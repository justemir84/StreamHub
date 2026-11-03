import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SitesScreen from "./screens/SitesScreen";
import WebViewScreen from "./screens/WebViewScreen";
import AccountsScreen from "./screens/AccountsScreen";
import FavoritesScreen from "./screens/FavoritesScreen";
import UpdateGate from "./components/UpdateGate";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function SitesStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Sites" component={SitesScreen} />
      <Stack.Screen name="WebView" component={WebViewScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <UpdateGate>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: { backgroundColor: "#15151f", borderTopColor: "#2a2a3a", height: 72, paddingBottom: 8 },
            tabBarActiveTintColor: "#3b82f6",
            tabBarInactiveTintColor: "#888",
            tabBarLabelStyle: { fontSize: 14, fontWeight: "600" }
          }}
        >
          <Tab.Screen name="Siteler" component={SitesStack} options={{ tabBarIcon: ({color}) => <Ionicons name="globe-outline" size={30} color={color} /> }} />
          <Tab.Screen name="Favoriler" component={FavoritesScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="star-outline" size={30} color={color} /> }} />
          <Tab.Screen name="Hesaplar" component={AccountsScreen} options={{ tabBarIcon: ({color}) => <Ionicons name="person-outline" size={30} color={color} /> }} />
        </Tab.Navigator>
      </NavigationContainer>
    </UpdateGate>
  );
}
