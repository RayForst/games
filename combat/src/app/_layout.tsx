import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { useGame } from '@/store/useGame';
import { colors } from '@/ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const hydrated = useGame((s) => s.hydrated);
  const setHydrated = useGame((s) => s.setHydrated);
  const tick = useGame((s) => s.tick);

  // Страховка: если хранилище не ответило, всё равно показываем приложение.
  useEffect(() => {
    const t = setTimeout(setHydrated, 3000);
    return () => clearTimeout(t);
  }, [setHydrated]);

  useEffect(() => {
    if (!hydrated) return;
    tick();
    SplashScreen.hideAsync().catch(() => {});
  }, [hydrated, tick]);

  // Регенерация hp идёт по часам: пересчитываем при возврате в приложение и раз в 5 секунд.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    const interval = setInterval(tick, 5000);
    return () => {
      sub.remove();
      clearInterval(interval);
    };
  }, [tick]);

  if (!hydrated) return <View style={styles.splash} />;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="create" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="fight"
          options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="stats" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg },
  content: { backgroundColor: colors.bg },
});
