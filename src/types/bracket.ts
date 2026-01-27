export interface Player {
  id: number;
  seed: number;
  name: string;
  display_seed: number;
  quadrant?: 1 | 2 | 3 | 4;
  created_at?: string;
}

// Individual game scores (e.g., [15, 12] means player1 scored 15, player2 scored 12)
export interface GameScore {
  p1: number;
  p2: number;
}

export interface Match {
  id: number;
  round: Round;
  match_number: number;
  quadrant: 1 | 2 | 3 | 4 | null;
  quadrant_match_num: number | null;
  player1_id: number | null;
  player2_id: number | null;
  player1_score: number | null; // Games won (0, 1, or 2)
  player2_score: number | null;
  // Detailed game scores stored as JSON string: "[{\"p1\":15,\"p2\":12},{\"p1\":15,\"p2\":8}]"
  game_scores: string | null;
  winner_id: number | null;
  next_match_id: number | null;
  next_match_slot: 1 | 2 | null;
  status: 'pending' | 'ready' | 'completed';
  created_at?: string;
  updated_at?: string;
}

export type Round =
  | 'play_in'
  | 'round_2'
  | 'round_3'
  | 'round_4'
  | 'sweet_16'
  | 'elite_8'
  | 'final_four'
  | 'championship';

export const ROUND_NAMES: Record<Round, string> = {
  play_in: 'Play-In',
  round_2: 'Round 2',
  round_3: 'Round 3',
  round_4: 'Round 4',
  sweet_16: 'Sweet 16',
  elite_8: 'Elite 8',
  final_four: 'Final Four',
  championship: 'Championship',
};

export const ROUND_ORDER: Round[] = [
  'play_in',
  'round_2',
  'round_3',
  'round_4',
  'sweet_16',
  'elite_8',
  'final_four',
  'championship',
];

export function getDisplaySeed(actualSeed: number): number {
  return Math.ceil(actualSeed / 4);
}

export function parseGameScores(jsonString: string | null): GameScore[] {
  if (!jsonString) return [];
  try {
    return JSON.parse(jsonString);
  } catch {
    return [];
  }
}

export function formatGameScores(scores: GameScore[]): string {
  if (scores.length === 0) return '';
  return scores.map(g => `${g.p1}-${g.p2}`).join(', ');
}
