cd C:\Users\Administrator\Desktop\x
echo FROM node:18-alpine AS builder > Dockerfile
echo WORKDIR /app >> Dockerfile
echo COPY frontend/package*.json ./ >> Dockerfile
echo RUN npm install >> Dockerfile
echo COPY frontend/ . >> Dockerfile
echo RUN npm run build >> Dockerfile
echo. >> Dockerfile
echo FROM nginx:alpine >> Dockerfile
echo COPY --from=builder /app/build /usr/share/nginx/html >> Dockerfile
echo EXPOSE 80 >> Dockerfile
echo CMD ["nginx", "-g", "daemon off;"] >> Dockerfile
