import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getRoleColorClasses, getRoleClassName, type UserRole } from '@/lib/roleColors';

/**
 * Hook to get role-based colors for the current user
 */
export const useRoleColors = () => {
  const { userRole } = useAuth();
  
  const colors = useMemo(() => getRoleColorClasses(userRole), [userRole]);
  const className = useMemo(() => {
    return (type: 'bg' | 'text' | 'border' | 'bg-light' | 'bg-lighter' | 'icon' = 'bg') => 
      getRoleClassName(userRole, type);
  }, [userRole]);
  
  return {
    role: userRole,
    colors,
    className,
    // Convenience methods
    bg: className('bg'),
    text: className('text'),
    border: className('border'),
    bgLight: className('bg-light'),
    bgLighter: className('bg-lighter'),
    icon: className('icon'),
  };
};

/**
 * Hook to get role-based colors for a specific role (useful for displaying other users' roles)
 */
export const useRoleColorsFor = (role: UserRole) => {
  const colors = useMemo(() => getRoleColorClasses(role), [role]);
  const className = useMemo(() => {
    return (type: 'bg' | 'text' | 'border' | 'bg-light' | 'bg-lighter' | 'icon' = 'bg') => 
      getRoleClassName(role, type);
  }, [role]);
  
  return {
    role,
    colors,
    className,
    bg: className('bg'),
    text: className('text'),
    border: className('border'),
    bgLight: className('bg-light'),
    bgLighter: className('bg-lighter'),
    icon: className('icon'),
  };
};

