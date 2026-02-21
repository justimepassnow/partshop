import React, { createContext, useContext, useState, useRef } from 'react';
import {
  Text,
  Animated,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from './ThemeContext';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [message, setMessage] = useState('');
  const [type, setType] = useState('success'); // 'success' | 'error' | 'info'
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-50)).current;
  const timerRef = useRef(null);
  const { colors, radius, spacing, typography } = useTheme();

  const showToast = (msg, msgType = 'success') => {
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setMessage(msg);
    setType(msgType);
    setVisible(true);

    // Animate In
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 60, // Top position
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-hide
    timerRef.current = setTimeout(() => {
      hideToast();
      timerRef.current = null;
    }, 3000);
  };

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setVisible(false));
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'error': return colors.danger;
      case 'info': return colors.primary;
      case 'success': return colors.success;
      default: return colors.surface;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {visible && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity,
              transform: [{ translateY }],
              backgroundColor: getBackgroundColor(),
              borderRadius: radius.lg,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[styles.toastText, { ...typography.bodySemi }]}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  toastText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
