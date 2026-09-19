import React, { createContext, useContext, useState, useEffect } from 'react';

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

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('ssk_app_theme', newTheme);
    } catch (e) {
      console.warn('Failed to save theme in localStorage', e);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'day' ? 'default' : 'day');
  };

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

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
