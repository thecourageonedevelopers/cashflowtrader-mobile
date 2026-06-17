import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AuthService from '../services/AuthService';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AuthService"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="AuthService"
          component={AuthService}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}