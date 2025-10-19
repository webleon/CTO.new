# syntax=docker/dockerfile:1
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Bundle app source
COPY src ./src
COPY .env.example ./

EXPOSE 3000

CMD ["node", "src/server.js"]
