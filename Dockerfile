# Use Node.js 18 (or higher) as the base image
FROM node:18-alpine

# Install build tools for native dependencies (like better-sqlite3)
RUN apk add --no-cache python3 make g++

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the frontend and backend
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application using the bundled server
CMD ["node", "dist/server.js"]
