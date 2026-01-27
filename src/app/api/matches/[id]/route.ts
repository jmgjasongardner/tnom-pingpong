import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { GameScore } from '@/types/bracket';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const { game_scores } = body as { game_scores: GameScore[] };

  // Validate game scores
  if (!Array.isArray(game_scores) || game_scores.length === 0) {
    return NextResponse.json({ error: 'Invalid game scores' }, { status: 400 });
  }

  // Calculate games won
  let player1GamesWon = 0;
  let player2GamesWon = 0;
  for (const game of game_scores) {
    if (game.p1 > game.p2) player1GamesWon++;
    else if (game.p2 > game.p1) player2GamesWon++;
  }

  if (player1GamesWon < 2 && player2GamesWon < 2) {
    return NextResponse.json({ error: 'No winner determined' }, { status: 400 });
  }

  // Get current match to find players and next match
  const { data: match, error: matchError } = await supabase
    .from('matches')
    .select('player1_id, player2_id, next_match_id, next_match_slot')
    .eq('id', id)
    .single();

  if (matchError || !match) {
    return NextResponse.json({ error: 'Match not found' }, { status: 404 });
  }

  // Determine winner
  const winner_id = player1GamesWon > player2GamesWon ? match.player1_id : match.player2_id;

  // Update current match
  const { error: updateError } = await supabase
    .from('matches')
    .update({
      player1_score: player1GamesWon,
      player2_score: player2GamesWon,
      game_scores: JSON.stringify(game_scores),
      winner_id,
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('Update error:', updateError);
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  // Advance winner to next match if there is one
  if (match.next_match_id && winner_id) {
    const updateField = match.next_match_slot === 1 ? 'player1_id' : 'player2_id';

    // First update the player in the next match
    await supabase
      .from('matches')
      .update({ [updateField]: winner_id })
      .eq('id', match.next_match_id);

    // Check if the next match now has both players
    const { data: nextMatch } = await supabase
      .from('matches')
      .select('player1_id, player2_id')
      .eq('id', match.next_match_id)
      .single();

    if (nextMatch && nextMatch.player1_id && nextMatch.player2_id) {
      // Both players are set, mark as ready
      await supabase
        .from('matches')
        .update({ status: 'ready' })
        .eq('id', match.next_match_id);
    }
  }

  return NextResponse.json({ success: true, winner_id });
}
