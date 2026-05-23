import { useEffect } from 'react';

interface ShortcutMap {
  refresh?: () => void;
  export?: () => void;
  settings?: () => void;
  closeTab?: () => void;
  goTo?: (id: string) => void;
  escape?: () => void;
}

export default function useKeyboardShortcuts(handlers: ShortcutMap): void {
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === 'r') { e.preventDefault(); handlers.refresh?.(); }
      else if (ctrl && e.key === 'e') { e.preventDefault(); handlers.export?.(); }
      else if (ctrl && e.key === ',') { e.preventDefault(); handlers.settings?.(); }
      else if (ctrl && e.key === 'w') { e.preventDefault(); handlers.closeTab?.(); }
      else if (ctrl && e.key === '1') { e.preventDefault(); handlers.goTo?.('IN'); }
      else if (ctrl && e.key === '2') { e.preventDefault(); handlers.goTo?.('US'); }
      else if (ctrl && e.key === 'k') { e.preventDefault(); handlers.goTo?.('watchlist'); }
      else if (e.key === 'Escape') { handlers.escape?.(); }
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [handlers]);
}
