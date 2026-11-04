import AsyncStorage from '@react-native-async-storage/async-storage';

// Токен устройства — учётка на сервере. Случайная строка, живёт в AsyncStorage рядом с сейвом.
// Сервер хранит только его хэш, поэтому потеря телефона = потеря учётки; ролей это не касается,
// их админ выдаст заново.

const KEY = 'combat.device-token';

let cached: string | null = null;

export function randomToken(rng: () => number = Math.random): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = 'dev-';
  for (let i = 0; i < 32; i++) out += alphabet[Math.floor(rng() * alphabet.length)];
  return out;
}

export async function getDeviceToken(): Promise<string> {
  if (cached) return cached;
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored && stored.length >= 8) {
      cached = stored;
      return stored;
    }
  } catch {
    // Хранилище недоступно (приватный режим в браузере): токен проживёт до перезагрузки.
  }
  const fresh = randomToken();
  cached = fresh;
  try {
    await AsyncStorage.setItem(KEY, fresh);
  } catch {
    // см. выше
  }
  return fresh;
}
