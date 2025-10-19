import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();
    
    // Get all votes from the database
    const { data: votes, error: votesError } = await supabaseServer
      .from('poll_votes')
      .select('*')
      .order('voted_at', { ascending: false });
    
    if (votesError) {
      console.error('❌ DEBUG - Error fetching votes:', votesError);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: votesError
      }, { status: 500 });
    }
    
    // Get all polls
    const { data: polls, error: pollsError } = await supabaseServer
      .from('polls')
      .select('id, question, created_at')
      .order('created_at', { ascending: false });
    
    if (pollsError) {
      console.error('❌ DEBUG - Error fetching polls:', pollsError);
    }
    
    // Get all poll options
    const { data: options, error: optionsError } = await supabaseServer
      .from('poll_options')
      .select('id, poll_id, option_text, vote_count')
      .order('created_at', { ascending: false });
    
    if (optionsError) {
      console.error('❌ DEBUG - Error fetching options:', optionsError);
    }
    
    // Analyze the data
    const uniqueUsers = votes ? [...new Set(votes.map(v => v.user_id))] : [];
    const voteCounts = votes ? votes.reduce((acc, vote) => {
      acc[vote.user_id] = (acc[vote.user_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) : {};
    
    console.log('🔍 DEBUG - Database analysis:', {
      totalVotes: votes?.length || 0,
      uniqueUsers: uniqueUsers.length,
      users: uniqueUsers,
      voteCounts,
      totalPolls: polls?.length || 0,
      totalOptions: options?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      data: {
        votes: votes || [],
        polls: polls || [],
        options: options || [],
        analysis: {
          totalVotes: votes?.length || 0,
          uniqueUsers: uniqueUsers.length,
          users: uniqueUsers,
          voteCounts,
          totalPolls: polls?.length || 0,
          totalOptions: options?.length || 0
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ DEBUG - Database debug error:', error);
    return NextResponse.json({
      success: false,
      error: 'Database debug error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
