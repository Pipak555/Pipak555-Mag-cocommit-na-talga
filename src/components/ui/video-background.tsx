import { useRef, useEffect, useState } from 'react';

interface VideoBackgroundProps {
  src: string;
  className?: string;
  overlay?: boolean;
  fallbackImage?: string;
}

export const VideoBackground = ({ 
  src, 
  className = '', 
  overlay = true,
  fallbackImage 
}: VideoBackgroundProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [videoError, setVideoError] = useState(false);

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
      videoRef.current.playbackRate = 0.8; // Slight slow motion for elegance
    }
  }, [isMobile, videoError]);

  const handleVideoError = () => {
    setVideoError(true);
  };

  // On mobile or if video fails to load, show fallback image
  if (isMobile || videoError) {
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
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        preload="auto"
        onError={handleVideoError}
      >
        <source src={src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {overlay && (
        <>
          <div className="absolute inset-0 bg-gradient-to-br from-black/50 via-black/30 to-black/50" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </>
      )}
    </div>
  );
};

