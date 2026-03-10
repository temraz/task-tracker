# Quick Production Deployment Checklist

## 🚀 Quick Start (5 Steps)

### 1. **Set Up Environment Variables**

Create a `.env` file with these **required** variables:

```env
# Database (REQUIRED)
DB_PASSWORD=your_strong_password_here

# Application (REQUIRED)
FRONTEND_URL=https://yourdomain.com
SESSION_SECRET=$(openssl rand -base64 32)

# Optional but Recommended
MICROSOFT_CLIENT_ID=your-azure-client-id
MICROSOFT_CLIENT_SECRET=your-azure-client-secret
MICROSOFT_TENANT_ID=your-azure-tenant-id
MICROSOFT_REDIRECT_URI=https://yourdomain.com/auth/microsoft/callback

EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### 2. **Choose Your Deployment Method**

**Option A: Docker Compose (VPS/Server)**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

**Option B: Cloud Platform**
- Railway: Connect repo → Add PostgreSQL → Set env vars → Deploy
- Render: Create Web Service → Add PostgreSQL → Set env vars → Deploy
- Heroku: `heroku create` → `heroku addons:create heroku-postgresql` → Deploy

### 3. **Set Up SSL (HTTPS)**

**Using Let's Encrypt (Free):**
```bash
sudo apt install certbot
sudo certbot certonly --standalone -d yourdomain.com
# Copy certificates to ./ssl/ directory
```

**Or use Cloud Provider SSL:**
- AWS: Application Load Balancer with ACM
- Cloudflare: Free SSL proxy
- Render/Railway: Automatic SSL

### 4. **Run Database Migrations**

```bash
# If using Docker
docker-compose -f docker-compose.prod.yml exec app npm run migrate

# If using cloud platform
# Usually runs automatically on first deploy
```

### 5. **Verify Deployment**

✅ Visit `https://yourdomain.com`
✅ Test login (default: admin / admin123 - **CHANGE THIS!**)
✅ Test Excel upload
✅ Test Excel export
✅ Check mobile responsiveness

## 🔐 Security Must-Do's

1. **Change default admin password** immediately after first login
2. **Use strong SESSION_SECRET** (32+ characters)
3. **Enable HTTPS** (required for production)
4. **Set up database backups** (daily recommended)
5. **Restrict database access** (only from app server)

## 📊 Minimum Server Requirements

- **CPU:** 1 core
- **RAM:** 2GB (4GB recommended)
- **Storage:** 20GB (for database)
- **OS:** Ubuntu 20.04+ or similar Linux

## 💰 Estimated Costs

- **VPS (DigitalOcean):** $12-24/month
- **Managed Database:** $15-30/month
- **Domain:** $10-15/year
- **SSL:** Free (Let's Encrypt)
- **Total:** ~$25-50/month

## 🆘 Common Issues

**Can't connect to database:**
- Check DB credentials in `.env`
- Verify database is running
- Check firewall rules

**Session not working:**
- Verify `FRONTEND_URL` matches your domain exactly
- Ensure HTTPS is working
- Check cookie settings

**Microsoft login not working:**
- Verify redirect URI matches exactly
- Check Azure app registration settings
- Ensure HTTPS is used

---

For detailed instructions, see `DEPLOYMENT.md`
