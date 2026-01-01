# Dockerfile for Render  
FROM node:18-alpine  
WORKDIR /app  
COPY backend/package*.json ./  
RUN npm ci --only=production  
COPY backend/ .  
ENV NODE_ENV=production  
ENV PORT=10000  
EXPOSE 10000  
CMD ["node", "server.js"]  
