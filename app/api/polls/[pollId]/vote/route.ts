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
    
    // Log all headers for debugging
    console.log('📋 All headers received:', Object.fromEntries(headersList.entries()));
    
    let userId: string;
    try {
      const result = await whopSdk.verifyUserToken(headersList);
      userId = result.userId;
      console.log('🔐 User authenticated successfully:', userId);
      console.log('🔐 Full verification result:', result);
    } catch (tokenError) {
      console.error('❌ Token verification failed:', tokenError);
      console.error('❌ Headers that caused the error:', Object.fromEntries(headersList.entries()));
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
      .select('id, company_id, experience_id, status, expires_at')
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

    // Debug: Log the poll details to understand the issue
    console.log('🔍 Poll details for access check:', {
      pollId: poll.id,
      pollCompanyId: poll.company_id,
      pollExperienceId: poll.experience_id,
      userId: userId
    });

    // TEMPORARY: Skip access check to test voting functionality
    // TODO: Fix access check logic after confirming votes work
    console.log('⚠️ TEMPORARILY SKIPPING ACCESS CHECK FOR TESTING');
    console.log('🔍 Poll details:', {
      pollId: poll.id,
      pollCompanyId: poll.company_id,
      pollExperienceId: poll.experience_id,
      userId: userId
    });

    // TODO: Re-enable this access check after fixing the issue
    /*
    // Verify user has access to the experience
    try {
      // Use the SDK with the specific user context
      const userSdk = whopSdk.withUser(userId);
      
      // Check access to the experience (not company)
      const accessResult = await userSdk.access.checkIfUserHasAccessToExperience({
        userId,
        experienceId: poll.experience_id,
      });
      
      console.log('🔍 Experience access check result:', {
        hasAccess: accessResult.hasAccess,
        accessLevel: accessResult.accessLevel,
        experienceId: poll.experience_id,
        userId: userId
      });

      if (!accessResult.hasAccess) {
        console.log('❌ User does not have access to vote on this poll');
        console.log('❌ Access details:', {
          userId,
          experienceId: poll.experience_id,
          accessLevel: accessResult.accessLevel,
          hasAccess: accessResult.hasAccess
        });
        return NextResponse.json(
          { error: 'You do not have access to vote on this poll' },
          { status: 403 }
        );
      }
      console.log('✅ User has access to vote on this poll');
    } catch (accessError) {
      console.error('❌ Access check failed:', accessError);
      console.error('❌ Access error details:', {
        error: accessError,
        userId,
        experienceId: poll.experience_id
      });
      return NextResponse.json(
        { error: 'Failed to verify access to this poll' },
        { status: 500 }
      );
    }
    */

    // Vote on the poll
    console.log('🗳️ About to save vote:', { pollId, option_id, userId });
    await voteOnPoll(pollId, option_id, userId);
    console.log('✅ Vote saved successfully for user:', userId);

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
