# Phase 4: Frontend Interface Development (React/TypeScript)

**Status:** Starting  
**Technology:** React 18 + TypeScript + Vite + Tailwind CSS  
**Port:** 3000

---

## Tổng quan Phase 4

Phase 4 tập trung vào xây dựng giao diện web hiện đại cho hệ thống IBN, sử dụng React 18, TypeScript, và Tailwind CSS. Frontend cung cấp đầy đủ tính năng quản trị hệ thống blockchain với UX/UI thân thiện.

## Mục tiêu chính

### Success Criteria
- [ ] Setup React 18 + TypeScript + Vite project
- [ ] Implement JWT-based authentication flow
- [ ] Build responsive UI with Tailwind CSS
- [ ] Create protected routing system
- [ ] Develop Dashboard overview page
- [ ] Build User Management interface (CRUD)
- [ ] Build Organization Management interface
- [ ] Build Channel Management interface (CRUD)
- [ ] Build Blockchain Explorer page
- [ ] Build Chaincode Operations page (Query/Invoke)
- [ ] Integrate with Backend API (port 8002)
- [ ] State management with Zustand/Redux
- [ ] API client with Axios interceptors
- [ ] Error handling and toast notifications
- [ ] Responsive design (mobile + desktop)
- [ ] Docker configuration
- [ ] Comprehensive testing

---

## Architecture Overview

### Technology Stack

```typescript
// Frontend Stack
{
  "framework": "React 18.2.0",
  "language": "TypeScript 5.x",
  "build-tool": "Vite 5.x",
  "styling": "Tailwind CSS 3.x",
  "state-management": "Zustand/Redux Toolkit",
  "http-client": "Axios",
  "query-library": "TanStack Query (React Query)",
  "routing": "React Router v6",
  "form-handling": "React Hook Form",
  "validation": "Zod",
  "notifications": "React Hot Toast",
  "testing": "Vitest + React Testing Library",
  "dev-server": "http://localhost:3000"
}
```

### Project Structure

```
frontend/
├── public/                    # Static assets
│   └── index.html             # Main HTML file
│
├── src/
│   ├── index.tsx              # React entry point
│   ├── App.tsx                # Root component
│   │
│   ├── config/
│   │   ├── api.ts             # API base URLs
│   │   ├── constants.ts       # Application constants
│   │   └── env.ts             # Environment variables
│   │
│   ├── core/
│   │   ├── types.ts           # Global TypeScript types
│   │   ├── errors.ts          # Custom error classes
│   │   └── constants.ts       # App-wide constants
│   │
│   ├── api/
│   │   ├── axiosConfig.ts     # Axios interceptors setup
│   │   ├── client.ts          # Axios client instance
│   │   ├── auth.ts            # Auth API calls
│   │   ├── users.ts           # User API calls
│   │   ├── organizations.ts   # Organization API calls
│   │   ├── channels.ts        # Channel API calls
│   │   ├── chaincode.ts       # Chaincode API calls
│   │   └── health.ts          # Health check API calls
│   │
│   ├── hooks/
│   │   ├── useAuth.ts         # Authentication hook
│   │   ├── useUser.ts         # User data hook
│   │   ├── useChannels.ts     # Channels data hook
│   │   ├── useChaincodes.ts   # Chaincodes hook
│   │   ├── useFetch.ts        # Generic fetch hook
│   │   └── useNotification.ts # Toast notifications hook
│   │
│   ├── store/
│   │   ├── authStore.ts       # Auth state (Zustand/Redux)
│   │   ├── uiStore.ts         # UI state
│   │   └── index.ts           # Store exports
│   │
│   ├── components/
│   │   ├── common/
│   │   │   ├── Header.tsx        # Top navigation bar
│   │   │   ├── Sidebar.tsx       # Left sidebar navigation
│   │   │   ├── Footer.tsx        # Footer component
│   │   │   ├── LoadingSpinner.tsx # Loading indicator
│   │   │   ├── ErrorBoundary.tsx  # Error boundary
│   │   │   ├── Modal.tsx          # Modal component
│   │   │   ├── Card.tsx           # Card container
│   │   │   ├── Button.tsx         # Button variants
│   │   │   ├── Input.tsx          # Input field
│   │   │   ├── Badge.tsx          # Status badge
│   │   │   └── Breadcrumb.tsx     # Navigation breadcrumb
│   │   │
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx     # Main app layout
│   │   │   ├── AuthLayout.tsx     # Auth pages layout
│   │   │   └── PageLayout.tsx     # Page container layout
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx      # Login form
│   │   │   ├── RegisterForm.tsx   # Register form
│   │   │   ├── ForgotPassword.tsx # Password reset
│   │   │   └── ProtectedRoute.tsx # Auth guard
│   │   │
│   │   ├── dashboard/
│   │   │   ├── Dashboard.tsx         # Main dashboard
│   │   │   ├── StatisticsCard.tsx    # Stats display
│   │   │   ├── ActivityChart.tsx     # Activity chart
│   │   │   └── RecentTransactions.tsx # Recent tx list
│   │   │
│   │   ├── users/
│   │   │   ├── UserList.tsx       # User listing table
│   │   │   ├── UserDetail.tsx     # User profile
│   │   │   ├── UserForm.tsx       # Create/edit user
│   │   │   └── UserActions.tsx    # User action buttons
│   │   │
│   │   ├── organizations/
│   │   │   ├── OrgList.tsx        # Organization listing
│   │   │   ├── OrgDetail.tsx      # Org profile
│   │   │   ├── OrgForm.tsx        # Create/edit org
│   │   │   └── OrgMembers.tsx     # Organization members
│   │   │
│   │   ├── channels/
│   │   │   ├── ChannelList.tsx    # Channel listing table
│   │   │   ├── ChannelDetail.tsx  # Channel details page
│   │   │   ├── ChannelForm.tsx    # Create/join channel
│   │   │   ├── ChannelInfo.tsx    # Channel info panel
│   │   │   └── ChannelActions.tsx # Channel operations
│   │   │
│   │   ├── chaincode/
│   │   │   ├── ChaincodeList.tsx  # Installed chaincodes
│   │   │   ├── ChaincodeDetail.tsx # Chaincode details
│   │   │   ├── InstallForm.tsx    # Install chaincode form
│   │   │   ├── QueryForm.tsx      # Query execution form
│   │   │   ├── InvokeForm.tsx     # Invoke execution form
│   │   │   └── QueryResults.tsx   # Display query results
│   │   │
│   │   ├── explorer/
│   │   │   ├── Explorer.tsx       # Blockchain explorer main
│   │   │   ├── BlockList.tsx      # Blocks list
│   │   │   ├── BlockDetail.tsx    # Block details page
│   │   │   ├── TransactionList.tsx # Transactions list
│   │   │   └── TransactionDetail.tsx # Transaction details
│   │   │
│   │   └── settings/
│   │       ├── Settings.tsx       # Settings page
│   │       ├── ProfileSettings.tsx # User profile settings
│   │       ├── SystemSettings.tsx  # System configuration
│   │       └── AuditLog.tsx        # Audit log viewer
│   │
│   ├── pages/
│   │   ├── LoginPage.tsx       # Login page
│   │   ├── RegisterPage.tsx    # Register page
│   │   ├── DashboardPage.tsx   # Dashboard page
│   │   ├── UsersPage.tsx       # User management page
│   │   ├── OrganizationsPage.tsx # Org management page
│   │   ├── ChannelsPage.tsx    # Channel management page
│   │   ├── ChaincodeePage.tsx  # Chaincode operations page
│   │   ├── ExplorerPage.tsx    # Blockchain explorer page
│   │   ├── SettingsPage.tsx    # Settings page
│   │   ├── NotFoundPage.tsx    # 404 page
│   │   └── UnauthorizedPage.tsx # 403 page
│   │
│   ├── utils/
│   │   ├── formatters.ts       # Format helpers (date, number)
│   │   ├── validators.ts       # Form validation
│   │   ├── helpers.ts          # General helpers
│   │   ├── jwt.ts              # JWT utilities
│   │   └── storage.ts          # LocalStorage/SessionStorage utilities
│   │
│   ├── styles/
│   │   ├── index.css           # Global styles
│   │   ├── tailwind.css        # Tailwind directives
│   │   └── globals.css         # CSS variables
│   │
│   └── types/
│       ├── index.ts            # Type exports
│       ├── api.ts              # API response types
│       ├── auth.ts             # Auth types
│       ├── user.ts             # User types
│       ├── channel.ts          # Channel types
│       ├── chaincode.ts        # Chaincode types
│       └── blockchain.ts       # Blockchain explorer types
│
├── tests/
│   ├── unit/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── utils/
│   │
│   ├── integration/
│   │   ├── pages/
│   │   └── flows/
│   │
│   └── e2e/
│       └── main-flow.spec.ts
│
├── public/
│   └── favicon.ico
│
├── package.json               # npm dependencies + scripts
├── tsconfig.json              # TypeScript configuration
├── vite.config.ts             # Vite configuration
├── vitest.config.ts           # Vitest configuration
├── tailwind.config.js         # Tailwind configuration
├── postcss.config.js          # PostCSS configuration
├── .env.example               # Environment variables template
├── .eslintrc.json             # ESLint configuration
├── .prettierrc                # Prettier configuration
├── Dockerfile                 # Docker build config
└── README.md                  # Frontend documentation
```

## Core Features

### 1. Authentication
- JWT-based login/register
- Token refresh mechanism
- Protected routes with permission checks
- Auto-logout on token expiration
- Remember me functionality

### 2. User Management
- List all users (admin only)
- Create new users with role assignment
- Edit user details and roles
- Delete users (with confirmation)
- Password reset functionality
- User activity tracking

### 3. Organization Management
- Create and manage blockchain organizations (MSPs)
- Assign users to organizations
- Organization member management
- Organization settings

### 4. Channel Management
- List available channels
- Create new channels (admin)
- Join existing channels
- View channel members
- Channel configuration
- Channel statistics

### 5. Chaincode Management
- View installed chaincodes
- Install new chaincodes
- Execute query operations (read-only)
- Execute invoke operations (read-write)
- View transaction results
- Chaincode documentation

### 6. Blockchain Explorer
- View all blocks
- View block details (transactions, hash, timestamp)
- View transactions
- Transaction search and filtering
- Transaction status tracking
- Real-time updates (WebSocket optional)

### 7. Dashboard
- System overview statistics
- Recent transactions
- Channel status
- Network health
- User activity timeline
- Quick actions

### 8. Settings
- User profile management
- Password change
- System settings (admin only)
- Audit log viewer
- API key management

## Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0",
    "zustand": "^4.4.0",
    "@tanstack/react-query": "^5.0.0",
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.4",
    "react-hot-toast": "^2.4.0",
    "date-fns": "^2.30.0",
    "classnames": "^2.3.0"
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^1.0.0",
    "@vitest/ui": "^1.0.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/jest-dom": "^6.1.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/node": "^20.10.0",
    "eslint": "^8.56.0",
    "@typescript-eslint/eslint-plugin": "^6.17.0",
    "@typescript-eslint/parser": "^6.17.0",
    "prettier": "^3.1.1"
  }
}
```

## API Integration

### Authentication Flow
1. User submits login credentials
2. Frontend sends POST /api/v1/auth/login to Backend
3. Backend returns JWT token + user info
4. Frontend stores token in localStorage/sessionStorage
5. All subsequent requests include JWT in Authorization header
6. Token refresh handled by axios interceptor

### API Client Setup
```typescript
// src/api/client.ts
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const client = axios.create({
  baseURL: process.env.VITE_API_URL || 'http://localhost:8002/api/v1',
  timeout: 30000,
});

// Request interceptor - add JWT token
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle errors, refresh token
client.interceptors.response.use(...);

export default client;
```

## State Management (Zustand)

```typescript
// src/store/authStore.ts
import create from 'zustand';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: async (email, password) => {
    // Implementation
  },
  
  logout: () => {
    set({ user: null, token: null, isAuthenticated: false });
    localStorage.removeItem('token');
  },
  
  refreshToken: async () => {
    // Implementation
  },
}));
```

## UI Components (Tailwind CSS)

All components styled with Tailwind CSS for:
- Responsive design (mobile-first)
- Dark mode support (optional)
- Consistent spacing and colors
- Smooth animations and transitions

## Testing Strategy

### Unit Tests
- Component rendering tests
- Hook tests
- Utility function tests
- Store action tests

### Integration Tests
- Page flow tests
- API integration tests
- State management tests

### E2E Tests
- Full user journey (login → chaincode query)
- Authentication flow
- CRUD operations

## Docker Configuration

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /build
COPY package*.json vite.config.ts tsconfig.json ./
RUN npm ci
COPY src ./src
COPY public ./public
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
RUN npm install -g http-server
COPY --from=builder /build/dist ./dist
EXPOSE 3000
CMD ["http-server", "dist", "-p", "3000", "--spa"]
```

## Environment Variables (.env)

```env
VITE_API_URL=http://localhost:8002/api/v1
VITE_APP_NAME=IBN Blockchain Management
VITE_APP_VERSION=0.0.1
VITE_LOG_LEVEL=debug
```

## Development Server

```bash
npm install
npm run dev       # Start dev server on http://localhost:3000
npm run build     # Production build
npm run preview   # Preview production build
npm run test      # Run tests
npm run lint      # Lint code
npm run format    # Format code with Prettier
```

## Responsive Design

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

All components are fully responsive and mobile-first.

## Performance Optimization

- Code splitting with React Router
- Lazy loading of components
- Image optimization
- Caching strategy
- Pagination for large lists
- Virtual scrolling for long lists (optional)

## Security Considerations

- JWT token stored securely (localStorage with expiration)
- HTTPS only in production
- XSS protection with React's built-in escaping
- CSRF token handling
- Input validation on all forms
- Rate limiting on API calls

## Next Steps

1. Setup React/Vite project with TypeScript
2. Install and configure dependencies
3. Setup Tailwind CSS
4. Create basic routing structure
5. Build authentication components
6. Build dashboard page
7. Build CRUD management pages
8. Build blockchain explorer
9. Build chaincode operations UI
10. Integrate with Backend API
11. Write tests
12. Docker configuration
