import React from 'react';
import { SSK_OFFICIAL_LOGO } from '../constants/brand';
import { cn } from '../lib/utils';

interface BrandLogoProps {
  className?: string;
  imgClassName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  lightText?: boolean;
  subtitle?: string;
  onClick?: () => void;
}

export function BrandLogo({ 
  className, 
  imgClassName,
  size = 'md', 
  showText = false, 
  lightText = true,
  subtitle,
  onClick
}: BrandLogoProps) {
  const containerSizeMap = {
    xs: 'w-7 h-7 rounded-lg p-0.5',
    sm: 'w-9 h-9 rounded-xl p-1',
    md: 'w-11 h-11 rounded-[12px] p-1.5',
    lg: 'w-16 h-16 rounded-[18px] p-2',
    xl: 'w-24 h-24 rounded-[24px] p-2.5',
    '2xl': 'w-32 h-32 rounded-[32px] p-3',
  };

  return (
    <div 
      onClick={onClick}
      className={cn("flex items-center gap-3 shrink-0 select-none", onClick && "cursor-pointer", className)}
    >
      <div className={cn(
        "bg-white border border-white/20 shadow-lg shadow-black/10 flex items-center justify-center shrink-0 overflow-hidden transition-transform duration-300 hover:scale-[1.02]", 
        containerSizeMap[size]
      )}>
        <img 
          src={SSK_OFFICIAL_LOGO} 
          alt="SSK Business Network Logo" 
          className={cn("w-full h-full object-contain drop-shadow-sm", imgClassName)}
          referrerPolicy="no-referrer"
          loading="eager"
        />
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <span className={cn(
            "font-black tracking-wider leading-none uppercase",
            size === 'xs' ? "text-[11px]" :
            size === 'sm' ? "text-xs" :
            size === 'md' ? "text-sm sm:text-base" :
            size === 'lg' ? "text-lg sm:text-xl" :
            "text-2xl",
            lightText ? "text-white" : "text-[#0F2040]"
          )}>
            SSK <span className="text-primary font-extrabold">BUSINESS NETWORK</span>
          </span>
          {subtitle && (
            <span className={cn(
              "font-extrabold tracking-[0.2em] uppercase mt-0.5 leading-tight truncate",
              size === 'xs' || size === 'sm' ? "text-[7px]" : "text-[8px] sm:text-[9px]",
              lightText ? "text-neutral-400" : "text-neutral-500"
            )}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
