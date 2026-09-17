# CLAUDE.md

> 适用范围：项目文档知识沉淀与协作参考
> 主入口链接：`docs/README.md`
> 文档状态：`archived`
> 最后验证日期：`2026-03-27`

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development Commands
```bash
npm run dev         # Start development server at http://localhost:3000
npm run build       # Build production package
npm run build:offline    # Build offline deployment package
npm run start       # Start production server
npm run lint        # Run ESLint code style checks

# Performance and Monitoring
npm run monitor     # Run performance monitoring
npm run monitor:continuous  # Continuous performance monitoring
npm run diagnose    # Run performance diagnostics
npm run optimize    # Run deployment optimization

# PM2 Production Commands
npm run start:prod  # Start production with PM2
npm run pm2:restart # Restart PM2 services
npm run pm2:reload  # Reload PM2 services
npm run pm2:logs    # View PM2 logs
npm run pm2:monit   # PM2 monitoring dashboard
```

### Notification Service Commands
```bash
# 快速部署通知系统（推荐）
./scripts/deploy-notifications.sh

# 手动启动作业同步服务
nohup node scripts/start-job-sync.js > /tmp/job-sync.log 2>&1 &

# 查看通知服务状态
ps aux | grep job-sync
tail -f /tmp/job-sync.log

# 停止通知服务
pkill -f job-sync
```

### Testing
No specific test commands configured. Use `npm run lint` to validate code style and TypeScript compilation.

## Project Documentation Structure

After reorganization, documentation is now organized by functional modules:

```
docs/
├── guides/              # User guides and API documentation
│   ├── api/            # API usage guides
│   ├── installation/   # Installation and deployment guides
│   └── usage/          # Usage instructions
├── features/           # Feature module documentation
│   ├── applications/   # Application management features
│   ├── dashboard/      # Dashboard related docs
│   ├── files/          # File management
│   ├── jobs/           # Job management
│   ├── notifications/  # Notification system
│   ├── vnc/            # VNC remote desktop
│   └── webshell/       # Web terminal
├── system/             # System architecture documentation
│   ├── authentication/ # Authentication & authorization
│   ├── database/       # Database integration
│   ├── licensing/      # License system
│   ├── microservices/  # Microservices architecture
│   └── permissions/    # Permission management
├── performance/        # Performance optimization
│   ├── optimization/   # Performance improvements
│   └── fixes/          # Performance fixes
├── deployment/         # Deployment related
├── operations/         # Operations management
├── troubleshooting/    # Troubleshooting guides
└── archive/            # Historical documentation
```

**Total of 181 documents** organized systematically by functional modules.

## Project Architecture

This is a **High Performance Computing (HPC) Management Platform** built with Next.js 14 App Router. The application provides a modern web interface for managing HPC jobs, users, and resources through integration with Slurm workload manager.

### Core Architecture Components

**Frontend Stack:**
- Next.js 14 with App Router and React Server Components
- Shadcn UI + Radix UI for accessible components
- Tailwind CSS mobile-first design
- Full TypeScript implementation

**Backend Integration:**
- LDAP authentication via `lib/auth-ldap.ts`
- Slurm scheduler integration via `lib/scheduler/slurm-adapter.ts`
- Supabase for user role management and notifications storage
- JWT-based session management
- Real-time notification system with job status monitoring

**Core Business Logic:**
- `lib/slurm.ts` - Slurm command execution and partition management
- `lib/job-sync.ts` - Job synchronization between Slurm and application
- `lib/notification-service.ts` - Comprehensive notification management system
- `app/api/jobs/route.ts` - Job submission, querying, and statistics
- `app/api/auth/route.ts` - Authentication endpoints
- `app/api/notifications/route.ts` - Notification CRUD operations and statistics

### Directory Structure

```
app/
├── dashboard/           # Main application pages
│   ├── applications/   # Application management (HPC, VNC applications)
│   ├── assets/         # Asset monitoring (nodes, partitions)
│   ├── big-screen/     # Big screen dashboard display
│   ├── compute/        # Compute resource monitoring
│   ├── files/          # File management interface
│   ├── jobs/           # Job management (active, history, reports)
│   ├── notifications/  # Notification management interface
│   ├── profile/        # User profile management
│   ├── submit/         # Job submission interface
│   ├── system/         # System administration
│   │   ├── announcements/ # System announcements
│   │   ├── applications/  # Application management
│   │   ├── backup/        # System backup
│   │   ├── bioinformatics/ # Bioinformatics tools
│   │   ├── groups/        # Group management
│   │   ├── license/       # License management
│   │   ├── logs/          # System logs
│   │   ├── permissions/   # Permission management
│   │   ├── settings/      # System settings
│   │   └── users/         # User management
│   └── webshell/       # Web terminal interface
├── api/                # REST API endpoints (92+ routes)
│   ├── applications/   # Application management API
│   ├── auth/           # Authentication API
│   ├── dashboard/      # Dashboard data API
│   ├── files/          # File operation API
│   ├── groups/         # Group management API
│   ├── jobs/           # Job management API
│   ├── license/        # License system API
│   ├── notifications/  # Notification management API
│   ├── permissions/    # Permission system API
│   ├── storage/        # Storage management API
│   ├── system/         # System information API
│   ├── users/          # User management API
│   ├── vnc/            # VNC session API
│   └── webshell/       # Web terminal API
components/
├── ui/                 # Shadcn UI components
├── dashboard/          # Business-specific components
├── application-management/ # Application management components
└── applications/       # Application-specific components
lib/
├── auth-ldap.ts        # LDAP authentication
├── license/            # License management system
├── notification-service.ts  # Notification service
├── resource-scheduler.ts    # Resource scheduling
├── scheduler/          # Slurm integration
├── slurm.ts           # Slurm command utilities
└── utils.ts           # Shared utilities
```

## Authentication & Authorization

The application uses a dual-layer authentication system:
1. **LDAP Authentication** - Primary user authentication against LDAP directory
2. **Supabase Role Management** - Role-based access control (admin/user roles)

Users authenticate via LDAP, then role information is retrieved from Supabase `users` table. JWT tokens are issued for session management.

## HPC Integration

### Slurm Integration
- Direct execution of `sinfo`, `squeue`, `sbatch`, `scancel` commands via `execFile`
- Job submission through `lib/scheduler/slurm-adapter.ts`
- Real-time job status monitoring and statistics
- Partition and node information retrieval

### Job Management
- Job submission with script validation
- User-based job filtering (admins see all, users see own jobs)
- Job statistics and trend analysis
- Log retrieval and file management

## Development Conventions

- **Component Style**: Use Shadcn UI components, follow existing patterns
- **Code Style**: Functional components, TypeScript interfaces over enums
- **State Management**: Use nuqs for URL state management, prefer React Server Components
- **Mobile-First**: Tailwind breakpoints, responsive design
- **Chinese Comments**: Detailed Chinese documentation in code

## Environment Variables

Required environment variables:
- `LDAP_URL`, `LDAP_BASE_DN`, `LDAP_BIND_DN`, `LDAP_BIND_PASSWORD`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`

## License Management System

### License System Components
The platform includes a comprehensive license management system:

- **License Validator**: `lib/license/license-validator.ts` - Core license validation logic
- **Unified Validator**: `lib/license/unified-license-validator.ts` - Centralized validation service
- **Security Manager**: `lib/license/license-security-manager.ts` - License security features
- **Hardware Fingerprinting**: Hardware binding and validation
- **Recovery Manager**: License recovery and restoration capabilities

### License API Endpoints
```bash
GET  /api/license/status              # Get license status and validation
GET  /api/license/features/[feature]  # Check specific feature availability
POST /api/license/installation        # Install new license
GET  /api/license/hardware            # Get hardware fingerprint
GET  /api/license/audit               # License usage audit
GET  /api/license/stats               # License statistics
```

### License Management UI
- **License Dashboard**: `app/dashboard/system/license/page.tsx`
- **Enhanced License Monitoring**: Real-time status, user/node limits, feature restrictions
- **Trial License Support**: Automatic detection and upgrade prompts
- **Hardware Binding**: Secure license-to-hardware association

### License Types Supported
- **Trial License**: Time-limited evaluation with feature restrictions
- **Commercial License**: Full feature access with user/node limits
- **Node Limit Enforcement**: Real-time monitoring and blocking
- **Feature-based Licensing**: Granular feature control

License system environment variables:
- `LICENSE_FILE_PATH` - Path to license file (default: config/license.json)
- `LICENSE_PUBLIC_KEY_PATH` - Path to public key (default: config/license-public.pem)
- `STRICT_LICENSE_VALIDATION` - Enable strict validation (default: true in production)
- ~~`SKIP_HARDWARE_BINDING`~~ — removed; do not document or rely on bypass flags
- `NODE_ENV` - Environment mode affecting license validation

## Application Management System

### Application Types
- **HPC Applications**: Traditional HPC workloads and simulations
- **VNC Applications**: Remote desktop applications
- **Bioinformatics Tools**: Specialized scientific computing tools

### Application Management Features
- **Application Discovery**: Automatic detection of installed applications
- **Resource Configuration**: Per-application resource limits and requirements
- **Template Management**: Pre-configured job templates
- **Application Catalog**: Centralized application repository

### Application API Endpoints
```bash
GET  /api/applications/discovery      # Auto-discover applications
GET  /api/applications/available      # List available applications
GET  /api/applications/bioinformatics # Bioinformatics-specific tools
POST /api/applications/resource-config # Configure application resources
POST /api/applications/[id]/submit    # Submit application job
GET  /api/applications/clear-cache    # Clear application cache
```

## Common Tasks

### Common Tasks and Development Patterns

### Adding New Job Management Features
1. Extend `lib/scheduler/slurm-adapter.ts` for new Slurm operations
2. Add API endpoints in `app/api/jobs/`
3. Create UI components in `app/dashboard/jobs/`
4. Follow existing authentication patterns

### Adding New System Management Features
1. Add API routes in `app/api/system/` with proper role-based access control
2. Create admin UI in `app/dashboard/system/`
3. Update user role checks in JWT validation
4. Implement rate limiting and caching for performance

### Adding New Application Types
1. Extend application discovery in `app/api/applications/discovery/`
2. Add application-specific resource profiles in `lib/resource-scheduler.ts`
3. Create application UI in `app/dashboard/applications/`
4. Update application catalog and templates

### File Management Extensions
1. Extend `app/api/files/route.ts` for new file operations
2. Update `app/dashboard/files/` components
3. Consider HPC storage mount points and permissions

### Adding Notification Features
1. Extend `lib/notification-service.ts` for new notification types
2. Add notification templates in the service configuration
3. Update the background job sync service in `scripts/start-job-sync.js`
4. Modify UI components in `app/dashboard/notifications/`

## System Management Features

### Advanced System Components
- **Resource Scheduler**: `lib/resource-scheduler.ts` - Intelligent resource allocation and recommendations
- **Node Monitoring**: `app/api/system/nodes/route.ts` - Real-time cluster node status with caching and rate limiting
- **System Settings**: `app/api/system/settings/route.ts` - Dynamic system configuration management
- **Resource Configuration**: `app/api/system/resource-config/route.ts` - Per-application resource configuration
- **System Information**: `app/api/system/info/route.ts` - Comprehensive system status and metrics

### System Management UI
- **System Dashboard**: `app/dashboard/system/page.tsx` - Centralized system administration
- **Node Monitoring**: Real-time cluster node status and resource utilization
- **User Management**: `app/dashboard/system/users/page.tsx` - Advanced user management with LDAP integration
- **Group Management**: `app/dashboard/system/groups/page.tsx` - Group administration and permissions
- **Backup Management**: `app/dashboard/system/backup/page.tsx` - System backup and recovery
- **System Logs**: `app/dashboard/system/logs/page.tsx` - Centralized log viewing and analysis

### Resource Management Features
- **Intelligent Resource Recommendation**: Automatic resource allocation based on application profiles
- **Cluster State Monitoring**: Real-time cluster resource availability
- **Resource Profiles**: Pre-defined resource configurations for different application types
- **Performance Optimization**: Automatic resource optimization based on historical usage patterns

### System API Endpoints
```bash
GET  /api/system/nodes              # Get cluster node status with caching
GET  /api/system/info               # System information and metrics
GET  /api/system/settings           # System configuration management
POST /api/system/resource-config   # Configure application resources
GET  /api/system/logs               # System log access
POST /api/system/notifications/cleanup  # Notification system maintenance
```

### File Management Extensions
1. Extend `app/api/files/route.ts` for new file operations
2. Update `app/dashboard/files/` components
3. Consider HPC storage mount points and permissions

### Adding Notification Features
1. Extend `lib/notification-service.ts` for new notification types
2. Add notification templates in the service configuration
3. Update the background job sync service in `scripts/start-job-sync.js`
4. Modify UI components in `app/dashboard/notifications/`

## Security Considerations

### Authentication Security
- Multi-layer authentication (LDAP + database roles)
- Login attempt limiting with account lockout
- Secure session management with httpOnly cookies
- IP-based tracking for enhanced security audit

### System Security
- Command injection protection with parameter validation
- File system protection with path validation and permission control
- Input validation using Zod schemas
- Comprehensive error handling with detailed logging

## Important Implementation Details

### Slurm Command Execution
- All Slurm commands are executed through secure wrappers in `lib/scheduler/slurm-adapter.ts`
- Status mapping handles various Slurm job states with intelligent error handling
- Temporary script files are managed securely with automatic cleanup
- User home directories are created and managed with proper permissions

### Job Status Synchronization
- Real-time job status updates through polling and caching
- Database synchronization for job persistence
- Efficient querying with pagination and filtering
- Statistics calculation for dashboard displays

### Error Handling
- Comprehensive error logging throughout the application
- User-friendly error messages while maintaining security
- Graceful degradation when Slurm services are unavailable
- Automatic retry mechanisms for transient failures

## Notification System

### Architecture Overview
The HPC platform includes a comprehensive real-time notification system that monitors job status changes and system events, providing users with timely updates about their computational work.

**Key Components:**
- **Background Service**: `scripts/start-job-sync.js` - Continuously monitors Slurm jobs (60-second intervals)
- **Notification Service**: `lib/notification-service.ts` - Handles 22 different notification types
- **API Layer**: `app/api/notifications/route.ts` - RESTful CRUD operations with JWT authentication
- **Frontend**: `app/dashboard/notifications/page.tsx` - Rich UI with filtering, pagination, and bulk operations
- **Database**: Supabase `active_notifications` table for persistent storage

### Notification Types Supported
- **Job Events**: Status changes, completion, failures, queue updates
- **System Events**: Maintenance, resource alerts, security warnings
- **User Events**: Account changes, permission updates, policy notifications

### Deployment Requirements

**⚠️ Critical: The notification system requires a separate background service to function.**

#### Option 1: Quick Deploy (Recommended)
```bash
cd /opt/my-hpcapp
./scripts/deploy-notifications.sh
```

#### Option 2: Manual Deploy
```bash
# Start the job synchronization service
nohup node scripts/start-job-sync.js > /tmp/job-sync.log 2>&1 &

# Monitor service status
tail -f /tmp/job-sync.log
ps aux | grep job-sync
```

#### Option 3: System Service
```bash
# Create systemd service (see docs/notification-service-deployment.md)
sudo systemctl enable hpc-job-sync
sudo systemctl start hpc-job-sync
```

### Service Monitoring
```bash
# Check service health
curl http://localhost:3000/api/health

# View notification statistics
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/notifications?stats=true

# Monitor background service logs
tail -f /tmp/job-sync.log
```

### Database Schema
```sql
-- Primary notification storage
active_notifications (
    id UUID PRIMARY KEY,
    type VARCHAR(100),      -- notification category
    title TEXT,             -- display title
    message TEXT,           -- notification content
    priority VARCHAR(20),   -- low|medium|high|urgent
    status VARCHAR(20),     -- unread|read|archived
    user_id VARCHAR(100),   -- target user
    is_global BOOLEAN,      -- system-wide notifications
    created_at TIMESTAMP,
    expires_at TIMESTAMP
)
```

### Service Features
- **Real-time Monitoring**: Detects job status changes within 60 seconds
- **Intelligent Deduplication**: Prevents notification spam through smart caching
- **User-specific Filtering**: Personal notifications plus global system announcements
- **Automatic Cleanup**: Configurable retention policies for old notifications
- **Fault Tolerance**: Graceful handling of Slurm service interruptions

### Performance Characteristics
- **Current Load**: Successfully monitoring 21+ concurrent jobs
- **Update Detection**: New jobs detected and synced automatically
- **Resource Usage**: Lightweight background process (~10MB memory)
- **Database Efficiency**: Optimized queries with proper indexing

For complete deployment documentation, see: `docs/notification-service-deployment.md`
