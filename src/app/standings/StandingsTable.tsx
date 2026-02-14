'use client';

import { useMemo } from 'react';
import { Match, Player, Round } from '@/types/bracket';
import { useRealTimeMatches } from '@/hooks/useRealTimeMatches';

interface StandingsTableProps {
  matches: Match[];
  players: Player[];
}

// Round order for calculating remaining wins
const ROUND_ORDER: Round[] = [
  'play_in',
  'round_2',
  'round_3',
  'round_4',
  'sweet_16',
  'elite_8',
  'final_four',
  'championship',
];

// Calculate triangular number sum from start to end (inclusive)
// e.g., triangularSum(4, 6) = 4 + 5 + 6 = 15
function triangularSum(start: number, end: number): number {
  if (end < start) return 0;
  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += i;
  }
  return sum;
}

export interface PlayerStanding {
  player: Player;
  wins: number;
  points: number;
  bonusPoints: number;
  possibleRemaining: number;
  isEliminated: boolean;
  inFinalFour: boolean;
  inChampionship: boolean;
  isWinner: boolean;
}

export function calculateStandings(matches: Match[], players: Player[]): PlayerStanding[] {
  const playerMap = new Map(players.map(p => [p.id, p]));

  // Count wins for each player
  const winsMap = new Map<number, number>();
  for (const player of players) {
    winsMap.set(player.id, 0);
  }

  for (const match of matches) {
    if (match.status === 'completed' && match.winner_id) {
      winsMap.set(match.winner_id, (winsMap.get(match.winner_id) || 0) + 1);
    }
  }

  // Find players who are eliminated (lost a match)
  const eliminatedPlayers = new Set<number>();
  for (const match of matches) {
    if (match.status === 'completed' && match.winner_id) {
      // The loser is eliminated
      if (match.player1_id && match.player1_id !== match.winner_id) {
        eliminatedPlayers.add(match.player1_id);
      }
      if (match.player2_id && match.player2_id !== match.winner_id) {
        eliminatedPlayers.add(match.player2_id);
      }
    }
  }

  // Find Final Four, Championship, and Winner
  const finalFourMatch1 = matches.find(m => m.round === 'final_four' && m.match_number === 1);
  const finalFourMatch2 = matches.find(m => m.round === 'final_four' && m.match_number === 2);
  const championshipMatch = matches.find(m => m.round === 'championship');

  const finalFourPlayers = new Set<number>();
  if (finalFourMatch1?.player1_id) finalFourPlayers.add(finalFourMatch1.player1_id);
  if (finalFourMatch1?.player2_id) finalFourPlayers.add(finalFourMatch1.player2_id);
  if (finalFourMatch2?.player1_id) finalFourPlayers.add(finalFourMatch2.player1_id);
  if (finalFourMatch2?.player2_id) finalFourPlayers.add(finalFourMatch2.player2_id);

  const championshipPlayers = new Set<number>();
  if (championshipMatch?.player1_id) championshipPlayers.add(championshipMatch.player1_id);
  if (championshipMatch?.player2_id) championshipPlayers.add(championshipMatch.player2_id);

  const winner = championshipMatch?.status === 'completed' ? championshipMatch.winner_id : null;

  // Find each player's starting round to calculate total possible wins
  const playerStartingRound = new Map<number, Round>();

  for (const player of players) {
    // Determine starting round based on seed
    if (player.seed >= 53) {
      playerStartingRound.set(player.id, 'play_in');
    } else if (player.seed >= 33) {
      playerStartingRound.set(player.id, 'round_2');
    } else if (player.seed >= 17) {
      playerStartingRound.set(player.id, 'round_3');
    } else {
      playerStartingRound.set(player.id, 'round_4');
    }
  }

  // Calculate standings for each player
  const standings: PlayerStanding[] = players.map(player => {
    const wins = winsMap.get(player.id) || 0;
    const isEliminated = eliminatedPlayers.has(player.id);
    const inFinalFour = finalFourPlayers.has(player.id);
    const inChampionship = championshipPlayers.has(player.id);
    const isWinner = winner === player.id;

    // Calculate points from wins (1 + 2 + 3 + ... + wins)
    const winPoints = triangularSum(1, wins);

    // Calculate bonus points
    let bonusPoints = 0;
    if (inFinalFour) bonusPoints += 1;
    if (inChampionship) bonusPoints += 2;
    if (isWinner) bonusPoints += 3;

    const points = winPoints + bonusPoints;

    // Calculate possible remaining points
    let possibleRemaining = 0;

    if (!isEliminated) {
      const startingRound = playerStartingRound.get(player.id) || 'round_4';
      const startingRoundIdx = ROUND_ORDER.indexOf(startingRound);

      // Total possible wins = rounds from starting round to championship (inclusive)
      const totalPossibleWins = ROUND_ORDER.length - startingRoundIdx;

      // Remaining wins = total possible - wins already achieved
      const remainingWins = totalPossibleWins - wins;

      if (remainingWins > 0) {
        // Points from remaining wins start at (wins + 1)
        const nextWinValue = wins + 1;
        const lastWinValue = wins + remainingWins;
        possibleRemaining += triangularSum(nextWinValue, lastWinValue);
      }

      // Add remaining bonus points
      if (!inFinalFour) possibleRemaining += 1;
      if (!inChampionship) possibleRemaining += 2;
      if (!isWinner) possibleRemaining += 3;
    }

    return {
      player,
      wins,
      points,
      bonusPoints,
      possibleRemaining,
      isEliminated,
      inFinalFour,
      inChampionship,
      isWinner,
    };
  });

  // Sort: points desc, possibleRemaining desc, seed asc, name alphabetical
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.possibleRemaining !== a.possibleRemaining) return b.possibleRemaining - a.possibleRemaining;
    if (a.player.seed !== b.player.seed) return a.player.seed - b.player.seed;
    return a.player.name.localeCompare(b.player.name);
  });

  return standings;
}

function StandingsDisplay({ matches, players }: { matches: Match[]; players: Player[] }) {
  const standings = useMemo(() => calculateStandings(matches, players), [matches, players]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800">Tournament Standings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Points: Sum of win values (1st win = 1pt, 2nd = 2pt, etc.) + Bonus (Final Four +1, Championship +2, Winner +3)
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Player</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Seed</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Wins</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Points</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Remaining</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Max</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((standing, idx) => (
              <tr
                key={standing.player.id}
                className={`border-t ${standing.isEliminated ? 'bg-gray-50 text-gray-400' : ''} ${standing.isWinner ? 'bg-yellow-50' : ''}`}
              >
                <td className="px-3 py-2 font-mono text-gray-400">{idx + 1}</td>
                <td className="px-3 py-2 font-medium">
                  {standing.player.name}
                  {standing.isWinner && <span className="ml-2">🏆</span>}
                </td>
                <td className="px-3 py-2 text-center text-gray-500">{standing.player.display_seed}</td>
                <td className="px-3 py-2 text-center">{standing.wins}</td>
                <td className="px-3 py-2 text-center font-semibold text-teal-600">{standing.points}</td>
                <td className="px-3 py-2 text-center text-gray-500">
                  {standing.isEliminated ? '-' : standing.possibleRemaining}
                </td>
                <td className="px-3 py-2 text-center font-semibold">
                  {standing.isEliminated ? standing.points : standing.points + standing.possibleRemaining}
                </td>
                <td className="px-3 py-2 text-center">
                  {standing.isWinner ? (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">Champion</span>
                  ) : standing.inChampionship ? (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">Finals</span>
                  ) : standing.inFinalFour ? (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">Final Four</span>
                  ) : standing.isEliminated ? (
                    <span className="px-2 py-0.5 bg-gray-200 text-gray-500 rounded text-xs font-medium">Eliminated</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">Active</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function StandingsTable({ matches: initialMatches, players }: StandingsTableProps) {
  const { matches } = useRealTimeMatches(initialMatches);
  return <StandingsDisplay matches={matches} players={players} />;
}
