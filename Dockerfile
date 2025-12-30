FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/ .

# Fix package.json first if needed
RUN cat > ensure-package.js << 'EOF'
const fs = require('fs');

try {
    let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Ensure required dependencies exist
    const requiredDeps = {
        "react": "^18.2.0",
        "react-dom": "^18.2.0", 
        "react-scripts": "5.0.1",
        "web-vitals": "^2.1.4",
        "react-router-dom": "^6.0.0",
        "axios": "^1.6.0"
    };
    
    let changed = false;
    for (const [dep, version] of Object.entries(requiredDeps)) {
        if (!pkg.dependencies || !pkg.dependencies[dep]) {
            pkg.dependencies = pkg.dependencies || {};
            pkg.dependencies[dep] = version;
            changed = true;
        }
    }
    
    if (changed) {
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
        console.log('Updated package.json with missing dependencies');
    }
} catch (err) {
    console.error('Error with package.json:', err.message);
    // Create a fresh package.json
    const freshPkg = {
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
    };
    fs.writeFileSync('package.json', JSON.stringify(freshPkg, null, 2));
    console.log('Created fresh package.json');
}
EOF

RUN node ensure-package.js

# Install dependencies
RUN npm install

# Fix ALL imports
RUN cat > fix-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('Fixing imports...');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const original = content;
    
    // Fix hook imports: ANY ../ before hooks/
    content = content.replace(
        /from\s+['"](\.\.\/)+hooks\/([^'"]+)['"]/g,
        (match, dots, hookName) => {
            const dotCount = (dots.match(/\.\.\//g) || []).length;
            const newDots = '../'.repeat(Math.max(1, dotCount - 1));
            return `from '${newDots}hooks/${hookName}'`;
        }
    );
    
    // Fix Provider imports: remove braces
    content = content.replace(
        /import\s+\{\s*([A-Za-z]+Provider)\s*\}\s+from\s+['"]([^'"]+)['"]/g,
        "import $1 from '$2'"
    );
    
    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log('Fixed:', path.relative(process.cwd(), filePath));
    }
}

function walkDir(dir) {
    fs.readdirSync(dir).forEach(item => {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else if (/\.(js|jsx|ts|tsx)$/.test(item)) {
            fixFile(fullPath);
        }
    });
}

walkDir('src');
console.log('✓ All imports fixed');
EOF

RUN node fix-imports.js

# Verify no problematic imports remain
RUN echo "=== Verifying imports ===" && \
    if find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec grep -l "\.\./\.\./\.\./hooks/" {} + >/dev/null 2>&1; then \
        echo "ERROR: Still found hook imports with ../../../"; \
        exit 1; \
    else \
        echo "✓ No problematic hook imports"; \
    fi

# Build the app
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
