import { Stack } from 'expo-router';

export default function InventoryStackLayout() {
  return (
    <Stack>
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
