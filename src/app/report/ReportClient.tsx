'use client';

import { useState } from 'react';
import { Match, Player, GameScore, ROUND_NAMES } from '@/types/bracket';
import { useRealTimeMatches } from '@/hooks/useRealTimeMatches';
import { ScoreModal } from '@/components/ScoreModal';
import Link from 'next/link';

interface ReportClientProps {
  initialMatches: Match[];
  players: Player[];
}

export function ReportClient({ initialMatches, players }: ReportClientProps) {
  const { matches } = useRealTimeMatches(initialMatches);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [filter, setFilter] = useState<'ready' | 'completed' | 'all'>('ready');

  const playerMap = new Map(players.map(p => [p.id, p]));

  // Filter matches
  const filteredMatches = matches.filter(m => {
    if (filter === 'ready') return m.status === 'ready' || (m.player1_id && m.player2_id && m.status !== 'completed');
    if (filter === 'completed') return m.status === 'completed';
    return true;
  });

  // Sort: ready matches first, then by round
  const sortedMatches = [...filteredMatches].sort((a, b) => {
    if (a.status === 'ready' && b.status !== 'ready') return -1;
    if (b.status === 'ready' && a.status !== 'ready') return 1;
    return 0;
  });

  const handleScoreSubmit = async (gameScores: GameScore[]) => {
    if (!selectedMatch) return;

    const response = await fetch(`/api/matches/${selectedMatch.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_scores: gameScores }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || 'Failed to update match');
      return;
    }

    setSelectedMatch(null);
  };

  const getPlayerName = (playerId: number | null) => {
    if (!playerId) return 'TBD';
    const player = playerMap.get(playerId);
    return player ? `(${player.display_seed}) ${player.name}` : 'Unknown';
  };

  const selectedPlayer1 = selectedMatch?.player1_id ? playerMap.get(selectedMatch.player1_id) || null : null;
  const selectedPlayer2 = selectedMatch?.player2_id ? playerMap.get(selectedMatch.player2_id) || null : null;

  const readyCount = matches.filter(m => m.player1_id && m.player2_id && m.status !== 'completed').length;
  const completedCount = matches.filter(m => m.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-600 text-white py-4 px-6 shadow-md">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Score Reporting</h1>
            <p className="text-teal-100 text-sm">Technomics Ping Pong Tournament</p>
          </div>
          <Link
            href="/"
            className="bg-white text-teal-600 px-4 py-2 rounded-lg font-medium hover:bg-teal-50 transition"
          >
            View Bracket
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <div className="text-3xl font-bold text-teal-600">{readyCount}</div>
            <div className="text-sm text-gray-500">Ready to Play</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <div className="text-3xl font-bold text-gray-600">{completedCount}</div>
            <div className="text-sm text-gray-500">Completed</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm text-center">
            <div className="text-3xl font-bold text-gray-400">{matches.length - completedCount - readyCount}</div>
            <div className="text-sm text-gray-500">Pending</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setFilter('ready')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'ready'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Ready to Play ({readyCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'completed'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            Completed ({completedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filter === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({matches.length})
          </button>
        </div>

        {/* Match List */}
        <div className="space-y-3">
          {sortedMatches.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center text-gray-500">
              No matches to display
            </div>
          ) : (
            sortedMatches.map(match => {
              const isReady = match.player1_id && match.player2_id && match.status !== 'completed';
              const isCompleted = match.status === 'completed';

              return (
                <div
                  key={match.id}
                  className={`bg-white rounded-lg shadow-sm overflow-hidden ${
                    isReady ? 'ring-2 ring-teal-500' : ''
                  }`}
                >
                  <div className="flex items-center">
                    {/* Round label */}
                    <div className="w-32 bg-gray-100 p-4 text-center border-r">
                      <div className="text-xs text-gray-500 uppercase">{ROUND_NAMES[match.round]}</div>
                      <div className="text-sm font-medium">Match {match.match_number}</div>
                    </div>

                    {/* Players */}
                    <div className="flex-1 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className={`${isCompleted && match.winner_id === match.player1_id ? 'font-bold text-teal-600' : ''}`}>
                            {getPlayerName(match.player1_id)}
                          </div>
                          <div className="text-gray-400 text-sm">vs</div>
                          <div className={`${isCompleted && match.winner_id === match.player2_id ? 'font-bold text-teal-600' : ''}`}>
                            {getPlayerName(match.player2_id)}
                          </div>
                        </div>

                        {/* Score or Action */}
                        <div className="ml-4">
                          {isCompleted ? (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-gray-700">
                                {match.player1_score} - {match.player2_score}
                              </div>
                              <div className="text-xs text-gray-400">Final</div>
                            </div>
                          ) : isReady ? (
                            <button
                              onClick={() => setSelectedMatch(match)}
                              className="bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition"
                            >
                              Enter Score
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">Waiting...</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Score Modal */}
      {selectedMatch && selectedPlayer1 && selectedPlayer2 && (
        <ScoreModal
          match={selectedMatch}
          player1={selectedPlayer1}
          player2={selectedPlayer2}
          isOpen={true}
          onClose={() => setSelectedMatch(null)}
          onSubmit={handleScoreSubmit}
        />
      )}
    </div>
  );
}
