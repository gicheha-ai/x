# Use Node.js LTS version
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies
# Copy package.json and package-lock.json
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy app source code
COPY . .

# Expose the port your backend runs on
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
