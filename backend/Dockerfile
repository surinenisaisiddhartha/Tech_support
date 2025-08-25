# Builder stage
FROM python:3.9-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements files
COPY backend/requirements.txt .
COPY backend/requirements-builder.txt .

# Install Python dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir --prefix=/install \
    -r requirements.txt \
    -r requirements-builder.txt \
    --use-deprecated=legacy-resolver

# Production stage
FROM python:3.9-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libgomp1 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy requirements for final install
COPY backend/requirements.txt .

# Install only the required packages in the final image
RUN pip install --no-cache-dir \
    -r requirements.txt \
    --use-deprecated=legacy-resolver

# Copy application code
COPY backend/ .

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    PYTHONPATH=/app \
    PYTHONIOENCODING=utf-8

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]