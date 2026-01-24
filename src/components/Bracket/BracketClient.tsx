'use client';

import { Match, Player } from '@/types/bracket';
import { useRealTimeMatches } from '@/hooks/useRealTimeMatches';
import { Bracket } from './Bracket';

interface BracketClientProps {
  initialMatches: Match[];
  players: Player[];
}

export function BracketClient({ initialMatches, players }: BracketClientProps) {
  const { matches } = useRealTimeMatches(initialMatches);

  const handleScoreSubmit = async (
    matchId: number,
    player1Score: number,
    player2Score: number
  ) => {
    const response = await fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        player1_score: player1Score,
        player2_score: player2Score,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update match');
    }
  };

  return (
    <Bracket
      matches={matches}
      players={players}
      onScoreSubmit={handleScoreSubmit}
    />
  );
}
