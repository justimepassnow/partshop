import { useState, useEffect } from "react";
import { initDB } from '../lib/database';
import { View, ActivityIndicator, Text } from "react-native";
import { Stack } from "expo-router";
import { ThemeProvider } from '../lib/ThemeContext';

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
        }}
      >
        <Text>Database failed to initialize: {error.message}</Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}