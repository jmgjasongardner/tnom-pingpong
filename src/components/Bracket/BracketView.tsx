'use client';

import { useMemo } from 'react';
import { Match, Player, Round } from '@/types/bracket';
import { useRealTimeMatches } from '@/hooks/useRealTimeMatches';

interface BracketViewProps {
  matches: Match[];
  players: Player[];
}

// Single match display - minimal style
function MatchCell({
  match,
  player1,
  player2,
  width = 130,
}: {
  match: Match;
  player1: Player | null;
  player2: Player | null;
  width?: number;
}) {
  const isCompleted = match.status === 'completed';
  const p1Winner = match.winner_id === player1?.id;
  const p2Winner = match.winner_id === player2?.id;

  return (
    <div
      className="bg-white border border-gray-300 text-[11px] overflow-hidden"
      style={{ width }}
    >
      <div className={`flex items-center border-b border-gray-200 ${p1Winner ? 'bg-teal-50 font-semibold' : ''}`}>
        <span className="w-5 text-center py-0.5 bg-gray-50 text-gray-400 border-r border-gray-200 text-[10px]">
          {player1?.display_seed || ''}
        </span>
        <span className={`flex-1 px-1 py-0.5 truncate ${!player1 ? 'text-gray-400 italic' : ''}`}>
          {player1?.name || 'TBD'}
        </span>
        {isCompleted && (
          <span className={`px-1 ${p1Winner ? 'text-teal-600 font-bold' : 'text-gray-400'}`}>
            {match.player1_score}
          </span>
        )}
      </div>
      <div className={`flex items-center ${p2Winner ? 'bg-teal-50 font-semibold' : ''}`}>
        <span className="w-5 text-center py-0.5 bg-gray-50 text-gray-400 border-r border-gray-200 text-[10px]">
          {player2?.display_seed || ''}
        </span>
        <span className={`flex-1 px-1 py-0.5 truncate ${!player2 ? 'text-gray-400 italic' : ''}`}>
          {player2?.name || 'TBD'}
        </span>
        {isCompleted && (
          <span className={`px-1 ${p2Winner ? 'text-teal-600 font-bold' : 'text-gray-400'}`}>
            {match.player2_score}
          </span>
        )}
      </div>
    </div>
  );
}

function BracketDisplay({ matches, players }: { matches: Match[]; players: Player[] }) {
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);

  // Group matches by round
  const matchesByRound = useMemo(() => {
    const byRound = new Map<Round, Match[]>();
    for (const match of matches) {
      const arr = byRound.get(match.round) || [];
      arr.push(match);
      byRound.set(match.round, arr);
    }
    for (const [, arr] of byRound) {
      arr.sort((a, b) => a.match_number - b.match_number);
    }
    return byRound;
  }, [matches]);

  // Build the bracket tree structure
  // We need to position matches based on where they feed into
  const matchById = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches]);

  // Find feeders for each match
  const feedersMap = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const match of matches) {
      if (match.next_match_id) {
        const feeders = map.get(match.next_match_id) || [];
        feeders.push(match.id);
        map.set(match.next_match_id, feeders);
      }
    }
    // Sort feeders by match_number
    for (const [, feeders] of map) {
      feeders.sort((a, b) => {
        const ma = matchById.get(a);
        const mb = matchById.get(b);
        return (ma?.match_number || 0) - (mb?.match_number || 0);
      });
    }
    return map;
  }, [matches, matchById]);

  // Calculate positions using tree layout
  // Start from championship and work backwards
  const positions = useMemo(() => {
    const pos = new Map<number, { x: number; y: number }>();

    const matchHeight = 36;
    const matchWidth = 130;
    const horizontalGap = 20;
    const baseVerticalGap = 4;

    // Round order and their x-positions (left to right)
    const roundOrder: Round[] = ['play_in', 'round_2', 'round_3', 'round_4', 'sweet_16', 'elite_8', 'final_four', 'championship'];
    const roundX = new Map<Round, number>();
    roundOrder.forEach((round, idx) => {
      roundX.set(round, idx * (matchWidth + horizontalGap));
    });

    // Start with Round 4 as base (16 matches, evenly spaced)
    // This is where the main bracket structure is defined
    const round4Matches = matchesByRound.get('round_4') || [];
    const r4Height = matchHeight + baseVerticalGap;

    round4Matches.forEach((match, idx) => {
      pos.set(match.id, {
        x: roundX.get('round_4') || 0,
        y: idx * r4Height * 2 + r4Height / 2, // Double spacing for tree structure
      });
    });

    // Position Sweet 16 onwards (center between feeders)
    const laterRounds: Round[] = ['sweet_16', 'elite_8', 'final_four', 'championship'];
    for (const round of laterRounds) {
      const roundMatches = matchesByRound.get(round) || [];
      const x = roundX.get(round) || 0;

      for (const match of roundMatches) {
        const feeders = feedersMap.get(match.id) || [];
        if (feeders.length >= 2) {
          const p1 = pos.get(feeders[0]);
          const p2 = pos.get(feeders[1]);
          if (p1 && p2) {
            pos.set(match.id, { x, y: (p1.y + p2.y) / 2 });
          }
        } else if (feeders.length === 1) {
          const p = pos.get(feeders[0]);
          if (p) pos.set(match.id, { x, y: p.y });
        }
      }
    }

    // Position earlier rounds (align with where they feed into)
    const earlierRounds: Round[] = ['round_3', 'round_2', 'play_in'];
    for (const round of earlierRounds) {
      const roundMatches = matchesByRound.get(round) || [];
      const x = roundX.get(round) || 0;

      for (const match of roundMatches) {
        if (match.next_match_id) {
          const nextPos = pos.get(match.next_match_id);
          const nextMatch = matchById.get(match.next_match_id);

          if (nextPos && nextMatch) {
            // Find which slot this match feeds into (1 or 2)
            const feeders = feedersMap.get(match.next_match_id) || [];
            const slotIndex = feeders.indexOf(match.id);

            // If this round has 1:1 mapping to next round, align directly
            // Otherwise, offset based on slot
            const nextRoundMatches = matchesByRound.get(nextMatch.round) || [];
            const thisRoundMatches = roundMatches;

            if (thisRoundMatches.length === nextRoundMatches.length) {
              // 1:1 mapping - align directly
              pos.set(match.id, { x, y: nextPos.y });
            } else {
              // 2:1 mapping - offset above/below
              const offset = r4Height / 2;
              pos.set(match.id, {
                x,
                y: nextPos.y + (slotIndex === 0 ? -offset : offset),
              });
            }
          }
        }
      }
    }

    return pos;
  }, [matchesByRound, feedersMap, matchById]);

  // Calculate SVG dimensions
  const maxY = Math.max(...Array.from(positions.values()).map(p => p.y)) + 50;
  const maxX = Math.max(...Array.from(positions.values()).map(p => p.x)) + 150;

  // Generate connector lines
  const connectors: JSX.Element[] = [];
  const matchWidth = 130;
  const matchHeight = 36;

  for (const match of matches) {
    if (match.next_match_id) {
      const fromPos = positions.get(match.id);
      const toPos = positions.get(match.next_match_id);

      if (fromPos && toPos) {
        const fromX = fromPos.x + matchWidth;
        const fromY = fromPos.y + matchHeight / 2;
        const toX = toPos.x;
        const toY = toPos.y + matchHeight / 2;
        const midX = fromX + (toX - fromX) / 2;

        const isCompleted = match.status === 'completed';
        const color = isCompleted ? '#14b8a6' : '#d1d5db';

        connectors.push(
          <g key={`conn-${match.id}`}>
            <line x1={fromX} y1={fromY} x2={midX} y2={fromY} stroke={color} strokeWidth="1.5" />
            <line x1={midX} y1={fromY} x2={midX} y2={toY} stroke={color} strokeWidth="1.5" />
            <line x1={midX} y1={toY} x2={toX} y2={toY} stroke={color} strokeWidth="1.5" />
          </g>
        );
      }
    }
  }

  // Round labels
  const roundLabels: { round: Round; label: string }[] = [
    { round: 'play_in', label: 'Play-In' },
    { round: 'round_2', label: 'Round 2' },
    { round: 'round_3', label: 'Round 3' },
    { round: 'round_4', label: 'Round 4' },
    { round: 'sweet_16', label: 'Sweet 16' },
    { round: 'elite_8', label: 'Elite 8' },
    { round: 'final_four', label: 'Final 4' },
    { round: 'championship', label: 'Finals' },
  ];

  return (
    <div className="overflow-auto p-4">
      {/* Round headers */}
      <div className="flex mb-2" style={{ paddingLeft: 0 }}>
        {roundLabels.map(({ round, label }, idx) => {
          const roundMatches = matchesByRound.get(round) || [];
          if (roundMatches.length === 0) return null;

          return (
            <div
              key={round}
              className="text-[10px] font-semibold text-gray-500 uppercase text-center"
              style={{ width: 130, marginRight: 20 }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Bracket */}
      <div className="relative" style={{ width: maxX, height: maxY }}>
        {/* Connector lines */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={maxX}
          height={maxY}
          style={{ overflow: 'visible' }}
        >
          {connectors}
        </svg>

        {/* Match cards */}
        {matches.map((match) => {
          const p = positions.get(match.id);
          if (!p) return null;

          const player1 = match.player1_id ? playerMap.get(match.player1_id) || null : null;
          const player2 = match.player2_id ? playerMap.get(match.player2_id) || null : null;

          return (
            <div
              key={match.id}
              className="absolute"
              style={{ left: p.x, top: p.y }}
            >
              <MatchCell match={match} player1={player1} player2={player2} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BracketView({ matches: initialMatches, players }: BracketViewProps) {
  const { matches } = useRealTimeMatches(initialMatches);
  return <BracketDisplay matches={matches} players={players} />;
}
