import { useState, useEffect } from "react";
import { initDB } from '../lib/database';
import { View, ActivityIndicator, Text } from "react-native";
import { Stack } from "expo-router";
import { ThemeProvider } from '../lib/ThemeContext';
import { ToastProvider } from '../lib/ToastContext';

export default function RootLayout() {
  const [isDBReady, setIsDBReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const setupDatabase = async () => {
      try {
        await initDB();
        setIsDBReady(true);
      } catch (err) {
        console.error('DB Init Error:', err);
        setError(err);
      }
    };

    setupDatabase();
  }, []);

  if (!isDBReady && !error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>Database Error</Text>
        <Text style={{ textAlign: 'center' }}>Database failed to initialize. Please restart the app.</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ToastProvider>
    </ThemeProvider>
  );
}