import fs from 'fs';
import path from 'path';
import { createClient } from '@/lib/supabase/server';
import { Match, Player } from '@/types/bracket';
import Link from 'next/link';
import Image from 'next/image';
import { StandingsTable } from './StandingsTable';
import { PortfolioTable, PortfolioEntry } from './PortfolioTable';

export const dynamic = 'force-dynamic';

function parsePortfolioCSV(): PortfolioEntry[] {
  const csvPath = path.join(process.cwd(), 'data', 'portfolio.csv');
  const content = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = content.split('\n').filter(l => l.trim());
  const dataLines = lines.slice(1);

  return dataLines.map(rawLine => {
    const line = rawLine.replace(/\r$/, '');
    // Parse CSV line with quoted fields: Analyst,"Selections","Tiebreaker","Winner"
    const match = line.match(/^([^,]+),"([^"]*)","([^"]*)","([^"]*)"$/);
    if (!match) return { analyst: line, selections: [], tiebreaker: '', winner: '' };

    const [, analyst, selectionsRaw, tiebreakerRaw, winnerRaw] = match;

    // Parse selections: "1\tVikram B;11\tDavid L;..." -> ["Vikram B", "David L", ...]
    const selections = selectionsRaw
      .split(';')
      .filter(s => s.trim())
      .map(s => s.replace(/^\d+\t/, '').trim());

    // Strip seed numbers from tiebreaker and winner
    const tiebreaker = tiebreakerRaw.replace(/^\d+\t/, '').trim();
    const winner = winnerRaw.replace(/^\d+\t/, '').trim();

    return { analyst, selections, tiebreaker, winner };
  });
}

export default async function StandingsPage() {
  const supabase = await createClient();

  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('*')
    .order('round')
    .order('match_number');

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .order('seed');

  if (matchesError || playersError || !matches?.length || !players?.length) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Setup Required</h2>
          <p className="text-gray-600">
            Tournament data not found. Please run the seed script.
          </p>
        </div>
      </div>
    );
  }

  const portfolios = parsePortfolioCSV();

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-teal-600 text-white py-3 px-4 shadow-md sticky top-0 z-20">
        <div className="max-w-[90rem] mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Image
              src="/technomics-logo.png"
              alt="Technomics"
              width={36}
              height={36}
              className="rounded"
            />
            <div>
              <h1 className="text-base font-bold leading-tight">Technomics March Madness</h1>
              <p className="text-teal-200 text-xs">Standings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/"
              className="bg-white text-teal-600 px-4 py-2 rounded-lg font-medium hover:bg-teal-50 transition text-sm"
            >
              View Bracket
            </Link>
            <Link
              href="/report"
              className="bg-teal-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-teal-400 transition text-sm"
            >
              Report Scores
            </Link>
          </div>
        </div>
      </header>

      {/* Standings Tables */}
      <div className="max-w-[90rem] mx-auto p-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <StandingsTable
          matches={matches as Match[]}
          players={players as Player[]}
        />
        <PortfolioTable
          matches={matches as Match[]}
          players={players as Player[]}
          portfolios={portfolios}
        />
      </div>
    </div>
  );
}
