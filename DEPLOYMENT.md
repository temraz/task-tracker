# Production Deployment Guide

This guide covers everything you need to deploy the Classera Task Tracker to production.

## 📋 Prerequisites

1. **Server/Cloud Platform** (choose one):
   - AWS (EC2, ECS, or Elastic Beanstalk)
   - Google Cloud Platform (Compute Engine, Cloud Run)
   - Azure (App Service, Container Instances)
   - DigitalOcean (Droplets, App Platform)
   - Heroku
   - Railway
   - Render
   - VPS with Docker support

2. **Domain Name** (optional but recommended)
   - Example: `tasktracker.classera.com`

3. **SSL Certificate** (required for HTTPS)
   - Let's Encrypt (free)
   - Cloud provider SSL
   - Custom certificate

## 🔐 Required Environment Variables

Create a `.env` file in your project root with the following variables:

### Database Configuration
```env
DB_HOST=db                    # For Docker: 'db', For external DB: your DB host
DB_PORT=5432                  # PostgreSQL port
DB_NAME=classera_tasks         # Database name
DB_USER=your_db_user           # Strong database username
DB_PASSWORD=your_strong_password  # Strong database password (use secrets manager)
```

### Application Configuration
```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://yourdomain.com  # Your production domain
SESSION_SECRET=your-very-long-random-secret-key-min-32-characters  # Generate with: openssl rand -base64 32
```

### Microsoft Azure AD (Optional - for Microsoft login)
```env
MICROSOFT_CLIENT_ID=your-azure-app-client-id
MICROSOFT_CLIENT_SECRET=your-azure-app-client-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id
MICROSOFT_REDIRECT_URI=https://yourdomain.com/auth/microsoft/callback
```

**To get Microsoft credentials:**
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Create a new registration
4. Add redirect URI: `https://yourdomain.com/auth/microsoft/callback`
5. Copy Client ID, Tenant ID
6. Create a client secret in "Certificates & secrets"

### Email Configuration (Optional - for user invitations)
```env
EMAIL_HOST=smtp.gmail.com      # Or your SMTP server
EMAIL_PORT=587                 # Or 465 for SSL
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password  # Use app-specific password for Gmail
EMAIL_FROM=noreply@classera.com
```

**For Gmail:**
- Enable 2-factor authentication
- Generate an "App Password" in Google Account settings
- Use that as `EMAIL_PASSWORD`

**For other providers:**
- SendGrid: Use SMTP settings from SendGrid dashboard
- AWS SES: Use SES SMTP credentials
- Mailgun: Use Mailgun SMTP settings

## 🐳 Production Docker Setup

### Option 1: Docker Compose (Recommended for VPS)

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15-alpine
    container_name: classera_db_prod
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/schema.sql:/docker-entrypoint-initdb.d/schema.sql
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  app:
    build: .
    container_name: classera_app_prod
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: db
      DB_PORT: 5432
      DB_NAME: ${DB_NAME}
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
      SESSION_SECRET: ${SESSION_SECRET}
      FRONTEND_URL: ${FRONTEND_URL}
      MICROSOFT_CLIENT_ID: ${MICROSOFT_CLIENT_ID}
      MICROSOFT_CLIENT_SECRET: ${MICROSOFT_CLIENT_SECRET}
      MICROSOFT_TENANT_ID: ${MICROSOFT_TENANT_ID}
      MICROSOFT_REDIRECT_URI: ${MICROSOFT_REDIRECT_URI}
      EMAIL_HOST: ${EMAIL_HOST}
      EMAIL_PORT: ${EMAIL_PORT:-587}
      EMAIL_USER: ${EMAIL_USER}
      EMAIL_PASSWORD: ${EMAIL_PASSWORD}
      EMAIL_FROM: ${EMAIL_FROM}
    env_file:
      - .env
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    container_name: classera_nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro  # SSL certificates
    depends_on:
      - app
    restart: unless-stopped
    networks:
      - app-network

volumes:
  postgres_data:

networks:
  app-network:
    driver: bridge
```

### Option 2: External Database (Recommended for Cloud)

Use a managed PostgreSQL service:
- **AWS RDS**
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **DigitalOcean Managed Databases**
- **Heroku Postgres**

Update `.env`:
```env
DB_HOST=your-managed-db-host.rds.amazonaws.com
DB_PORT=5432
DB_NAME=classera_tasks
DB_USER=your_db_user
DB_PASSWORD=your_db_password
```

## 🔒 Security Checklist

### 1. Environment Variables
- ✅ Never commit `.env` to git
- ✅ Use secrets manager (AWS Secrets Manager, HashiCorp Vault)
- ✅ Rotate secrets regularly
- ✅ Use strong passwords (min 16 characters)

### 2. Database Security
- ✅ Use strong database passwords
- ✅ Enable SSL connections to database
- ✅ Restrict database access to app server only
- ✅ Regular backups
- ✅ Use managed database with automatic backups

### 3. Application Security
- ✅ Set `NODE_ENV=production`
- ✅ Use HTTPS only (force redirect HTTP to HTTPS)
- ✅ Set secure session cookies
- ✅ Enable CORS only for your domain
- ✅ Rate limiting (add express-rate-limit)
- ✅ Input validation
- ✅ SQL injection prevention (already using parameterized queries)

### 4. Server Security
- ✅ Firewall rules (only open 80, 443)
- ✅ SSH key authentication only
- ✅ Regular security updates
- ✅ Fail2ban for brute force protection

## 🌐 Nginx Configuration (Reverse Proxy)

Create `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    # HTTPS server
    server {
        listen 443 ssl http2;
        server_name yourdomain.com www.yourdomain.com;

        # SSL configuration
        ssl_certificate /etc/nginx/ssl/fullchain.pem;
        ssl_certificate_key /etc/nginx/ssl/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

        # Client body size (for file uploads)
        client_max_body_size 10M;

        # Proxy settings
        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # Static files caching
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            proxy_pass http://app;
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
}
```

## 📦 Deployment Steps

### Step 1: Prepare Your Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker and Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### Step 2: Clone and Configure

```bash
# Clone your repository
git clone <your-repo-url>
cd task-manager

# Create .env file
cp .env.example .env  # If you create one
nano .env  # Edit with production values

# Create SSL directory
mkdir -p ssl
```

### Step 3: SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Copy certificates to project
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem ./ssl/
sudo chmod 644 ./ssl/*.pem

# Set up auto-renewal (add to crontab)
sudo crontab -e
# Add: 0 3 * * * certbot renew --quiet && docker-compose -f docker-compose.prod.yml restart nginx
```

### Step 4: Deploy

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Run database migrations
docker-compose -f docker-compose.prod.yml exec app npm run migrate
```

### Step 5: Verify

1. Check if services are running:
   ```bash
   docker-compose -f docker-compose.prod.yml ps
   ```

2. Test your domain:
   - Visit `https://yourdomain.com`
   - Check SSL certificate
   - Test login functionality

## 🔄 Updates and Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build

# Run migrations if needed
docker-compose -f docker-compose.prod.yml exec app npm run migrate
```

### Database Backups

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose -f docker-compose.prod.yml exec -T db pg_dump -U $DB_USER $DB_NAME > $BACKUP_DIR/backup_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete
EOF

chmod +x backup.sh

# Add to crontab (daily at 2 AM)
0 2 * * * /path/to/backup.sh
```

### Monitoring

Consider adding:
- **PM2** for process management (if not using Docker)
- **Sentry** for error tracking
- **New Relic** or **Datadog** for performance monitoring
- **Uptime monitoring** (UptimeRobot, Pingdom)

## 🚀 Platform-Specific Guides

### Heroku

1. Install Heroku CLI
2. Create `Procfile`:
   ```
   web: node server.js
   ```
3. Deploy:
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-postgresql:hobby-dev
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=$(openssl rand -base64 32)
   # Set other env vars
   git push heroku main
   ```

### Railway

1. Connect GitHub repository
2. Add PostgreSQL service
3. Set environment variables in dashboard
4. Deploy automatically on push

### Render

1. Create new Web Service
2. Connect repository
3. Add PostgreSQL database
4. Set environment variables
5. Deploy

### AWS (EC2 + RDS)

1. Launch EC2 instance
2. Create RDS PostgreSQL instance
3. Configure security groups
4. Install Docker on EC2
5. Deploy using docker-compose
6. Set up Application Load Balancer + SSL

## 📝 Post-Deployment Checklist

- [ ] SSL certificate installed and working
- [ ] HTTPS redirect working
- [ ] Database migrations completed
- [ ] Admin user created (username: admin, password: admin123 - **CHANGE THIS!**)
- [ ] Microsoft OAuth configured (if using)
- [ ] Email service configured (if using)
- [ ] Environment variables set correctly
- [ ] CORS configured for production domain
- [ ] Session cookies working
- [ ] File uploads working
- [ ] Excel import/export working
- [ ] All pages loading correctly
- [ ] Mobile responsive working
- [ ] Database backups configured
- [ ] Monitoring set up
- [ ] Error logging configured

## 🔧 Troubleshooting

### Application won't start
- Check logs: `docker-compose logs app`
- Verify environment variables
- Check database connection

### Database connection errors
- Verify DB credentials in `.env`
- Check database is accessible from app container
- Test connection: `docker-compose exec app node -e "import('./database/db.js').then(m => m.default.query('SELECT 1'))"`

### SSL errors
- Verify certificate files exist
- Check nginx configuration
- Ensure port 443 is open in firewall

### Session not persisting
- Verify `FRONTEND_URL` matches your domain
- Check cookie settings (secure, sameSite)
- Ensure HTTPS is working

## 📞 Support

For issues, check:
1. Application logs
2. Database logs
3. Nginx logs
4. Browser console
5. Network tab in DevTools

---

**Important:** Always test in a staging environment before deploying to production!
