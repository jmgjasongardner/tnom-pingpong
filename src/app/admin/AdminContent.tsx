'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Match, Player, ROUND_NAMES, ROUND_ORDER } from '@/types/bracket';

export function AdminContent() {
  const searchParams = useSearchParams();
  const adminKey = searchParams.get('key');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [editMode, setEditMode] = useState<'score' | 'seeding' | null>(null);

  const supabase = createClient();

  useEffect(() => {
    // Check admin key
    const expectedKey = process.env.NEXT_PUBLIC_ADMIN_KEY;
    if (adminKey === expectedKey) {
      setIsAuthorized(true);
      loadData();
    } else {
      setLoading(false);
    }
  }, [adminKey]);

  const loadData = async () => {
    setLoading(true);
    const [matchesRes, playersRes] = await Promise.all([
      supabase.from('matches').select('*').order('round').order('match_number'),
      supabase.from('players').select('*').order('seed'),
    ]);

    if (matchesRes.data) setMatches(matchesRes.data as Match[]);
    if (playersRes.data) setPlayers(playersRes.data as Player[]);
    setLoading(false);
  };

  const handleUndoMatch = async (match: Match) => {
    if (!confirm('Are you sure you want to undo this match result? This will also clear any dependent matches.')) {
      return;
    }

    // Clear the match result
    await supabase
      .from('matches')
      .update({
        player1_score: null,
        player2_score: null,
        winner_id: null,
        status: 'ready',
      })
      .eq('id', match.id);

    // Clear the winner from the next match if there is one
    if (match.next_match_id) {
      const updateField = match.next_match_slot === 1 ? 'player1_id' : 'player2_id';
      await supabase
        .from('matches')
        .update({
          [updateField]: null,
          status: 'pending',
          player1_score: null,
          player2_score: null,
          winner_id: null,
        })
        .eq('id', match.next_match_id);
    }

    await loadData();
  };

  const handleUpdateScore = async (matchId: number, p1Score: number, p2Score: number) => {
    const match = matches.find((m) => m.id === matchId);
    if (!match) return;

    const winner_id = p1Score > p2Score ? match.player1_id : match.player2_id;

    await supabase
      .from('matches')
      .update({
        player1_score: p1Score,
        player2_score: p2Score,
        winner_id,
        status: 'completed',
      })
      .eq('id', matchId);

    // Update next match
    if (match.next_match_id && winner_id) {
      const updateField = match.next_match_slot === 1 ? 'player1_id' : 'player2_id';
      await supabase
        .from('matches')
        .update({ [updateField]: winner_id })
        .eq('id', match.next_match_id);
    }

    setSelectedMatch(null);
    await loadData();
  };

  const getPlayerById = (id: number | null) => {
    if (!id) return null;
    return players.find((p) => p.id === id) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="max-w-md mx-auto p-8">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">
            Invalid or missing admin key. Access this page with{' '}
            <code className="bg-gray-100 px-1 rounded">?key=YOUR_ADMIN_KEY</code>
          </p>
        </div>
      </div>
    );
  }

  const completedMatches = matches.filter((m) => m.status === 'completed');

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tournament Admin</h2>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setEditMode(editMode === 'score' ? null : 'score')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              editMode === 'score'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Edit Scores
          </button>
          <button
            onClick={() => setEditMode(editMode === 'seeding' ? null : 'seeding')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              editMode === 'seeding'
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            Edit Seedings
          </button>
          <button
            onClick={loadData}
            className="px-4 py-2 rounded-lg font-medium bg-gray-100 hover:bg-gray-200 transition"
          >
            Refresh Data
          </button>
        </div>

        {editMode === 'score' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Completed Matches ({completedMatches.length})</h3>
            {completedMatches.length === 0 ? (
              <p className="text-gray-500">No completed matches yet.</p>
            ) : (
              <div className="space-y-2">
                {ROUND_ORDER.map((round) => {
                  const roundMatches = completedMatches.filter((m) => m.round === round);
                  if (roundMatches.length === 0) return null;

                  return (
                    <div key={round}>
                      <h4 className="font-medium text-gray-600 mt-4 mb-2">
                        {ROUND_NAMES[round]}
                      </h4>
                      <div className="space-y-2">
                        {roundMatches.map((match) => {
                          const p1 = getPlayerById(match.player1_id);
                          const p2 = getPlayerById(match.player2_id);

                          return (
                            <div
                              key={match.id}
                              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                            >
                              <div className="flex-1">
                                <span className={match.winner_id === match.player1_id ? 'font-bold' : ''}>
                                  {p1?.name} ({match.player1_score})
                                </span>
                                <span className="text-gray-400 mx-2">vs</span>
                                <span className={match.winner_id === match.player2_id ? 'font-bold' : ''}>
                                  {p2?.name} ({match.player2_score})
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setSelectedMatch(match)}
                                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleUndoMatch(match)}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm"
                                >
                                  Undo
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {editMode === 'seeding' && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Player Seedings</h3>
            <p className="text-sm text-gray-500 mb-4">
              Player seedings for reference.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="bg-gray-50 p-2 rounded text-sm"
                >
                  <span className="font-mono text-gray-500 mr-2">#{player.seed}</span>
                  <span className="text-gray-400 mr-1">({player.display_seed})</span>
                  {player.name}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Score Edit Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-bold mb-4">Edit Match Score</h3>
            <ScoreEditor
              match={selectedMatch}
              player1={getPlayerById(selectedMatch.player1_id)}
              player2={getPlayerById(selectedMatch.player2_id)}
              onSave={(p1, p2) => handleUpdateScore(selectedMatch.id, p1, p2)}
              onCancel={() => setSelectedMatch(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreEditor({
  match,
  player1,
  player2,
  onSave,
  onCancel,
}: {
  match: Match;
  player1: Player | null;
  player2: Player | null;
  onSave: (p1Score: number, p2Score: number) => void;
  onCancel: () => void;
}) {
  const [score1, setScore1] = useState(match.player1_score ?? 0);
  const [score2, setScore2] = useState(match.player2_score ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span>{player1?.name || 'TBD'}</span>
        <input
          type="number"
          min={0}
          max={2}
          value={score1}
          onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
          className="w-16 h-10 text-center border rounded"
        />
      </div>
      <div className="flex items-center justify-between">
        <span>{player2?.name || 'TBD'}</span>
        <input
          type="number"
          min={0}
          max={2}
          value={score2}
          onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
          className="w-16 h-10 text-center border rounded"
        />
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={onCancel}
          className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(score1, score2)}
          disabled={score1 === score2 || (score1 !== 2 && score2 !== 2)}
          className="flex-1 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
}
