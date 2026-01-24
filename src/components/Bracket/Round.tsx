'use client';

import { Match as MatchType, Player, Round as RoundType, ROUND_NAMES } from '@/types/bracket';
import { Match } from './Match';

interface RoundProps {
  round: RoundType;
  matches: MatchType[];
  players: Map<number, Player>;
  onMatchClick: (match: MatchType) => void;
}

export function Round({ round, matches, players, onMatchClick }: RoundProps) {
  // Sort matches by match_number
  const sortedMatches = [...matches].sort((a, b) => a.match_number - b.match_number);

  return (
    <div className="flex flex-col items-center">
      <h3 className="text-sm font-semibold text-gray-600 mb-4 bg-teal-100 px-3 py-1 rounded-full">
        {ROUND_NAMES[round]}
      </h3>
      <div className="flex flex-col gap-4 justify-around min-h-[600px]">
        {sortedMatches.map((match) => (
          <Match
            key={match.id}
            match={match}
            player1={match.player1_id ? players.get(match.player1_id) || null : null}
            player2={match.player2_id ? players.get(match.player2_id) || null : null}
            onClick={() => onMatchClick(match)}
          />
        ))}
      </div>
    </div>
  );
}
