import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { testNotificationToUsers } from '@/lib/notifications/poll-notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { experienceId, userIds, pollTitle, senderUserId } = body;

    if (!experienceId || !userIds || !Array.isArray(userIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: experienceId, userIds (array)' },
        { status: 400 }
      );
    }

    console.log('🧪 API Test Notification Request:', {
      experienceId,
      userIds,
      pollTitle: pollTitle || 'Test Poll',
      senderUserId: senderUserId || 'test-user'
    });

    // Note: We can't list experience members with current SDK
    console.log('📋 Sending test notification to all members of experience:', experienceId);

    // Send test notification
    await testNotificationToUsers(
      userIds,
      pollTitle || 'Test Poll',
      experienceId,
      senderUserId || 'test-user'
    );

    return NextResponse.json({
      success: true,
      message: `Test notification sent to ${userIds.length} users`,
      experienceId,
      userIds
    });

  } catch (error) {
    console.error('Error in test notification API:', error);
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    );
  }
}
