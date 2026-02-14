'use client';

import { useMemo } from 'react';
import { Match, Player } from '@/types/bracket';
import { useRealTimeMatches } from '@/hooks/useRealTimeMatches';
import { calculateStandings } from './StandingsTable';

export interface PortfolioEntry {
  analyst: string;
  selections: string[];
  tiebreaker: string;
  winner: string;
}

interface PortfolioTableProps {
  matches: Match[];
  players: Player[];
  portfolios: PortfolioEntry[];
}

interface PortfolioStanding {
  entry: PortfolioEntry;
  points: number;
  maxPoints: number;
  playersRemaining: number;
}

function calculatePortfolioStandings(
  portfolios: PortfolioEntry[],
  matches: Match[],
  players: Player[]
): PortfolioStanding[] {
  const standings = calculateStandings(matches, players);
  const standingsByName = new Map(standings.map(s => [s.player.name, s]));

  const portfolioStandings = portfolios.map(entry => {
    let points = 0;
    let maxPoints = 0;
    let playersRemaining = 0;

    for (const playerName of entry.selections) {
      const standing = standingsByName.get(playerName);
      if (standing) {
        points += standing.points;
        maxPoints += standing.points + (standing.isEliminated ? 0 : standing.possibleRemaining);
        if (!standing.isEliminated) playersRemaining++;
      }
    }

    return { entry, points, maxPoints, playersRemaining };
  });

  portfolioStandings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.maxPoints !== a.maxPoints) return b.maxPoints - a.maxPoints;
    return a.entry.analyst.localeCompare(b.entry.analyst);
  });

  return portfolioStandings;
}

function PlayerName({ name, eliminated }: { name: string; eliminated: boolean }) {
  return (
    <span className={eliminated ? 'text-red-500 line-through' : ''}>
      {name}
    </span>
  );
}

function PortfolioDisplay({ matches, players, portfolios }: PortfolioTableProps) {
  const standings = useMemo(
    () => calculatePortfolioStandings(portfolios, matches, players),
    [portfolios, matches, players]
  );

  const eliminatedNames = useMemo(() => {
    const playerStandings = calculateStandings(matches, players);
    return new Set(playerStandings.filter(s => s.isEliminated).map(s => s.player.name));
  }, [matches, players]);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <h2 className="text-lg font-bold text-gray-800">Portfolio Standings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Sum of selected players&apos; points from tournament standings
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">#</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Analyst</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Selections</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Points</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Max</th>
              <th className="px-3 py-2 text-center font-semibold text-gray-600">Active</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Tiebreaker</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Winner</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s, idx) => (
              <tr key={s.entry.analyst} className="border-t">
                <td className="px-3 py-2 font-mono text-gray-400">{idx + 1}</td>
                <td className="px-3 py-2 font-medium whitespace-nowrap">{s.entry.analyst}</td>
                <td className="px-3 py-2 text-gray-600 text-xs">
                  {s.entry.selections.map((name, i) => (
                    <span key={name}>
                      {i > 0 && ', '}
                      <PlayerName name={name} eliminated={eliminatedNames.has(name)} />
                    </span>
                  ))}
                </td>
                <td className="px-3 py-2 text-center font-semibold text-teal-600">{s.points}</td>
                <td className="px-3 py-2 text-center font-semibold">{s.maxPoints}</td>
                <td className="px-3 py-2 text-center text-gray-500">{s.playersRemaining}/5</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <PlayerName name={s.entry.tiebreaker} eliminated={eliminatedNames.has(s.entry.tiebreaker)} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <PlayerName name={s.entry.winner} eliminated={eliminatedNames.has(s.entry.winner)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function PortfolioTable({ matches: initialMatches, players, portfolios }: PortfolioTableProps) {
  const { matches } = useRealTimeMatches(initialMatches);
  return <PortfolioDisplay matches={matches} players={players} portfolios={portfolios} />;
}
