import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  to?: string;
  label?: string;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export const BackButton = ({ 
  to, 
  label = 'Back', 
  className = '',
  variant = 'ghost'
}: BackButtonProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <Button
      variant={variant}
      onClick={handleBack}
      className={`h-9 sm:h-auto text-xs sm:text-sm px-2 sm:px-4 touch-manipulation ${className}`}
    >
      <ArrowLeft className="h-4 w-4 mr-1.5 sm:mr-2" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">Back</span>
    </Button>
  );
};
