FROM node:18-alpine AS builder
WORKDIR /app

# Copy frontend
COPY frontend/ .

# Fix package.json
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

# Move hooks out of src/ if they exist
RUN if [ -d "src/hooks" ]; then \
    echo "Moving hooks..."; \
    mkdir -p hooks; \
    mv src/hooks/* hooks/ 2>/dev/null || true; \
    rmdir src/hooks 2>/dev/null || true; \
fi

# Fix syntax errors in App.js (missing semicolon at line 3:61)
RUN if [ -f "src/App.js" ]; then \
    echo "Fixing syntax errors in App.js..."; \
    # Add semicolon at position 61 of line 3 \
    sed -i '3s/\(.\{60\}\)/\1;/' src/App.js 2>/dev/null || \
    # Or just show the problematic line \
    echo "Line 3 of App.js:" && sed -n '3p' src/App.js; \
fi

# Also fix common syntax errors in all files
RUN find src -name "*.js" -o -name "*.jsx" | xargs sed -i 's/from "\.\.\/\.\.\/\.\.\/hooks\//from "..\/..\/hooks\//g' 2>/dev/null || true

# Build
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
