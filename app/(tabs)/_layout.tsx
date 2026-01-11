import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { House, ClockCounterClockwise, List, ChartLine, Crown } from 'phosphor-react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Tab Layout - Premium Monochromatic
 *
 * Pure black tab bar with white active icons.
 */

// Tab icon with active state
function TabIcon({
  icon: Icon,
  color,
  focused,
}: {
  icon: typeof House;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Icon
        size={24}
        color={color}
        weight={focused ? 'fill' : 'regular'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 44,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        // Tab bar styling - Pure black
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: {
          backgroundColor: '#000000',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingLeft: Math.max(insets.left, 16),
          paddingRight: Math.max(insets.right, 16),
          height: Platform.OS === 'ios' ? 60 + insets.bottom : 68,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },

        // Header styling - Pure black
        headerShown: true,
        headerStyle: {
          backgroundColor: '#000000',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 17,
        },
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={House} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={ClockCounterClockwise} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={List} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={ChartLine} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="pricing"
        options={{
          title: 'Premium',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon icon={Crown} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
