import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import OverviewScreen  from "../screens/OverviewScreen";
import ChallengeScreen from "../screens/ChallengeScreen";
import CommunityScreen from "../screens/CommunityScreen";
import MarketScreen    from "../screens/MarketScreen";
import JournalScreen   from "../screens/JournalScreen";
import SessionsScreen  from "../screens/SessionsScreen";
import ProgressScreen  from "../screens/ProgressScreen";
import SupportScreen   from "../screens/SupportScreen";
import ProfileScreen   from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName="OverviewScreen"
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name="OverviewScreen"  component={OverviewScreen}  />
      <Tab.Screen name="ChallengeScreen" component={ChallengeScreen} />
      <Tab.Screen name="CommunityScreen" component={CommunityScreen} />
      <Tab.Screen name="MarketScreen"    component={MarketScreen}    />
      <Tab.Screen name="JournalScreen"   component={JournalScreen}   />
      <Tab.Screen name="SessionsScreen"  component={SessionsScreen}  />
      <Tab.Screen name="ProgressScreen"  component={ProgressScreen}  />
      <Tab.Screen name="SupportScreen"   component={SupportScreen}   />
      <Tab.Screen name="ProfileScreen"   component={ProfileScreen}   />
    </Tab.Navigator>
  );
}
