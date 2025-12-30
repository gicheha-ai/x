# Moneyfy - Debug Version
FROM node:18-alpine

RUN apk add --no-cache nginx curl

WORKDIR /app

# Create backend
RUN echo 'const express = require("express"); const app = express(); app.get("/api/health", (req, res) => { console.log("Health check called from IP:", req.ip); res.json({status: "healthy", time: new Date().toISOString()}); }); app.get("/api", (req, res) => res.json({message: "API OK"})); app.get("/api/debug/files", (req, res) => { const fs = require("fs"); const path = require("path"); res.json({ htmlExists: fs.existsSync("/var/www/html/index.html"), htmlPath: "/var/www/html/index.html", filesInHtmlDir: fs.readdirSync("/var/www/html"), currentDir: process.cwd(), nginxConfig: fs.existsSync("/etc/nginx/nginx.conf") }); }); const PORT = process.env.PORT || 10000; app.listen(PORT, "0.0.0.0", () => console.log("Backend on port", PORT));' > server.js

RUN npm init -y && npm install express --omit=dev

# Create HTML in TWO locations to test
RUN mkdir -p /var/www/html
RUN echo '<html><body style="font-family: Arial; padding: 40px;"><h1>💰 Moneyfy Test Page</h1><p>If you see this, nginx is working!</p><p><a href="/api">Test API</a> | <a href="/api/debug/files">Debug Files</a></p></body></html>' > /var/www/html/index.html

# ALSO create in root directory
RUN echo '<html><body style="font-family: Arial; padding: 40px;"><h1>💰 Moneyfy ROOT Test</h1><p>This is in /app directory</p></body></html>' > /app/index.html

# Test nginx config
RUN echo 'events {}' > /etc/nginx/nginx.conf
RUN echo 'http {' >> /etc/nginx/nginx.conf
RUN echo '  server {' >> /etc/nginx/nginx.conf
RUN echo '    listen 80;' >> /etc/nginx/nginx.conf
RUN echo '    # Try different root directories' >> /etc/nginx/nginx.conf
RUN echo '    root /var/www/html;' >> /etc/nginx/nginx.conf
RUN echo '    index index.html;' >> /etc/nginx/nginx.conf
RUN echo '    location / {' >> /etc/nginx/nginx.conf
RUN echo '      try_files $uri $uri/ =404;' >> /etc/nginx/nginx.conf
RUN echo '    }' >> /etc/nginx/nginx.conf
RUN echo '    location /api {' >> /etc/nginx/nginx.conf
RUN echo '      proxy_pass http://localhost:10000;' >> /etc/nginx/nginx.conf
RUN echo '    }' >> /etc/nginx/nginx.conf
RUN echo '    # Special debug endpoint to test nginx directly' >> /etc/nginx/nginx.conf
RUN echo '    location /nginx-test {' >> /etc/nginx/nginx.conf
RUN echo '      return 200 "Nginx is working!";' >> /etc/nginx/nginx.conf
RUN echo '      add_header Content-Type text/plain;' >> /etc/nginx/nginx.conf
RUN echo '    }' >> /etc/nginx/nginx.conf
RUN echo '  }' >> /etc/nginx/nginx.conf
RUN echo '}' >> /etc/nginx/nginx.conf

# Create startup script with debugging
RUN echo '#!/bin/sh' > start.sh
RUN echo 'echo "=== STARTING MONEYFY DEBUG ==="' >> start.sh
RUN echo 'echo "1. Current directory:"' >> start.sh
RUN echo 'pwd' >> start.sh
RUN echo 'echo "2. Files in /var/www/html:"' >> start.sh
RUN echo 'ls -la /var/www/html/' >> start.sh
RUN echo 'echo "3. Testing nginx config:"' >> start.sh
RUN echo 'nginx -t' >> start.sh
RUN echo 'echo "4. Starting backend..."' >> start.sh
RUN echo 'node server.js &' >> start.sh
RUN echo 'echo "5. Testing backend..."' >> start.sh
RUN echo 'sleep 2' >> start.sh
RUN echo 'curl -f http://localhost:10000/api/health || echo "Backend test failed"' >> start.sh
RUN echo 'echo "6. Starting nginx..."' >> start.sh
RUN echo 'nginx -g "daemon off;"' >> start.sh
RUN chmod +x start.sh

CMD ["/app/start.sh"]
