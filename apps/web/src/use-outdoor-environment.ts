import { useEffect, useRef, useState } from 'react';
import { SolarEnvironmentSchema, type SolarEnvironment } from '@roompilot/domain';
import { resolveOutdoorMode, type OutdoorMode } from './preferences';

export function useOutdoorEnvironment() {
  const [mode, setMode] = useState<OutdoorMode>(() => { try { return resolveOutdoorMode(localStorage.getItem('roompilot.outdoorMode')); } catch { return 'day'; } });
  const [solar, setSolar] = useState<SolarEnvironment | null>(null);
  const [pending, setPending] = useState(true);
  const modeRef = useRef(mode);
  const refreshRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    let active = true;
    let latestRequest = 0;
    const controller = new AbortController();
    async function refresh() {
      const request = ++latestRequest;
      try {
        const response = await fetch('/api/environment', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(5000)]) });
        if (!response.ok) throw new Error('Environment unavailable');
        const parsed = SolarEnvironmentSchema.safeParse(await response.json());
        if (active && request === latestRequest) setSolar(parsed.success ? parsed.data : null);
      } catch { if (active && request === latestRequest) setSolar(null); }
      finally { if (active && request === latestRequest) setPending(false); }
    }
    void refresh();
    refreshRef.current = () => { void refresh(); };
    const timer = setInterval(() => { if (modeRef.current === 'auto') void refresh(); }, 60_000);
    return () => { active = false; controller.abort(); clearInterval(timer); refreshRef.current = null; };
  }, []);
  function changeMode(next: OutdoorMode) {
    modeRef.current = next;
    setMode(next);
    if (next === 'auto') refreshRef.current?.();
    try { localStorage.setItem('roompilot.outdoorMode', next); } catch { /* Private browsing may block preference storage. */ }
  }
  return { mode, changeMode, solar, pending };
}
