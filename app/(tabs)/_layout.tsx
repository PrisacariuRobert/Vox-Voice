import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Colors } from '../../constants/colors';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    index: '◉',
    history: '◎',
    settings: '⚙',
  };
  return (
    <Text style={[styles.icon, focused ? styles.iconActive : styles.iconInactive]}>
      {icons[label] ?? '●'}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Voice',
          tabBarIcon: ({ focused }) => <TabIcon label="index" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ focused }) => <TabIcon label="history" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon label="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopColor: Colors.tabBarBorder,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    height: 80,
  },
  tabLabel: {
    fontFamily: 'Syne_500Medium',
    fontSize: 11,
    marginBottom: 4,
  },
  icon: {
    fontSize: 20,
  },
  iconActive: {
    color: Colors.tabActive,
  },
  iconInactive: {
    color: Colors.tabInactive,
  },
});
