import React, { useEffect } from "react";
import { Alert, BackHandler, TVEventHandler } from "react-native";
import * as Updates from "expo-updates";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SitesScreen from "./screens/SitesScreen";
import WebViewScreen from "./screens/WebViewScreen";
import AccountsScreen from "./screens/AccountsScreen";
import FavoritesScreen from "./screens/FavoritesScreen";

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
  useEffect(() => {
    const tvHandler = new TVEventHandler();
    tvHandler.enable(null, (cmp, evt) => {
      if (!evt) return;
      if (evt.eventType === "back" || evt.eventType === "menu") {
        BackHandler.exitApp();
      }
    });
    return () => tvHandler.disable();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        if (__DEV__) return;
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          Alert.alert("Güncelleme", "Yeni sürüm mevcut. Şimdi güncellensin mi?", [
            { text: "Sonra", style: "cancel" },
            { text: "Güncelle", onPress: async () => {
              try {
                await Updates.fetchUpdateAsync();
                await Updates.reloadAsync();
              } catch (e) {
                Alert.alert("Hata", e?.message || "Güncelleme başarısız.");
              }
            } }
          ]);
        }
      } catch (e) {}
    })();
  }, []);

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: "#15151f", borderTopColor: "#2a2a3a" },
          tabBarActiveTintColor: "#3b82f6",
          tabBarInactiveTintColor: "#666"
        }}
      >
        <Tab.Screen name="Siteler" component={SitesStack} options={{ tabBarIcon: ({color,size}) => <Ionicons name="globe-outline" size={size} color={color} /> }} />
        <Tab.Screen name="Favoriler" component={FavoritesScreen} options={{ tabBarIcon: ({color,size}) => <Ionicons name="star-outline" size={size} color={color} /> }} />
        <Tab.Screen name="Hesaplar" component={AccountsScreen} options={{ tabBarIcon: ({color,size}) => <Ionicons name="person-outline" size={size} color={color} /> }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}