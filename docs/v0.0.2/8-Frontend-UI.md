# 🎨 Phase 6: Frontend Permission UI

**Version:** v0.0.2 REVISED  
**Timeline:** 2 days  
**Difficulty:** ⭐⭐ Intermediate  
**Prerequisites:** Phases 1-5 completed, React frontend setup

---

## 🎯 **WHAT YOU'LL BUILD**

In this phase, you'll update the frontend to display wallet-based identity information:

- ✅ Show user enrollment status
- ✅ Display wallet ID
- ✅ Show certificate serial number
- ✅ Display certificate expiry date
- ✅ Show organization MSP ID
- ✅ Block non-enrolled users from chaincode operations

**Starting Point:** Basic user profile  
**Ending Point:** Complete enrollment status UI with guards

---

## 📋 **PREREQUISITES**

### **1. Backend API Must Return Wallet Info**

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser", "password": "Test123!"}'

# Should return:
# {
#   "user": {
#     "wallet_id": "testuser@org1",
#     "enrolled": true,
#     "certificate_serial": "..."
#   }
# }
```

### **2. Check Frontend Structure**

```bash
ls -la frontend/src/

# Should have:
# - components/
# - store/
# - pages/
```

---

## 🚀 **IMPLEMENTATION STEPS**

### **Step 1: Update Auth Store**

**File:** `frontend/src/store/auth.ts` (UPDATE)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  username: string;
  email: string;
  organization_id?: string;
  wallet_id?: string;              // ⭐ NEW
  certificate_serial?: string;     // ⭐ NEW
  enrolled: boolean;               // ⭐ NEW
  enrolled_at?: string;            // ⭐ NEW
  roles?: Array<{ id: string; name: string }>;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      
      setAuth: (token, user) => set({
        token,
        user,
        isAuthenticated: true
      }),
      
      logout: () => set({
        token: null,
        user: null,
        isAuthenticated: false
      }),
      
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null
      }))
    }),
    {
      name: 'auth-storage'
    }
  )
);
```

---

### **Step 2: Create User Profile Component**

**File:** `frontend/src/components/UserProfile.tsx` (NEW)

```typescript
import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { api } from '../services/api';

interface CertificateInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  expired: boolean;
  mspId: string;
}

export const UserProfile: React.FC = () => {
  const { user } = useAuthStore();
  const [certificateInfo, setCertificateInfo] = useState<CertificateInfo | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (user?.wallet_id) {
      loadCertificateInfo();
    }
  }, [user?.wallet_id]);
  
  const loadCertificateInfo = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/v1/users/${user?.id}/certificate`);
      setCertificateInfo(response.data);
    } catch (error) {
      console.error('Failed to load certificate info:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!user) return null;
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">User Profile</h2>
      
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-600 font-medium">Username</label>
            <p className="text-gray-900 font-semibold">{user.username}</p>
          </div>
          
          <div>
            <label className="text-sm text-gray-600 font-medium">Email</label>
            <p className="text-gray-900">{user.email}</p>
          </div>
        </div>
        
        {/* Enrollment Status */}
        <div className="border-t pt-4">
          <label className="text-sm text-gray-600 font-medium">Enrollment Status</label>
          <div className="flex items-center gap-2 mt-1">
            {user.enrolled ? (
              <>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Enrolled
                </span>
                {user.enrolled_at && (
                  <span className="text-sm text-gray-500">
                    on {new Date(user.enrolled_at).toLocaleDateString()}
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Not Enrolled
              </span>
            )}
          </div>
        </div>
        
        {/* Wallet Info */}
        {user.wallet_id && (
          <div className="border-t pt-4 space-y-3">
            <div>
              <label className="text-sm text-gray-600 font-medium">Wallet ID</label>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-sm font-mono text-gray-800">
                  {user.wallet_id}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(user.wallet_id!)}
                  className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                  title="Copy to clipboard"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div>
              <label className="text-sm text-gray-600 font-medium">Certificate Serial</label>
              <code className="block mt-1 px-3 py-2 bg-gray-50 rounded border border-gray-200 text-xs font-mono text-gray-700 break-all">
                {user.certificate_serial}
              </code>
            </div>
            
            {certificateInfo && !loading && (
              <>
                <div>
                  <label className="text-sm text-gray-600 font-medium">Certificate Validity</label>
                  <div className="mt-1 text-sm text-gray-700">
                    <p>From: <span className="font-medium">{new Date(certificateInfo.validFrom).toLocaleString()}</span></p>
                    <p>To: <span className="font-medium">{new Date(certificateInfo.validTo).toLocaleString()}</span></p>
                    {certificateInfo.expired && (
                      <p className="text-red-600 font-medium mt-1">⚠️ Certificate expired</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-gray-600 font-medium">Organization MSP</label>
                  <p className="mt-1 font-mono text-sm text-gray-800">{certificateInfo.mspId}</p>
                </div>
              </>
            )}
          </div>
        )}
        
        {/* Roles */}
        {user.roles && user.roles.length > 0 && (
          <div className="border-t pt-4">
            <label className="text-sm text-gray-600 font-medium">Roles</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {user.roles.map((role) => (
                <span
                  key={role.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {role.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Not Enrolled Warning */}
      {!user.enrolled && (
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Enrollment Required</h3>
              <p className="text-sm text-yellow-700 mt-1">
                You need to be enrolled with the blockchain network to perform transactions.
                Please contact your organization administrator.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
```

---

### **Step 3: Create Enrollment Guard Component**

**File:** `frontend/src/components/EnrollmentGuard.tsx` (NEW)

```typescript
import React from 'react';
import { useAuthStore } from '../store/auth';
import { Navigate } from 'react-router-dom';

interface EnrollmentGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Enrollment Guard Component
 * Blocks access to chaincode operations for non-enrolled users
 */
export const EnrollmentGuard: React.FC<EnrollmentGuardProps> = ({
  children,
  fallback
}) => {
  const { user } = useAuthStore();
  
  // If user is not enrolled, show fallback or redirect
  if (!user?.enrolled) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            {/* Warning Icon */}
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-4">
              <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Enrollment Required
            </h3>
            
            <p className="text-sm text-gray-500 mb-6">
              You need to be enrolled with the blockchain network to access this feature.
              Please contact your organization administrator to complete the enrollment process.
            </p>
            
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Your Status:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex items-center">
                  <span className="w-24">Username:</span>
                  <span className="font-medium">{user?.username}</span>
                </li>
                <li className="flex items-center">
                  <span className="w-24">Email:</span>
                  <span className="font-medium">{user?.email}</span>
                </li>
                <li className="flex items-center">
                  <span className="w-24">Enrolled:</span>
                  <span className="text-red-600 font-medium">No</span>
                </li>
              </ul>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => window.location.href = '/profile'}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Go to Profile
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // User is enrolled, render children
  return <>{children}</>;
};
```

---

### **Step 4: Update App Routes**

**File:** `frontend/src/App.tsx` (UPDATE)

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { EnrollmentGuard } from './components/EnrollmentGuard';
import { UserProfile } from './components/UserProfile';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { ChaincodePages } from './pages/Chaincode';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Profile - accessible to all authenticated users */}
        <Route path="/profile" element={
          <ProtectedRoute>
            <UserProfile />
          </ProtectedRoute>
        } />
        
        {/* Dashboard - accessible to all authenticated users */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        {/* Chaincode operations - require enrollment */}
        <Route path="/chaincode/*" element={
          <ProtectedRoute>
            <EnrollmentGuard>
              <ChaincodePages />
            </EnrollmentGuard>
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

### **Step 5: Add Certificate Info API Endpoint**

**File:** `backend-ts/src/routes/users.ts` (ADD)

```typescript
/**
 * Get user certificate info
 * GET /api/v1/users/:id/certificate
 */
router.get('/users/:id/certificate', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user can access this info
    if (req.user.id !== id && !req.user.roles?.some(r => r.name === 'SuperAdmin')) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden'
      });
    }
    
    const user = await db('users').where({ id }).first();
    
    if (!user || !user.wallet_id) {
      return res.status(404).json({
        success: false,
        error: 'User not enrolled'
      });
    }
    
    // Get wallet
    const identity = await walletService.get(user.wallet_id);
    
    if (!identity) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }
    
    // Validate certificate
    const validation = fabricCAService.validateCertificate(identity.certificate);
    
    res.json({
      success: true,
      data: {
        subject: validation.subject,
        issuer: validation.issuer,
        validFrom: validation.validFrom,
        validTo: validation.validTo,
        expired: validation.expired,
        mspId: identity.mspId
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## ✅ **VERIFICATION CHECKLIST**

### **1. Login and Check Profile**

```bash
# Login
# Navigate to /profile
# Should see:
# - Enrollment status (green badge)
# - Wallet ID
# - Certificate serial
# - Certificate validity dates
```

### **2. Test Enrollment Guard**

```bash
# Create non-enrolled user
# Try to access /chaincode
# Should be blocked with enrollment warning
```

### **3. Test Certificate Info**

```bash
curl http://localhost:3000/api/v1/users/<user_id>/certificate \
  -H "Authorization: Bearer <token>"

# Should return certificate details
```

---

## 📊 **WHAT YOU'VE ACCOMPLISHED**

✅ **User profile** shows enrollment status  
✅ **Wallet information** displayed  
✅ **Certificate details** visible  
✅ **Enrollment guard** blocks non-enrolled users  
✅ **Better UX** for enrollment process  

---

## 🚀 **NEXT STEPS**

**Phase 7:** Testing & Documentation

**Estimated time:** 3 days

---

**Phase 6 Complete!** ✅

**Next:** [Phase 7 - Testing](./7-Testing-Documentation.md)
