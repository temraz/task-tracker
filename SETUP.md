# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up PostgreSQL Database

```bash
# Create database
createdb classera_tasks

# Or using psql
psql -U postgres
CREATE DATABASE classera_tasks;
\q
```

## 3. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

## 4. Microsoft Azure AD Setup

1. Go to https://portal.azure.com
2. Azure Active Directory > App registrations > New registration
3. Name: `Classera Task Tracker`
4. Redirect URI: `http://localhost:3000/auth/microsoft/callback` (Web)
5. Register
6. Copy **Application (client) ID** → `MICROSOFT_CLIENT_ID`
7. Copy **Directory (tenant) ID** → `MICROSOFT_TENANT_ID`
8. Certificates & secrets > New client secret > Copy value → `MICROSOFT_CLIENT_SECRET`
9. API permissions > Add:
   - Microsoft Graph > User.Read
   - Microsoft Graph > email
   - Microsoft Graph > profile
10. Grant admin consent

## 5. Email Setup (Gmail)

1. Google Account > Security > 2-Step Verification (enable)
2. App passwords > Generate
3. Use generated password in `EMAIL_PASSWORD`

## 6. Run Migrations

```bash
npm run migrate
```

## 7. Start Server

```bash
npm run dev
```

Visit: http://localhost:3000

## Default Admin

- Email: `admin@classera.com`
- You'll need to update this in the database after first Microsoft login, or create a user with this email in Azure AD.

## Troubleshooting

- **Database connection failed**: Check PostgreSQL is running and credentials in `.env`
- **Microsoft auth fails**: Verify redirect URI matches exactly in Azure AD
- **Email not sending**: Check email credentials and use App Password for Gmail
