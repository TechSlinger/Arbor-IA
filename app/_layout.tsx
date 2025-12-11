import { Stack } from 'expo-router';
import React from 'react';

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f0f5ea' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="farms/create" />
      <Stack.Screen name="farms/[id]" />
      <Stack.Screen name="trees/create" />
      <Stack.Screen name="trees/[id]" />
    </Stack>
  );
}
