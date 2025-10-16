import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';
import { shouldSendNotification, markNotificationSent } from '@/lib/notifications/poll-notifications';

export async function POST(request: NextRequest) {
  try {
    const { pollId, question, experienceId, creatorUserId, send_notification, created_at } = await request.json();

    // Validate required fields
    if (!pollId || !question || !experienceId || !creatorUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: pollId, question, experienceId, creatorUserId' },
        { status: 400 }
      );
    }

    // Check if we should send notification (prevents duplicates and old polls)
    const shouldSend = await shouldSendNotification({
      id: pollId,
      send_notification: send_notification ?? true,
      created_at
    });

    if (!shouldSend) {
      console.log(`⏭️ Skipping notification for poll ${pollId} - already sent or not eligible`);
      return NextResponse.json({
        success: false,
        message: `Notification skipped for poll ${pollId} - already sent or not eligible`
      });
    }

    console.log('🔔 Server-side notification request:', {
      pollId,
      question: question.substring(0, 50) + '...',
      experienceId,
      creatorUserId,
      send_notification,
      created_at
    });

    // Send notification using server-side SDK
    // Note: We cannot exclude the poll creator with current SDK, but we'll track this in our system
    await whopSdk.notifications.sendPushNotification({
      title: "New poll available!",
      content: question.length > 100 
        ? question.substring(0, 100) + "..." 
        : question,
      experienceId,
      isMention: true,
      senderUserId: creatorUserId,
      restPath: `/polls/${pollId}`, // Fixed: Added leading slash
    });

    // Mark notification as sent
    await markNotificationSent(pollId, experienceId, creatorUserId);
    
    console.log(`✅ Server notification sent for poll ${pollId} to experience ${experienceId}`);

    return NextResponse.json({ 
      success: true,
      message: `Notification sent for poll ${pollId}`
    });

  } catch (error) {
    console.error('❌ Error in server notification API:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
