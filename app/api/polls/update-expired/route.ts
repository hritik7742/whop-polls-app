import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = createServerClient();
    
    const now = new Date().toISOString();
    console.log('Updating expired polls at:', now);
    
    // Update expired polls
    const { data: expiredPolls, error } = await supabaseServer
      .from('polls')
      .update({ status: 'expired' })
      .eq('status', 'active')
      .lt('expires_at', now)
      .select('id, question, expires_at, status');

    if (error) {
      console.error('Error updating expired polls:', error);
      return NextResponse.json(
        { error: 'Failed to update expired polls', details: error },
        { status: 500 }
      );
    }

    console.log('Updated expired polls:', expiredPolls);

    return NextResponse.json({
      success: true,
      message: 'Expired polls updated',
      expiredCount: expiredPolls?.length || 0,
      expiredPolls: expiredPolls?.map(poll => ({
        id: poll.id,
        question: poll.question.substring(0, 50) + '...',
        expires_at: poll.expires_at,
        status: poll.status
      })) || []
    });

  } catch (error) {
    console.error('Error in update-expired route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
