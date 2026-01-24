import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/Header';
import { BracketClient } from '@/components/Bracket/BracketClient';
import { Match, Player } from '@/types/bracket';

export const dynamic = 'force-dynamic';

export default async function BracketPage() {
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

  // If there's no data yet (Supabase not set up), show setup instructions
  if (matchesError || playersError || !matches?.length || !players?.length) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="max-w-4xl mx-auto p-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Tournament Setup Required
            </h2>
            <p className="text-gray-600 mb-6">
              The tournament bracket needs to be initialized. Please follow these steps:
            </p>
            <ol className="list-decimal list-inside space-y-4 text-gray-700">
              <li>
                <strong>Create a Supabase project</strong> at{' '}
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-teal-600 hover:underline"
                >
                  supabase.com
                </a>
              </li>
              <li>
                <strong>Create the database tables</strong> by running the SQL schema
                (see <code className="bg-gray-100 px-1 rounded">SETUP.md</code>)
              </li>
              <li>
                <strong>Add your Supabase credentials</strong> to{' '}
                <code className="bg-gray-100 px-1 rounded">.env.local</code>
              </li>
              <li>
                <strong>Run the seeding script</strong> to initialize players and matches
              </li>
            </ol>

            {(matchesError || playersError) && (
              <div className="mt-6 p-4 bg-red-50 rounded-lg">
                <p className="text-red-700 text-sm">
                  Error: {matchesError?.message || playersError?.message}
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <Header />
      <div className="p-4">
        <BracketClient
          initialMatches={matches as Match[]}
          players={players as Player[]}
        />
      </div>
    </main>
  );
}
