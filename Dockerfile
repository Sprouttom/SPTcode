FROM python:3.11-slim

WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port
EXPOSE 5000

# Set environment variables
ENV PORT=5000
ENV PYTHONUNBUFFERED=1

# Command to run the application using Gunicorn (supports dynamic PORT from Render)
CMD sh -c "gunicorn --bind 0.0.0.0:${PORT:-5000} app:app"

