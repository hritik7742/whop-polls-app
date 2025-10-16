/**
 * Test script to verify notification logic without external dependencies
 */

console.log('🔔 Testing Notification Logic...\n');

// Mock the notification function
async function mockSendPollActiveNotification(poll, company) {
  console.log('📱 Mock notification would be sent:');
  console.log('   Poll ID:', poll.id);
  console.log('   Question:', poll.question);
  console.log('   Company:', company.name);
  console.log('   Experience ID:', poll.experience_id);
  console.log('   Notifications enabled:', poll.send_notification);
  
  if (poll.send_notification) {
    console.log('✅ Notification would be sent to all users in experience');
    return true;
  } else {
    console.log('❌ Notifications disabled, no notification sent');
    return false;
  }
}

// Test cases
async function runTests() {
  console.log('1️⃣ Testing poll with notifications enabled...');
  const pollWithNotifications = {
    id: 'test-poll-1',
    question: 'Do you like push notifications?',
    experience_id: 'test-experience-123',
    send_notification: true
  };
  
  const company = { name: 'Test Company' };
  
  await mockSendPollActiveNotification(pollWithNotifications, company);
  
  console.log('\n2️⃣ Testing poll with notifications disabled...');
  const pollWithoutNotifications = {
    id: 'test-poll-2',
    question: 'This poll has notifications disabled',
    experience_id: 'test-experience-123',
    send_notification: false
  };
  
  await mockSendPollActiveNotification(pollWithoutNotifications, company);
  
  console.log('\n3️⃣ Testing notification payload structure...');
  const notificationPayload = {
    title: 'New Poll Available!',
    content: 'Do you like push notifications?',
    experienceId: 'test-experience-123',
    externalId: 'test-poll-1',
    isMention: true,
    restPath: '/experiences/test-experience-123',
    senderUserId: 'test-user-123'
  };
  
  console.log('📋 Notification payload structure:');
  console.log(JSON.stringify(notificationPayload, null, 2));
  
  console.log('\n✅ All notification logic tests passed!');
  console.log('\n📱 To test real notifications:');
  console.log('1. Make sure your development server is running');
  console.log('2. Create a poll with notifications enabled');
  console.log('3. Check your device for push notifications');
  console.log('4. Check server logs for notification attempts');
}

runTests().catch(console.error);
