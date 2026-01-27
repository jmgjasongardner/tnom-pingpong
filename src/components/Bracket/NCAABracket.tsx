'use client';

import { useMemo } from 'react';
import { Match, Player, Round } from '@/types/bracket';

interface NCAABracketProps {
  matches: Match[];
  players: Player[];
}

// Compact match display for NCAA-style bracket
function BracketMatch({
  match,
  player1,
  player2,
  position,
}: {
  match: Match;
  player1: Player | null;
  player2: Player | null;
  position: 'top' | 'bottom';
}) {
  const isCompleted = match.status === 'completed';
  const p1Winner = match.winner_id === player1?.id;
  const p2Winner = match.winner_id === player2?.id;

  return (
    <div className="flex flex-col text-xs">
      {/* Player 1 */}
      <div className={`flex items-center border-b border-gray-300 ${position === 'top' ? 'border-t' : ''} ${p1Winner ? 'bg-teal-50 font-semibold' : 'bg-white'}`}>
        <span className="w-6 text-center text-gray-400 bg-gray-50 py-1 border-r border-gray-300">
          {player1?.display_seed || ''}
        </span>
        <span className={`flex-1 px-2 py-1 truncate ${!player1 ? 'text-gray-400 italic' : ''}`}>
          {player1?.name || 'TBD'}
        </span>
        {isCompleted && (
          <span className={`w-6 text-center py-1 ${p1Winner ? 'text-teal-700 font-bold' : 'text-gray-400'}`}>
            {match.player1_score}
          </span>
        )}
      </div>
      {/* Player 2 */}
      <div className={`flex items-center border-b border-gray-300 ${p2Winner ? 'bg-teal-50 font-semibold' : 'bg-white'}`}>
        <span className="w-6 text-center text-gray-400 bg-gray-50 py-1 border-r border-gray-300">
          {player2?.display_seed || ''}
        </span>
        <span className={`flex-1 px-2 py-1 truncate ${!player2 ? 'text-gray-400 italic' : ''}`}>
          {player2?.name || 'TBD'}
        </span>
        {isCompleted && (
          <span className={`w-6 text-center py-1 ${p2Winner ? 'text-teal-700 font-bold' : 'text-gray-400'}`}>
            {match.player2_score}
          </span>
        )}
      </div>
    </div>
  );
}

// Round column with proper bracket lines
function RoundColumn({
  title,
  matches,
  playerMap,
  roundIndex,
  totalRounds,
  isRightSide,
}: {
  title: string;
  matches: Match[];
  playerMap: Map<number, Player>;
  roundIndex: number;
  totalRounds: number;
  isRightSide: boolean;
}) {
  // Calculate spacing based on round
  // Each round doubles the spacing from the previous
  const baseHeight = 48; // Height of one match
  const baseGap = 8;
  const multiplier = Math.pow(2, roundIndex);
  const matchGap = (multiplier - 1) * baseHeight + baseGap * multiplier;
  const topPadding = roundIndex > 0 ? (multiplier - 1) * (baseHeight / 2 + baseGap / 2) : 0;

  return (
    <div className="flex flex-col flex-shrink-0" style={{ width: 140 }}>
      {/* Round header */}
      <div className="text-center mb-2 h-6">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
          {title}
        </span>
      </div>

      {/* Matches */}
      <div
        className="flex flex-col"
        style={{ gap: matchGap, paddingTop: topPadding }}
      >
        {matches.map((match, idx) => {
          const player1 = match.player1_id ? playerMap.get(match.player1_id) || null : null;
          const player2 = match.player2_id ? playerMap.get(match.player2_id) || null : null;

          return (
            <div key={match.id} className="relative">
              <BracketMatch
                match={match}
                player1={player1}
                player2={player2}
                position={idx === 0 ? 'top' : 'bottom'}
              />
              {/* Connector line to next round */}
              {roundIndex < totalRounds - 1 && (
                <div
                  className={`absolute top-1/2 ${isRightSide ? 'right-0 -mr-4' : 'left-full'} w-4 border-t-2 border-gray-300`}
                  style={{ transform: 'translateY(-50%)' }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NCAABracket({ matches, players }: NCAABracketProps) {
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  // Group and sort matches by round
  const matchesByRound = useMemo(() => {
    const byRound = new Map<Round, Match[]>();
    for (const match of matches) {
      const arr = byRound.get(match.round) || [];
      arr.push(match);
      byRound.set(match.round, arr);
    }
    // Sort by match_number within each round
    for (const [, arr] of byRound) {
      arr.sort((a, b) => a.match_number - b.match_number);
    }
    return byRound;
  }, [matches]);

  // Define round structure for display
  // Left side: Play-in → Round 2 → Round 3 → Round 4 → Sweet 16 (top half)
  // Right side: Sweet 16 (bottom half) ← Elite 8 ← Final Four ← Championship

  const leftRounds: { round: Round; title: string }[] = [
    { round: 'play_in', title: 'Play-In' },
    { round: 'round_2', title: 'Round of 64' },
    { round: 'round_3', title: 'Round of 32' },
    { round: 'round_4', title: 'Round of 16' },
  ];

  const centerRounds: { round: Round; title: string }[] = [
    { round: 'sweet_16', title: 'Sweet 16' },
    { round: 'elite_8', title: 'Elite 8' },
    { round: 'final_four', title: 'Final Four' },
    { round: 'championship', title: 'Championship' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-full overflow-x-auto">
        <div className="flex gap-1 justify-center min-w-max">
          {/* Left side rounds */}
          {leftRounds.map(({ round, title }, idx) => {
            const roundMatches = matchesByRound.get(round) || [];
            if (roundMatches.length === 0) return null;

            return (
              <RoundColumn
                key={round}
                title={title}
                matches={roundMatches}
                playerMap={playerMap}
                roundIndex={idx}
                totalRounds={leftRounds.length + centerRounds.length}
                isRightSide={false}
              />
            );
          })}

          {/* Center/Right rounds */}
          {centerRounds.map(({ round, title }, idx) => {
            const roundMatches = matchesByRound.get(round) || [];
            if (roundMatches.length === 0) return null;

            return (
              <RoundColumn
                key={round}
                title={title}
                matches={roundMatches}
                playerMap={playerMap}
                roundIndex={leftRounds.length + idx}
                totalRounds={leftRounds.length + centerRounds.length}
                isRightSide={false}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
