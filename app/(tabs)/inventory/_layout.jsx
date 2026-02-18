import { Stack } from 'expo-router';
import { useTheme } from '../../../lib/ThemeContext';

export default function InventoryStackLayout() {
  const { theme } = useTheme();

  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: theme.background,
      },
      headerTintColor: theme.text,
    }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Inventory',
        }} 
      />
      <Stack.Screen 
        name="[categoryId]" 
        options={{ 
          title: 'Category Items',
        }} 
      />
    </Stack>
  );
}
