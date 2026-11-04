import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';

import { LOCATIONS_BY_ID } from '@/game';
import { useGame } from '@/store/useGame';
import { colors } from '@/ui/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color} size={size} />;
  }
  return TabIcon;
}

export default function TabsLayout() {
  const location = useGame((s) => s.character?.location ?? 'city');
  const traveling = useGame((s) => !!s.travel);
  const placeTitle = traveling ? 'В пути' : LOCATIONS_BY_ID[location].name;
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
      <Tabs.Screen name="city" options={{ title: placeTitle, tabBarIcon: icon(traveling ? 'walk' : location === 'city' ? 'map' : location === 'brod' ? 'business' : 'leaf') }} />
      <Tabs.Screen name="character" options={{ title: 'Персонаж', tabBarIcon: icon('person') }} />
      <Tabs.Screen name="backpack" options={{ title: 'Рюкзак', tabBarIcon: icon('bag-handle') }} />
    </Tabs>
  );
}
