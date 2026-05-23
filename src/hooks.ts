import { useState, useRef, useCallback } from 'react';
import { yahooSearch, type SearchQuote } from './utils';
import { getItemSync, setItemSync } from './storage';

export function useYahooSearch() {
  const [srch, setSrch] = useState('');
  const [results, setResults] = useState<SearchQuote[]>([]);
  const [focused, setFocused] = useState(false);
  const [busyS, setBusyS] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback((q: string) => {
    setSrch(q);
    clearTimeout(timer.current!);
    if (!q.trim()) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setBusyS(true);
      try {
        const found = await yahooSearch(q);
        setResults(found);
      } catch { setResults([]); }
      setBusyS(false);
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setSrch('');
    setResults([]);
  }, []);

  return { srch, setSrch, results, setResults, focused, setFocused, busyS, doSearch, clearSearch };
}

export function useNotes() {
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(getItemSync('pm_notes') || '{}'); }
    catch { return {}; }
  });
  const saveNote = (sym: string, text: string) => {
    setNotes(p => {
      const n = { ...p };
      if (text.trim()) n[sym] = text; else delete n[sym];
      setItemSync('pm_notes', JSON.stringify(n));
      return n;
    });
  };
  return { notes, saveNote };
}
