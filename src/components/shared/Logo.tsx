import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

const Logo = ({ size = 'md', className = '', showText = true }: LogoProps) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-20 h-20'
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      {/* Logo Image - Using logo.svg from public folder */}
      <img 
        src="/logo.svg"
        alt="Mojo Dojo Casa House Logo" 
        className={`${sizeClasses[size]} object-contain`}
        onError={(e) => {
          // Fallback to logo.png if svg fails
          const target = e.target as HTMLImageElement;
          if (!target.src.includes('logo.png')) {
            target.src = '/logo.png';
          }
        }}
      />
      
      {/* Company Name */}
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold bg-gradient-to-r from-orange-500 via-blue-500 to-green-500 bg-clip-text text-transparent ${textSizes[size]}`}>
            Mojo Dojo Casa House
          </span>
          <span className="text-xs text-muted-foreground -mt-1">
            Your Gateway to Amazing Stays
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;