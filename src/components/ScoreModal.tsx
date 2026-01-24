'use client';

import { useState } from 'react';
import { Match, Player } from '@/types/bracket';

interface ScoreModalProps {
  match: Match;
  player1: Player;
  player2: Player;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (player1Score: number, player2Score: number) => Promise<void>;
}

export function ScoreModal({
  match,
  player1,
  player2,
  isOpen,
  onClose,
  onSubmit,
}: ScoreModalProps) {
  const [score1, setScore1] = useState<number>(match.player1_score ?? 0);
  const [score2, setScore2] = useState<number>(match.player2_score ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setError(null);

    // Validate: must have a winner (best of 3, so someone needs 2)
    if (score1 === score2) {
      setError('Scores cannot be tied - there must be a winner!');
      return;
    }

    if (score1 > 2 || score2 > 2) {
      setError('Maximum score is 2 (best of 3 games)');
      return;
    }

    if (score1 < 0 || score2 < 0) {
      setError('Scores cannot be negative');
      return;
    }

    // Winner must have 2
    if (score1 !== 2 && score2 !== 2) {
      setError('Winner must have 2 games (best of 3)');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(score1, score2);
    } catch (e) {
      setError('Failed to save score. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="p-6">
          <h2 className="text-xl font-bold text-center mb-6 text-gray-800">
            Enter Match Score
          </h2>
          <p className="text-sm text-gray-500 text-center mb-4">
            Best of 3 games to 15
          </p>

          <div className="space-y-4">
            {/* Player 1 */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">({player1.display_seed})</span>
                <span className="font-medium">{player1.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScore1(Math.max(0, score1 - 1))}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold"
                >
                  -
                </button>
                <span className="w-12 h-12 text-2xl text-center border-2 border-gray-300 rounded-lg flex items-center justify-center font-mono">
                  {score1}
                </span>
                <button
                  type="button"
                  onClick={() => setScore1(Math.min(2, score1 + 1))}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div className="text-center text-gray-400 font-semibold">vs</div>

            {/* Player 2 */}
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">({player2.display_seed})</span>
                <span className="font-medium">{player2.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScore2(Math.max(0, score2 - 1))}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold"
                >
                  -
                </button>
                <span className="w-12 h-12 text-2xl text-center border-2 border-gray-300 rounded-lg flex items-center justify-center font-mono">
                  {score2}
                </span>
                <button
                  type="button"
                  onClick={() => setScore2(Math.min(2, score2 + 1))}
                  className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-lg font-bold"
                >
                  +
                </button>
              </div>
            </div>
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
              disabled={isSubmitting}
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
