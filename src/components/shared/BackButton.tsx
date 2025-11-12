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
      size="icon"
      className={`touch-manipulation ${className}`}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
};
