# Moneyfy - Fixed Diagnostic Version
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
  
  const debugInfo = {
    backend: 'running',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 10000,
    files: {
      htmlExists: fs.existsSync('/var/www/html/index.html'),
      nginxConfigExists: fs.existsSync('/etc/nginx/nginx.conf')
    }
  };
  
  console.log('Debug endpoint called');
  res.json(debugInfo);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('Backend server started on port ' + PORT);
  console.log('Health check: http://0.0.0.0:' + PORT + '/api/health');
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
        }
        .btn:hover {
            background: #764ba2;
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
        
        <h3>Quick Tests:</h3>
        <div>
            <a href="/api" class="btn" target="_blank">Test API</a>
            <a href="/api/health" class="btn" target="_blank">Health Check</a>
            <a href="/api/debug" class="btn" target="_blank">Debug Info</a>
        </div>
        
        <p id="timestamp"></p>
    </div>
    
    <script>
        document.getElementById('timestamp').textContent = 'Page loaded: ' + new Date().toISOString();
        
        fetch('/api/health')
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Backend not responding');
            })
            .then(data => {
                document.getElementById('backendStatus').className = 'status success';
                document.getElementById('backendStatus').innerHTML = '✅ Backend is running';
            })
            .catch(error => {
                document.getElementById('backendStatus').className = 'status error';
                document.getElementById('backendStatus').innerHTML = '❌ Backend error';
            });
    </script>
</body>
</html>
EOF

# ========== SIMPLE NGINX CONFIG ==========
RUN cat > /etc/nginx/nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        root /var/www/html;
        index index.html;
        
        location / {
            try_files $uri $uri/ =404;
        }
        
        location /api {
            proxy_pass http://localhost:10000;
        }
    }
}
EOF

# ========== START SCRIPT ==========
RUN echo '#!/bin/sh' > /app/start.sh
RUN echo 'echo "=== MONEYFY STARTUP ==="' >> /app/start.sh
RUN echo 'echo "Starting backend..."' >> /app/start.sh
RUN echo 'cd /app/backend && node server.js &' >> /app/start.sh
RUN echo 'echo "Backend started"' >> /app/start.sh
RUN echo 'echo "Starting nginx..."' >> /app/start.sh
RUN echo 'nginx -g "daemon off;"' >> /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
