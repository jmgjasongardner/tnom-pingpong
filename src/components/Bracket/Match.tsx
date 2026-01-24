'use client';

import { Match as MatchType, Player } from '@/types/bracket';

interface PlayerSlotProps {
  player: Player | null;
  score: number | null;
  isWinner: boolean;
}

function PlayerSlot({ player, score, isWinner }: PlayerSlotProps) {
  return (
    <div
      className={`flex justify-between items-center py-1.5 px-2 rounded ${
        isWinner ? 'bg-teal-50 font-semibold' : ''
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-gray-500 w-6 flex-shrink-0">
          {player ? `(${player.display_seed})` : ''}
        </span>
        <span
          className={`truncate ${!player ? 'text-gray-400 italic' : ''}`}
          title={player?.name}
        >
          {player?.name || 'TBD'}
        </span>
      </div>
      <span className="font-mono text-lg ml-2 flex-shrink-0">
        {score !== null ? score : '-'}
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

  return (
    <div
      className={`
        match-card bg-white rounded-lg shadow-md border-2 w-52
        ${isCompleted ? 'border-teal-500' : 'border-gray-200'}
        ${isClickable ? 'cursor-pointer hover:border-teal-300 hover:shadow-lg' : ''}
      `}
      onClick={isClickable ? onClick : undefined}
    >
      <div className="p-2">
        <PlayerSlot
          player={player1}
          score={match.player1_score}
          isWinner={match.winner_id === player1?.id}
        />
        <div className="border-t border-gray-200 my-1" />
        <PlayerSlot
          player={player2}
          score={match.player2_score}
          isWinner={match.winner_id === player2?.id}
        />
      </div>
      {isReady && !isCompleted && (
        <div className="bg-teal-50 text-teal-700 text-xs text-center py-1 rounded-b-md">
          Click to enter score
        </div>
      )}
    </div>
  );
}
