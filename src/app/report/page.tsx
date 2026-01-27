import { createClient } from '@/lib/supabase/server';
import { Match, Player } from '@/types/bracket';
import { ReportClient } from './ReportClient';

export const dynamic = 'force-dynamic';

export default async function ReportPage() {
  const supabase = await createClient();

  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .order('round')
    .order('match_number');

  const { data: players } = await supabase
    .from('players')
    .select('*')
    .order('seed');

  return (
    <ReportClient
      initialMatches={(matches as Match[]) || []}
      players={(players as Player[]) || []}
    />
  );
}
