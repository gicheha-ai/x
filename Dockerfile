# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first
COPY frontend/package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY frontend/ .

# Create a simple fix script for imports
RUN cat > fix-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

function fixImports(dir) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            fixImports(filePath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            let content = fs.readFileSync(filePath, 'utf8');
            
            // Fix hook imports: ../../../hooks/ -> ../../hooks/
            content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/hooks\/([^'"]+)['"]/g, "from '../../hooks/$1'");
            
            // Fix Provider imports
            content = content.replace(/import\s+\{\s*AuthProvider\s*\}\s+from\s+['"][^'"]*AuthProvider['"]/g, "import AuthProvider from './context/AuthContext/AuthProvider'");
            content = content.replace(/import\s+\{\s*ProductProvider\s*\}\s+from\s+['"][^'"]*ProductProvider['"]/g, "import ProductProvider from './context/ProductContext/ProductProvider'");
            content = content.replace(/import\s+\{\s*CartProvider\s*\}\s+from\s+['"][^'"]*CartProvider['"]/g, "import CartProvider from './context/CartContext/CartProvider'");
            
            fs.writeFileSync(filePath, content);
        }
    });
}

fixImports('src');
EOF

# Run the fix script
RUN node fix-imports.js

# Build the React app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Simple nginx config (no complex echo)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
