/**
 * Test script to send notifications and see which users receive them
 */

console.log('🔔 Testing Notification with User Tracking...\n');

// Test function to check experience
async function testExperience() {
  try {
    const { whopSdk } = await import('../lib/whop-sdk.js');
    
    // Replace with your actual experience ID
    const experienceId = 'exp_msfdDLMb8sP7Eg'; // Your experience ID
    
    console.log('🔍 Checking experience:', experienceId);
    
    // Note: We can't list users with current SDK, but we can check if experience exists
    try {
      const experience = await whopSdk.experiences.getExperience({ experienceId });
      console.log(`✅ Experience found: ${experience.name || experienceId}`);
      console.log('📋 Notifications will be sent to all members of this experience');
    } catch (error) {
      console.log('❌ Experience not found or access denied');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Test function to send a test notification
async function testNotification() {
  try {
    const { whopSdk } = await import('../lib/whop-sdk.js');
    
    // Replace with your actual values
    const experienceId = 'exp_msfdDLMb8sP7Eg'; // Your experience ID
    const senderUserId = 'user_YsPkGs1l1SAro'; // Your user ID
    
    console.log('\n📤 Sending test notification...');
    
    await whopSdk.notifications.sendPushNotification({
      title: "Test Poll Notification",
      content: "This is a test notification to verify the system is working!",
      experienceId: experienceId,
      isMention: true,
      senderUserId: senderUserId,
      restPath: `/test-poll`, // Fixed: added leading slash
    });

    console.log('✅ Test notification sent successfully!');
    console.log('📱 Check your device for the notification');
    
  } catch (error) {
    console.error('❌ Error sending test notification:', error.message);
  }
}

// Run the tests
async function runTests() {
  await testExperience();
  await testNotification();
}

runTests();
