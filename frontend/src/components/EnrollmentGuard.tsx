import React from 'react';
import { useAuthStore } from '@/store/auth';

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
                <div className="max-w-md w-full bg-white shadow-2xl rounded-2xl p-8">
                    <div className="text-center">
                        {/* Warning Icon */}
                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-yellow-100 mb-6">
                            <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-3">
                            Enrollment Required
                        </h3>

                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            You need to be enrolled with the blockchain network to access this feature.
                            Please contact your organization administrator to complete the enrollment process.
                        </p>

                        <div className="bg-gray-50 rounded-xl p-5 text-left mb-6 border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Status:</h4>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li className="flex items-center justify-between">
                                    <span className="text-gray-500">Username:</span>
                                    <span className="font-medium text-gray-900">{user?.username}</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span className="text-gray-500">Email:</span>
                                    <span className="font-medium text-gray-900">{user?.email}</span>
                                </li>
                                <li className="flex items-center justify-between">
                                    <span className="text-gray-500">Enrolled:</span>
                                    <span className="text-red-600 font-semibold">No</span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => window.location.href = '/profile'}
                                className="flex-1 bg-blue-600 text-white px-5 py-3 rounded-xl hover:bg-blue-700 transition font-medium shadow-md hover:shadow-lg"
                            >
                                Go to Profile
                            </button>
                            <button
                                onClick={() => window.location.href = '/dashboard'}
                                className="flex-1 bg-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-300 transition font-medium"
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
