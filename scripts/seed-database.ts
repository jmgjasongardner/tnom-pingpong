import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
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
}

interface MatchData {
  round: string;
  match_number: number;
  player1_seed: number | null;
  player2_seed: number | null;
  next_round: string | null;
  next_match_number: number | null;
  next_slot: 1 | 2 | null;
}

function parseCSV(filepath: string): PlayerData[] {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());

  return lines.map((line) => {
    const parts = line.split(',');
    const seed = parseInt(parts[0].trim());
    const name = parts[1]?.trim() || `Player ${seed}`;
    return {
      seed,
      name,
      display_seed: Math.ceil(seed / 4),
    };
  });
}

function generateMatches(): MatchData[] {
  const matches: MatchData[] = [];

  // Play-in round: Seeds 53-76 (24 players, 12 matches)
  // Matchups: 53v76, 54v75, 55v74, etc.
  for (let i = 0; i < 12; i++) {
    const highSeed = 53 + i;
    const lowSeed = 76 - i;
    matches.push({
      round: 'play_in',
      match_number: i + 1,
      player1_seed: highSeed,
      player2_seed: lowSeed,
      next_round: 'round_2',
      next_match_number: 12 - i, // Winner goes to face seed 33+i in round 2
      next_slot: 2,
    });
  }

  // Round 2: Seeds 33-44 vs play-in winners + Seeds 45-52 internal
  // Matches 1-12: Seed 33-44 vs play-in winners
  for (let i = 0; i < 12; i++) {
    const directSeed = 44 - i; // 44, 43, ..., 33
    matches.push({
      round: 'round_2',
      match_number: i + 1,
      player1_seed: directSeed,
      player2_seed: null, // Filled by play-in winner
      next_round: 'round_3',
      next_match_number: Math.ceil((i + 1) / 2),
      next_slot: ((i % 2) + 1) as 1 | 2,
    });
  }

  // Matches 13-16: Seeds 45-52 (45v52, 46v51, 47v50, 48v49)
  const round2Internal = [
    [45, 52],
    [46, 51],
    [47, 50],
    [48, 49],
  ];
  for (let i = 0; i < 4; i++) {
    matches.push({
      round: 'round_2',
      match_number: 13 + i,
      player1_seed: round2Internal[i][0],
      player2_seed: round2Internal[i][1],
      next_round: 'round_3',
      next_match_number: 7 + Math.ceil((i + 1) / 2),
      next_slot: ((i % 2) + 1) as 1 | 2,
    });
  }

  // Round 3: Seeds 17-32 vs round 2 winners
  // If favorites win: 17v48, 18v47, 19v46, 20v45, 21v44, ..., 32v33
  for (let i = 0; i < 16; i++) {
    const directSeed = 17 + i;
    matches.push({
      round: 'round_3',
      match_number: i + 1,
      player1_seed: directSeed,
      player2_seed: null, // Filled by round 2 winner
      next_round: 'round_4',
      next_match_number: Math.ceil((i + 1) / 2),
      next_slot: ((i % 2) + 1) as 1 | 2,
    });
  }

  // Round 4: Seeds 1-16 vs round 3 winners
  // Standard: 1v32, 2v31, ..., 16v17 (if favorites win)
  for (let i = 0; i < 16; i++) {
    const directSeed = 1 + i;
    matches.push({
      round: 'round_4',
      match_number: i + 1,
      player1_seed: directSeed,
      player2_seed: null, // Filled by round 3 winner
      next_round: 'sweet_16',
      next_match_number: Math.ceil((i + 1) / 2),
      next_slot: ((i % 2) + 1) as 1 | 2,
    });
  }

  // Sweet 16
  for (let i = 0; i < 8; i++) {
    matches.push({
      round: 'sweet_16',
      match_number: i + 1,
      player1_seed: null,
      player2_seed: null,
      next_round: 'elite_8',
      next_match_number: Math.ceil((i + 1) / 2),
      next_slot: ((i % 2) + 1) as 1 | 2,
    });
  }

  // Elite 8
  for (let i = 0; i < 4; i++) {
    matches.push({
      round: 'elite_8',
      match_number: i + 1,
      player1_seed: null,
      player2_seed: null,
      next_round: 'final_four',
      next_match_number: Math.ceil((i + 1) / 2),
      next_slot: ((i % 2) + 1) as 1 | 2,
    });
  }

  // Final Four
  for (let i = 0; i < 2; i++) {
    matches.push({
      round: 'final_four',
      match_number: i + 1,
      player1_seed: null,
      player2_seed: null,
      next_round: 'championship',
      next_match_number: 1,
      next_slot: (i + 1) as 1 | 2,
    });
  }

  // Championship
  matches.push({
    round: 'championship',
    match_number: 1,
    player1_seed: null,
    player2_seed: null,
    next_round: null,
    next_match_number: null,
    next_slot: null,
  });

  return matches;
}

async function seed() {
  console.log('Starting tournament seeding...\n');

  // Parse players from CSV
  const csvPath = path.join(process.cwd(), 'data', 'seeding.csv');
  console.log(`Reading players from ${csvPath}...`);
  const players = parseCSV(csvPath);
  console.log(`Found ${players.length} players\n`);

  // Clear existing data
  console.log('Clearing existing data...');
  await supabase.from('matches').delete().neq('id', 0);
  await supabase.from('players').delete().neq('id', 0);

  // Insert players
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

  // Create a map of seed -> player id
  const seedToId = new Map<number, number>();
  for (const player of insertedPlayers || []) {
    seedToId.set(player.seed, player.id);
  }

  // Generate matches
  console.log('Generating bracket structure...');
  const matchesData = generateMatches();
  console.log(`Generated ${matchesData.length} matches\n`);

  // First pass: Insert all matches without next_match_id
  console.log('Inserting matches (first pass)...');
  const matchInserts = matchesData.map((m) => ({
    round: m.round,
    match_number: m.match_number,
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

  // Create a map of (round, match_number) -> match id
  const matchIdMap = new Map<string, number>();
  for (const match of insertedMatches || []) {
    matchIdMap.set(`${match.round}-${match.match_number}`, match.id);
  }

  // Second pass: Update next_match_id and next_match_slot
  console.log('Linking matches (second pass)...');
  for (let i = 0; i < matchesData.length; i++) {
    const m = matchesData[i];
    if (m.next_round && m.next_match_number) {
      const currentMatchId = matchIdMap.get(`${m.round}-${m.match_number}`);
      const nextMatchId = matchIdMap.get(`${m.next_round}-${m.next_match_number}`);

      if (currentMatchId && nextMatchId) {
        await supabase
          .from('matches')
          .update({
            next_match_id: nextMatchId,
            next_match_slot: m.next_slot,
          })
          .eq('id', currentMatchId);
      }
    }
  }

  console.log('\nSeeding complete!');
  console.log(`- ${players.length} players`);
  console.log(`- ${matchesData.length} matches`);
  console.log('\nBracket structure:');
  console.log('  Play-in:     12 matches (seeds 53-76)');
  console.log('  Round 2:     16 matches (seeds 33-52 + play-in winners)');
  console.log('  Round 3:     16 matches (seeds 17-32 + round 2 winners)');
  console.log('  Round 4:     16 matches (seeds 1-16 + round 3 winners)');
  console.log('  Sweet 16:    8 matches');
  console.log('  Elite 8:     4 matches');
  console.log('  Final Four:  2 matches');
  console.log('  Championship: 1 match');
}

seed().catch(console.error);
