'use client';

import { useState } from 'react';
import { Match, Player, ROUND_ORDER } from '@/types/bracket';
import { Round } from './Round';
import { ScoreModal } from '../ScoreModal';

interface BracketProps {
  matches: Match[];
  players: Player[];
  onScoreSubmit: (matchId: number, player1Score: number, player2Score: number) => Promise<void>;
}

export function Bracket({ matches, players, onScoreSubmit }: BracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Create a map for quick player lookup
  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Group matches by round
  const matchesByRound = new Map<string, Match[]>();
  for (const match of matches) {
    const roundMatches = matchesByRound.get(match.round) || [];
    roundMatches.push(match);
    matchesByRound.set(match.round, roundMatches);
  }

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
  };

  const handleScoreSubmit = async (player1Score: number, player2Score: number) => {
    if (!selectedMatch) return;
    await onScoreSubmit(selectedMatch.id, player1Score, player2Score);
    setSelectedMatch(null);
  };

  const selectedPlayer1 = selectedMatch?.player1_id
    ? playerMap.get(selectedMatch.player1_id) || null
    : null;
  const selectedPlayer2 = selectedMatch?.player2_id
    ? playerMap.get(selectedMatch.player2_id) || null
    : null;

  return (
    <>
      <div className="bracket-container">
        <div className="flex gap-8 min-w-max p-4">
          {ROUND_ORDER.map((round) => {
            const roundMatches = matchesByRound.get(round) || [];
            if (roundMatches.length === 0) return null;

            return (
              <Round
                key={round}
                round={round}
                matches={roundMatches}
                players={playerMap}
                onMatchClick={handleMatchClick}
              />
            );
          })}
        </div>
      </div>

      {selectedMatch && selectedPlayer1 && selectedPlayer2 && (
        <ScoreModal
          match={selectedMatch}
          player1={selectedPlayer1}
          player2={selectedPlayer2}
          isOpen={true}
          onClose={() => setSelectedMatch(null)}
          onSubmit={handleScoreSubmit}
        />
      )}
    </>
  );
}
