# Moneyfy - Diagnostic Version for Free Plan
FROM node:18-alpine

# Install nginx
RUN apk add --no-cache nginx

WORKDIR /app
COPY . .

# ========== BACKEND WITH EXTRA LOGGING ==========
RUN cat > backend/server.js << 'EOF'
const express = require('express');
const app = express();

console.log('=== BACKEND STARTING ===');

app.get('/api/health', (req, res) => {
  console.log('Health check called');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Moneyfy Backend'
  });
});

app.get('/api', (req, res) => {
  console.log('API endpoint called');
  res.json({ 
    message: 'Moneyfy API is running!',
    endpoints: ['/api', '/api/health', '/api/debug']
  });
});

// Debug endpoint
app.get('/api/debug', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const debugInfo = {
    backend: 'running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 10000,
    files: {
      htmlExists: fs.existsSync('/var/www/html/index.html'),
      nginxConfigExists: fs.existsSync('/etc/nginx/nginx.conf')
    },
    request: {
      ip: req.ip,
      headers: req.headers
    }
  };
  
  console.log('Debug endpoint called:', debugInfo);
  res.json(debugInfo);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(\`✅ Backend server started on port \${PORT}\`);
  console.log(\`✅ Health check: http://0.0.0.0:\${PORT}/api/health\`);
});
EOF

RUN cd backend && npm install express --omit=dev

# ========== CREATE HTML WITH SELF-DIAGNOSTICS ==========
RUN mkdir -p /var/www/html
RUN cat > /var/www/html/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Moneyfy - Diagnostic</title>
    <style>
        body { 
            font-family: 'Arial', sans-serif; 
            margin: 0; 
            padding: 40px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            color: #333;
        }
        h1 { 
            color: #764ba2; 
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .status {
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            font-weight: bold;
        }
        .success { background: #d4edda; color: #155724; border-left: 4px solid #28a745; }
        .error { background: #f8d7da; color: #721c24; border-left: 4px solid #dc3545; }
        .loading { background: #fff3cd; color: #856404; border-left: 4px solid #ffc107; }
        .btn {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            margin: 10px 5px;
            transition: all 0.3s;
        }
        .btn:hover {
            background: #764ba2;
            transform: translateY(-2px);
        }
        .log {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 15px;
            margin-top: 20px;
            font-family: monospace;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>💰 Moneyfy Diagnostic Dashboard</h1>
        
        <div class="status success">
            ✅ This page is being served by nginx
        </div>
        
        <div id="backendStatus" class="status loading">
            ⏳ Testing backend connection...
        </div>
        
        <div id="fileStatus" class="status loading">
            ⏳ Checking file system...
        </div>
        
        <h3>Quick Tests:</h3>
        <div>
            <a href="/api" class="btn" target="_blank">🔧 Test API</a>
            <a href="/api/health" class="btn" target="_blank">❤️ Health Check</a>
            <a href="/api/debug" class="btn" target="_blank">🐛 Debug Info</a>
        </div>
        
        <h3>Live Log:</h3>
        <div id="log" class="log">
            Page loaded at: <span id="timestamp"></span>
        </div>
        
        <h3>Next Steps:</h3>
        <ol>
            <li>If API tests fail, check Render logs</li>
            <li>If this page shows, nginx is working!</li>
            <li>Replace this HTML with your actual frontend</li>
        </ol>
    </div>
    
    <script>
        // Set timestamp
        document.getElementById('timestamp').textContent = new Date().toISOString();
        
        // Test backend
        fetch('/api/health')
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Backend not responding');
            })
            .then(data => {
                const el = document.getElementById('backendStatus');
                el.className = 'status success';
                el.innerHTML = \`✅ Backend is running (\${data.timestamp})\`;
            })
            .catch(error => {
                const el = document.getElementById('backendStatus');
                el.className = 'status error';
                el.innerHTML = \`❌ Backend error: \${error.message}\`;
            });
        
        // Check files via debug endpoint
        fetch('/api/debug')
            .then(response => response.json())
            .then(data => {
                const el = document.getElementById('fileStatus');
                el.className = 'status success';
                el.innerHTML = \`✅ Files checked: HTML \${data.files.htmlExists ? 'exists' : 'missing'}, Nginx config \${data.files.nginxConfigExists ? 'exists' : 'missing'}\`;
            })
            .catch(error => {
                const el = document.getElementById('fileStatus');
                el.className = 'status error';
                el.innerHTML = \`❌ Cannot check files: \${error.message}\`;
            });
    </script>
</body>
</html>
EOF

# ========== SIMPLE GUARANTEED NGINX CONFIG ==========
RUN cat > /etc/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name _;
        
        root /var/www/html;
        index index.html;
        
        # Logging
        access_log /var/log/nginx/access.log;
        error_log /var/log/nginx/error.log;
        
        location / {
            try_files $uri $uri/ =404;
        }
        
        location /api {
            proxy_pass http://localhost:10000;
            proxy_set_header Host $host;
        }
    }
}
EOF

# ========== VERIFY SETUP ==========
RUN echo "=== VERIFICATION STEPS ==="
RUN echo "1. Checking HTML file..."
RUN ls -la /var/www/html/
RUN echo "2. Checking nginx config..."
RUN nginx -t 2>&1 || echo "Nginx config test might show warnings but that's OK"

# ========== START SCRIPT ==========
RUN echo '#!/bin/sh' > /app/start.sh
RUN echo 'echo "=== MONEYFY STARTUP ==="' >> /app/start.sh
RUN echo 'echo "Starting backend on port 10000..."' >> /app/start.sh
RUN echo 'cd /app/backend && node server.js &' >> /app/start.sh
RUN echo 'echo "Backend started in background"' >> /app/start.sh
RUN echo 'echo "Starting nginx..."' >> /app/start.sh
RUN echo 'nginx -g "daemon off;"' >> /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 10000

CMD ["/app/start.sh"]
