import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { deletePoll } from '@/lib/db/polls';
import { pollIdSchema } from '@/lib/validation';

export async function DELETE(
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

    // Verify user token - get from headers like in server components
    const headersList = request.headers;
    const { userId } = await whopSdk.verifyUserToken(headersList);

    // Get poll details to verify ownership
    const { createServerClient } = await import('@/lib/supabase');
    const supabaseServer = createServerClient();
    
    const { data: poll, error: pollError } = await supabaseServer
      .from('polls')
      .select('creator_user_id, company_id')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      return NextResponse.json(
        { error: 'Poll not found' },
        { status: 404 }
      );
    }

    // Check if user is the poll creator or has admin access to the company
    const isCreator = poll.creator_user_id === userId;
    
    if (!isCreator) {
      // Check if user has admin access to the company
      const accessResult = await whopSdk.access.checkIfUserHasAccessToCompany({
        userId,
        companyId: poll.company_id,
      });

      if (!accessResult.hasAccess || accessResult.accessLevel !== 'admin') {
        return NextResponse.json(
          { error: 'You can only delete polls you created or have admin access to' },
          { status: 403 }
        );
      }
    }

    // Delete the poll
    await deletePoll(pollId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting poll:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized to delete this poll') {
      return NextResponse.json(
        { error: 'You are not authorized to delete this poll' },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete poll' },
      { status: 500 }
    );
  }
}
