import { Tabs } from "expo-router";
import { Text } from "react-native";
import { theme } from "../../src/theme/theme";

function EmojiIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.orange2,
        tabBarInactiveTintColor: theme.colors.onDark3,
        tabBarStyle: {
          backgroundColor: theme.colors.navy,
          borderTopWidth: 0,
          height: 82,
          paddingTop: 8,
          paddingBottom: 14,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 2,
        },
        tabBarLabelStyle: {
          fontFamily: theme.fontFamily.bodyBold,
          fontSize: 9,
          letterSpacing: 0.4,
          textTransform: "uppercase",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: () => <EmojiIcon emoji="🏠" />,
        }}
      />

      <Tabs.Screen
        name="planner"
        options={{
          title: "Planner",
          tabBarIcon: () => <EmojiIcon emoji="📋" />,
        }}
      />

      <Tabs.Screen
        name="recipes"
        options={{
          title: "Recipes",
          tabBarIcon: () => <EmojiIcon emoji="🍲" />,
        }}
      />

      <Tabs.Screen
        name="shopping"
        options={{
          title: "Shopping",
          tabBarIcon: () => <EmojiIcon emoji="🛒" />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: () => <EmojiIcon emoji="👤" />,
        }}
      />
    </Tabs>
  );
}
