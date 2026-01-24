'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Match } from '@/types/bracket';

export function useRealTimeMatches(initialMatches: Match[]) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to all changes on matches table
    const channel = supabase
      .channel('matches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setMatches((prev) =>
              prev.map((m) =>
                m.id === payload.new.id ? { ...m, ...payload.new } as Match : m
              )
            );
          } else if (payload.eventType === 'INSERT') {
            setMatches((prev) => [...prev, payload.new as Match]);
          } else if (payload.eventType === 'DELETE') {
            setMatches((prev) =>
              prev.filter((m) => m.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const updateMatch = useCallback((matchId: number, updates: Partial<Match>) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, ...updates } : m))
    );
  }, []);

  return { matches, updateMatch };
}
