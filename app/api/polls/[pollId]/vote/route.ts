import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { voteOnPoll } from '@/lib/db/polls';
import { voteSchema, pollIdSchema } from '@/lib/validation';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const { pollId } = await params;
    
    // Validate poll ID
    const pollIdValidation = pollIdSchema.safeParse(pollId);
    if (!pollIdValidation.success) {
      return NextResponse.json(
        { error: 'Invalid poll ID format' },
        { status: 400 }
      );
    }

    const body = await request.json();
    
    // Validate request body
    const validationResult = voteSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      );
    }

    const { option_id } = validationResult.data;

    // Verify user token - get from headers like in server components
    const headersList = request.headers;
    
    let userId: string;
    try {
      const result = await whopSdk.verifyUserToken(headersList);
      userId = result.userId;
      console.log('🔐 User authenticated:', userId);
    } catch (tokenError) {
      console.error('Token verification failed:', tokenError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Get poll details to verify access
    const { createServerClient } = await import('@/lib/supabase');
    const supabaseServer = createServerClient();
    
    const { data: poll, error: pollError } = await supabaseServer
      .from('polls')
      .select('company_id, experience_id, status, expires_at')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Check if poll is still active
    if (poll.status !== 'active' || new Date(poll.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This poll is no longer active' },
        { status: 400 }
      );
    }

    // Verify user has access to the experience or company
    try {
      // First try to check experience access
      let accessResult;
      try {
        // Use the SDK with the specific user context
        const userSdk = whopSdk.withUser(userId);
        accessResult = await userSdk.access.checkIfUserHasAccessToExperience({
          userId,
          experienceId: poll.experience_id,
        });
        console.log('🔍 Experience access check:', accessResult);
      } catch (experienceError) {
        console.log('⚠️ Experience access failed, trying company access:', experienceError);
        // If experience access fails, try company access (for polls created from dashboard)
        const userSdk = whopSdk.withUser(userId);
        accessResult = await userSdk.access.checkIfUserHasAccessToCompany({
          userId,
          companyId: poll.experience_id, // In dashboard polls, experience_id is actually companyId
        });
        console.log('🔍 Company access check:', accessResult);
      }

      if (!accessResult.hasAccess) {
        console.log('❌ User does not have access to vote on this poll');
        return NextResponse.json(
          { error: 'You do not have access to vote on this poll' },
          { status: 403 }
        );
      }
      console.log('✅ User has access to vote on this poll');
    } catch (accessError) {
      console.error('Access check failed:', accessError);
      return NextResponse.json(
        { error: 'Failed to verify access to this poll' },
        { status: 500 }
      );
    }

    // Vote on the poll
    await voteOnPoll(pollId, option_id, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error voting on poll:', error);
    
    if (error instanceof Error && error.message === 'User has already voted on this poll') {
      return NextResponse.json(
        { error: 'You have already voted on this poll' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to vote on poll' },
      { status: 500 }
    );
  }
}
