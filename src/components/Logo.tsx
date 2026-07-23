import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSlogan?: boolean;
  layout?: 'stacked' | 'horizontal' | 'icon-only';
  iconColor?: string;
  useImage?: boolean;
}

export default function Logo({
  className = '',
  size = 'md',
  showSlogan = true,
  layout = 'stacked',
  iconColor = '#C87413',
  useImage = true,
}: LogoProps) {
  // Dimension maps
  const containerHeights = {
    sm: 'h-9',
    md: 'h-14',
    lg: 'h-28',
    xl: 'h-40 sm:h-48',
  };

  const iconSizes = {
    sm: 'w-8 h-8',
    md: 'w-11 h-11',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  };

  const titleSizes = {
    sm: 'text-sm sm:text-base',
    md: 'text-base sm:text-lg',
    lg: 'text-2xl',
    xl: 'text-2xl sm:text-3xl',
  };

  const sloganSizes = {
    sm: 'text-[9.5px] sm:text-[10.5px]',
    md: 'text-[11px] sm:text-xs',
    lg: 'text-xs sm:text-sm',
    xl: 'text-sm sm:text-base',
  };

  // If stacked and useImage is requested, render the full crisp logo SVG image
  if (layout === 'stacked' && useImage) {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${className}`}>
        <img
          src="/logo.svg"
          alt="The Menu Crew — Tap. Sign up. Eat."
          className={`object-contain max-w-full ${containerHeights[size]}`}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    );
  }

  return (
    <div className={`flex ${layout === 'stacked' ? 'flex-col items-center text-center' : 'items-center gap-2.5'} ${className}`}>
      {/* Icon Symbol */}
      <div className={`relative flex items-center justify-center shrink-0 ${iconSizes[size]}`}>
        <img
          src="/logo-icon.svg"
          alt="The Menu Crew Icon"
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>

      {/* Text Group */}
      {layout !== 'icon-only' && (
        <div className={`flex flex-col ${layout === 'stacked' ? 'items-center mt-1' : 'items-start'}`}>
          <span className={`font-sans font-black tracking-wider uppercase text-[#B25E00] leading-tight ${titleSizes[size]}`}>
            THE MENU CREW
          </span>
          {showSlogan && (
            <span className={`font-sans font-semibold text-neutral-800 tracking-normal mt-0.5 ${sloganSizes[size]}`}>
              Tap. Sign up. Eat.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
