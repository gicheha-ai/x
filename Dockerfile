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

# Create SMART fix script that understands context vs provider
RUN cat > smart-fix.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('=== SMART FIX ===');

// Map of what each file exports
const exportMap = {};

// Scan all context and provider files
function scanExports() {
    const contextDir = path.join('src', 'context');
    if (!fs.existsSync(contextDir)) return;
    
    const contexts = fs.readdirSync(contextDir).filter(item => 
        fs.statSync(path.join(contextDir, item)).isDirectory()
    );
    
    contexts.forEach(ctx => {
        const ctxDir = path.join(contextDir, ctx);
        const files = fs.readdirSync(ctxDir);
        
        files.forEach(file => {
            if (file.endsWith('.js') || file.endsWith('.jsx')) {
                const filePath = path.join(ctxDir, file);
                const content = fs.readFileSync(filePath, 'utf8');
                const baseName = path.basename(file, path.extname(file));
                
                // Check what this file exports
                if (content.includes('export default')) {
                    exportMap[baseName] = { type: 'default', path: `./context/${ctx}/${file}` };
                } else if (content.includes('export const') || content.includes('export {')) {
                    // Extract exported names
                    const exportMatches = content.match(/export\s+(?:const|let|var|function|class)\s+([A-Za-z0-9_]+)/g) || [];
                    const namedExports = content.match(/export\s+\{\s*([^}]+)\s*\}/g) || [];
                    
                    exportMatches.forEach(match => {
                        const name = match.match(/export\s+(?:const|let|var|function|class)\s+([A-Za-z0-9_]+)/)[1];
                        exportMap[name] = { type: 'named', path: `./context/${ctx}/${file}` };
                    });
                    
                    namedExports.forEach(match => {
                        const names = match.match(/export\s+\{\s*([^}]+)\s*\}/)[1].split(',').map(n => n.trim());
                        names.forEach(name => {
                            exportMap[name] = { type: 'named', path: `./context/${ctx}/${file}` };
                        });
                    });
                }
            }
        });
    });
}

scanExports();
console.log('Export map:', Object.keys(exportMap).join(', '));

// Fix all files
function fixAllFiles(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            fixAllFiles(fullPath);
        } else if (item.endsWith('.js') || item.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            
            // Find all imports
            const importRegex = /import\s+(?:(\{[^}]+\})|([^'"{}\n]+))\s+from\s+['"]([^'"]+)['"]/g;
            let match;
            
            while ((match = importRegex.exec(content)) !== null) {
                const importStatement = match[0];
                const importWhat = match[1] || match[2]; // {Named} or default
                const importFrom = match[3];
                
                // Check if this import needs fixing
                if (importWhat && importFrom) {
                    // Extract imported names
                    let importedNames = [];
                    if (importWhat.startsWith('{')) {
                        // Named import: { AuthContext, something }
                        importedNames = importWhat.slice(1, -1).split(',').map(n => n.trim());
                    } else {
                        // Default import: AuthContext
                        importedNames = [importWhat.trim()];
                    }
                    
                    // Check each imported name
                    for (const name of importedNames) {
                        if (exportMap[name] && !importFrom.includes(name)) {
                            // This import is wrong - fix it
                            const newImport = importWhat.startsWith('{') ? 
                                `import { ${name} } from '${exportMap[name].path}'` :
                                `import ${name} from '${exportMap[name].path}'`;
                            
                            // Replace just this specific import
                            content = content.replace(importStatement, newImport);
                            changed = true;
                            console.log(`Fixed ${name} import in ${path.relative(process.cwd(), fullPath)}`);
                            break; // Move to next import statement
                        }
                    }
                }
            }
            
            if (changed) {
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

fixAllFiles('src');
console.log('=== SMART FIX COMPLETE ===');
EOF

RUN node smart-fix.js

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
