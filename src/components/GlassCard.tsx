import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  glow?: 'orange' | 'cyan' | 'none';
  onClick?: () => void;
  hoverEffect?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  glow = 'none',
  onClick,
  hoverEffect = true
}) => {
  const glowClasses = {
    orange: 'animated-border border border-primary/20 shadow-glow-orange',
    cyan: 'animated-border-cyan border border-secondary/20 shadow-glow-cyan',
    none: 'border border-border/50 shadow-glass'
  };

  return (
    <div
      onClick={onClick}
      className={`
        glass-panel rounded-industrial p-6 transition-all duration-500 ease-out
        ${glowClasses[glow]}
        ${hoverEffect ? 'hover:translate-y-[-4px] hover:border-primary/40 hover:shadow-glass-hover cursor-pointer' : ''}
        ${onClick ? 'active:scale-[0.98]' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default GlassCard;
