import { useRef, useEffect, useState } from 'react';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CategoryCardVideoProps {
  videoSrc: string;
  fallbackImage?: string;
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  colorClass: 'primary' | 'secondary' | 'accent';
}

export const CategoryCardVideo = ({
  videoSrc,
  fallbackImage,
  icon: Icon,
  title,
  description,
  href,
  colorClass
}: CategoryCardVideoProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (videoRef.current && !isMobile && !videoError) {
      if (isHovered) {
        videoRef.current.play().catch(() => {
          setVideoError(true);
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Reset to first frame
      }
    }
  }, [isMobile, videoError, isHovered]);

  const handleVideoError = () => {
    setVideoError(true);
  };

  const colorVariants = {
    primary: {
      hoverBorder: 'hover:border-primary/50',
      iconBg: 'bg-primary/10',
      iconHover: 'group-hover:bg-primary/20',
      iconColor: 'text-primary',
      textHover: 'group-hover:text-primary'
    },
    secondary: {
      hoverBorder: 'hover:border-secondary/50',
      iconBg: 'bg-secondary/10',
      iconHover: 'group-hover:bg-secondary/20',
      iconColor: 'text-secondary',
      textHover: 'group-hover:text-secondary'
    },
    accent: {
      hoverBorder: 'hover:border-accent/50',
      iconBg: 'bg-accent/10',
      iconHover: 'group-hover:bg-accent/20',
      iconColor: 'text-accent',
      textHover: 'group-hover:text-accent'
    }
  };

  const colors = colorVariants[colorClass];

  return (
    <Link
      to={href}
      className="group block relative overflow-hidden rounded-lg h-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Card Container */}
      <div className={`relative p-8 text-center shadow-medium hover:shadow-hover transition-all duration-300 border-2 border-transparent ${colors.hoverBorder} bg-card h-full overflow-hidden`}>
        
        {/* Video Background */}
        {!isMobile && !videoError ? (
          <div className="absolute inset-0 overflow-hidden">
            <video
              ref={videoRef}
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              preload="metadata"
              onError={handleVideoError}
              onLoadedMetadata={(e) => {
                // Ensure video is paused and at first frame when metadata loads
                const video = e.currentTarget;
                video.pause();
                video.currentTime = 0;
              }}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 group-hover:from-black/50 group-hover:via-black/30 group-hover:to-black/50 transition-all duration-500" />
          </div>
        ) : (
          // Mobile or error fallback
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ 
              backgroundImage: fallbackImage ? `url(${fallbackImage})` : undefined,
              backgroundColor: !fallbackImage ? 'hsl(var(--background))' : undefined
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/50" />
          </div>
        )}
        
        {/* Content */}
        <div className="relative z-10 mb-6">
          <div className={`w-32 h-32 mx-auto mb-4 rounded-2xl overflow-hidden ${colors.iconBg} ${colors.iconHover} flex items-center justify-center group-hover:scale-105 transition-transform duration-300 backdrop-blur-sm border-2 border-white/20`}>
            <Icon className={`w-16 h-16 ${colors.iconColor} drop-shadow-lg`} />
          </div>
          <div className={`w-14 h-14 mx-auto rounded-full ${colors.iconBg} ${colors.iconHover} flex items-center justify-center group-hover:scale-110 transition-transform duration-300 backdrop-blur-sm`}>
            <Icon className={`w-7 h-7 ${colors.iconColor}`} />
          </div>
        </div>
        
        <h3 className={`text-2xl font-bold mb-3 ${colors.textHover} transition-colors relative z-10 text-white drop-shadow-lg`}>
          {title}
        </h3>
        <p className="text-white/90 text-base leading-relaxed relative z-10 drop-shadow-md">
          {description}
        </p>
      </div>
    </Link>
  );
};

