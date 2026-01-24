import { Match, Round, getDisplaySeed } from '@/types/bracket';

interface PlayerData {
  seed: number;
  name: string;
}

interface GeneratedMatch {
  round: Round;
  match_number: number;
  player1_seed: number | null;
  player2_seed: number | null;
  feeds_to: { round: Round; match_number: number; slot: 1 | 2 } | null;
}

/**
 * Generates all 75 matches for the tournament bracket.
 *
 * Bracket structure:
 * - Play-in (12 matches): Seeds 53-76 (53v76, 54v75, ..., 64v65)
 * - Round 2 (16 matches): Seeds 33-52 + 12 play-in winners
 * - Round 3 (16 matches): Seeds 17-32 + 16 round 2 winners
 * - Round 4 (16 matches): Seeds 1-16 + 16 round 3 winners
 * - Sweet 16 (8 matches)
 * - Elite 8 (4 matches)
 * - Final Four (2 matches)
 * - Championship (1 match)
 */
export function generateBracketStructure(): GeneratedMatch[] {
  const matches: GeneratedMatch[] = [];

  // Play-in round: Seeds 53-76 (24 players, 12 matches)
  // Matchups: 53v76, 54v75, 55v74, 56v73, 57v72, 58v71, 59v70, 60v69, 61v68, 62v67, 63v66, 64v65
  for (let i = 0; i < 12; i++) {
    const highSeed = 53 + i; // 53, 54, 55, ..., 64
    const lowSeed = 76 - i;  // 76, 75, 74, ..., 65
    matches.push({
      round: 'play_in',
      match_number: i + 1,
      player1_seed: highSeed,
      player2_seed: lowSeed,
      feeds_to: {
        round: 'round_2',
        match_number: Math.ceil((i + 1) / 1), // Each play-in feeds to round 2
        slot: 2 as const, // Play-in winners take slot 2 (lower seed position)
      },
    });
  }

  // Round 2: Seeds 33-52 (20 players) + 12 play-in winners = 32 players, 16 matches
  // Seeds 33-52 face play-in winners
  // Matchups (if favorites win): 33v64, 34v63, 35v62, ..., 44v53
  // Then 45v52, 46v51, 47v50, 48v49 (these 4 matchups are within 33-52)
  // Actually, we have 20 direct seeds + 12 play-in winners = 32 players
  // Let's pair them: higher seeds (33-44) face play-in winners, and 45-52 face each other

  // Matches 1-12: Seed 33-44 vs play-in winners (seeds ~53-76 range winners)
  for (let i = 0; i < 12; i++) {
    const directSeed = 33 + i; // 33, 34, ..., 44
    matches.push({
      round: 'round_2',
      match_number: i + 1,
      player1_seed: directSeed,
      player2_seed: null, // Filled by play-in winner
      feeds_to: {
        round: 'round_3',
        match_number: Math.ceil((i + 1) / 2),
        slot: ((i % 2) + 1) as 1 | 2,
      },
    });
  }

  // Matches 13-16: Seeds 45-52 play each other (45v52, 46v51, 47v50, 48v49)
  const round2InternalMatchups = [
    [45, 52], [46, 51], [47, 50], [48, 49]
  ];
  for (let i = 0; i < 4; i++) {
    matches.push({
      round: 'round_2',
      match_number: 13 + i,
      player1_seed: round2InternalMatchups[i][0],
      player2_seed: round2InternalMatchups[i][1],
      feeds_to: {
        round: 'round_3',
        match_number: 7 + Math.ceil((i + 1) / 2),
        slot: ((i % 2) + 1) as 1 | 2,
      },
    });
  }

  // Round 3: Seeds 17-32 (16 players) + 16 round 2 winners = 32 players, 16 matches
  // Matchups: 17 vs best R2 winner, 18 vs second best, etc.
  // If favorites win: 17v48, 18v47, 19v46, 20v45, 21v44, ..., 32v33
  for (let i = 0; i < 16; i++) {
    const directSeed = 17 + i; // 17, 18, ..., 32
    matches.push({
      round: 'round_3',
      match_number: i + 1,
      player1_seed: directSeed,
      player2_seed: null, // Filled by round 2 winner
      feeds_to: {
        round: 'round_4',
        match_number: Math.ceil((i + 1) / 2),
        slot: ((i % 2) + 1) as 1 | 2,
      },
    });
  }

  // Round 4: Seeds 1-16 (16 players) + 16 round 3 winners = 32 players, 16 matches
  // Standard bracket: 1v(32 seed position), 2v(31), etc.
  // If favorites: 1v32, 2v31, 3v30, ..., 16v17
  for (let i = 0; i < 16; i++) {
    const directSeed = 1 + i; // 1, 2, ..., 16
    matches.push({
      round: 'round_4',
      match_number: i + 1,
      player1_seed: directSeed,
      player2_seed: null, // Filled by round 3 winner
      feeds_to: {
        round: 'sweet_16',
        match_number: Math.ceil((i + 1) / 2),
        slot: ((i % 2) + 1) as 1 | 2,
      },
    });
  }

  // Sweet 16: 16 -> 8
  for (let i = 0; i < 8; i++) {
    matches.push({
      round: 'sweet_16',
      match_number: i + 1,
      player1_seed: null,
      player2_seed: null,
      feeds_to: {
        round: 'elite_8',
        match_number: Math.ceil((i + 1) / 2),
        slot: ((i % 2) + 1) as 1 | 2,
      },
    });
  }

  // Elite 8: 8 -> 4
  for (let i = 0; i < 4; i++) {
    matches.push({
      round: 'elite_8',
      match_number: i + 1,
      player1_seed: null,
      player2_seed: null,
      feeds_to: {
        round: 'final_four',
        match_number: Math.ceil((i + 1) / 2),
        slot: ((i % 2) + 1) as 1 | 2,
      },
    });
  }

  // Final Four: 4 -> 2
  for (let i = 0; i < 2; i++) {
    matches.push({
      round: 'final_four',
      match_number: i + 1,
      player1_seed: null,
      player2_seed: null,
      feeds_to: {
        round: 'championship',
        match_number: 1,
        slot: (i + 1) as 1 | 2,
      },
    });
  }

  // Championship: 2 -> 1
  matches.push({
    round: 'championship',
    match_number: 1,
    player1_seed: null,
    player2_seed: null,
    feeds_to: null,
  });

  return matches;
}

/**
 * Maps play-in winners to their round 2 matches.
 * Play-in match i winner goes to round 2 match based on seeding.
 */
export function getPlayInToRound2Mapping(): Map<number, { matchNumber: number; slot: 2 }> {
  const mapping = new Map<number, { matchNumber: number; slot: 2 }>();

  // Play-in matches are numbered 1-12
  // Their winners face seeds 33-44 (in reverse order to maintain seed protection)
  // Play-in 1 (53v76) winner faces seed 44 in round 2 match 12
  // Play-in 12 (64v65) winner faces seed 33 in round 2 match 1
  for (let i = 1; i <= 12; i++) {
    mapping.set(i, { matchNumber: 13 - i, slot: 2 });
  }

  return mapping;
}

/**
 * Creates SQL statements for seeding the database.
 */
export function generateSeedingSQL(players: PlayerData[]): string {
  const playerInserts = players.map(p =>
    `INSERT INTO players (seed, name, display_seed) VALUES (${p.seed}, '${p.name.replace(/'/g, "''")}', ${getDisplaySeed(p.seed)});`
  ).join('\n');

  const bracket = generateBracketStructure();

  // We need to build the matches with proper next_match_id references
  // First pass: create all matches to get IDs
  // Second pass: link them

  // For simplicity, we'll use a predictable ID scheme based on round and match_number
  const getMatchId = (round: Round, matchNumber: number): number => {
    const roundOffsets: Record<Round, number> = {
      play_in: 0,
      round_2: 12,
      round_3: 28,
      round_4: 44,
      sweet_16: 60,
      elite_8: 68,
      final_four: 72,
      championship: 74,
    };
    return roundOffsets[round] + matchNumber;
  };

  const matchInserts = bracket.map(m => {
    const id = getMatchId(m.round, m.match_number);
    const nextMatchId = m.feeds_to
      ? getMatchId(m.feeds_to.round, m.feeds_to.match_number)
      : 'NULL';
    const nextMatchSlot = m.feeds_to ? m.feeds_to.slot : 'NULL';
    const player1 = m.player1_seed ? `(SELECT id FROM players WHERE seed = ${m.player1_seed})` : 'NULL';
    const player2 = m.player2_seed ? `(SELECT id FROM players WHERE seed = ${m.player2_seed})` : 'NULL';
    const status = (m.player1_seed && m.player2_seed) ? "'ready'" : "'pending'";

    return `INSERT INTO matches (id, round, match_number, player1_id, player2_id, next_match_id, next_match_slot, status) VALUES (${id}, '${m.round}', ${m.match_number}, ${player1}, ${player2}, ${nextMatchId}, ${nextMatchSlot}, ${status});`;
  }).join('\n');

  return `-- Players\n${playerInserts}\n\n-- Matches\n${matchInserts}`;
}
