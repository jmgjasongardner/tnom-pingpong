export interface Player {
  id: number;
  seed: number;
  name: string;
  display_seed: number;
  created_at?: string;
}

export interface Match {
  id: number;
  round: Round;
  match_number: number;
  player1_id: number | null;
  player2_id: number | null;
  player1_score: number | null;
  player2_score: number | null;
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
