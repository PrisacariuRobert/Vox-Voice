import { Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Colors } from '../../constants/colors';
import { MicIcon, ClockIcon, GearIcon } from '../../components/Icons';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const color = focused ? Colors.tabActive : Colors.tabInactive;
  const size = 22;
  switch (label) {
    case 'index':
      return <MicIcon size={size} color={color} strokeWidth={1.8} />;
    case 'history':
      return <ClockIcon size={size} color={color} strokeWidth={1.8} />;
    case 'settings':
      return <GearIcon size={size} color={color} strokeWidth={1.8} />;
    default:
      return <View style={{ width: size, height: size }} />;
  }
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' },
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
});
