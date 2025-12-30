# Moneyfy - Express Server Only (No Nginx)
FROM node:18-alpine

WORKDIR /app

# Create package.json
RUN echo '{"name":"moneyfy","version":"1.0.0","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{"express":"^4.18.2"}}' > package.json

# Create server.js that serves both frontend and API
RUN echo 'const express = require("express"); const app = express(); const PORT = process.env.PORT || 10000; app.get("/", (req, res) => { res.send(`<!DOCTYPE html><html><head><title>Moneyfy</title><style>body{font-family:Arial;margin:40px;background:#f0f8ff}</style></head><body><div style="max-width:800px;margin:auto;background:white;padding:40px;border-radius:15px;box-shadow:0 5px 15px rgba(0,0,0,0.1)"><h1 style="color:#2c3e50">💰 Moneyfy</h1><p style="font-size:18px">Your financial application is <strong style="color:#27ae60">LIVE</strong> and running!</p><p>✅ Successfully deployed on Render</p><div style="margin-top:30px"><a href="/api" style="background:#3498db;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;margin-right:10px">Test API</a><a href="/api/health" style="background:#2ecc71;color:white;padding:12px 24px;border-radius:6px;text-decoration:none">Health Check</a></div></div></body></html>`); }); app.get("/api", (req, res) => { res.json({ message: "Moneyfy API", status: "running", timestamp: new Date().toISOString() }); }); app.get("/api/health", (req, res) => { res.json({ status: "healthy", service: "Moneyfy" }); }); app.listen(PORT, "0.0.0.0", () => { console.log("✅ Moneyfy server running on port " + PORT); console.log("🌐 Open: http://localhost:" + PORT); });' > server.js

# Install dependencies and start
RUN npm install
CMD ["npm", "start"]
