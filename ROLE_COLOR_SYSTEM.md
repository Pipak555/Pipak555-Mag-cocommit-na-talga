# Role-Based Color System Implementation

## Overview
This document outlines the standardized color palette system implemented across the platform for consistent visual identity based on user roles.

## Color Assignments
- **Admin**: Green (`--role-admin`)
- **Host**: Blue (`--role-host`)
- **Guest**: Orange (`--role-guest`)

## Implementation Details

### 1. CSS Variables (`src/index.css`)
Role-based color variables have been added to both light and dark mode themes:
- `--role-admin`, `--role-admin-foreground`, `--role-admin-glow`, `--role-admin-light`, `--role-admin-lighter`
- `--role-host`, `--role-host-foreground`, `--role-host-glow`, `--role-host-light`, `--role-host-lighter`
- `--role-guest`, `--role-guest-foreground`, `--role-guest-glow`, `--role-guest-light`, `--role-guest-lighter`

### 2. Tailwind Configuration (`tailwind.config.ts`)
Role colors are available as Tailwind classes:
- `bg-role-admin`, `text-role-admin`, `border-role-admin`
- `bg-role-host`, `text-role-host`, `border-role-host`
- `bg-role-guest`, `text-role-guest`, `border-role-guest`
- Plus variants: `role-admin/10`, `role-admin-light`, `role-admin-lighter`, etc.

### 3. Utility Functions (`src/lib/roleColors.ts`)
Helper functions for accessing role-based colors:
- `getRoleColorClasses(role)`: Returns color class names for a role
- `getRoleClassName(role, type)`: Returns specific color class for a role and type

### 4. React Hook (`src/hooks/useRoleColors.tsx`)
Custom hook for components to access role-based colors:
- `useRoleColors()`: Returns colors for the current user's role
- `useRoleColorsFor(role)`: Returns colors for a specific role

### 5. Component Updates

#### Button Component (`src/components/ui/button.tsx`)
Added role-based button variants:
- `variant="role-admin"`
- `variant="role-host"`
- `variant="role-guest"`

#### Badge Component (`src/components/ui/badge.tsx`)
Added role-based badge variants:
- `variant="role-admin"`
- `variant="role-host"`
- `variant="role-guest"`

## Updated Components

### Dashboards
✅ **Admin Dashboard** (`src/pages/admin/AdminDashboard.tsx`)
- Header icon background and text colors
- Welcome banner background
- Stats cards (earnings text color)
- Admin tools icons
- All icons now use `text-role-admin`

✅ **Host Dashboard** (`src/pages/host/HostDashboard.tsx`)
- Header icon background and text colors
- Stats cards (borders and text colors)
- All cards use `bg-role-host` and `text-role-host`

✅ **Guest Dashboard** (`src/pages/guest/GuestDashboard.tsx`)
- Header icon background and text colors
- "Become a Host" card uses host colors appropriately
- Role-specific styling applied

### Email Verification Banners
✅ **Admin Banner** (`src/components/admin/EmailVerificationBanner.tsx`)
- Border and background: `border-role-admin/50 bg-role-admin/10`
- Icon: `text-role-admin`
- Button: `variant="role-admin"`

✅ **Host Banner** (`src/components/host/EmailVerificationBanner.tsx`)
- Border and background: `border-role-host/50 bg-role-host/10`
- Icon: `text-role-host`
- Button: `variant="role-host"`

✅ **Guest Banner** (`src/components/guest/EmailVerificationBanner.tsx`)
- Border and background: `border-role-guest/50 bg-role-guest/10`
- Icon: `text-role-guest`
- Button: `variant="role-guest"`

## Usage Examples

### In Components
```tsx
import { useRoleColors } from '@/hooks/useRoleColors';

const MyComponent = () => {
  const { bg, text, icon } = useRoleColors();
  
  return (
    <div className={`${bg} ${text}`}>
      <Icon className={icon} />
    </div>
  );
};
```

### Direct Tailwind Classes
```tsx
// Admin
<div className="bg-role-admin text-role-admin-foreground">
  <Icon className="text-role-admin" />
</div>

// Host
<div className="bg-role-host text-role-host-foreground">
  <Icon className="text-role-host" />
</div>

// Guest
<div className="bg-role-guest text-role-guest-foreground">
  <Icon className="text-role-guest" />
</div>
```

### Button Variants
```tsx
<Button variant="role-admin">Admin Action</Button>
<Button variant="role-host">Host Action</Button>
<Button variant="role-guest">Guest Action</Button>
```

## Areas for Future Updates

While the core system is in place, the following areas may benefit from additional role-based color updates:

1. **Login Pages** (`src/pages/auth/*.tsx`)
   - Primary action buttons could use role-specific colors
   - Form highlights and focus states

2. **Account Settings Pages**
   - Section headers and icons
   - Form submit buttons

3. **Booking Pages**
   - Status badges
   - Action buttons
   - Confirmation messages

4. **Listing Pages**
   - Action buttons
   - Status indicators
   - Category badges

5. **Notification Components**
   - Notification badges
   - Toast messages (role-specific styling)

6. **Modal/Dialog Components**
   - Header backgrounds
   - Action buttons
   - Icon colors

7. **Navigation Elements**
   - Active state indicators
   - Hover states
   - Badge counts

## Accessibility Considerations

All role colors have been designed with accessibility in mind:
- Sufficient contrast ratios (WCAG AA compliant)
- Foreground colors are white for all role backgrounds
- Light variants available for subtle backgrounds
- Dark mode variants included for all roles

## Testing Checklist

- [x] CSS variables defined for all roles
- [x] Tailwind config updated
- [x] Utility functions created
- [x] React hook implemented
- [x] Button component updated
- [x] Badge component updated
- [x] Admin dashboard updated
- [x] Host dashboard updated
- [x] Guest dashboard updated
- [x] Email verification banners updated
- [ ] Login pages (optional enhancement)
- [ ] Other pages and components (as needed)

## Notes

- The system maintains backward compatibility with existing `primary`, `secondary`, and `accent` colors
- Role colors are additive - they don't replace the existing color system
- Components can mix role colors with standard colors as needed
- All role colors work in both light and dark modes

