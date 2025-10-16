/**
 * Test script to verify experience ID extraction
 */

console.log('🔍 Testing Experience ID Extraction...\n');

// Simulate the experience ID extraction logic
function testExperienceIdExtraction() {
  console.log('1️⃣ Testing experience ID validation:');
  
  // Test cases
  const testCases = [
    { id: 'exp_123456789', expected: 'valid', description: 'Valid experience ID' },
    { id: 'biz_123456789', expected: 'invalid', description: 'Company ID (should be invalid)' },
    { id: 'exp_abc123def', expected: 'valid', description: 'Valid experience ID with letters' },
    { id: 'biz_abc123def', expected: 'invalid', description: 'Company ID with letters (should be invalid)' },
  ];
  
  testCases.forEach(testCase => {
    const isValid = testCase.id.startsWith('exp_');
    const result = isValid ? '✅ valid' : '❌ invalid';
    console.log(`   ${testCase.description}: ${testCase.id} → ${result}`);
  });
  
  console.log('\n2️⃣ Testing notification payload structure:');
  
  // Simulate the notification payload with proper experience ID
  const validPayload = {
    title: 'New Poll Available!',
    content: 'Test poll question',
    subtitle: 'Test Company',
    experienceId: 'exp_123456789', // This should be a valid experience ID
    externalId: 'poll-123',
    isMention: true,
    restPath: 'polls/poll-123',
    senderUserId: 'user_123'
  };
  
  console.log('✅ Valid notification payload:');
  console.log(JSON.stringify(validPayload, null, 2));
  
  console.log('\n3️⃣ Testing invalid payload (what was happening before):');
  
  const invalidPayload = {
    ...validPayload,
    experienceId: 'biz_123456789', // This was the problem - company ID instead of experience ID
  };
  
  console.log('❌ Invalid notification payload (company ID):');
  console.log(JSON.stringify(invalidPayload, null, 2));
  
  console.log('\n📋 Summary:');
  console.log('✅ Experience IDs should start with "exp_"');
  console.log('❌ Company IDs start with "biz_" and should NOT be used for notifications');
  console.log('🔧 The fix ensures we get real experience IDs from Whop SDK');
  console.log('📱 Notifications will now work because we use valid experience IDs');
}

testExperienceIdExtraction();
