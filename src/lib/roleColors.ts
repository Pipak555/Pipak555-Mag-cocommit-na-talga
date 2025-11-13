/**
 * Role-based color utility functions
 * Provides consistent color access based on user roles:
 * - Admin: Green
 * - Host: Blue
 * - Guest: Orange
 */

export type UserRole = 'admin' | 'host' | 'guest' | null;

export interface RoleColors {
  main: string;
  foreground: string;
  glow: string;
  light: string;
  lighter: string;
  bg: string;
  bgLight: string;
  bgLighter: string;
  text: string;
  border: string;
  hover: string;
}

/**
 * Get role-based color classes for Tailwind
 */
export const getRoleColorClasses = (role: UserRole): RoleColors => {
  const rolePrefix = role ? `role-${role}` : 'muted';
  
  return {
    main: `${rolePrefix}`,
    foreground: `${rolePrefix}-foreground`,
    glow: `${rolePrefix}-glow`,
    light: `${rolePrefix}-light`,
    lighter: `${rolePrefix}-lighter`,
    bg: `bg-${rolePrefix}`,
    bgLight: `bg-${rolePrefix}-light`,
    bgLighter: `bg-${rolePrefix}-lighter`,
    text: `text-${rolePrefix}`,
    border: `border-${rolePrefix}`,
    hover: `hover:bg-${rolePrefix}/90`,
  };
};

/**
 * Get role-based color classes as a string for className
 */
export const getRoleClassName = (
  role: UserRole,
  type: 'bg' | 'text' | 'border' | 'bg-light' | 'bg-lighter' | 'icon' = 'bg'
): string => {
  if (!role) return '';
  
  const rolePrefix = `role-${role}`;
  
  switch (type) {
    case 'bg':
      return `bg-${rolePrefix}`;
    case 'text':
      return `text-${rolePrefix}`;
    case 'border':
      return `border-${rolePrefix}`;
    case 'bg-light':
      return `bg-${rolePrefix}-light`;
    case 'bg-lighter':
      return `bg-${rolePrefix}-lighter`;
    case 'icon':
      return `bg-${rolePrefix}/10 text-${rolePrefix}`;
    default:
      return '';
  }
};

/**
 * Get button variant class based on role
 */
export const getRoleButtonVariant = (role: UserRole): string => {
  if (!role) return 'default';
  return `role-${role}`;
};

/**
 * Get badge variant class based on role
 */
export const getRoleBadgeVariant = (role: UserRole): string => {
  if (!role) return 'secondary';
  return `role-${role}`;
};

