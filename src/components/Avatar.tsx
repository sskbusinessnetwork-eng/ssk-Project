import React, { useMemo } from 'react';
import { cn } from '../lib/utils';
import { getCleanFullName } from '../utils/authUtils';

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | string;
  className?: string;
  fallbackClassName?: string;
}

export function Avatar({ src, name, size = 'md', className, fallbackClassName }: AvatarProps) {
  // Try to clean name if provided, else "User"
  const cleanName = getCleanFullName(name || '') || 'User';

  const initials = useMemo(() => {
    const parts = cleanName.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }, [cleanName]);

  // Determine size classes
  const sizeClasses = {
    'xs': 'w-6 h-6 text-[10px]',
    'sm': 'w-8 h-8 text-xs',
    'md': 'w-10 h-10 text-sm',
    'lg': 'w-12 h-12 text-base',
    'xl': 'w-16 h-16 text-xl',
    '2xl': 'w-24 h-24 text-3xl',
    '3xl': 'w-32 h-32 text-4xl'
  }[size] || size; // Allow custom tailwind class if not matching

  const avatarSrc = src && !src.includes('|||') ? src : (src?.split('|||')[0] || '');

  const [imgError, setImgError] = React.useState(false);

  if (avatarSrc && !imgError) {
    return (
      <img
        src={avatarSrc}
        alt={cleanName}
        onError={() => setImgError(true)}
        className={cn("rounded-full object-cover shrink-0", sizeClasses, className)}
        referrerPolicy="no-referrer"
      />
    );
  }

  // Fallback Initials
  return (
    <div 
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center font-bold text-white bg-gradient-to-br from-orange-500 to-red-600 border border-white/10 shadow-inner", 
        sizeClasses, 
        className,
        fallbackClassName
      )}
      title={cleanName}
    >
      {initials}
    </div>
  );
}
