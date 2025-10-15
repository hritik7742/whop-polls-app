import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { getUserPollUsage, initializeUserSubscription } from '@/lib/db/user-subscription-functions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, companyId, experienceId } = body;

    if (!userId || !companyId || !experienceId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Verify user token
    const headersList = request.headers;
    const { userId: verifiedUserId } = await whopSdk.verifyUserToken(headersList);

    if (verifiedUserId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Initialize user subscription if not exists
    await initializeUserSubscription(userId, companyId, experienceId);

    // Get user poll usage
    const usage = await getUserPollUsage(userId, companyId, experienceId);

    if (!usage) {
      return NextResponse.json(
        { error: 'Failed to fetch user usage' },
        { status: 500 }
      );
    }

    return NextResponse.json(usage);
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
