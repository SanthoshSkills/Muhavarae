import { useEffect, useRef } from 'react';

export const useFocusPenalty = (onFocusLost, onFocusGained) => {
  const isFocused = useRef(true);

  useEffect(() => {
    const triggerLost = () => {
      if (isFocused.current) {
        isFocused.current = false;
        onFocusLost();
      }
    };

    const triggerGained = () => {
      if (!isFocused.current) {
        isFocused.current = true;
        onFocusGained();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerLost();
      } else {
        triggerGained();
      }
    };

    const handleWindowBlur = () => {
      // Small timeout to check if it's a real blur or just a transient state
      setTimeout(() => {
        if (!document.hasFocus() || document.hidden) {
          triggerLost();
        }
      }, 50);
    };

    const handleWindowFocus = () => {
      triggerGained();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [onFocusLost, onFocusGained]);
};
