import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { createPoll, CreatePollData } from '@/lib/db/polls';
import { createPollSchema } from '@/lib/validation';
import { canUserCreatePoll, initializeUserSubscription } from '@/lib/db/user-subscription-functions';
// Notifications will be sent from experience view instead

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validationResult = createPollSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.errors);
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

    const { question, options, expires_at, scheduled_at, is_anonymous, send_notification, company_id, experience_id } = validationResult.data;

    // Verify user token - get from headers like in server components
    const headersList = request.headers;
    const { userId } = await whopSdk.verifyUserToken(headersList);

    // Verify user has access to the company
    const accessResult = await whopSdk.access.checkIfUserHasAccessToCompany({
      userId,
      companyId: company_id,
    });

    if (!accessResult.hasAccess || accessResult.accessLevel !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Initialize user subscription if not exists
    await initializeUserSubscription(userId, company_id, experience_id);

    // Check if user can create more polls
    const canCreate = await canUserCreatePoll(userId, company_id, experience_id);
    if (!canCreate) {
      return NextResponse.json({ 
        error: 'Poll limit reached',
        message: 'You have reached the maximum number of polls for the free plan. Please upgrade to Pro to create unlimited polls.',
        requiresUpgrade: true
      }, { status: 403 });
    }

    // Create poll data
    const pollData: CreatePollData = {
      question,
      company_id,
      experience_id,
      creator_user_id: userId,
      expires_at,
      scheduled_at,
      is_anonymous,
      send_notification,
      options,
    };

    const poll = await createPoll(pollData);

    // Notifications will be sent from experience view when polls are detected
    console.log(`Poll created: ${poll.id} with notification enabled: ${send_notification}`);

    return NextResponse.json(poll, { status: 201 });
  } catch (error) {
    console.error('Error creating poll:', error);
    return NextResponse.json(
      { error: 'Failed to create poll' },
      { status: 500 }
    );
  }
}
