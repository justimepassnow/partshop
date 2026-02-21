import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { db } from './database';

const Palette = {
  primary: {
    light: '#3B82F6',
    main: '#2563EB',
    dark: '#1D4ED8',
  },
  secondary: {
    light: '#6366F1',
    main: '#4F46E5',
    dark: '#4338CA',
  },
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

const Typography = {
  h1: { fontSize: 32, fontWeight: '700', lineHeight: 40 },
  h2: { fontSize: 24, fontWeight: '700', lineHeight: 32 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
  body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodySemi: { fontSize: 16, fontWeight: '600', lineHeight: 24 },
  caption: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  small: { fontSize: 12, fontWeight: '500', lineHeight: 16 },
};

const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const Radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

const Colors = {
  light: {
    background: '#F0F4FF', // Very light indigo tint
    surface: '#E0E7FF',    // Light indigo/blue tint
    text: '#1E293B',       // Slate 800 for better contrast on blue
    textSecondary: '#64748B',
    primary: Palette.primary.main,
    secondary: Palette.secondary.main,
    border: '#D1D5DB',
    card: '#FFFFFF',
    danger: Palette.danger,
    success: Palette.success,
    warning: Palette.warning,
    shadow: 'rgba(37, 99, 235, 0.1)', // Primary tinted shadow
  },
  dark: {
    background: Palette.gray[900],
    surface: Palette.gray[800],
    text: Palette.gray[50],
    textSecondary: Palette.gray[400],
    primary: Palette.primary.light,
    secondary: Palette.secondary.light,
    border: Palette.gray[700],
    card: Palette.gray[800],
    danger: Palette.danger,
    success: Palette.success,
    warning: Palette.warning,
    shadow: 'rgba(0, 0, 0, 0.3)',
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [userTheme, setUserTheme] = useState('auto'); // 'auto' | 'light' | 'dark'

  useEffect(() => {
    const loadTheme = async () => {
      try {
        const result = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', ['theme']);
        if (result) {
          setUserTheme(result.value);
        }
      } catch (error) {
        console.error('Failed to load theme preference:', error);
      }
    };
    loadTheme();
  }, []);

  const setThemePreference = async (theme) => {
    setUserTheme(theme);
    try {
      await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['theme', theme]);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const isDark = userTheme === 'auto' ? systemColorScheme === 'dark' : userTheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const theme = {
    colors,
    typography: Typography,
    spacing: Spacing,
    radius: Radius,
    isDark,
    userTheme,
    setThemePreference,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
