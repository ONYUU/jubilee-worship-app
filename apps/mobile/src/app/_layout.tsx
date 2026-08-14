import { ContentProvider } from "@/features/content/content-provider";
import { NotificationListener } from "@/features/notifications/notification-listener";
import { colors } from "@/theme/tokens";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ContentProvider>
          <NotificationListener />
          <StatusBar style="dark" />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
