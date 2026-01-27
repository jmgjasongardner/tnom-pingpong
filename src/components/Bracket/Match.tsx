'use client';

import { Match as MatchType, Player, parseGameScores, formatGameScores } from '@/types/bracket';

interface PlayerSlotProps {
  player: Player | null;
  gamesWon: number | null;
  isWinner: boolean;
  position: 'top' | 'bottom';
}

function PlayerSlot({ player, gamesWon, isWinner, position }: PlayerSlotProps) {
  return (
    <div
      className={`flex justify-between items-center py-1.5 px-2
        ${position === 'top' ? 'rounded-t border-b border-gray-200' : 'rounded-b'}
        ${isWinner ? 'bg-teal-100 font-semibold' : 'bg-white'}
      `}
    >
      <div className="flex items-center gap-1 min-w-0 flex-1">
        <span className="text-[10px] text-gray-400 w-5 flex-shrink-0 font-mono">
          {player ? player.display_seed : ''}
        </span>
        <span
          className={`truncate text-sm ${!player ? 'text-gray-400 italic' : ''}`}
          title={player?.name}
        >
          {player?.name || 'TBD'}
        </span>
      </div>
      <span className={`font-mono text-sm ml-1 w-5 text-center flex-shrink-0 ${isWinner ? 'text-teal-700' : 'text-gray-600'}`}>
        {gamesWon !== null ? gamesWon : ''}
      </span>
    </div>
  );
}

interface MatchProps {
  match: MatchType;
  player1: Player | null;
  player2: Player | null;
  onClick: () => void;
}

export function Match({ match, player1, player2, onClick }: MatchProps) {
  const isReady = player1 && player2;
  const isCompleted = match.status === 'completed';
  const isClickable = isReady && !isCompleted;

  const gameScores = parseGameScores(match.game_scores);
  const scoreDisplay = formatGameScores(gameScores);

  return (
    <div
      className={`
        match-card border rounded shadow-sm w-full overflow-hidden
        ${isCompleted ? 'border-teal-500' : 'border-gray-300'}
        ${isClickable ? 'cursor-pointer hover:border-teal-400 hover:shadow-md transition-all' : ''}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      <PlayerSlot
        player={player1}
        gamesWon={match.player1_score}
        isWinner={match.winner_id === player1?.id}
        position="top"
      />
      <PlayerSlot
        player={player2}
        gamesWon={match.player2_score}
        isWinner={match.winner_id === player2?.id}
        position="bottom"
      />
      {/* Game scores display */}
      {isCompleted && scoreDisplay && (
        <div className="bg-gray-50 text-[10px] text-gray-500 text-center py-0.5 border-t border-gray-200">
          {scoreDisplay}
        </div>
      )}
      {isReady && !isCompleted && (
        <div className="bg-teal-50 text-[10px] text-teal-600 text-center py-0.5 border-t border-gray-200">
          Click to enter score
        </div>
      )}
    </div>
  );
}
