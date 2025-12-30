# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend files
COPY frontend/ .

# Ensure package.json has all dependencies
RUN echo '{"name":"moneyfy-frontend","version":"0.1.0","private":true,"dependencies":{"react":"^18.2.0","react-dom":"^18.2.0","react-scripts":"5.0.1","web-vitals":"^2.1.4","react-router-dom":"^6.0.0","axios":"^1.6.0"},"scripts":{"start":"react-scripts start","build":"react-scripts build","test":"react-scripts test","eject":"react-scripts eject"}}' > package.json

# Install dependencies
RUN npm install

# Create a fix script for import issues
RUN cat > fix-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;

    // Fix hook imports
    content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/hooks\/([^'"]+)['"]/g, "from '../../hooks/$1'");
    
    // Fix Provider imports - try both patterns
    const providers = ['AuthProvider', 'ProductProvider', 'CartProvider', 'OrderProvider', 'UserProvider'];
    
    providers.forEach(provider => {
        // Pattern 1: import { Provider } from './context/ProviderContext/Provider'
        const pattern1 = new RegExp(`import\\s+\\{\\s*${provider}\\s*\\}\\s+from\\s+['"][^'"]*${provider}['"]`, 'g');
        if (pattern1.test(content)) {
            // Check if file actually exports as default
            const providerPath = `./context/${provider.replace('Provider', '')}Context/${provider}`;
            try {
                const providerFile = path.join(path.dirname(filePath), providerPath.replace('./', '') + '.js');
                if (fs.existsSync(providerFile)) {
                    const providerContent = fs.readFileSync(providerFile, 'utf8');
                    if (providerContent.includes('export default')) {
                        // It's a default export, remove braces
                        content = content.replace(pattern1, `import ${provider} from '${providerPath}'`);
                        changed = true;
                    }
                }
            } catch (e) {
                // If can't check, assume it's default and fix anyway
                content = content.replace(pattern1, `import ${provider} from '${providerPath}'`);
                changed = true;
            }
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed:', filePath);
    }
}

function walkDir(dir) {
    fs.readdirSync(dir).forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (/\.(js|jsx)$/.test(item)) {
            processFile(fullPath);
        }
    });
}

walkDir('src');
EOF

# Run the fix script
RUN node fix-imports.js

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
