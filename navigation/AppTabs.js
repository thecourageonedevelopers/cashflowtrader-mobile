import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import OverviewScreen      from "../screens/OverviewScreen";
import ChallengeScreen     from "../screens/ChallengeScreen";
import MarketScreen        from "../screens/MarketScreen";
import JournalScreen       from "../screens/JournalScreen";
import SessionsScreen      from "../screens/SessionsScreen";
import ProgressScreen      from "../screens/ProgressScreen";
import SupportScreen       from "../screens/SupportScreen";
import ProfileScreen       from "../screens/ProfileScreen";
import AdminScreen         from "../screens/admin/DashboardScreen";
import { TAB_ROUTES } from "../src/constants/routes";

const Tab = createBottomTabNavigator();

export default function AppTabs() {
  return (
    <Tab.Navigator
      initialRouteName={TAB_ROUTES.OVERVIEW}
      backBehavior="none"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
      }}
    >
      <Tab.Screen name={TAB_ROUTES.OVERVIEW}  component={OverviewScreen}  />
      <Tab.Screen name={TAB_ROUTES.CHALLENGE} component={ChallengeScreen} />
      <Tab.Screen name={TAB_ROUTES.MARKET}    component={MarketScreen}   />
      <Tab.Screen name={TAB_ROUTES.JOURNAL}   component={JournalScreen}   />
      <Tab.Screen name={TAB_ROUTES.SESSIONS}  component={SessionsScreen}  />
      <Tab.Screen name={TAB_ROUTES.PROGRESS}  component={ProgressScreen}  />
      <Tab.Screen name={TAB_ROUTES.SUPPORT}   component={SupportScreen}   />
      <Tab.Screen name={TAB_ROUTES.PROFILE}   component={ProfileScreen}   />
      <Tab.Screen name="AdminScreen"          component={AdminScreen}     />
    </Tab.Navigator>
  );
}
