# Docker Setup Guide

This guide will help you run the Classera Task Tracker using Docker.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose (included with Docker Desktop)

## Quick Start

### 1. Create Environment File

Create a `.env` file in the project root with your configuration:

```bash
# Copy the example
cp .env.example .env
```

Edit `.env` and add your Microsoft Azure AD and email credentials:

```env
SESSION_SECRET=your-random-secret-key-here
MICROSOFT_CLIENT_ID=your_azure_client_id
MICROSOFT_CLIENT_SECRET=your_azure_client_secret
MICROSOFT_TENANT_ID=your_azure_tenant_id
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@classera.com
FRONTEND_URL=http://localhost:3000
```

### 2. Build and Run with Docker Compose

**For Production:**
```bash
docker-compose up -d
```

**For Development (with hot reload):**
```bash
docker-compose -f docker-compose.dev.yml up
```

### 3. Access the Application

- Application: http://localhost:3000
- Database: localhost:5432 (postgres/postgres)

### 4. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f db
```

### 5. Stop the Application

```bash
docker-compose down
```

**To remove volumes (deletes database data):**
```bash
docker-compose down -v
```

## Docker Commands

### Rebuild after code changes:
```bash
docker-compose build
docker-compose up -d
```

### Run migrations manually:
```bash
docker-compose exec app npm run migrate
```

### Access database directly:
```bash
docker-compose exec db psql -U postgres -d classera_tasks
```

### Restart a specific service:
```bash
docker-compose restart app
docker-compose restart db
```

## Troubleshooting

### Database connection issues:
```bash
# Check if database is running
docker-compose ps

# Check database logs
docker-compose logs db

# Restart database
docker-compose restart db
```

### Application won't start:
```bash
# Check application logs
docker-compose logs app

# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Port already in use:
If port 3000 or 5432 is already in use, edit `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Change host port
```

### Reset everything:
```bash
# Stop and remove everything including volumes
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Start fresh
docker-compose up -d
```

## Development vs Production

- **Development** (`docker-compose.dev.yml`): 
  - Hot reload enabled
  - Source code mounted as volume
  - More verbose logging

- **Production** (`docker-compose.yml`):
  - Optimized build
  - No source code volume
  - Production environment variables

## Environment Variables

All environment variables from `.env` are automatically loaded by Docker Compose. Make sure your `.env` file is in the project root.

## Data Persistence

Database data is stored in a Docker volume (`postgres_data`). This means:
- Data persists between container restarts
- Data is lost when you run `docker-compose down -v`
- To backup: `docker-compose exec db pg_dump -U postgres classera_tasks > backup.sql`
- To restore: `docker-compose exec -T db psql -U postgres classera_tasks < backup.sql`
