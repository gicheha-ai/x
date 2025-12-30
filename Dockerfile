FROM node:18-alpine AS builder
WORKDIR /app

# Copy everything
COPY frontend/ .

# Create fresh package.json
RUN cat > package.json << 'EOF'
{
  "name": "moneyfy-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "web-vitals": "^2.1.4",
    "react-router-dom": "^6.0.0",
    "axios": "^1.6.0"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  }
}
EOF

RUN npm install

# Create COMPREHENSIVE fix script
RUN cat > fix-everything.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('=== FIXING EVERYTHING ===');

// Step 1: Analyze ALL provider files
const providerExports = {};

// Find all context directories
const contextPath = path.join('src', 'context');
if (fs.existsSync(contextPath)) {
    const contexts = fs.readdirSync(contextPath).filter(item => 
        fs.statSync(path.join(contextPath, item)).isDirectory()
    );
    
    contexts.forEach(ctx => {
        const providerFile = path.join(contextPath, ctx, `${ctx.replace('Context', 'Provider')}.js`);
        const contextFile = path.join(contextPath, ctx, `${ctx}.js`);
        
        if (fs.existsSync(providerFile)) {
            const content = fs.readFileSync(providerFile, 'utf8');
            if (content.includes('export default')) {
                providerExports[`${ctx.replace('Context', 'Provider')}`] = { 
                    type: 'default', 
                    file: providerFile,
                    name: `${ctx.replace('Context', 'Provider')}`
                };
            } else {
                providerExports[`${ctx.replace('Context', 'Provider')}`] = { 
                    type: 'named', 
                    file: providerFile,
                    name: `${ctx.replace('Context', 'Provider')}`
                };
            }
        }
        
        if (fs.existsSync(contextFile)) {
            const content = fs.readFileSync(contextFile, 'utf8');
            providerExports[`${ctx}`] = { 
                type: 'named', 
                file: contextFile,
                name: `${ctx}`
            };
        }
    });
}

console.log('Found exports:', Object.keys(providerExports).join(', '));

// Step 2: Fix ALL JavaScript files
function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Fix 1: Remove semicolons from import strings
    content = content.replace(/from\s+['"]([^'"]*);['"]/g, "from '$1'");
    
    // Fix 2: Fix ALL provider imports
    for (const [exportName, info] of Object.entries(providerExports)) {
        // Pattern for: import { Name } from '...'
        const namedImportRegex = new RegExp(`import\\s+\\{\\s*${exportName}\\s*\\}\\s+from\\s+['"]([^'"]+)['"]`, 'g');
        // Pattern for: import Name from '...'
        const defaultImportRegex = new RegExp(`import\\s+${exportName}\\s+from\\s+['"]([^'"]+)['"]`, 'g');
        
        if (namedImportRegex.test(content) && info.type === 'default') {
            // Change named import to default import
            content = content.replace(
                namedImportRegex,
                `import ${exportName} from '${info.file.replace(/^src\//, './')}'`
            );
            changed = true;
            console.log(`Fixed ${exportName}: named -> default in ${path.relative(process.cwd(), filePath)}`);
        } else if (defaultImportRegex.test(content) && info.type === 'named') {
            // Change default import to named import
            content = content.replace(
                defaultImportRegex,
                `import { ${exportName} } from '${info.file.replace(/^src\//, './')}'`
            );
            changed = true;
            console.log(`Fixed ${exportName}: default -> named in ${path.relative(process.cwd(), filePath)}`);
        }
    }
    
    // Fix 3: Hook imports - make them all relative to src root
    const relativePath = path.relative('src', path.dirname(filePath));
    const depth = relativePath === '' ? 0 : relativePath.split(path.sep).length;
    const correctHookPath = '../'.repeat(depth) + 'hooks/';
    
    content = content.replace(/from\s+['"](\.\.\/)+hooks\/([^'"]+)['"]/g, `from '${correctHookPath}$2'`);
    
    if (changed) {
        fs.writeFileSync(filePath, content);
    }
}

// Walk through all files
function walkDir(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
            fixFile(fullPath);
        }
    }
}

walkDir('src');

// Step 3: Move hooks out of src/ if they exist
if (fs.existsSync('src/hooks')) {
    console.log('Moving hooks out of src/...');
    const hooks = fs.readdirSync('src/hooks');
    if (!fs.existsSync('hooks')) fs.mkdirSync('hooks');
    
    hooks.forEach(hook => {
        fs.renameSync(
            path.join('src/hooks', hook),
            path.join('hooks', hook)
        );
    });
    
    fs.rmdirSync('src/hooks');
}

console.log('=== EVERYTHING FIXED ===');
EOF

RUN node fix-everything.js

# Verify fixes
RUN echo "=== Verification ===" && \
    echo "1. Checking Provider imports..." && \
    if find src -name "*.js" -o -name "*.jsx" -exec grep -l "import {.*Provider}" {} + >/dev/null 2>&1; then \
        echo "Found named Provider imports (might be OK if files export as named):"; \
        find src -name "*.js" -o -name "*.jsx" -exec grep -l "import {.*Provider}" {} + | head -3; \
    else \
        echo "✓ No unexpected named Provider imports"; \
    fi

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
