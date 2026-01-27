'use client';

import React, { useMemo } from 'react';
import { Match, Player, Round } from '@/types/bracket';
import { useRealTimeMatches } from '@/hooks/useRealTimeMatches';

interface QuadrantBracketProps {
  matches: Match[];
  players: Player[];
}

// Quadrant names for headers
const QUADRANT_NAMES: Record<number, string> = {
  1: 'Arlington',
  2: 'Albuquerque',
  3: 'Troy',
  4: 'Ottawa',
};

// Match cell component
function MatchCell({
  match,
  player1,
  player2,
  p1ScoreOverride,
  p2ScoreOverride,
  width = 120,
  mirrored = false,
}: {
  match: Match;
  player1: Player | null;
  player2: Player | null;
  p1ScoreOverride?: number | null;
  p2ScoreOverride?: number | null;
  width?: number;
  mirrored?: boolean;
}) {
  const isCompleted = match.status === 'completed';
  const p1Winner = match.winner_id === player1?.id;
  const p2Winner = match.winner_id === player2?.id;
  const p1Score = p1ScoreOverride !== undefined ? p1ScoreOverride : match.player1_score;
  const p2Score = p2ScoreOverride !== undefined ? p2ScoreOverride : match.player2_score;

  const PlayerRow = ({ player, isWinner, score }: { player: Player | null; isWinner: boolean; score: number | null }) => (
    <div className={`flex items-center ${mirrored ? 'flex-row-reverse' : ''} ${isWinner ? 'bg-teal-50 font-semibold' : ''}`}>
      <span className={`w-5 text-center py-0.5 bg-gray-50 text-gray-400 ${mirrored ? 'border-l' : 'border-r'} border-gray-200 text-[10px]`}>
        {player?.display_seed || ''}
      </span>
      <span className={`flex-1 px-1 py-0.5 truncate ${!player ? 'text-gray-400 italic' : ''} ${mirrored ? 'text-right' : ''}`}>
        {player?.name || 'TBD'}
      </span>
      {isCompleted && (
        <span className={`px-1 ${isWinner ? 'text-teal-600 font-bold' : 'text-gray-400'}`}>
          {score}
        </span>
      )}
    </div>
  );

  return (
    <div
      className="bg-white border border-gray-300 text-[11px] overflow-hidden"
      style={{ width }}
    >
      <div className="border-b border-gray-200">
        <PlayerRow player={player1} isWinner={p1Winner} score={p1Score} />
      </div>
      <PlayerRow player={player2} isWinner={p2Winner} score={p2Score} />
    </div>
  );
}

// Rounds that appear in quadrants (before Final Four)
const QUADRANT_ROUNDS: Round[] = ['play_in', 'round_2', 'round_3', 'round_4', 'sweet_16', 'elite_8'];

const ROUND_LABELS: Record<Round, string> = {
  play_in: 'Play-In',
  round_2: 'Round 2',
  round_3: 'Round 3',
  round_4: 'Round 4',
  sweet_16: 'Sweet 16',
  elite_8: 'Elite 8',
  final_four: 'Final Four',
  championship: 'Championship',
};

function QuadrantDisplay({ matches, players }: { matches: Match[]; players: Player[] }) {
  const playerMap = useMemo(() => new Map(players.map(p => [p.id, p])), [players]);
  const matchById = useMemo(() => new Map(matches.map(m => [m.id, m])), [matches]);

  // Group matches by quadrant
  const matchesByQuadrant = useMemo(() => {
    const byQuadrant = new Map<number | null, Match[]>();
    for (const match of matches) {
      const q = match.quadrant;
      const arr = byQuadrant.get(q) || [];
      arr.push(match);
      byQuadrant.set(q, arr);
    }
    return byQuadrant;
  }, [matches]);

  // Final Four and Championship (quadrant = null)
  const finalMatches = useMemo(() => {
    return matches.filter(m => m.round === 'final_four' || m.round === 'championship');
  }, [matches]);

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
    for (const [, feeders] of map) {
      feeders.sort((a, b) => {
        const ma = matchById.get(a);
        const mb = matchById.get(b);
        return (ma?.match_number || 0) - (mb?.match_number || 0);
      });
    }
    return map;
  }, [matches, matchById]);

  // Layout constants
  const matchWidth = 120;
  const matchHeight = 36;
  const horizontalGap = 16;
  const baseVerticalGap = 4;
  const baseUnit = matchHeight + baseVerticalGap;

  // Calculate positions within a quadrant
  const calculateQuadrantPositions = (
    quadrantMatches: Match[],
    mirrored: boolean
  ): Map<number, { x: number; y: number }> => {
    const pos = new Map<number, { x: number; y: number }>();

    // Group by round
    const byRound = new Map<Round, Match[]>();
    for (const match of quadrantMatches) {
      const arr = byRound.get(match.round) || [];
      arr.push(match);
      byRound.set(match.round, arr);
    }

    // Sort within rounds by quadrant_match_num for consistent ordering
    for (const [, arr] of byRound) {
      arr.sort((a, b) => (a.quadrant_match_num ?? 0) - (b.quadrant_match_num ?? 0));
    }

    // Count matches in each round for this quadrant
    const roundCounts: { round: Round; count: number }[] = QUADRANT_ROUNDS.map(r => ({
      round: r,
      count: (byRound.get(r) || []).length,
    })).filter(r => r.count > 0);

    // Find the round with most matches to determine total height
    const maxMatches = Math.max(...roundCounts.map(r => r.count), 1);
    const totalHeight = maxMatches * baseUnit;

    // Calculate x positions for rounds
    const roundX = new Map<Round, number>();
    let xPos = 0;
    const roundsInOrder = mirrored ? [...QUADRANT_ROUNDS].reverse() : QUADRANT_ROUNDS;

    for (const round of roundsInOrder) {
      if (byRound.has(round)) {
        roundX.set(round, xPos);
        xPos += matchWidth + horizontalGap;
      }
    }

    // Position matches - center vertically based on feeders or evenly distribute
    for (const round of QUADRANT_ROUNDS) {
      const roundMatches = byRound.get(round) || [];
      if (roundMatches.length === 0) continue;

      const x = roundX.get(round) || 0;
      const count = roundMatches.length;
      const spacing = totalHeight / count;
      const startOffset = spacing / 2 - matchHeight / 2;

      roundMatches.forEach((match, idx) => {
        pos.set(match.id, {
          x,
          y: startOffset + idx * spacing,
        });
      });
    }

    return pos;
  };

  // Get quadrant dimensions
  const getQuadrantDimensions = (quadrantMatches: Match[]) => {
    const byRound = new Map<Round, Match[]>();
    for (const match of quadrantMatches) {
      const arr = byRound.get(match.round) || [];
      arr.push(match);
      byRound.set(match.round, arr);
    }

    const roundCount = QUADRANT_ROUNDS.filter(r => byRound.has(r)).length;
    const maxMatches = Math.max(...QUADRANT_ROUNDS.map(r => (byRound.get(r) || []).length), 1);

    return {
      width: roundCount * (matchWidth + horizontalGap),
      height: maxMatches * baseUnit,
    };
  };

  // Generate connectors for a quadrant
  const generateConnectors = (
    quadrantMatches: Match[],
    positions: Map<number, { x: number; y: number }>,
    mirrored: boolean
  ): React.ReactNode[] => {
    const connectors: React.ReactNode[] = [];

    for (const match of quadrantMatches) {
      if (match.next_match_id) {
        const nextMatch = matchById.get(match.next_match_id);
        // Only draw connector if next match is in same quadrant
        if (!nextMatch || nextMatch.quadrant !== match.quadrant) continue;

        const fromPos = positions.get(match.id);
        const toPos = positions.get(match.next_match_id);

        if (fromPos && toPos) {
          const fromX = mirrored ? fromPos.x : fromPos.x + matchWidth;
          const fromY = fromPos.y + matchHeight / 2;
          const toX = mirrored ? toPos.x + matchWidth : toPos.x;
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

    return connectors;
  };

  // Render a single quadrant
  const renderQuadrant = (
    quadrant: number,
    mirrored: boolean,
    position: 'top' | 'bottom'
  ) => {
    const quadrantMatches = (matchesByQuadrant.get(quadrant) || []).filter(
      m => QUADRANT_ROUNDS.includes(m.round)
    );

    if (quadrantMatches.length === 0) return null;

    const positions = calculateQuadrantPositions(quadrantMatches, mirrored);
    const dimensions = getQuadrantDimensions(quadrantMatches);
    const connectors = generateConnectors(quadrantMatches, positions, mirrored);

    // Get rounds that exist in this quadrant
    const byRound = new Map<Round, Match[]>();
    for (const match of quadrantMatches) {
      const arr = byRound.get(match.round) || [];
      arr.push(match);
      byRound.set(match.round, arr);
    }
    const roundsPresent = QUADRANT_ROUNDS.filter(r => byRound.has(r));
    const displayRounds = mirrored ? [...roundsPresent].reverse() : roundsPresent;

    return (
      <div className="flex flex-col">
        {/* Quadrant header */}
        <div className={`text-sm font-bold text-gray-700 mb-2 ${mirrored ? 'text-right' : ''}`}>
          {QUADRANT_NAMES[quadrant]}
        </div>

        {/* Round labels */}
        <div className="flex mb-1">
          {displayRounds.map((round, idx) => (
            <div
              key={round}
              className="text-[9px] font-semibold text-gray-400 uppercase text-center"
              style={{
                width: matchWidth,
                marginLeft: idx > 0 ? horizontalGap : 0,
              }}
            >
              {ROUND_LABELS[round]}
            </div>
          ))}
        </div>

        {/* Bracket area */}
        <div className="relative" style={{ width: dimensions.width, height: dimensions.height }}>
          <svg
            className="absolute top-0 left-0 pointer-events-none"
            width={dimensions.width}
            height={dimensions.height}
            style={{ overflow: 'visible' }}
          >
            {connectors}
          </svg>

          {quadrantMatches.map((match) => {
            const p = positions.get(match.id);
            if (!p) return null;

            let player1 = match.player1_id ? playerMap.get(match.player1_id) || null : null;
            let player2 = match.player2_id ? playerMap.get(match.player2_id) || null : null;
            let p1Score = match.player1_score;
            let p2Score = match.player2_score;

            // Ensure better seed (lower display_seed) is always on top
            const seed1 = player1?.display_seed ?? 999;
            const seed2 = player2?.display_seed ?? 999;
            if (seed2 < seed1) {
              [player1, player2] = [player2, player1];
              [p1Score, p2Score] = [p2Score, p1Score];
            }

            return (
              <div
                key={match.id}
                className="absolute"
                style={{ left: p.x, top: p.y }}
              >
                <MatchCell
                  match={match}
                  player1={player1}
                  player2={player2}
                  p1ScoreOverride={p1Score}
                  p2ScoreOverride={p2Score}
                  width={matchWidth}
                  mirrored={mirrored}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper to render a match with better seed on top
  const renderMatchWithSeedOrder = (match: Match) => {
    let player1 = match.player1_id ? playerMap.get(match.player1_id) || null : null;
    let player2 = match.player2_id ? playerMap.get(match.player2_id) || null : null;
    let p1Score = match.player1_score;
    let p2Score = match.player2_score;

    const seed1 = player1?.display_seed ?? 999;
    const seed2 = player2?.display_seed ?? 999;
    if (seed2 < seed1) {
      [player1, player2] = [player2, player1];
      [p1Score, p2Score] = [p2Score, p1Score];
    }

    return (
      <MatchCell
        match={match}
        player1={player1}
        player2={player2}
        p1ScoreOverride={p1Score}
        p2ScoreOverride={p2Score}
        width={matchWidth}
      />
    );
  };

  // Render Final Four and Championship
  const renderFinalRounds = () => {
    const ff1 = finalMatches.find(m => m.round === 'final_four' && m.match_number === 1);
    const ff2 = finalMatches.find(m => m.round === 'final_four' && m.match_number === 2);
    const championship = finalMatches.find(m => m.round === 'championship');

    const centerWidth = matchWidth + 40;
    const finalHeight = 280;

    return (
      <div
        className="flex flex-col items-center justify-center px-4"
        style={{ width: centerWidth, minHeight: finalHeight }}
      >
        {/* Final Four label */}
        <div className="text-[9px] font-semibold text-gray-400 uppercase mb-2">
          Final Four
        </div>

        {/* FF Match 1 (Q1 vs Q4) */}
        {ff1 && (
          <div className="mb-4">
            {renderMatchWithSeedOrder(ff1)}
          </div>
        )}

        {/* Championship */}
        {championship && (
          <div className="my-4">
            <div className="text-[9px] font-semibold text-gray-400 uppercase mb-1 text-center">
              Championship
            </div>
            {renderMatchWithSeedOrder(championship)}
          </div>
        )}

        {/* FF Match 2 (Q2 vs Q3) */}
        {ff2 && (
          <div className="mt-4">
            {renderMatchWithSeedOrder(ff2)}
          </div>
        )}
      </div>
    );
  };

  // Get dimensions for layout calculations
  const q1Matches = (matchesByQuadrant.get(1) || []).filter(m => QUADRANT_ROUNDS.includes(m.round));
  const q2Matches = (matchesByQuadrant.get(2) || []).filter(m => QUADRANT_ROUNDS.includes(m.round));
  const q3Matches = (matchesByQuadrant.get(3) || []).filter(m => QUADRANT_ROUNDS.includes(m.round));
  const q4Matches = (matchesByQuadrant.get(4) || []).filter(m => QUADRANT_ROUNDS.includes(m.round));

  const q1Dims = getQuadrantDimensions(q1Matches);
  const q2Dims = getQuadrantDimensions(q2Matches);
  const q3Dims = getQuadrantDimensions(q3Matches);
  const q4Dims = getQuadrantDimensions(q4Matches);

  const leftHeight = Math.max(q1Dims.height, q4Dims.height);
  const rightHeight = Math.max(q2Dims.height, q3Dims.height);
  const maxHeight = Math.max(leftHeight, rightHeight);

  return (
    <div className="p-4 overflow-auto">
      {/* Main bracket layout: Q1 and Q4 on left, center finals, Q2 and Q3 on right */}
      <div className="flex items-stretch">
        {/* Left side: Q1 (top) and Q4 (bottom) */}
        <div className="flex flex-col justify-between" style={{ minHeight: maxHeight * 2 + 80 }}>
          <div className="mb-8">
            {renderQuadrant(1, false, 'top')}
          </div>
          <div className="mt-8">
            {renderQuadrant(4, false, 'bottom')}
          </div>
        </div>

        {/* Center: Final Four and Championship */}
        <div className="flex items-center">
          {renderFinalRounds()}
        </div>

        {/* Right side: Q2 (top) and Q3 (bottom) - mirrored */}
        <div className="flex flex-col justify-between" style={{ minHeight: maxHeight * 2 + 80 }}>
          <div className="mb-8">
            {renderQuadrant(2, true, 'top')}
          </div>
          <div className="mt-8">
            {renderQuadrant(3, true, 'bottom')}
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuadrantBracket({ matches: initialMatches, players }: QuadrantBracketProps) {
  const { matches } = useRealTimeMatches(initialMatches);
  return <QuadrantDisplay matches={matches} players={players} />;
}
