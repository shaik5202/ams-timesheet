# ASM Attendance System

A comprehensive timesheet management system built with Next.js, TypeScript, and MongoDB.

## Features

### Core Functionality
- **User Authentication**: Secure login/logout with role-based access control
- **Timesheet Management**: Create, edit, and submit weekly timesheets
- **Project Tracking**: Log hours against specific projects with descriptions
- **Approval Workflow**: PM and FM approval process for timesheets

### New Features (Latest Update)

#### 1. Preapproval Dashboard (`/preapproval`)
- **Comprehensive View**: See all timesheets with approval history
- **Advanced Filtering**: Filter by status, date, employee, and search terms
- **Export Functionality**: Export data to Excel (CSV) and PDF formats
- **Real-time Updates**: Live status tracking and decision history
- **Role-based Access**: Available to PM, FM, and ADMIN users

#### 2. Enhanced Admin Panel (`/admin`)
- **Dual Tabs**: User Management and Approval History
- **Approval History**: Complete view of all timesheet approvals/rejections
- **Advanced Filters**: Search, status, date, and employee filtering
- **Export Capabilities**: Excel and PDF export for all data
- **Summary Statistics**: Real-time counts and metrics

#### 3. Navigation System
- **Unified Navigation**: Consistent navigation across all pages
- **Role-based Menu**: Dynamic menu items based on user permissions
- **Active State Tracking**: Visual indication of current page
- **Responsive Design**: Mobile-friendly navigation

### Export Features
- **Excel Export**: CSV format with comprehensive timesheet data
- **PDF Export**: Professional reports with summary and detailed information
- **Filtered Exports**: Export only filtered/selected data
- **Automatic Naming**: Date-stamped file names for easy organization

## User Roles

- **EMPLOYEE**: Create and manage personal timesheets
- **PM (Project Manager)**: Approve timesheets for managed projects
- **FM (Functional Manager)**: Approve timesheets for direct reports
- **ADMIN**: Full system access, user management, and oversight

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom components
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT-based with bcrypt password hashing
- **PDF Generation**: jsPDF for report generation
- **UI Components**: Radix UI primitives with custom styling

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp env.example .env.local
   # Configure your MongoDB connection and JWT secret
   ```

3. **Database Setup**
   ```bash
   npm run seed
   ```

4. **Development Server**
   ```bash
   npm run dev
   ```

## API Endpoints

- `/api/login` - User authentication
- `/api/logout` - User logout
- `/api/users` - User management (admin only)
- `/api/timesheets` - Timesheet CRUD operations
- `/api/approvals` - Approval workflow management
- `/api/projects` - Project management

## File Structure

```
app/
├── admin/           # Admin dashboard with approval history
├── approvals/       # Timesheet approval workflow
├── preapproval/     # New: Comprehensive approval dashboard
├── timesheets/      # Timesheet management
├── api/            # Backend API routes
└── components/     # Reusable UI components
    └── Navigation.tsx  # New: Unified navigation component
```

## Key Components

### Navigation Component
- **Location**: `components/Navigation.tsx`
- **Features**: Role-based menu, active state, responsive design
- **Usage**: Import and use across all authenticated pages

### Preapproval Page
- **Location**: `app/preapproval/page.tsx`
- **Features**: Advanced filtering, export functionality, approval history
- **Access**: PM, FM, and ADMIN users

### Enhanced Admin Panel
- **Location**: `app/admin/page.tsx`
- **Features**: User management, approval history, export capabilities
- **Access**: ADMIN users only

## Recent Updates

### v1.1.0 - Preapproval & Enhanced Admin Features
- ✅ Added comprehensive preapproval dashboard
- ✅ Enhanced admin panel with approval history
- ✅ Implemented Excel and PDF export functionality
- ✅ Added advanced filtering and search capabilities
- ✅ Created unified navigation system
- ✅ Improved user experience with consistent UI

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
