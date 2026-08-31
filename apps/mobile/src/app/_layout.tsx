import { ContentProvider } from "@/features/content/content-provider";
import { NotificationListener } from "@/features/notifications/notification-listener";
import { ThemeProvider, useAppTheme } from "@/theme/theme-provider";
import { Image } from "expo-image";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export const unstable_settings = {
  initialRouteName: "(tabs)"
};

SplashScreen.setOptions({ duration: 0, fade: false });
void SplashScreen.preventAutoHideAsync().catch(() => undefined);

const STARTUP_SPLASH_HOLD_MS = 550;
const startupSplash = {
  light: require("../../assets/images/jubilee/splash-light-title.png"),
  dark: require("../../assets/images/jubilee/splash-dark-title.png")
} as const;

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedRootLayout />
    </ThemeProvider>
  );
}

function ThemedRootLayout() {
  const { colors, mode } = useAppTheme();
  const [startupImageReady, setStartupImageReady] = useState(false);
  const [startupVisible, setStartupVisible] = useState(true);

  useEffect(() => {
    if (!startupImageReady) return;
    void SplashScreen.hideAsync().catch(() => undefined);
    const timeout = setTimeout(() => setStartupVisible(false), STARTUP_SPLASH_HOLD_MS);
    return () => clearTimeout(timeout);
  }, [startupImageReady]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ContentProvider>
          <NotificationListener />
          <StatusBar style={mode === "dark" ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: "slide_from_right"
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="worship/[slug]/index" />
            <Stack.Screen name="worship/[slug]/songlist" />
            <Stack.Screen name="notifications/index" />
            <Stack.Screen name="notification-settings/index" />
            <Stack.Screen name="privacy/index" />
          </Stack>
        </ContentProvider>
        {startupVisible ? (
          <View
            accessible={false}
            style={[styles.startupSplash, { backgroundColor: colors.background }]}
          >
            <Image
              source={startupSplash[mode]}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              cachePolicy="memory"
              onLoad={() => setStartupImageReady(true)}
              onError={() => setStartupImageReady(true)}
            />
          </View>
        ) : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  startupSplash: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000
  }
});
