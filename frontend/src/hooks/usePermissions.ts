import { useAuthStore } from '@/store/auth';

export function usePermissions() {
    const { user } = useAuthStore();

    const hasPermission = (resource: string, action: string): boolean => {
        if (!user) return false;

        // SuperAdmin has all permissions
        if (user.roles?.some(role => role.name === 'SuperAdmin')) {
            return true;
        }

        // Check user's permissions
        // This is a simplified version - you should implement based on your RBAC structure
        const permissions = user.roles?.flatMap(role => role.permissions || []) || [];

        return permissions.some(
            permission =>
                permission.resource === resource &&
                permission.action === action
        );
    };

    const hasAnyPermission = (permissions: Array<{ resource: string; action: string }>): boolean => {
        return permissions.some(p => hasPermission(p.resource, p.action));
    };

    const hasAllPermissions = (permissions: Array<{ resource: string; action: string }>): boolean => {
        return permissions.every(p => hasPermission(p.resource, p.action));
    };

    return {
        hasPermission,
        hasAnyPermission,
        hasAllPermissions,
    };
}
