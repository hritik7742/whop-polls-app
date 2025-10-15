import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();
    
    const now = new Date().toISOString();
    console.log('Activating scheduled polls at:', now);
    
    // First, try the RPC function
    const { data: rpcResult, error: rpcError } = await supabaseServer.rpc('activate_scheduled_polls');
    
    if (rpcError) {
      console.error('RPC function error:', rpcError);
      // Fallback to direct SQL update
      const { data: directResult, error: directError } = await supabaseServer
        .from('polls')
        .update({ status: 'active' })
        .eq('status', 'scheduled')
        .not('scheduled_at', 'is', null)
        .lte('scheduled_at', now)
        .select('id, question, scheduled_at, status');

      if (directError) {
        console.error('Direct update error:', directError);
        return NextResponse.json(
          { error: 'Failed to activate scheduled polls', details: directError },
          { status: 500 }
        );
      }

      console.log('Direct update result:', directResult);
      return NextResponse.json({
        success: true,
        message: 'Scheduled polls activated via direct update',
        activatedCount: directResult?.length || 0,
        activatedPolls: directResult?.map(poll => ({
          id: poll.id,
          question: poll.question.substring(0, 50) + '...',
          scheduled_at: poll.scheduled_at,
          status: poll.status
        })) || []
      });
    }

    // Get the count of activated polls
    const { data: activatedPolls, error: countError } = await supabaseServer
      .from('polls')
      .select('id, question, scheduled_at, status')
      .eq('status', 'active')
      .gte('scheduled_at', new Date(Date.now() - 60000).toISOString()) // Polls activated in the last minute
      .not('scheduled_at', 'is', null);

    if (countError) {
      console.error('Error counting activated polls:', countError);
    }

    console.log('RPC activation result:', rpcResult);
    console.log('Activated polls:', activatedPolls);

    return NextResponse.json({
      success: true,
      message: 'Scheduled polls activation completed',
      activatedCount: activatedPolls?.length || 0,
      activatedPolls: activatedPolls?.map(poll => ({
        id: poll.id,
        question: poll.question.substring(0, 50) + '...',
        scheduled_at: poll.scheduled_at,
        status: poll.status
      })) || []
    });

  } catch (error) {
    console.error('Error in activate-scheduled route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
