import { Redirect } from 'expo-router';

import { useGame } from '@/store/useGame';

export default function Index() {
  const character = useGame((s) => s.character);
  const fight = useGame((s) => s.fight);

  if (!character) return <Redirect href="/create" />;
  if (fight?.status === 'active') return <Redirect href="/fight" />;
  return <Redirect href="/(tabs)/city" />;
}
