FROM node:18-alpine AS builder
WORKDIR /app

# Copy frontend directory
COPY frontend/ .

# First, fix package.json if it has merge conflicts or is invalid
RUN cat > fix-package.js << 'EOF'
const fs = require('fs');

function fixPackageJson() {
    try {
        let content = fs.readFileSync('package.json', 'utf8');
        const original = content;
        
        // Remove Git merge conflict markers
        content = content.replace(/^<<<<<<< .*$\n/m, '');
        content = content.replace(/^=======$\n/m, '');
        content = content.replace(/^>>>>>>> .*$\n/m, '');
        
        // If empty or invalid, create a valid one
        if (content.trim() === '' || content.trim() === '{}' || !isValidJson(content)) {
            console.log('Creating valid package.json...');
            content = JSON.stringify({
                name: "moneyfy-frontend",
                version: "0.1.0",
                private: true,
                dependencies: {
                    "react": "^18.2.0",
                    "react-dom": "^18.2.0",
                    "react-scripts": "5.0.1",
                    "web-vitals": "^2.1.4",
                    "react-router-dom": "^6.0.0",
                    "axios": "^1.6.0"
                },
                scripts: {
                    "start": "react-scripts start",
                    "build": "react-scripts build",
                    "test": "react-scripts test",
                    "eject": "react-scripts eject"
                }
            }, null, 2);
        }
        
        if (content !== original) {
            fs.writeFileSync('package.json', content);
            console.log('Fixed package.json');
        }
        
        return true;
    } catch (err) {
        console.error('Error fixing package.json:', err.message);
        return false;
    }
}

function isValidJson(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

fixPackageJson();
EOF

RUN node fix-package.js

# Verify package.json is valid
RUN node -e "try { require('./package.json'); console.log('✓ package.json is valid JSON'); } catch(e) { console.error('✗ package.json is invalid:', e.message); process.exit(1); }"

# Install dependencies
RUN npm install

# Fix ALL Provider imports
RUN cat > fix-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('Fixing imports...');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Fix hook imports: ../../../hooks/ -> ../../hooks/
    content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/hooks\/([^'"]+)['"]/g, "from '../../hooks/$1'");
    
    // Fix ALL Provider imports (named -> default)
    const providerRegex = /import\s+\{\s*([A-Za-z]+Provider)\s*\}\s+from\s+['"]([^'"]+)['"]/g;
    let match;
    while ((match = providerRegex.exec(content)) !== null) {
        const providerName = match[1];
        const importPath = match[2];
        content = content.replace(
            `import { ${providerName} } from '${importPath}'`,
            `import ${providerName} from '${importPath}'`
        );
        changed = true;
        console.log(`Fixed ${providerName} import in ${path.relative(process.cwd(), filePath)}`);
    }
    
    if (changed || content.includes("../../../hooks/")) {
        fs.writeFileSync(filePath, content);
        return true;
    }
    return false;
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    let fixedCount = 0;
    
    files.forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            fixedCount += walkDir(fullPath);
        } else if (/\.(js|jsx)$/.test(item)) {
            if (fixFile(fullPath)) {
                fixedCount++;
            }
        }
    });
    
    return fixedCount;
}

const fixed = walkDir('src');
console.log(`\n✓ Fixed ${fixed} files`);
EOF

RUN node fix-imports.js

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
