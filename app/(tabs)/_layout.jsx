import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarStyle: {
        backgroundColor: theme.background,
        borderTopColor: theme.border,
      },
      headerStyle: {
        backgroundColor: theme.background,
      },
      headerTintColor: theme.text,
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.border,
    }}>
      <Tabs.Screen
        name="inventory"
        options={{
          title: 'Inventory',
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'cube' : 'cube-outline'} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shoppingList"
        options={{
          title: 'Shopping List',
          headerShown: true,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

