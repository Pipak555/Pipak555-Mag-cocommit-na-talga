import { useRef, useEffect, useState } from 'react';

interface VideoBackgroundProps {
  src: string;
  className?: string;
  overlay?: boolean;
  fallbackImage?: string;
  style?: React.CSSProperties;
}

export const VideoBackground = ({ 
  src, 
  className = '', 
  overlay = true,
  fallbackImage,
  style
}: VideoBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Allow videos on mobile but use lighter loading strategy
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Intersection Observer to load video only when in viewport
  useEffect(() => {
    if (videoError) return;
    
    if (!containerRef.current) {
      // If container not ready yet, check again after a short delay
      const timer = setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200;
          if (isVisible) {
            setIsInView(true);
          }
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Check if element is already in viewport (with larger threshold for hero sections)
    const rect = containerRef.current.getBoundingClientRect();
    const isVisible = rect.top < window.innerHeight + 200 && rect.bottom > -200;
    
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
      { rootMargin: isMobile ? '100px' : '200px' } // Start loading earlier for hero sections
    );

    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [videoError, isMobile]);

  useEffect(() => {
    if (videoRef.current && !videoError && isInView) {
      const video = videoRef.current;
      
      // Set playback rate (slightly slower for smoother playback)
      video.playbackRate = isMobile ? 1.0 : 0.8;
      
      // Load video when in view
      video.load();
      
      // Play when ready
      const handleCanPlay = () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsLoaded(true);
            })
            .catch((error) => {
              console.warn('Video autoplay failed:', error);
              // Still show video even if autoplay fails
              setIsLoaded(true);
            });
        } else {
          setIsLoaded(true);
        }
      };
      
      const handleLoadedData = () => {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsLoaded(true);
            })
            .catch(() => {
              setIsLoaded(true);
            });
        } else {
          setIsLoaded(true);
        }
      };
      
      video.addEventListener('canplay', handleCanPlay, { once: true });
      video.addEventListener('loadeddata', handleLoadedData, { once: true });
      
      // Also try to play immediately if video is already loaded
      if (video.readyState >= 2) {
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsLoaded(true))
            .catch(() => setIsLoaded(true));
        } else {
          setIsLoaded(true);
        }
      }
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadeddata', handleLoadedData);
      };
    }
  }, [isMobile, videoError, isInView]);

  const handleVideoError = () => {
    setVideoError(true);
  };

  // If video fails to load, show fallback image
  if (videoError) {
    return (
      <div 
        className={`absolute inset-0 bg-cover bg-center bg-no-repeat ${className}`}
        style={{ 
          backgroundImage: fallbackImage ? `url(${fallbackImage})` : undefined,
          backgroundColor: !fallbackImage ? 'hsl(var(--background))' : undefined
        }}
      >
        {overlay && (
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/50" />
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden ${className}`} 
      style={style}
    >
      {/* Show fallback image while video loads */}
      {!isLoaded && fallbackImage && (
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500"
          style={{ 
            backgroundImage: `url(${fallbackImage})`,
            opacity: isLoaded ? 0 : 1,
            zIndex: 1
          }}
        />
      )}
      
      {isInView && (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{ 
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scale(1) translateZ(0)',
            willChange: 'auto',
            objectFit: 'cover',
            objectPosition: 'center center',
            minWidth: '100%',
            minHeight: '100%',
            maxWidth: '100%',
            maxHeight: '100%',
            pointerEvents: 'none',
            opacity: isLoaded ? 1 : 0,
            zIndex: 2
          }}
          preload="metadata"
          poster={fallbackImage}
          onError={handleVideoError}
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.play().catch(() => {
                // Auto-play might fail, that's okay
              });
            }
          }}
        >
          <source src={src} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      )}
      
      {overlay && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-background/30 dark:from-black/50 via-background/15 dark:via-black/30 to-background/30 dark:to-black/50 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/40 dark:from-black/60 via-transparent to-transparent z-10" />
        </>
      )}
    </div>
  );
};

