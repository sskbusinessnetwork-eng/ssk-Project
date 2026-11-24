import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

export type AppTheme = 'default' | 'day';

interface ThemeContextType {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'default',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('ssk_app_theme');
      return saved === 'day' ? 'day' : 'default';
    } catch {
      return 'default';
    }
  });

  const setTheme = useCallback((newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('ssk_app_theme', newTheme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next = prev === 'day' ? 'default' : 'day';
      try {
        localStorage.setItem('ssk_app_theme', next);
      } catch (e) {
        console.warn('Failed to save theme in localStorage', e);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'day') {
      root.classList.add('theme-day');
      body.classList.add('theme-day');
      root.setAttribute('data-theme', 'day');
      body.setAttribute('data-theme', 'day');
    } else {
      root.classList.remove('theme-day');
      body.classList.remove('theme-day');
      root.setAttribute('data-theme', 'default');
      body.setAttribute('data-theme', 'default');
    }
  }, [theme]);

  const contextValue = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
