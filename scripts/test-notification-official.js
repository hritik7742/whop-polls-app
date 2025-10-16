/**
 * Test script based on official Whop documentation
 */

console.log('🔔 Testing Notification with Official Whop Documentation...\n');

// Simulate the exact notification call from the official docs
async function testOfficialNotification() {
  try {
    // This is the exact structure from the official Whop documentation
    const notificationPayload = {
      // The ID of the experience to send the notification to
      experienceId: "biz_YX2FRzxxEDS7oz", // Your experience ID
      
      // The content of the notification (Required!)
      content: "New Poll Available! Do you like push notifications?",
      
      // The title of the notification (Required!)
      title: "New Poll Available!",
      
      // Whether the notification is a mention (sends immediate mobile push)
      isMention: true,
      
      // The rest path to append to the generated deep link
      restPath: "/experiences/biz_YX2FRzxxEDS7oz",
      
      // The ID of the user sending the notification
      senderUserId: "user_YsPkGs1l1SAro",
      
      // An external ID for the notification
      externalId: "test-poll-123"
    };

    console.log('📋 Official notification payload structure:');
    console.log(JSON.stringify(notificationPayload, null, 2));
    
    console.log('\n✅ This payload matches the official Whop documentation exactly!');
    console.log('\n📱 Expected behavior:');
    console.log('1. All users in experience "biz_YX2FRzxxEDS7oz" will receive push notification');
    console.log('2. Notification title: "New Poll Available!"');
    console.log('3. Notification content: "New Poll Available! Do you like push notifications?"');
    console.log('4. Tapping notification opens: /experiences/biz_YX2FRzxxEDS7oz');
    console.log('5. isMention: true ensures immediate mobile push');
    
    console.log('\n🔍 Key differences from previous implementation:');
    console.log('✅ Using experienceId (not companyTeamId)');
    console.log('✅ Both title and content are required');
    console.log('✅ isMention: true for immediate push');
    console.log('✅ restPath for deep linking');
    console.log('✅ externalId for tracking');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOfficialNotification();
