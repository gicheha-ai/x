FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/ .

# Create proper package.json
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

# Create the ULTIMATE fix script
RUN cat > ultimate-fix.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('=== ULTIMATE FIX STARTING ===');

// Find ALL provider files and their correct paths
const providerPaths = {};
const contextDirs = fs.readdirSync(path.join('src', 'context')).filter(dir => 
    fs.statSync(path.join('src', 'context', dir)).isDirectory()
);

contextDirs.forEach(dir => {
    const providerFile = dir.replace('Context', 'Provider') + '.js';
    const providerPath = path.join('src', 'context', dir, providerFile);
    
    if (fs.existsSync(providerPath)) {
        providerPaths[dir.replace('Context', 'Provider')] = `./context/${dir}/${providerFile}`;
        console.log(`Found ${dir.replace('Context', 'Provider')} at: ./context/${dir}/${providerFile}`);
    }
});

// Fix ALL JavaScript/JSX files
function fixAllFiles(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
        const fullPath = path.join(currentDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            fixAllFiles(fullPath);
        } else if (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            // Fix 1: Hook imports (convert to correct relative path)
            const relativeToSrc = path.relative('src', path.dirname(fullPath));
            const depth = relativeToSrc === '' ? 0 : relativeToSrc.split(path.sep).length;
            const correctHookPath = '../'.repeat(depth) + 'hooks/';
            
            const hookRegex = /from\s+['"](\.\.\/)+hooks\/([^'"]+)['"]/g;
            if (hookRegex.test(content)) {
                content = content.replace(hookRegex, `from '${correctHookPath}$2'`);
                changed = true;
            }
            
            // Fix 2: Provider imports - ensure correct path and import style
            for (const [provider, correctPath] of Object.entries(providerPaths)) {
                // Pattern for this provider with any path
                const providerRegex = new RegExp(`import\\s+(?:\\{\\s*${provider}\\s*\\}|${provider})\\s+from\\s+['"]([^'"]*${provider}(?:\\.js)?)['"]`, 'g');
                
                let match;
                while ((match = providerRegex.exec(content)) !== null) {
                    const currentImport = match[0];
                    const newImport = `import ${provider} from '${correctPath}'`;
                    
                    if (currentImport !== newImport) {
                        content = content.replace(currentImport, newImport);
                        changed = true;
                        console.log(`Fixed ${provider} import in ${path.relative(process.cwd(), fullPath)}`);
                    }
                }
            }
            
            // Fix 3: Also fix imports ending with just Context (missing Provider.js)
            const contextRegex = /import\s+([A-Za-z]+Provider)\s+from\s+['"]\.\/context\/([A-Za-z]+Context)(?!\/)['"]/g;
            if (contextRegex.test(content)) {
                content = content.replace(contextRegex, "import $1 from './context/$2/$1'");
                changed = true;
            }
            
            if (changed) {
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

fixAllFiles('src');

// Create jsconfig.json for absolute imports
const jsconfig = {
    compilerOptions: {
        baseUrl: "src"
    },
    include: ["src"]
};
fs.writeFileSync('jsconfig.json', JSON.stringify(jsconfig, null, 2));

console.log('=== ULTIMATE FIX COMPLETE ===');
EOF

RUN node ultimate-fix.js

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
