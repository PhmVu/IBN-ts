import React, { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { User, Shield, Key, Calendar, Building } from 'lucide-react';

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
            const response = await api.get(`/users/${user?.id}/certificate`);
            setCertificateInfo(response.data.data);
        } catch (error) {
            console.error('Failed to load certificate info:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">User Profile</h1>
                <p className="text-gray-500 mt-1">Manage your account and blockchain identity</p>
            </div>

            {/* Basic Info Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Basic Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Username</label>
                            <p className="text-lg font-semibold text-gray-900 mt-1">{user.username}</p>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-500">Email</label>
                            <p className="text-lg text-gray-900 mt-1">{user.email}</p>
                        </div>

                        {user.organization_id && (
                            <div>
                                <label className="text-sm font-medium text-gray-500">Organization ID</label>
                                <p className="text-lg text-gray-900 mt-1 font-mono text-sm">{user.organization_id}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Enrollment Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="h-5 w-5" />
                        Blockchain Enrollment
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {/* Enrollment Status */}
                        <div>
                            <label className="text-sm font-medium text-gray-500">Status</label>
                            <div className="flex items-center gap-2 mt-2">
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
                            <div className="space-y-4 pt-4 border-t">
                                <div>
                                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                        <Key className="h-4 w-4" />
                                        Wallet ID
                                    </label>
                                    <div className="mt-2 flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm font-mono text-gray-800">
                                            {user.wallet_id}
                                        </code>
                                        <button
                                            onClick={() => navigator.clipboard.writeText(user.wallet_id!)}
                                            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                                            title="Copy to clipboard"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>

                                {user.certificate_serial && (
                                    <div>
                                        <label className="text-sm font-medium text-gray-500">Certificate Serial</label>
                                        <code className="block mt-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-xs font-mono text-gray-700 break-all">
                                            {user.certificate_serial}
                                        </code>
                                    </div>
                                )}

                                {certificateInfo && !loading && (
                                    <>
                                        <div>
                                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                                <Calendar className="h-4 w-4" />
                                                Certificate Validity
                                            </label>
                                            <div className="mt-2 space-y-1 text-sm text-gray-700">
                                                <p>From: <span className="font-medium">{new Date(certificateInfo.validFrom).toLocaleString()}</span></p>
                                                <p>To: <span className="font-medium">{new Date(certificateInfo.validTo).toLocaleString()}</span></p>
                                                {certificateInfo.expired && (
                                                    <p className="text-red-600 font-medium mt-2">⚠️ Certificate expired</p>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                                                <Building className="h-4 w-4" />
                                                Organization MSP
                                            </label>
                                            <p className="mt-2 font-mono text-sm text-gray-800 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                                                {certificateInfo.mspId}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Roles Card */}
            {user.roles && user.roles.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Roles & Permissions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {user.roles.map((role) => (
                                <span
                                    key={role.id}
                                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200"
                                >
                                    {role.name}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Not Enrolled Warning */}
            {!user.enrolled && (
                <div className="p-6 bg-yellow-50 border-2 border-yellow-200 rounded-2xl">
                    <div className="flex gap-4">
                        <svg className="w-6 h-6 text-yellow-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <div className="flex-1">
                            <h3 className="text-lg font-semibold text-yellow-900">Enrollment Required</h3>
                            <p className="text-sm text-yellow-800 mt-2">
                                You need to be enrolled with the blockchain network to perform transactions.
                                Please contact your organization administrator to complete the enrollment process.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
