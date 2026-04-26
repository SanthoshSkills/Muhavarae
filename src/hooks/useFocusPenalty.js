import { useEffect } from 'react';

export const useFocusPenalty = (onPenalty) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      // If the page goes hidden (user switched tabs, minimized app, OS locked)
      if (document.hidden) {
        onPenalty();
      }
    };

    const handleWindowBlur = () => {
      onPenalty();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [onPenalty]);
};
