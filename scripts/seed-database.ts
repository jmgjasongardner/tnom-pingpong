import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Make sure .env.local is set up.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface PlayerData {
  seed: number;
  name: string;
  display_seed: number;
  quadrant: number;
}

interface MatchCSVRow {
  round: string;
  match_number: number;
  player1_seed: number | null;
  player2_seed: number | null;
  next_match: string | null;
  quadrant: number | null;
  quadrant_match_num: number | null;
}

function parsePlayersCSV(filepath: string): PlayerData[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const parts = line.split(',');
    const rank = parseInt(parts[0].trim());
    const name = parts[1]?.trim() || `Player ${rank}`;
    const seed = parseInt(parts[2]?.trim() || parts[0].trim());
    const quadrant = parseInt(parts[3]?.trim() || '1');
    return {
      seed: rank, // Use rank as the seed (1-76)
      name,
      display_seed: seed, // The "Seed" column is actually display_seed (1-19)
      quadrant,
    };
  });
}

function parseMatchesCSV(filepath: string): MatchCSVRow[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  // Skip header row
  const dataLines = lines.slice(1);

  return dataLines.map((line) => {
    const parts = line.split(',');
    const round = parts[0].trim();
    const match_number = parseInt(parts[1].trim());
    const p1 = parts[2]?.trim();
    const p2 = parts[3]?.trim();
    const next_match = parts[4]?.trim() || null;
    const quadrantStr = parts[5]?.trim();
    const quadrant = quadrantStr ? parseInt(quadrantStr) : null;
    const quadrantMatchNumStr = parts[6]?.trim();
    const quadrant_match_num = quadrantMatchNumStr ? parseInt(quadrantMatchNumStr) : null;

    return {
      round,
      match_number,
      player1_seed: p1 && p1 !== 'TBD' ? parseInt(p1) : null,
      player2_seed: p2 && p2 !== 'TBD' ? parseInt(p2) : null,
      next_match: next_match || null,
      quadrant,
      quadrant_match_num,
    };
  });
}

async function seed() {
  console.log('Starting tournament seeding...\n');

  // Read players
  const playersPath = path.join(process.cwd(), 'data', 'seeding.csv');
  console.log(`Reading players from ${playersPath}...`);
  const players = parsePlayersCSV(playersPath);
  console.log(`Found ${players.length} players\n`);

  // Read matches from CSV
  const matchesPath = path.join(process.cwd(), 'data', 'matches.csv');
  console.log(`Reading matches from ${matchesPath}...`);
  const matchesData = parseMatchesCSV(matchesPath);
  console.log(`Found ${matchesData.length} matches\n`);

  console.log('Clearing existing data...');
  // Delete matches first (foreign key constraint)
  const { error: delMatchErr } = await supabase.from('matches').delete().gte('id', 0);
  if (delMatchErr) console.log('Match delete note:', delMatchErr.message);

  const { error: delPlayerErr } = await supabase.from('players').delete().gte('id', 0);
  if (delPlayerErr) console.log('Player delete note:', delPlayerErr.message);

  console.log('Inserting players...');
  const { data: insertedPlayers, error: playersError } = await supabase
    .from('players')
    .insert(players)
    .select();

  if (playersError) {
    console.error('Error inserting players:', playersError);
    process.exit(1);
  }

  console.log(`Inserted ${insertedPlayers?.length} players\n`);

  // Build seed to player ID map
  const seedToId = new Map<number, number>();
  for (const player of insertedPlayers || []) {
    seedToId.set(player.seed, player.id);
  }

  // Insert matches
  console.log('Inserting matches...');
  const matchInserts = matchesData.map((m) => ({
    round: m.round,
    match_number: m.match_number,
    quadrant: m.quadrant,
    quadrant_match_num: m.quadrant_match_num,
    player1_id: m.player1_seed ? seedToId.get(m.player1_seed) : null,
    player2_id: m.player2_seed ? seedToId.get(m.player2_seed) : null,
    status: m.player1_seed && m.player2_seed ? 'ready' : 'pending',
  }));

  const { data: insertedMatches, error: matchesError } = await supabase
    .from('matches')
    .insert(matchInserts)
    .select();

  if (matchesError) {
    console.error('Error inserting matches:', matchesError);
    process.exit(1);
  }

  console.log(`Inserted ${insertedMatches?.length} matches\n`);

  // Build match key to ID map and match data map
  const matchIdMap = new Map<string, number>();
  const matchDataMap = new Map<string, MatchCSVRow>();
  for (const match of insertedMatches || []) {
    matchIdMap.set(`${match.round}-${match.match_number}`, match.id);
  }
  for (const m of matchesData) {
    matchDataMap.set(`${m.round}-${m.match_number}`, m);
  }

  // Track which slot each match feeds into for its next_match
  // For matches with both TBD: first feeder gets slot 1, second gets slot 2
  const nextMatchSlotTracker = new Map<string, number>();

  console.log('Linking matches...');

  // Link matches based on next_match column from CSV
  for (const m of matchesData) {
    if (!m.next_match) continue;

    const currentMatchKey = `${m.round}-${m.match_number}`;
    const currentMatchId = matchIdMap.get(currentMatchKey);
    const nextMatchId = matchIdMap.get(m.next_match);
    const nextMatchData = matchDataMap.get(m.next_match);

    if (currentMatchId && nextMatchId && nextMatchData) {
      let currentSlot: number;

      // Determine slot based on target match structure:
      // - If target has player1 set and player2 TBD: feeder goes to slot 2
      // - If target has player2 set and player1 TBD: feeder goes to slot 1
      // - If both TBD: use counter (first feeder slot 1, second slot 2)
      if (nextMatchData.player1_seed && !nextMatchData.player2_seed) {
        // player1 is set, feeder must go to slot 2
        currentSlot = 2;
      } else if (!nextMatchData.player1_seed && nextMatchData.player2_seed) {
        // player2 is set, feeder must go to slot 1
        currentSlot = 1;
      } else {
        // Both TBD - use counter
        currentSlot = (nextMatchSlotTracker.get(m.next_match) || 0) + 1;
        nextMatchSlotTracker.set(m.next_match, currentSlot);
      }

      await supabase
        .from('matches')
        .update({ next_match_id: nextMatchId, next_match_slot: currentSlot })
        .eq('id', currentMatchId);
    }
  }

  // Print summary
  console.log('\nSeeding complete!');
  console.log(`- ${players.length} players`);
  console.log(`- ${matchesData.length} matches`);

  // Show bracket structure
  console.log('\nBracket structure from CSV:');
  const rounds = ['play_in', 'round_2', 'round_3', 'round_4', 'sweet_16', 'elite_8', 'final_four', 'championship'];
  for (const round of rounds) {
    const roundMatches = matchesData.filter(m => m.round === round);
    console.log(`  ${round}: ${roundMatches.length} matches`);
  }
}

seed().catch(console.error);
