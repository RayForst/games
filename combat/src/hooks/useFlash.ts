import { useCallback, useEffect, useRef, useState } from 'react';

/** Короткое сообщение, которое само исчезает — вместо назойливых Alert. */
export function useFlash(ms = 1800): [string | null, (text: string) => void] {
  const [text, setText] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback(
    (t: string) => {
      setText(t);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setText(null), ms);
    },
    [ms],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return [text, flash];
}
