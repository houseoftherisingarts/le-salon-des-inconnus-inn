
import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onComplete: () => void;
  images?: string[];
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ onComplete, images = [] }) => {
  // Start with full opacity immediately to block the view
  const [opacityClass, setOpacityClass] = useState('opacity-100');

  useEffect(() => {
    let isMounted = true;

    // 2. Preload Images Logic
    const preloadImages = async () => {
        const imagePromises = images.map((src) => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                img.onload = resolve;
                img.onerror = resolve; // Resolve anyway to avoid blocking
            });
        });

        // Ensure minimum display time of 2.5s to show logo animation
        const minTimePromise = new Promise(resolve => setTimeout(resolve, 2500));

        // Wait for both images and minimum time
        await Promise.all([Promise.all(imagePromises), minTimePromise]);
        
        if (!isMounted) return;

        // 3. Start Fade Out
        setOpacityClass('opacity-0 pointer-events-none');

        // 4. Complete after transition (1s duration in CSS)
        setTimeout(() => {
            if (isMounted) onComplete();
        }, 1000);
    };

    preloadImages();

    return () => {
      isMounted = false;
    };
  }, [onComplete, images]);

  return (
    <div 
      className={`fixed inset-0 z-[100] bg-[#050505] flex flex-col items-center justify-center transition-opacity duration-1000 ${opacityClass}`}
    >
      <div className="relative flex items-center justify-center">
        {/* Logo Container with Tribal Drumbeat Animation */}
        <div 
          className="relative w-40 h-auto flex items-center justify-center"
          style={{
            animation: 'tribalBeat 1.0s cubic-bezier(0.25, 1, 0.5, 1) forwards',
            opacity: 0,
            animationDelay: '0.2s' // Slight delay to sync with fade in
          }}
        >
           <img 
            src="https://i.imgur.com/B1YfPqn.png" 
            alt="Logo" 
            className="w-full h-auto drop-shadow-[0_0_25px_rgba(250,204,21,0.5)]"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>

      <style>{`
        @keyframes tribalBeat {
          0% { 
            opacity: 0; 
            transform: scale(0.5); 
          }
          40% { 
            opacity: 1; 
            transform: scale(1.2); 
          }
          70% { 
            transform: scale(0.95); 
          }
          100% { 
            opacity: 1; 
            transform: scale(1); 
          }
        }
      `}</style>
    </div>
  );
};
