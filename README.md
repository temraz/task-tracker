# Classera Task Tracker

A full-stack task management application with Microsoft Azure AD authentication, quarterly organization, and user management.

## Features

- ✅ **Microsoft Azure AD Authentication** - Secure login with Microsoft accounts
- ✅ **Quarterly Task Organization** - Organize tasks by Q1, Q2, Q3, Q4
- ✅ **User Management** - Admin can add users and send email invitations
- ✅ **Database Storage** - PostgreSQL database for persistent data
- ✅ **Task Management** - Create, update, delete, and track tasks
- ✅ **Comments System** - Add comments to tasks
- ✅ **Performance Tracking** - Track task performance (On Track, At Risk, Off Track)
- ✅ **Filtering & Search** - Filter tasks by owner, status, priority, category, and quarter

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Microsoft Azure AD App Registration
- Email account for sending invitations (Gmail, Outlook, etc.)

## Setup Instructions

### 1. Database Setup

```bash
# Install PostgreSQL and create database
createdb classera_tasks

# Or using psql
psql -U postgres
CREATE DATABASE classera_tasks;
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=classera_tasks
DB_USER=postgres
DB_PASSWORD=your_password

# Microsoft Azure AD
MICROSOFT_CLIENT_ID=your_azure_client_id
MICROSOFT_CLIENT_SECRET=your_azure_client_secret
MICROSOFT_TENANT_ID=your_azure_tenant_id
MICROSOFT_REDIRECT_URI=http://localhost:3000/auth/microsoft/callback

# Session
SESSION_SECRET=your_random_secret_key_here

# Email (for invitations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
EMAIL_FROM=noreply@classera.com

# Frontend
FRONTEND_URL=http://localhost:3000
```

### 4. Microsoft Azure AD Setup

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Set:
   - Name: `Classera Task Tracker`
   - Supported account types: `Accounts in this organizational directory only` (or as needed)
   - Redirect URI: `http://localhost:3000/auth/microsoft/callback` (Web)
5. After creation, note:
   - **Application (client) ID** → `MICROSOFT_CLIENT_ID`
   - **Directory (tenant) ID** → `MICROSOFT_TENANT_ID`
6. Go to **Certificates & secrets** > **New client secret**
7. Copy the secret value → `MICROSOFT_CLIENT_SECRET`
8. Go to **API permissions** > Add:
   - `Microsoft Graph` > `User.Read`
   - `Microsoft Graph` > `email`
   - `Microsoft Graph` > `profile`
9. Click **Grant admin consent**

### 5. Email Setup (Gmail Example)

For Gmail, you need an App Password:

1. Go to [Google Account](https://myaccount.google.com)
2. Security > 2-Step Verification (enable if not already)
3. App passwords > Generate new app password
4. Use this password in `EMAIL_PASSWORD`

### 6. Run Database Migrations

```bash
npm run migrate
```

This will:
- Create all database tables
- Create default admin user (admin@classera.com)
- Create quarters for the current year

### 7. Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `GET /api/auth/microsoft` - Start Microsoft login
- `GET /api/auth/microsoft/callback` - Microsoft callback
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create user and send invitation (admin only)
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user (admin only)
- `POST /api/users/:id/resend-invitation` - Resend invitation (admin only)

### Quarters
- `GET /api/quarters` - Get all quarters
- `GET /api/quarters/current` - Get current quarter
- `GET /api/quarters/:id` - Get quarter by ID
- `POST /api/quarters` - Create quarter
- `PUT /api/quarters/:id` - Update quarter

### Tasks
- `GET /api/tasks` - Get all tasks (with filters)
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/stats/overview` - Get task statistics

### Comments
- `GET /api/comments/task/:taskId` - Get comments for a task
- `POST /api/comments` - Create comment
- `DELETE /api/comments/:id` - Delete comment

## Database Schema

### Users
- `id`, `microsoft_id`, `email`, `name`, `department`, `avatar`, `role`, `invitation_token`, `is_active`

### Quarters
- `id`, `year`, `quarter` (1-4), `start_date`, `end_date`, `is_active`

### Tasks
- `id`, `quarter_id`, `owner_id`, `name`, `category`, `priority`, `due_date`, `status`, `performance`, `notes`

### Comments
- `id`, `task_id`, `user_id`, `text`, `created_at`

## Usage

1. **First Time Setup:**
   - Default admin user is created: `admin@classera.com`
   - Login with Microsoft account that matches this email (or update in database)

2. **Adding Users:**
   - Admin can add users via API or frontend
   - Invitation email is sent automatically
   - User clicks link and logs in with Microsoft

3. **Creating Tasks:**
   - Select a quarter (Q1, Q2, Q3, Q4)
   - Assign to a user
   - Set priority, due date, status, etc.

4. **Managing Tasks:**
   - Filter by quarter, owner, status, priority, category
   - Track performance (On Track, At Risk, Off Track)
   - Add comments to tasks

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env`
- Verify database exists: `psql -l | grep classera_tasks`

### Microsoft Authentication Issues
- Verify Azure AD app registration settings
- Check redirect URI matches exactly
- Ensure admin consent is granted for API permissions

### Email Not Sending
- Check email credentials in `.env`
- For Gmail, use App Password (not regular password)
- Check firewall/network settings

## Development

```bash
# Run migrations
npm run migrate

# Start dev server
npm run dev

# Check logs
# Server logs will show database connection status
```

## License

ISC
