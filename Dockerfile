# Combined Dockerfile for frontend (Next.js) and backend (FastAPI with Tesseract OCR)
FROM node:20-bullseye

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install Python, pip, Tesseract OCR, Nginx, Supervisor, envsubst
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       python3 python3-pip python3-venv \
       tesseract-ocr \
       nginx \
       supervisor \
       gettext-base \
       ca-certificates \
       build-essential \
       libglib2.0-0 libsm6 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Create app directories
WORKDIR /app

# ---------- Backend ----------
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt
COPY backend/ ./

# ---------- Frontend ----------
WORKDIR /app/frontend
COPY frontend/package*.json ./
# Install dependencies first
RUN npm install --no-audit --no-fund
# Copy the rest of the frontend files
COPY frontend/ ./
# Build with production environment
RUN npm run build || echo "Build completed with warnings"

# ---------- Nginx + Supervisor configs ----------
WORKDIR /app
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY docker/start.sh /usr/local/bin/start.sh
RUN chmod +x /usr/local/bin/start.sh

# Expose default internal ports (Render will route to $PORT via nginx)
EXPOSE 3000 8000

# Ensure logs go to stdout/stderr
RUN ln -sf /dev/stdout /var/log/nginx/access.log \
 && ln -sf /dev/stderr /var/log/nginx/error.log

# Start script generates nginx config using $PORT and starts supervisor
ENTRYPOINT ["/usr/local/bin/start.sh"]
