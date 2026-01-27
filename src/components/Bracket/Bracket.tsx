'use client';

import React, { useState, useMemo } from 'react';
import { Match, Player, ROUND_ORDER, ROUND_NAMES, GameScore, Round } from '@/types/bracket';
import { Match as MatchComponent } from './Match';
import { ScoreModal } from '../ScoreModal';

interface BracketProps {
  matches: Match[];
  players: Player[];
  onScoreSubmit: (matchId: number, gameScores: GameScore[]) => Promise<void>;
}

const MATCH_HEIGHT = 60;
const MATCH_WIDTH = 176;
const HORIZONTAL_GAP = 40;
const VERTICAL_GAP = 16;

export function Bracket({ matches, players, onScoreSubmit }: BracketProps) {
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  const playerMap = new Map(players.map((p) => [p.id, p]));

  // Group matches by round
  const matchesByRound = useMemo(() => {
    const byRound = new Map<Round, Match[]>();
    for (const match of matches) {
      const roundMatches = byRound.get(match.round) || [];
      roundMatches.push(match);
      byRound.set(match.round, roundMatches);
    }
    // Sort matches within each round by match_number
    for (const [round, roundMatches] of byRound) {
      byRound.set(round, roundMatches.sort((a, b) => a.match_number - b.match_number));
    }
    return byRound;
  }, [matches]);

  // Calculate positions for each match
  const { matchPositions, totalHeight } = useMemo(() => {
    const positions = new Map<number, { x: number; y: number }>();
    const matchById = new Map(matches.map(m => [m.id, m]));

    // Find which matches feed into each match
    const feedersMap = new Map<number, number[]>();
    for (const match of matches) {
      if (match.next_match_id) {
        const feeders = feedersMap.get(match.next_match_id) || [];
        feeders.push(match.id);
        feedersMap.set(match.next_match_id, feeders);
      }
    }

    // Sort feeders by match_number
    for (const [, feeders] of feedersMap) {
      feeders.sort((a, b) => {
        const matchA = matchById.get(a);
        const matchB = matchById.get(b);
        return (matchA?.match_number || 0) - (matchB?.match_number || 0);
      });
    }

    // Calculate x position for each round
    const roundX = new Map<Round, number>();
    ROUND_ORDER.forEach((round, index) => {
      roundX.set(round, index * (MATCH_WIDTH + HORIZONTAL_GAP));
    });

    const slotHeight = MATCH_HEIGHT + VERTICAL_GAP;

    // The bracket structure:
    // - Round 4 has 16 matches feeding into Sweet 16's 8 matches (2:1)
    // - Sweet 16 onwards is standard bracket (2:1 each round)
    // - Round 2, 3 each have 16 matches with 1:1 mapping to next round
    // - Play-in has 12 matches feeding into 12 of Round 2's matches

    // Start by positioning Round 4 (16 matches) - this feeds into Sweet 16
    // Position Round 4 matches in pairs that will feed into each Sweet 16 match
    const round4Matches = matchesByRound.get('round_4') || [];
    round4Matches.forEach((match, idx) => {
      positions.set(match.id, {
        x: roundX.get('round_4') || 0,
        y: idx * slotHeight,
      });
    });

    // Sweet 16 onwards: center between feeders
    const laterRounds: Round[] = ['sweet_16', 'elite_8', 'final_four', 'championship'];
    for (const round of laterRounds) {
      const roundMatches = matchesByRound.get(round) || [];
      const x = roundX.get(round) || 0;

      for (const match of roundMatches) {
        const feeders = feedersMap.get(match.id) || [];
        if (feeders.length >= 2) {
          const pos1 = positions.get(feeders[0]);
          const pos2 = positions.get(feeders[1]);
          if (pos1 && pos2) {
            positions.set(match.id, {
              x,
              y: (pos1.y + pos2.y) / 2,
            });
          }
        } else if (feeders.length === 1) {
          const pos = positions.get(feeders[0]);
          if (pos) {
            positions.set(match.id, { x, y: pos.y });
          }
        }
      }
    }

    // Round 3: 1:1 with Round 4, so align each R3 match with its R4 target
    const round3Matches = matchesByRound.get('round_3') || [];
    for (const match of round3Matches) {
      if (match.next_match_id) {
        const r4Pos = positions.get(match.next_match_id);
        if (r4Pos) {
          positions.set(match.id, {
            x: roundX.get('round_3') || 0,
            y: r4Pos.y,
          });
        }
      }
    }

    // Round 2: 1:1 with Round 3, so align each R2 match with its R3 target
    const round2Matches = matchesByRound.get('round_2') || [];
    for (const match of round2Matches) {
      if (match.next_match_id) {
        const r3Pos = positions.get(match.next_match_id);
        if (r3Pos) {
          positions.set(match.id, {
            x: roundX.get('round_2') || 0,
            y: r3Pos.y,
          });
        }
      }
    }

    // Play-in: align with the Round 2 match each feeds into
    const playInMatches = matchesByRound.get('play_in') || [];
    for (const match of playInMatches) {
      if (match.next_match_id) {
        const r2Pos = positions.get(match.next_match_id);
        if (r2Pos) {
          positions.set(match.id, {
            x: roundX.get('play_in') || 0,
            y: r2Pos.y,
          });
        }
      }
    }

    // Shift everything down if there are negative y values
    let minY = Infinity;
    for (const pos of positions.values()) {
      minY = Math.min(minY, pos.y);
    }
    if (minY < 0) {
      for (const [id, pos] of positions) {
        positions.set(id, { x: pos.x, y: pos.y - minY });
      }
    }

    // Calculate total height
    let maxY = 0;
    for (const pos of positions.values()) {
      maxY = Math.max(maxY, pos.y + MATCH_HEIGHT);
    }

    return { matchPositions: positions, totalHeight: maxY + 40 };
  }, [matches, matchesByRound]);

  // Calculate total width
  const totalWidth = ROUND_ORDER.length * (MATCH_WIDTH + HORIZONTAL_GAP);

  const handleMatchClick = (match: Match) => {
    setSelectedMatch(match);
  };

  const handleScoreSubmit = async (gameScores: GameScore[]) => {
    if (!selectedMatch) return;
    await onScoreSubmit(selectedMatch.id, gameScores);
    setSelectedMatch(null);
  };

  const selectedPlayer1 = selectedMatch?.player1_id
    ? playerMap.get(selectedMatch.player1_id) || null
    : null;
  const selectedPlayer2 = selectedMatch?.player2_id
    ? playerMap.get(selectedMatch.player2_id) || null
    : null;

  // Generate connector lines
  const connectorLines: React.ReactNode[] = [];
  for (const match of matches) {
    if (match.next_match_id) {
      const fromPos = matchPositions.get(match.id);
      const toPos = matchPositions.get(match.next_match_id);
      if (fromPos && toPos) {
        const fromX = fromPos.x + MATCH_WIDTH;
        const fromY = fromPos.y + MATCH_HEIGHT / 2;
        const toX = toPos.x;
        const toY = toPos.y + MATCH_HEIGHT / 2;
        const midX = fromX + (toX - fromX) / 2;

        const isCompleted = match.status === 'completed';
        const strokeColor = isCompleted ? '#14b8a6' : '#d1d5db';

        connectorLines.push(
          <g key={`connector-${match.id}`}>
            <line x1={fromX} y1={fromY} x2={midX} y2={fromY} stroke={strokeColor} strokeWidth="2" />
            <line x1={midX} y1={fromY} x2={midX} y2={toY} stroke={strokeColor} strokeWidth="2" />
            <line x1={midX} y1={toY} x2={toX} y2={toY} stroke={strokeColor} strokeWidth="2" />
          </g>
        );
      }
    }
  }

  return (
    <>
      <div className="overflow-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-[calc(100vh-80px)]">
        {/* Round headers */}
        <div className="flex sticky top-0 bg-gradient-to-br from-gray-50 to-gray-100 z-10 pt-4 pb-2 px-6">
          {ROUND_ORDER.map((round, index) => {
            const roundMatches = matchesByRound.get(round) || [];
            if (roundMatches.length === 0) return null;

            return (
              <div
                key={round}
                style={{
                  width: MATCH_WIDTH,
                  marginLeft: index === 0 ? 0 : HORIZONTAL_GAP,
                  flexShrink: 0,
                }}
                className="text-center"
              >
                <span className="text-xs font-semibold text-white bg-teal-600 px-3 py-1 rounded-full shadow-sm">
                  {ROUND_NAMES[round]}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bracket area */}
        <div className="relative px-6 pb-6" style={{ width: totalWidth + 48, height: totalHeight }}>
          {/* SVG for connector lines */}
          <svg
            className="absolute top-0 left-6 pointer-events-none"
            width={totalWidth}
            height={totalHeight}
            style={{ overflow: 'visible' }}
          >
            {connectorLines}
          </svg>

          {/* Match cards */}
          {matches.map((match) => {
            const pos = matchPositions.get(match.id);
            if (!pos) return null;

            const player1 = match.player1_id ? playerMap.get(match.player1_id) || null : null;
            const player2 = match.player2_id ? playerMap.get(match.player2_id) || null : null;

            return (
              <div
                key={match.id}
                className="absolute"
                style={{
                  left: pos.x,
                  top: pos.y,
                  width: MATCH_WIDTH,
                }}
              >
                <MatchComponent
                  match={match}
                  player1={player1}
                  player2={player2}
                  onClick={() => handleMatchClick(match)}
                />
              </div>
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
