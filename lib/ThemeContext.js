import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';

const Colors = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    primary: '#007AFF',
    card: '#F2F2F7',
    border: '#C6C6C8',
    danger: '#FF3B30',
  },
  dark: {
    background: '#000000',
    text: '#FFFFFF',
    primary: '#0A84FF',
    card: '#1C1C1E',
    border: '#38383A',
    danger: '#FF453A',
  },
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  return (
    <ThemeContext.Provider value={{ theme, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
