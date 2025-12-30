# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy frontend files
COPY frontend/ .

# Ensure package.json has all dependencies
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

# Install dependencies
RUN npm install

# Create a comprehensive fix script
RUN cat > fix-all-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Fixing all import issues...');

// Find all JavaScript files
function getAllJsFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    
    list.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            results = results.concat(getAllJsFiles(filePath));
        } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
            results.push(filePath);
        }
    });
    
    return results;
}

// Fix a single file
function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Fix 1: Hook imports (../../../hooks/ -> ../../hooks/)
    content = content.replace(
        /from\s+['"]\.\.\/\.\.\/\.\.\/hooks\/([^'"]+)['"]/g,
        "from '../../hooks/$1'"
    );
    
    // Fix 2: Also fix ../../hooks/ if needed (some might be two levels up)
    content = content.replace(
        /from\s+['"]\.\.\/\.\.\/hooks\/([^'"]+)['"]/g,
        "from '../hooks/$1'"
    );
    
    // Fix 3: Provider imports - remove braces for default exports
    const providers = ['AuthProvider', 'ProductProvider', 'CartProvider', 'OrderProvider', 'UserProvider'];
    
    providers.forEach(provider => {
        // Pattern: import { Provider } from '...Provider'
        const regex = new RegExp(`import\\s+\\{\\s*${provider}\\s*\\}\\s+from\\s+['"][^'"]*${provider}['"]`, 'g');
        if (regex.test(content)) {
            // Replace with default import
            content = content.replace(
                regex,
                `import ${provider} from './context/${provider.replace('Provider', '')}Context/${provider}'`
            );
        }
    });
    
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('✓ Fixed:', path.relative(process.cwd(), filePath));
        return true;
    }
    return false;
}

// Main fix process
const jsFiles = getAllJsFiles('src');
let fixedCount = 0;

jsFiles.forEach(file => {
    if (fixFile(file)) {
        fixedCount++;
    }
});

console.log(`\nFixed ${fixedCount} files out of ${jsFiles.length}`);

// Also create symlinks for hooks if they don't exist in the right place
try {
    if (!fs.existsSync('src/hooks')) {
        console.log('Creating hooks directory...');
        fs.mkdirSync('src/hooks', { recursive: true });
    }
} catch (err) {
    console.log('Note: Could not create hooks directory:', err.message);
}
EOF

# Run the fix script
RUN node fix-all-imports.js

# Verify fixes were applied
RUN echo "Checking for remaining hook imports..." && \
    if find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec grep -l "\.\./\.\./\.\./hooks/" {} + >/dev/null 2>&1; then \
      echo "ERROR: Still found hook imports with ../../../" && \
      find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec grep -l "\.\./\.\./\.\./hooks/" {} + | xargs -I {} echo "  {}" && \
      exit 1; \
    else \
      echo "✓ All hook imports fixed"; \
    fi

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html

# Nginx config for React SPA
RUN echo 'server {
    listen 80;
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
