import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  role?: 'admin' | 'host' | 'guest' | null; // Optional role override
}

export const BackButton = ({ 
  to, 
  label = 'Back', 
  className = '',
  variant = 'ghost',
  role: roleOverride
}: BackButtonProps) => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const role = roleOverride || userRole;

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  // Role-based hover classes for ghost/outline variants
  const getRoleHoverClass = () => {
    if (variant !== 'ghost' && variant !== 'outline') return '';
    
    switch (role) {
      case 'admin':
        return 'hover:bg-role-admin/10 hover:text-role-admin hover:border-role-admin/20';
      case 'host':
        return 'hover:bg-role-host/10 hover:text-role-host hover:border-role-host/20';
      case 'guest':
        return 'hover:bg-role-guest/10 hover:text-role-guest hover:border-role-guest/20';
      default:
        return '';
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleBack}
      size="icon"
      className={cn('touch-manipulation', getRoleHoverClass(), className)}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
};
