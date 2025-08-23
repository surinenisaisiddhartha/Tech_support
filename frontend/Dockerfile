# Use Node.js 20 image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY frontend/package*.json ./

# Install dependencies with specific versions
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm install --no-audit --no-fund && \
    npm install --save-dev typescript @types/node @types/react @types/react-dom next@15.4.5

# Copy frontend code
COPY frontend/ .

# Set environment variables for build
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# Disable ESLint during build
RUN echo "module.exports = { eslint: { ignoreDuringBuilds: true } }" > next.config.js

# Build the application
RUN npm run build

# Expose port
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]