import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const ReactionTooltip = ({ 
  isVisible, 
  targetElement, 
  allReactions, 
  userNames, 
  userData, 
  onClose 
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0, showAbove: false });
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!isVisible || !targetElement) return;

    const calculatePosition = () => {
      if (!tooltipRef.current) return;
      
      // Safety check: Ensure targetElement is still in the DOM
      if (!document.body.contains(targetElement)) {
        console.warn('Target element not in DOM, closing tooltip');
        onClose();
        return;
      }
      
      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Use actual dimensions or fallback
      const tooltipHeight = tooltipRect.height > 0 ? tooltipRect.height : 80;
      const tooltipWidth = tooltipRect.width > 0 ? tooltipRect.width : 180;
      
      let top, left, showAbove;
      
      // Vertical positioning - check space above first
      const spaceAbove = targetRect.top;
      const spaceBelow = viewportHeight - targetRect.bottom;
      const padding = 20; // Increased safe padding from edges
      
      if (spaceAbove >= tooltipHeight + padding && spaceAbove > spaceBelow) {
        // Show above - position tooltip above the target with gap
        top = targetRect.top - tooltipHeight - 10;
        showAbove = true;
      } else if (spaceBelow >= tooltipHeight + padding) {
        // Show below - position tooltip below the target with gap
        top = targetRect.bottom + 10;
        showAbove = false;
      } else {
        // Not enough space in either direction, choose the side with more space
        if (spaceAbove > spaceBelow) {
          top = Math.max(padding, targetRect.top - tooltipHeight - 10);
          showAbove = true;
        } else {
          top = Math.min(viewportHeight - tooltipHeight - padding, targetRect.bottom + 10);
          showAbove = false;
        }
      }
      
      // Horizontal positioning - center on target element
      const targetCenterX = targetRect.left + (targetRect.width / 2);
      
      // Calculate left position (before transform)
      left = targetCenterX;
      
      // Ensure tooltip stays within viewport bounds horizontally
      // Account for the translateX(-50%) transform
      const halfTooltipWidth = tooltipWidth / 2;
      const minLeft = halfTooltipWidth + padding;
      const maxLeft = viewportWidth - halfTooltipWidth - padding;
      
      // Clamp the left position
      if (left < minLeft) {
        left = minLeft;
      } else if (left > maxLeft) {
        left = maxLeft;
      }
      
      // Ensure top is within bounds
      if (top < padding) {
        top = padding;
      } else if (top + tooltipHeight > viewportHeight - padding) {
        top = Math.max(padding, viewportHeight - tooltipHeight - padding);
      }
      
      setPosition({ top, left, showAbove });
    };

    // Calculate position immediately and after delays (for content to render)
    calculatePosition();
    const timer1 = setTimeout(calculatePosition, 50);
    const timer2 = setTimeout(calculatePosition, 150);
    const timer3 = setTimeout(calculatePosition, 300); // Extra delay for slow loading
    
    // Recalculate on window resize or scroll
    const handleResize = () => calculatePosition();
    const handleScroll = () => calculatePosition();
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isVisible, targetElement, allReactions, userNames]); // Re-calculate when content changes

  useEffect(() => {
    if (!isVisible) return;

    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target) && 
          targetElement && !targetElement.contains(event.target)) {
        onClose();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, targetElement, onClose]);

  if (!isVisible || !allReactions?.length) return null;

  // Group reactions by emoji
  const groupedReactions = allReactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) acc[reaction.emoji] = [];
    acc[reaction.emoji].push(reaction.userId);
    return acc;
  }, {});

  return createPortal(
    <div
      ref={tooltipRef}
      className="fixed z-[999999] pointer-events-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
        transform: 'translateX(-50%)', // Center horizontally using transform
      }}
    >
      {/* Tooltip container */}
      <div className="bg-base-100 shadow-2xl rounded-xl px-3 py-2 border border-base-300 min-w-[140px] max-w-xs max-h-[300px] overflow-y-auto backdrop-blur-sm">
        {/* Content */}
        <div className="flex flex-col gap-1.5">
          {Object.entries(groupedReactions).map(([emoji, userIds]) => (
            <div key={emoji} className="flex items-center justify-between gap-3">
              {/* Left side: Emoji */}
              <span className="text-2xl flex-shrink-0">{emoji}</span>
              
              {/* Right side: User names */}
              <div className="flex flex-wrap gap-1 items-center justify-end min-w-0">
                {userIds.map((userId, idx) => {
                  const displayName = userId === userData?.uid 
                    ? 'You' 
                    : userNames[userId] || '...';
                  const isLoading = !userNames[userId] && userId !== userData?.uid;
                  
                  return (
                    <span 
                      key={`${userId}-${idx}`}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium transition-all ${
                        userId === userData?.uid 
                          ? 'bg-primary/20 text-primary border border-primary/40' 
                          : isLoading
                          ? 'bg-base-300 text-base-content/50 animate-pulse'
                          : 'bg-base-200 text-base-content hover:bg-base-300'
                      }`}
                    >
                      {displayName}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Arrow pointing to the reaction badge */}
      <div 
        className={`absolute left-1/2 transform -translate-x-1/2 ${
          position.showAbove 
            ? 'top-full w-0 h-0 border-l-[10px] border-r-[10px] border-t-[8px] border-transparent border-t-base-100'
            : 'bottom-full w-0 h-0 border-l-[10px] border-r-[10px] border-b-[8px] border-transparent border-b-base-100'
        }`}
        style={{ 
          filter: position.showAbove 
            ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' 
            : 'drop-shadow(0 -2px 4px rgba(0,0,0,0.1))'
        }}
      />
      
      {/* Arrow border for better visibility */}
      <div 
        className={`absolute left-1/2 transform -translate-x-1/2 ${
          position.showAbove 
            ? 'top-full w-0 h-0 border-l-[11px] border-r-[11px] border-t-[9px] border-transparent border-t-base-300 -mt-px'
            : 'bottom-full w-0 h-0 border-l-[11px] border-r-[11px] border-b-[9px] border-transparent border-b-base-300 -mb-px'
        }`}
        style={{ zIndex: -1 }}
      />
    </div>,
    document.body
  );
};

export default ReactionTooltip;