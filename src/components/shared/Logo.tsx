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
      {/* Logo SVG */}
      <div className={`${sizeClasses[size]} relative`}>
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer circular background */}
          <circle cx="50" cy="50" r="50" fill="white" stroke="#e5e7eb" strokeWidth="0.5" />
          
          {/* Outer organic shapes/leaves */}
          <g className="opacity-90">
            {/* Top organic shapes */}
            <path d="M20 15 Q30 10 40 15 Q50 8 60 15 Q70 10 80 15 Q85 20 80 25 Q70 20 60 25 Q50 18 40 25 Q30 20 20 25 Z" fill="url(#gradient1)" />
            <path d="M15 30 Q25 25 35 30 Q45 23 55 30 Q65 25 75 30 Q80 35 75 40 Q65 35 55 40 Q45 33 35 40 Q25 35 15 40 Z" fill="url(#gradient2)" />
            
            {/* Left organic shapes */}
            <path d="M10 45 Q15 40 20 45 Q25 38 30 45 Q35 40 40 45 Q45 50 40 55 Q35 50 30 55 Q25 48 20 55 Q15 50 10 55 Z" fill="url(#gradient1)" />
            <path d="M5 60 Q10 55 15 60 Q20 53 25 60 Q30 55 35 60 Q40 65 35 70 Q30 65 25 70 Q20 63 15 70 Q10 65 5 70 Z" fill="url(#gradient2)" />
            
            {/* Right organic shapes */}
            <path d="M60 45 Q65 40 70 45 Q75 38 80 45 Q85 40 90 45 Q95 50 90 55 Q85 50 80 55 Q75 48 70 55 Q65 50 60 55 Z" fill="url(#gradient1)" />
            <path d="M65 60 Q70 55 75 60 Q80 53 85 60 Q90 55 95 60 Q100 65 95 70 Q90 65 85 70 Q80 63 75 70 Q70 65 65 70 Z" fill="url(#gradient2)" />
            
            {/* Bottom organic shapes */}
            <path d="M20 75 Q30 70 40 75 Q50 68 60 75 Q70 70 80 75 Q85 80 80 85 Q70 80 60 85 Q50 78 40 85 Q30 80 20 85 Z" fill="url(#gradient1)" />
            <path d="M15 90 Q25 85 35 90 Q45 83 55 90 Q65 85 75 90 Q80 95 75 100 Q65 95 55 100 Q45 93 35 100 Q25 95 15 100 Z" fill="url(#gradient2)" />
          </g>
          
          {/* Wavy elements above house */}
          <path d="M65 35 Q70 30 75 35 Q80 32 85 35 Q90 40 85 45 Q80 42 75 45 Q70 40 65 45 Z" fill="url(#gradient3)" />
          <path d="M60 30 Q65 25 70 30 Q75 27 80 30 Q85 35 80 40 Q75 37 70 40 Q65 35 60 40 Z" fill="url(#gradient3)" />
          
          {/* House - Left side (orange/yellow) */}
          <path d="M35 50 L45 40 L55 50 L55 65 L35 65 Z" fill="url(#gradient4)" />
          
          {/* House - Right side (blue) */}
          <path d="M55 50 L65 40 L75 50 L75 65 L55 65 Z" fill="url(#gradient5)" />
          
          {/* Torii gate */}
          <rect x="38" y="55" width="4" height="8" fill="#dc2626" />
          <rect x="48" y="55" width="4" height="8" fill="#dc2626" />
          <rect x="36" y="58" width="18" height="2" fill="#dc2626" />
          <rect x="36" y="60" width="18" height="1.5" fill="#dc2626" />
          
          {/* Hands cradling the house */}
          <path d="M30 65 Q35 70 40 65 Q45 68 50 65 Q55 70 60 65" stroke="url(#gradient5)" strokeWidth="2" fill="none" />
          <path d="M50 65 Q55 70 60 65 Q65 68 70 65 Q75 70 80 65" stroke="url(#gradient6)" strokeWidth="2" fill="none" />
        </svg>
        
        {/* Gradients */}
        <defs>
          <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
          <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id="gradient4" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
          <linearGradient id="gradient5" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1e40af" />
          </linearGradient>
          <linearGradient id="gradient6" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#16a34a" />
          </linearGradient>
        </defs>
      </div>
      
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
