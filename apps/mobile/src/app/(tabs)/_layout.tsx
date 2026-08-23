import { useAppTheme } from "@/theme/theme-provider";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

type IconName = ComponentProps<typeof Ionicons>["name"];

function tabIcon(name: IconName, focusedName: IconName) {
  function TabBarIcon({
    color,
    size,
    focused
  }: {
    color: ColorValue;
    size: number;
    focused: boolean;
  }) {
    return <Ionicons name={focused ? focusedName : name} color={String(color)} size={size} />;
  }
  return TabBarIcon;
}

export default function TabsLayout() {
  const { colors } = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.active,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.navigation,
          borderTopColor: colors.line,
          paddingTop: 8
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
        sceneStyle: { backgroundColor: colors.background }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "홈", tabBarIcon: tabIcon("home-outline", "home") }}
      />
      <Tabs.Screen
        name="worship/index"
        options={{ title: "예배", tabBarIcon: tabIcon("calendar-outline", "calendar") }}
      />
      <Tabs.Screen
        name="media/index"
        options={{ title: "미디어", tabBarIcon: tabIcon("play-circle-outline", "play-circle") }}
      />
      <Tabs.Screen
        name="guide/index"
        options={{
          title: "안내",
          tabBarIcon: tabIcon("information-circle-outline", "information-circle")
        }}
      />
    </Tabs>
  );
}
