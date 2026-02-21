import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/ThemeContext';

export default function InventoryStackLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: colors.surface,
      },
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
        color: colors.text,
      },
      headerTintColor: colors.primary,
      headerShadowVisible: false,
      headerBackTitleVisible: false,
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Categories',
        }} 
      />
      <Stack.Screen 
        name="[categoryId]" 
        options={{ 
          title: 'Inventory',
        }} 
      />
    </Stack>
  );
}
