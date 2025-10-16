/**
 * Direct test of notification functionality
 */

console.log('🔔 Testing Notification Directly...\n');

// Simulate the notification call that would happen in the app
async function testNotificationDirect() {
  try {
    // This simulates what happens when a poll is created
    const poll = {
      id: 'test-poll-123',
      question: 'Test Poll - Are notifications working?',
      creator_user_id: 'user_YsPkGs1l1SAro',
      company_id: 'biz_YX2FRzxxEDS7oz',
      experience_id: 'biz_YX2FRzxxEDS7oz',
      send_notification: true
    };

    const company = {
      id: 'biz_YX2FRzxxEDS7oz',
      name: 'Test Company'
    };

    console.log('📱 Simulating notification for poll:', poll.id);
    console.log('   Question:', poll.question);
    console.log('   Company:', company.name);
    console.log('   Experience ID:', poll.experience_id);
    console.log('   Notifications enabled:', poll.send_notification);

    if (!poll.send_notification) {
      console.log('❌ Notifications disabled, skipping');
      return;
    }

    // Prepare notification content
    const notificationInfo = {
      title: 'New Poll Available!',
      subtitle: company.name || 'Community Poll',
      content: poll.question.length > 100 
        ? poll.question.substring(0, 100) + '...' 
        : poll.question,
    };

    console.log('\n📋 Notification content:');
    console.log('   Title:', notificationInfo.title);
    console.log('   Subtitle:', notificationInfo.subtitle);
    console.log('   Content:', notificationInfo.content);

    // This is the payload that would be sent to Whop SDK
    const notificationPayload = {
      title: notificationInfo.title,
      content: notificationInfo.content,
      experienceId: poll.experience_id,
      externalId: poll.id,
      isMention: true,
      restPath: `/experiences/${poll.experience_id}`,
      senderUserId: poll.creator_user_id,
    };

    console.log('\n📤 Notification payload:');
    console.log(JSON.stringify(notificationPayload, null, 2));

    console.log('\n✅ Notification would be sent successfully!');
    console.log('📱 Users in the experience would receive a push notification');
    console.log('🔗 Tapping the notification would open:', notificationPayload.restPath);

  } catch (error) {
    console.error('❌ Notification test failed:', error);
  }
}

testNotificationDirect();
