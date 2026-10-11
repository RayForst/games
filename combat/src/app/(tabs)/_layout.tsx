import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { colors } from '@/ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.bgElevated, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="character" options={{ title: 'Персонаж', tabBarIcon: icon('person') }} />
      <Tabs.Screen name="arena" options={{ title: 'Зал боя', tabBarIcon: icon('skull') }} />
      <Tabs.Screen name="shop" options={{ title: 'Магазин', tabBarIcon: icon('storefront') }} />
      <Tabs.Screen name="backpack" options={{ title: 'Рюкзак', tabBarIcon: icon('bag-handle') }} />
    </Tabs>
  );
}
