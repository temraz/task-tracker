#!/bin/bash
set -e

# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ec2-user

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Git
sudo yum install -y git

# Install Node.js (for running migrations if needed)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Create application directory
sudo mkdir -p /opt/task-manager
sudo chown ec2-user:ec2-user /opt/task-manager
cd /opt/task-manager

# Clone repository (replace with your repo URL)
# git clone https://github.com/your-username/task-manager.git .

# Or copy files from S3, or use a deployment script
# For now, we'll create a basic setup

# Create docker-compose.yml
cat > docker-compose.yml << DOCKEREOF
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: classera_db
    environment:
      POSTGRES_DB: classera_tasks
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: $${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  app:
    build: .
    container_name: classera_app
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: classera_tasks
      DB_USER: postgres
      DB_PASSWORD: $${DB_PASSWORD}
      SESSION_SECRET: $${SESSION_SECRET}
      FRONTEND_URL: $${FRONTEND_URL:-http://localhost:3000}
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./public:/app/public
    restart: unless-stopped
    command: sh -c "sleep 5 && npm run migrate && npm start"

volumes:
  postgres_data:
DOCKEREOF

# Create .env file
cat > .env << ENVEOF
DB_PASSWORD=${db_password}
SESSION_SECRET=${session_secret}
NODE_ENV=production
PORT=3000
DB_HOST=db
DB_PORT=5432
DB_NAME=classera_tasks
DB_USER=postgres
FRONTEND_URL=
ENVEOF

# Note: You'll need to:
# 1. Copy your project files to /opt/task-manager
# 2. Run: docker-compose up -d

# Log completion
echo "Docker and dependencies installed successfully!" > /var/log/user-data.log
echo "Application directory: /opt/task-manager" >> /var/log/user-data.log
