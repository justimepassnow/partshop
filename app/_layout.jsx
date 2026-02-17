import { useState, useEffect } from "react";
import {initDB} from '../lib/database';
import { View ,ActivityIndicator, Text} from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from '@expo/vector-icons';

export default function RootLayout(){
    const [isDBReady,setIsDBReady]=useState(false);
    const [error,setError]=useState(null);
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
  if(!isDBReady && !error){
    return(
        <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <ActivityIndicator size="large" />
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
        <Text>Database failed to initialize.</Text>
      </View>
    );
  }
  return(
    <Tabs>
      <Tabs.Screen
        name="(tabs)/inventory" 
        options={{
          title: 'Inventory',
          tabBarIcon: ({focused}) => (
            <Ionicons name={focused ? 'cube':'cube-outline'} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tabs)/shoppingList" 
        options={{
          title: 'ShoppingList',
          tabBarIcon: ({focused}) => (
            <Ionicons name={focused ? 'cart':'cart-outline'} size={24} />
          ),
        }}
      />
    </Tabs>
  );

}