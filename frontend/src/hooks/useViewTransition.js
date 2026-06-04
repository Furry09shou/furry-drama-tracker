import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const useViewTransition = () => {
  const navigate = useNavigate();

  const transitionTo = useCallback((to, options) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        navigate(to, options);
      });
    } else {
      navigate(to, options);
    }
  }, [navigate]);

  return transitionTo;
};

export default useViewTransition;
