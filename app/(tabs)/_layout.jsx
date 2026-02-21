import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function TabsLayout() {
  const { colors, radius, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const tabHeight = Platform.OS === 'ios' ? 60 + insets.bottom : 64 + insets.bottom;

  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.background,
        borderTopColor: colors.border,
        height: tabHeight,
        paddingBottom: insets.bottom + (Platform.OS === 'ios' ? 0 : 8),
        paddingTop: 8,
        borderTopWidth: 1,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      },
      headerTitleStyle: {
        fontWeight: '700',
        fontSize: 18,
        color: colors.text,
      },
      headerTintColor: colors.text,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarLabelStyle: {
        fontSize: 12,
        fontWeight: '500',
      },
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

