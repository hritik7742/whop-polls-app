import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

export async function POST(request: NextRequest) {
  try {
    const { pollId, question, experienceId, creatorUserId } = await request.json();

    // Validate required fields
    if (!pollId || !question || !experienceId || !creatorUserId) {
      return NextResponse.json(
        { error: 'Missing required fields: pollId, question, experienceId, creatorUserId' },
        { status: 400 }
      );
    }

    console.log('🔔 Server-side notification request:', {
      pollId,
      question: question.substring(0, 50) + '...',
      experienceId,
      creatorUserId
    });

    // Send notification using server-side SDK
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
