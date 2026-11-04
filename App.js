import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SitesScreen from "./screens/SitesScreen";
import WebViewScreen from "./screens/WebViewScreen";
import AccountsScreen from "./screens/AccountsScreen";
import FavoritesScreen from "./screens/FavoritesScreen";
import UpdateGate from "./components/UpdateGate";
import TVFocusable from "./components/TVFocusable";
import TvFocusScope from "./components/TvFocusScope";
import { startTvFocus, stopTvFocus } from "./utils/tvFocus";

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

// Alt menude de odak halkasi gorunsun diye varsayilan buton yerine TVFocusable.
// React Navigation butona style/accessibility proplari gecer; bunlari koruyoruz
// ki sekme cubugu yerlesimi bozulmasin.
function TabBarButton({
  children,
  onPress,
  onLongPress,
  style,
  accessibilityLabel,
  accessibilityRole,
  accessibilityState,
  testID,
}) {
  return (
    <TVFocusable
      style={[styles.tabButton, style]}
      focusedStyle={styles.tabButtonFocused}
      radius={12}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
      accessibilityState={accessibilityState}
      testID={testID}
    >
      {children}
    </TVFocusable>
  );
}

export default function App() {
  // Android TV'de odak degisimlerini dinleyen native modulu baslat.
  useEffect(() => {
    startTvFocus();
    return () => stopTvFocus();
  }, []);

  return (
    <UpdateGate>
      {/* Ana penceredeki odak degisimlerini dinleyen gorunmez native view. */}
      <TvFocusScope />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: "#151515",
              borderTopColor: "#232323",
              height: 76,
              paddingBottom: 8,
              paddingTop: 6
            },
            tabBarActiveTintColor: "#4a9eff",
            tabBarInactiveTintColor: "#8a8a8a",
            tabBarLabelStyle: { fontSize: 15, fontWeight: "700" },
            tabBarButton: (props) => <TabBarButton {...props} />
          }}
        >
          <Tab.Screen
            name="Siteler"
            component={SitesStack}
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="globe-outline" size={26} color={color} />
            }}
          />
          <Tab.Screen
            name="Favoriler"
            component={FavoritesScreen}
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="star-outline" size={26} color={color} />
            }}
          />
          <Tab.Screen
            name="Ayarlar"
            component={AccountsScreen}
            options={{
              tabBarIcon: ({ color }) => <Ionicons name="settings-outline" size={26} color={color} />
            }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </UpdateGate>
  );
}

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    marginHorizontal: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4
  },
  tabButtonFocused: {
    backgroundColor: "rgba(74,158,255,0.16)"
  }
});
