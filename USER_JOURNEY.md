# Classera Task Tracker - User Journey

## Complete User Flow

### 1. **First Time Access / Login**

#### Option A: Username/Password Login
1. User visits http://localhost:3001
2. Sees login screen with:
   - Email/Password login form
   - "Sign in with Microsoft" button (if configured)
   - "Register" link
3. User enters email and password
4. Clicks "Sign In"
5. System authenticates and creates session
6. User is redirected to dashboard

#### Option B: Microsoft OAuth Login
1. User clicks "Sign in with Microsoft"
2. Redirected to Microsoft login page
3. User authenticates with Microsoft account
4. Redirected back to application
5. System creates/updates user account
6. User is logged in and sees dashboard

#### Option C: Registration
1. User clicks "Register" on login screen
2. Fills in:
   - Name (required)
   - Email (required)
   - Password (required, min 6 chars)
   - Username (optional)
   - Department (optional)
3. Clicks "Create Account"
4. Account is created and user is automatically logged in
5. User sees dashboard

### 2. **Quarter Selection**

After login, user sees:
- If no quarter selected: Quarter selector screen with clickable cards
- Each card shows: Q1, Q2, Q3, Q4 with year and date range
- Current quarter is highlighted in dark blue
- User clicks on a quarter card to select it
- Selected quarter is shown in navigation bar dropdown

### 3. **Dashboard View**

Once quarter is selected:
- **Team Overview**: Grid of user cards showing:
  - User avatar, name, department
  - Progress bar (completed/total)
  - Task counts (completed, in progress, not started, overdue)
- **Sidebar Stats**:
  - Total tasks
  - Completed/In Progress/Not Started breakdown
  - Overdue count
  - Tasks by priority
  - Upcoming deadlines
  - Tasks by category

### 4. **Excel Import**

#### Upload Process:
1. User selects a quarter (Q1-Q4)
2. Clicks "⬆ Upload Excel" button in navigation
3. Selects Excel file (.xlsx or .xls)
4. File must have a sheet named "Tasks"
5. System processes file:
   - Creates users from column B (Owner names)
   - Creates tasks in selected quarter
   - Maps all columns (Task, Owner, Category, Priority, Due Date, Status, Performance, Notes)
6. Success message shows: "✅ X tasks and Y owners loaded"
7. Dashboard refreshes with new data

#### Excel Format:
- **Column A**: Task Name (required)
- **Column B**: Owner (required, auto-creates user)
- **Column C**: Category (optional)
- **Column D**: Priority (Critical/High/Medium/Low)
- **Column E**: Due Date (YYYY-MM-DD)
- **Column F**: Status (Not Started/In Progress/Completed)
- **Column G**: Performance (On Track/At Risk/Off Track)
- **Column H**: Notes (optional)

### 5. **Task Management**

#### Viewing Tasks:
- **Dashboard**: Team overview with user cards
- **All Tasks**: Filterable table of all tasks
- **Overdue**: Tasks past due date
- **Performance**: Performance metrics dashboard
- **Owner Detail**: Click on user card to see their tasks

#### Creating Tasks:
1. Navigate to owner detail view
2. Click "+ Add Task"
3. Fill in:
   - Task name (required)
   - Category (optional)
   - Priority (Critical/High/Medium/Low)
   - Due date
   - Status (Not Started/In Progress/Completed)
   - Notes (optional)
4. Click "Save"
5. Task is created in current quarter

#### Editing Tasks:
1. Click edit icon (✏️) on any task
2. Modal opens with all task fields
3. Make changes
4. Click "Save Changes"
5. Task is updated in database

#### Updating Task Status:
- Quick update: Use dropdown in task table
- Changes are saved immediately to database

#### Task Performance:
- Set performance rating: 🟢 On Track, 🟡 At Risk, 🔴 Off Track
- Visible in performance dashboard
- Used for reporting

### 6. **User Management (Admin Only)**

#### Adding Users:
1. Admin clicks "+ Add User" on dashboard
2. Fills in:
   - Name (required)
   - Email (required)
   - Department (optional)
3. Clicks "Save & Send Invitation"
4. System:
   - Creates user account
   - Generates invitation token
   - Sends email invitation
5. User receives email with invitation link
6. User clicks link and logs in with Microsoft
7. Account is activated

#### Managing Users:
- View all users in system
- Edit user details
- Delete users (removes their tasks)
- Resend invitations

### 7. **Comments**

1. Click comment icon (💬) on a task
2. Comment section expands
3. Type comment and press Enter or click "Post"
4. Comment is saved with timestamp
5. All comments visible for that task

### 8. **Filtering & Search**

Available filters:
- **Status**: All, Not Started, In Progress, Completed
- **Priority**: All, Critical, High, Medium, Low
- **Category**: All categories or specific one
- **Owner**: All owners or specific one
- **Search**: Text search in task names
- **Quarter**: Select different quarter from dropdown

### 9. **Quarter Navigation**

- Quarter selector in navigation bar
- Click to switch between quarters
- Tasks are organized by quarter
- Each quarter has its own task list

### 10. **Logout**

1. Click "Logout" button in navigation
2. Session is destroyed
3. User is redirected to login screen
4. Must log in again to access

## Session Persistence

- **Login persists**: User stays logged in after page refresh
- **Session duration**: 24 hours
- **Auto-logout**: After 24 hours of inactivity
- **Cookie-based**: Session stored in secure HTTP-only cookie

## Data Flow

1. **Login** → Session created → User data stored in session
2. **Page Load** → Check session → Load user data → Load quarters → Load tasks
3. **Quarter Selection** → Load tasks for that quarter
4. **Task Operations** → API calls → Database updates → UI refresh
5. **Excel Upload** → Process file → Create users/tasks → Refresh dashboard

## Error Handling

- **Authentication errors**: Redirect to login
- **API errors**: Show error message to user
- **Upload errors**: Show specific error (e.g., "Sheet not found")
- **Network errors**: Retry or show connection error

## Key Features Summary

✅ **Dual Authentication**: Username/Password + Microsoft OAuth  
✅ **Quarter Organization**: Tasks organized by Q1-Q4  
✅ **Excel Import**: Bulk import tasks and users  
✅ **Real-time Updates**: Changes saved immediately  
✅ **User Management**: Admin can add users and send invitations  
✅ **Session Persistence**: Stay logged in after refresh  
✅ **Filtering**: Multiple ways to filter and search tasks  
✅ **Performance Tracking**: Track task performance (On Track/At Risk/Off Track)  
✅ **Comments**: Add comments to tasks  
✅ **Database Storage**: All data persisted in PostgreSQL  
