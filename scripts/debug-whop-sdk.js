/**
 * Debug script to check Whop SDK methods
 */

console.log('🔍 Debugging Whop SDK...\n');

// Try to import and check the SDK
try {
  const { whopSdk } = await import('../lib/whop-sdk.js');
  
  console.log('✅ Whop SDK imported successfully');
  console.log('📋 Available methods:');
  
  // Check if notifications object exists
  if (whopSdk.notifications) {
    console.log('   ✅ notifications object exists');
    console.log('   📋 Available notification methods:');
    console.log('      -', Object.keys(whopSdk.notifications));
    
    // Check if sendPushNotification exists
    if (whopSdk.notifications.sendPushNotification) {
      console.log('   ✅ sendPushNotification method exists');
    } else {
      console.log('   ❌ sendPushNotification method does not exist');
    }
  } else {
    console.log('   ❌ notifications object does not exist');
  }
  
  // Check other available methods
  console.log('\n📋 All available SDK methods:');
  console.log('   -', Object.keys(whopSdk));
  
  // Test a simple notification call
  console.log('\n🧪 Testing notification call...');
  try {
    const result = await whopSdk.notifications.sendPushNotification({
      title: 'Test Notification',
      content: 'This is a test',
      experienceId: 'test-experience',
      externalId: 'test-id',
      isMention: true,
      restPath: '/test',
      senderUserId: 'test-user'
    });
    console.log('✅ Notification call successful:', result);
  } catch (error) {
    console.log('❌ Notification call failed:', error.message);
  }
  
} catch (error) {
  console.log('❌ Failed to import Whop SDK:', error.message);
}

console.log('\n🔍 Debug complete!');
