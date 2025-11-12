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
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Intersection Observer to load video when in viewport
  useEffect(() => {
    if (!containerRef.current) {
      // If container not ready, check again after a short delay
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight + 100 && rect.bottom > -100;
          if (isVisible) {
            setIsInView(true);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Check if already in viewport
    const rect = containerRef.current.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight + 100 && rect.bottom > -100;
    
    if (isVisible) {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      { rootMargin: '100px' }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Load and play video
  useEffect(() => {
    if (videoRef.current && !videoError && isInView) {
      const video = videoRef.current;
      
      // Ensure video source is set and load
      if (video.readyState === 0) {
        video.load();
      }
      
      // On mobile, try to play immediately after a short delay to ensure video is ready
      if (isMobile) {
        const tryPlay = () => {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise.catch((error) => {
              console.warn('Video autoplay failed on mobile:', error);
              // Don't set error, just let it try again on interaction
            });
          }
        };
        
        // Try immediately
        tryPlay();
        
        // Also try after metadata loads
        const handleMetadata = () => {
          tryPlay();
          video.removeEventListener('loadedmetadata', handleMetadata);
        };
        video.addEventListener('loadedmetadata', handleMetadata);
        
        return () => {
          video.removeEventListener('loadedmetadata', handleMetadata);
        };
      }
    }
  }, [isInView, isMobile, videoError]);

  // Handle hover/play state
  useEffect(() => {
    if (videoRef.current && !videoError && isInView) {
      if (isHovered || isMobile) {
        // On mobile, play automatically; on desktop, play on hover
        videoRef.current.play().catch(() => {
          // Don't set error on play failure, might just need user interaction
        });
      } else {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Reset to first frame
      }
    }
  }, [isMobile, videoError, isHovered, isInView]);

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
      onTouchStart={() => {
        // On mobile, trigger play on touch
        if (isMobile && videoRef.current && !videoError && isInView) {
          videoRef.current.play().catch(() => {
            // Auto-play might fail, that's okay
          });
        }
      }}
      ref={containerRef}
    >
      {/* Card Container */}
      <div className={`relative p-8 text-center shadow-medium hover:shadow-hover transition-all duration-300 border-2 border-transparent ${colors.hoverBorder} bg-card h-full overflow-hidden`}>
        
        {/* Video Background */}
        {!videoError ? (
          <div className="absolute inset-0 overflow-hidden">
            {/* Show fallback image while video loads or if not in view yet */}
            {(!isInView || !videoReady) && fallbackImage && (
              <div 
                className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
                style={{ 
                  backgroundImage: `url(${fallbackImage})`,
                  opacity: isInView && videoReady ? 0 : 1,
                  zIndex: 1
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/50" />
              </div>
            )}
            
            <video
              ref={videoRef}
              loop
              muted
              playsInline
              autoPlay={isMobile && isInView}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
              style={{
                opacity: isInView && videoReady ? 1 : 0,
                zIndex: 2
              }}
              preload="metadata"
              onError={handleVideoError}
              onLoadedMetadata={(e) => {
                const video = e.currentTarget;
                if (isMobile && isInView) {
                  // On mobile, try to play automatically
                  video.play().catch(() => {
                    // Auto-play might fail, that's okay - will try on user interaction
                  });
                } else {
                  // On desktop, pause at first frame until hover
                  video.pause();
                  video.currentTime = 0;
                }
              }}
              onCanPlay={() => {
                // Video is ready to play
                setVideoReady(true);
                if (videoRef.current) {
                  if (isMobile && isInView) {
                    // Auto-play on mobile
                    videoRef.current.play().catch(() => {
                      // Auto-play might fail, that's okay
                    });
                  } else if (isHovered) {
                    // Play on hover for desktop
                    videoRef.current.play().catch(() => {
                      // Auto-play might fail, that's okay
                    });
                  }
                }
              }}
              onLoadedData={() => {
                setVideoReady(true);
              }}
              onClick={(e) => {
                // On mobile, if video didn't autoplay, try to play on tap
                if (isMobile && videoRef.current && videoRef.current.paused) {
                  e.preventDefault();
                  videoRef.current.play().catch(() => {
                    // Still might fail, that's okay
                  });
                }
              }}
            >
              <source src={videoSrc} type="video/mp4" />
            </video>
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60 group-hover:from-black/50 group-hover:via-black/30 group-hover:to-black/50 transition-all duration-500 z-10" />
          </div>
        ) : (
          // Error fallback
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

