'use client';

import { useState } from 'react';
import { Match, Player, GameScore } from '@/types/bracket';

interface ScoreModalProps {
  match: Match;
  player1: Player;
  player2: Player;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (gameScores: GameScore[]) => Promise<void>;
}

export function ScoreModal({
  match,
  player1,
  player2,
  isOpen,
  onClose,
  onSubmit,
}: ScoreModalProps) {
  const [games, setGames] = useState<GameScore[]>([
    { p1: 0, p2: 0 },
    { p1: 0, p2: 0 },
    { p1: 0, p2: 0 },
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const updateGame = (gameIndex: number, player: 'p1' | 'p2', value: number) => {
    const newGames = [...games];
    newGames[gameIndex] = { ...newGames[gameIndex], [player]: Math.max(0, Math.min(99, value)) };
    setGames(newGames);
  };

  // Calculate games won
  const p1GamesWon = games.filter(g => g.p1 > g.p2 && (g.p1 > 0 || g.p2 > 0)).length;
  const p2GamesWon = games.filter(g => g.p2 > g.p1 && (g.p1 > 0 || g.p2 > 0)).length;
  const hasWinner = p1GamesWon >= 2 || p2GamesWon >= 2;
  const winner = p1GamesWon >= 2 ? player1 : p2GamesWon >= 2 ? player2 : null;

  const handleSubmit = async () => {
    setError(null);

    // Validate: need a winner (best of 3)
    if (!hasWinner) {
      setError('Enter scores until one player wins 2 games');
      return;
    }

    // Filter to only played games
    const playedGames = games.filter(g => g.p1 > 0 || g.p2 > 0);

    // Validate no ties in individual games
    for (const game of playedGames) {
      if (game.p1 === game.p2) {
        setError('Individual games cannot be tied');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(playedGames);
    } catch (e) {
      setError('Failed to save score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-center mb-2 text-gray-800">
            Enter Match Score
          </h2>
          <p className="text-sm text-gray-500 text-center mb-6">
            Best of 3 games to 15 points
          </p>

          {/* Player names header */}
          <div className="grid grid-cols-[1fr,auto,1fr] gap-4 mb-4 text-center">
            <div className="font-semibold text-gray-700">
              <span className="text-sm text-gray-400">({player1.display_seed}) </span>
              {player1.name}
            </div>
            <div className="text-gray-400 font-bold">vs</div>
            <div className="font-semibold text-gray-700">
              <span className="text-sm text-gray-400">({player2.display_seed}) </span>
              {player2.name}
            </div>
          </div>

          {/* Game scores */}
          <div className="space-y-3">
            {[0, 1, 2].map((gameIndex) => {
              const game = games[gameIndex];
              const gameWinner = game.p1 > game.p2 ? 'p1' : game.p2 > game.p1 ? 'p2' : null;
              const isPlayed = game.p1 > 0 || game.p2 > 0;

              return (
                <div
                  key={gameIndex}
                  className={`grid grid-cols-[1fr,auto,1fr] gap-4 items-center p-3 rounded-lg ${
                    isPlayed ? 'bg-gray-50' : 'bg-gray-50/50'
                  }`}
                >
                  <div className="flex justify-center">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={game.p1 || ''}
                      onChange={(e) => updateGame(gameIndex, 'p1', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={`w-16 h-12 text-2xl text-center border-2 rounded-lg font-mono
                        ${gameWinner === 'p1' ? 'border-teal-500 bg-teal-50' : 'border-gray-300'}
                        focus:border-teal-500 focus:outline-none`}
                    />
                  </div>
                  <div className="text-sm font-medium text-gray-400">
                    Game {gameIndex + 1}
                  </div>
                  <div className="flex justify-center">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={game.p2 || ''}
                      onChange={(e) => updateGame(gameIndex, 'p2', parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className={`w-16 h-12 text-2xl text-center border-2 rounded-lg font-mono
                        ${gameWinner === 'p2' ? 'border-teal-500 bg-teal-50' : 'border-gray-300'}
                        focus:border-teal-500 focus:outline-none`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Match result summary */}
          <div className={`mt-4 p-3 rounded-lg text-center ${hasWinner ? 'bg-teal-50' : 'bg-gray-100'}`}>
            {hasWinner ? (
              <p className="font-semibold text-teal-700">
                {winner?.name} wins {p1GamesWon}-{p2GamesWon}
              </p>
            ) : (
              <p className="text-gray-500">Enter scores to determine winner</p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !hasWinner}
              className="flex-1 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition font-medium"
            >
              {isSubmitting ? 'Saving...' : 'Save Score'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
