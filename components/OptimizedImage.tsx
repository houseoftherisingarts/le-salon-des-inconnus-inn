
import React, { useState, useEffect, useRef } from 'react';
import { getOptimizedUrl } from '../utils/imageOptimizer';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string; // Applied to the container
  imageClassName?: string; // Applied to the img tag
  aspectRatio?: string; // CSS aspect-ratio value (e.g. "16/9")
  priority?: boolean; // If true, loads eagerly and with high fetch priority
  objectFit?: 'cover' | 'contain' | 'fill';
  style?: React.CSSProperties; // Container styles
  imageStyle?: React.CSSProperties; // Direct image styles (e.g. objectPosition)
  onClick?: () => void;
  // New Props for Optimization
  width?: number; // Manual override
  variant?: 'HERO' | 'CARD' | 'THUMBNAIL' | 'DEFAULT';
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = "",
  imageClassName = "",
  aspectRatio,
  priority = false,
  objectFit = 'cover',
  style,
  imageStyle,
  onClick,
  width,
  variant = 'DEFAULT'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Determine optimal width based on variant or prop
  const getFetchWidth = () => {
      if (width) return width;
      if (variant === 'HERO' || priority) return 1920; // Full screen / High Detail
      if (variant === 'CARD') return 800;  // Listing cards / Half width
      if (variant === 'THUMBNAIL') return 400; // Small avatars / previews
      return 1000; // Default safe fallback
  };

  const optimizedSrc = getOptimizedUrl(src, getFetchWidth());

  // Anti-Flash Fix: Check if image is already cached in browser
  useEffect(() => {
      if (imgRef.current?.complete) {
          setIsLoaded(true);
      }
  }, []);

  useEffect(() => {
    // If priority is true, we don't need the observer
    if (priority) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { 
        rootMargin: '200px', // Start loading 200px before it hits viewport
        threshold: 0.01 
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [priority]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden bg-[#1a1a1a] ${className}`}
      style={{ 
        ...style, 
        aspectRatio: aspectRatio,
        display: 'block' // Ensure block
      }}
      onClick={onClick}
    >
      {/* Placeholder / Blur Effect */}
      {/* Fade out this overlay when loaded */}
      <div 
        className={`absolute inset-0 bg-white/5 transition-opacity duration-700 pointer-events-none z-10 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`} 
      />

      {(isInView || priority) && (
        <img
          ref={imgRef}
          src={optimizedSrc}
          alt={alt}
          className={`transition-opacity duration-700 ease-out ${imageClassName} ${
            isLoaded ? '' : 'opacity-0'
          }`}
          style={{ 
            objectFit,
            ...imageStyle,
            display: 'block' // Ensure block
          }}
          decoding="async"
          // @ts-ignore - React 18/19 support fetchPriority but types might lag
          fetchPriority={priority ? "high" : "auto"}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
};
