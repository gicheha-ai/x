FROM node:18-alpine AS builder
WORKDIR /app

# Copy everything
COPY frontend/ .

# Create guaranteed package.json
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

# Install
RUN npm install

# NUCLEAR FIX: Create a script that rewrites ALL imports correctly
RUN cat > nuclear-fix.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('=== NUCLEAR FIX STARTING ===');

// 1. First, check ALL provider files to see how they export
const providerFiles = {};
const providerDirs = ['AuthContext', 'ProductContext', 'CartContext', 'OrderContext', 'UserContext', 'SuperAdminContext'];

providerDirs.forEach(dir => {
    const providerPath = path.join('src', 'context', dir, dir.replace('Context', 'Provider') + '.js');
    if (fs.existsSync(providerPath)) {
        const content = fs.readFileSync(providerPath, 'utf8');
        providerFiles[dir.replace('Context', 'Provider')] = content.includes('export default') ? 'default' : 'named';
        console.log(`${dir.replace('Context', 'Provider')}: ${providerFiles[dir.replace('Context', 'Provider')]} export`);
    }
});

// 2. Fix ALL JavaScript files
function fixAllFiles(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            fixAllFiles(fullPath);
        } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            
            // FIX 1: Hook imports - convert ALL to correct relative paths
            // Calculate how many levels deep this file is
            const relativeToSrc = path.relative('src', path.dirname(fullPath));
            const depth = relativeToSrc === '' ? 0 : relativeToSrc.split(path.sep).length;
            const correctPrefix = '../'.repeat(depth) || './';
            
            content = content.replace(/from\s+['"](\.\.\/)+hooks\/([^'"]+)['"]/g, `from '${correctPrefix}hooks/$2'`);
            
            // FIX 2: Provider imports - fix based on actual export type
            for (const [provider, exportType] of Object.entries(providerFiles)) {
                const regex = new RegExp(`import\\s+\\{\\s*${provider}\\s*\\}\\s+from\\s+['"][^'"]+['"]`, 'g');
                if (regex.test(content)) {
                    if (exportType === 'default') {
                        // Change named import to default import
                        content = content.replace(
                            new RegExp(`import\\s+\\{\\s*${provider}\\s*\\}\\s+from\\s+['"]([^'"]+)['"]`),
                            `import ${provider} from '$1'`
                        );
                    }
                    // If named export, leave as is
                }
            }
            
            // FIX 3: Also fix any remaining problematic patterns
            content = content.replace(/import\s+\{\s*([A-Za-z]+Provider)\s*\}\s+from\s+['"]([^'"]+)['"]/g, `import $1 from '$2'`);
            
            fs.writeFileSync(fullPath, content);
        }
    }
}

fixAllFiles('src');

// 3. Also move hooks if needed
if (fs.existsSync('src/hooks')) {
    console.log('Copying hooks to node_modules...');
    fs.mkdirSync('node_modules/hooks', { recursive: true });
    const hookFiles = fs.readdirSync('src/hooks');
    hookFiles.forEach(file => {
        fs.copyFileSync(path.join('src/hooks', file), path.join('node_modules/hooks', file));
    });
}

console.log('=== NUCLEAR FIX COMPLETE ===');
EOF

RUN node nuclear-fix.js

# Verify the fixes
RUN echo "=== Verification ===" && \
    echo "1. Checking hook imports..." && \
    if find src -name "*.js" -o -name "*.jsx" | xargs grep -l "\.\./\.\./\.\./hooks/" 2>/dev/null; then \
        echo "WARNING: Still found ../../../hooks/ imports"; \
    else \
        echo "✓ No ../../../hooks/ imports"; \
    fi && \
    echo "2. Checking Provider imports..." && \
    if find src -name "*.js" -o -name "*.jsx" | xargs grep -l "import {.*Provider}" 2>/dev/null; then \
        echo "WARNING: Still found named Provider imports"; \
        find src -name "*.js" -o -name "*.jsx" | xargs grep -l "import {.*Provider}" 2>/dev/null | head -3; \
    else \
        echo "✓ No named Provider imports"; \
    fi

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
