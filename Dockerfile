FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/ .
RUN cat > fix-all-imports.js << 'EOF'
const fs = require('fs');
const path = require('path');

console.log('Fixing ALL import issues...');

// Fix ALL files recursively
function fixDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            fixDirectory(fullPath);
        } else if (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const original = content;
            
            // FIX 1: All hook imports - replace ANY number of ../ before hooks/
            // Matches: ../../../hooks/, ../../hooks/, ../hooks/
            content = content.replace(
                /from\s+['"](\.\.\/)+hooks\/([^'"]+)['"]/g,
                (match, dots, hookName) => {
                    // Count how many ../ we have
                    const dotCount = (dots.match(/\.\.\//g) || []).length;
                    // We need to go up 2 levels from src/ to get to src/hooks/
                    // So if we have 3 ../ (../../../), convert to 2 ../ (../../)
                    // If we have 2 ../ (../../), convert to 1 ../ (../)
                    // If we have 1 ../ (../), keep as is (already inside src/)
                    const newDots = '../'.repeat(Math.max(1, dotCount - 1));
                    return `from '${newDots}hooks/${hookName}'`;
                }
            );
            
            // FIX 2: All Provider imports - remove braces
            // Matches: import { SomethingProvider } from '...SomethingProvider'
            content = content.replace(
                /import\s+\{\s*([A-Za-z]+Provider)\s*\}\s+from\s+['"]([^'"]+)['"]/g,
                "import $1 from '$2'"
            );
            
            // FIX 3: Also fix imports with extra spaces or newlines
            content = content.replace(
                /import\s*\{\s*([A-Za-z]+Provider)\s*\}\s*from\s*['"]([^'"]+)['"]/g,
                "import $1 from '$2'"
            );
            
            if (content !== original) {
                fs.writeFileSync(fullPath, content);
                console.log('✓ Fixed:', path.relative(process.cwd(), fullPath));
            }
        }
    }
}

// Also create a symlink for hooks if needed (as error suggests)
try {
    if (!fs.existsSync('node_modules/hooks')) {
        fs.mkdirSync('node_modules/hooks', { recursive: true });
        // Create symlink from src/hooks to node_modules/hooks
        if (fs.existsSync('src/hooks')) {
            // Note: We can't create symlinks easily in Docker build context
            // Instead, we'll copy the hooks to a location that satisfies the import
            fs.cpSync('src/hooks', 'node_modules/hooks', { recursive: true });
            console.log('✓ Copied hooks to node_modules/hooks');
        }
    }
} catch (err) {
    console.log('Note:', err.message);
}

fixDirectory('src');
console.log('\n✓ All imports fixed!');
EOF

RUN node fix-all-imports.js

# Verify fixes
RUN echo "=== Verifying no more ../../../hooks/ imports ===" && \
    if find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec grep -l "\.\./\.\./\.\./hooks/" {} + >/dev/null 2>&1; then \
        echo "ERROR: Still found problematic hook imports:"; \
        find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec grep -l "\.\./\.\./\.\./hooks/" {} + | head -5; \
        exit 1; \
    else \
        echo "✓ No more ../../../hooks/ imports"; \
    fi

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
