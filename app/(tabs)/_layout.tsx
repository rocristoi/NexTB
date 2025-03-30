import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { HapticTab } from '@/components/HapticTab';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
    screenOptions={{
      tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarBackground: TabBarBackground,
      tabBarStyle: Platform.select({
        ios: {
          backgroundColor: 'black', 
          borderTopWidth: 0,
          position: 'absolute', 
        },
        android: {
          backgroundColor: 'black', 
          borderTopWidth: 0,
          position: 'absolute', 
        },
        default: {},
      }),
    }}>
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <MaterialIcons name="settings" size={24} color={color} />,
        }}
      />
        <Tabs.Screen
        name="lines"
        options={{
          title: 'Lines',
          tabBarIcon: ({ color }) => <MaterialIcons name="linear-scale" size={24} color={color} />,
        }}
      />
        <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <MaterialIcons size={28} name="map" color={color} />,
        }}
      />
      <Tabs.Screen
        name="faulty"
        options={{
          title: 'Faulty A/C list',
          tabBarIcon: ({ color }) => <MaterialIcons name="severe-cold" size={24} color={color} />,
        }}
      />
            <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarIcon: ({ color }) => <MaterialIcons name="bus-alert" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}
