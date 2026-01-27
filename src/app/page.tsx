import { createClient } from '@/lib/supabase/server';
import { Match, Player } from '@/types/bracket';
import { BracketView } from '@/components/Bracket/BracketView';
import Link from 'next/link';
import Image from 'next/image';

export const dynamic = 'force-dynamic';

export default async function Home() {
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
          {(matchesError || playersError) && (
            <p className="mt-4 text-red-600 text-sm">
              {matchesError?.message || playersError?.message}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-teal-600 text-white py-3 px-4 shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
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
              <p className="text-teal-200 text-xs">Ping Pong Tournament</p>
            </div>
          </div>
          <Link
            href="/report"
            className="bg-white text-teal-600 px-4 py-2 rounded-lg font-medium hover:bg-teal-50 transition text-sm"
          >
            Report Scores
          </Link>
        </div>
      </header>

      {/* Bracket */}
      <BracketView
        matches={matches as Match[]}
        players={players as Player[]}
      />
    </div>
  );
}
