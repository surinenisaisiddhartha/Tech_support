# Use a smaller base image
FROM python:3.9-slim as builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TORCH_CUDA_VERSION=None

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY backend/requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.9-slim

# Install system dependencies for PyMuPDF and Tesseract
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# Copy only the virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set working directory
WORKDIR /app
COPY backend/ .

# Set environment variables
ENV PORT=8000 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    TORCH_CUDA_VERSION=None \
    PYTORCH_CUDA_ALLOC_CONF=max_split_size_mb:128

# Expose port
EXPOSE 8000

# Command to run the application with 1 worker to reduce memory usage
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--limit-concurrency", "10", "--timeout-keep-alive", "30"]