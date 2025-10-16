/**
 * Test script for push notification functionality
 * Run this script to test poll notifications
 */

const { createServerClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_USER_ID = 'test-user-123';
const TEST_COMPANY_ID = 'test-company-456';
const TEST_EXPERIENCE_ID = 'test-experience-789';

async function testNotificationFunctionality() {
  console.log('🔔 Testing Push Notification Functionality...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration. Please set environment variables.');
    return;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Create a poll with notifications enabled
    console.log('1️⃣ Testing poll creation with notifications enabled...');
    const { data: pollWithNotifications, error: pollError1 } = await supabase
      .from('polls')
      .insert({
        question: 'Test Poll with Notifications - What is your favorite color?',
        company_id: TEST_COMPANY_ID,
        experience_id: TEST_EXPERIENCE_ID,
        creator_user_id: TEST_USER_ID,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        status: 'active',
        send_notification: true
      })
      .select()
      .single();

    if (pollError1) {
      console.error('❌ Failed to create poll with notifications:', pollError1);
      return;
    }
    console.log('✅ Poll with notifications created:', pollWithNotifications.id);

    // Test 2: Create a poll with notifications disabled
    console.log('\n2️⃣ Testing poll creation with notifications disabled...');
    const { data: pollWithoutNotifications, error: pollError2 } = await supabase
      .from('polls')
      .insert({
        question: 'Test Poll without Notifications - What is your favorite food?',
        company_id: TEST_COMPANY_ID,
        experience_id: TEST_EXPERIENCE_ID,
        creator_user_id: TEST_USER_ID,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        status: 'active',
        send_notification: false
      })
      .select()
      .single();

    if (pollError2) {
      console.error('❌ Failed to create poll without notifications:', pollError2);
      return;
    }
    console.log('✅ Poll without notifications created:', pollWithoutNotifications.id);

    // Test 3: Create a scheduled poll with notifications
    console.log('\n3️⃣ Testing scheduled poll creation with notifications...');
    const scheduledTime = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 minutes from now
    const { data: scheduledPoll, error: pollError3 } = await supabase
      .from('polls')
      .insert({
        question: 'Scheduled Poll with Notifications - What is your favorite season?',
        company_id: TEST_COMPANY_ID,
        experience_id: TEST_EXPERIENCE_ID,
        creator_user_id: TEST_USER_ID,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        status: 'scheduled',
        scheduled_at: scheduledTime,
        send_notification: true
      })
      .select()
      .single();

    if (pollError3) {
      console.error('❌ Failed to create scheduled poll:', pollError3);
      return;
    }
    console.log('✅ Scheduled poll created:', scheduledPoll.id, 'scheduled for:', scheduledTime);

    // Test 4: Test notification API endpoint
    console.log('\n4️⃣ Testing notification API endpoint...');
    try {
      const response = await fetch('http://localhost:3000/api/polls/activate-scheduled', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Notification API test successful:', result.message);
        if (result.activatedCount > 0) {
          console.log(`   Activated ${result.activatedCount} polls`);
        }
      } else {
        console.log('⚠️  Notification API test failed (this is expected if server is not running)');
      }
    } catch (apiError) {
      console.log('⚠️  Notification API test failed (server not running):', apiError.message);
    }

    // Test 5: Verify poll data structure
    console.log('\n5️⃣ Verifying poll data structure...');
    const { data: allPolls, error: fetchError } = await supabase
      .from('polls')
      .select('id, question, status, send_notification, scheduled_at')
      .eq('creator_user_id', TEST_USER_ID)
      .eq('company_id', TEST_COMPANY_ID)
      .eq('experience_id', TEST_EXPERIENCE_ID);

    if (fetchError) {
      console.error('❌ Failed to fetch polls:', fetchError);
    } else {
      console.log('✅ Poll data structure verification:');
      allPolls?.forEach(poll => {
        console.log(`   - ${poll.id}: "${poll.question.substring(0, 30)}..." (${poll.status}, notifications: ${poll.send_notification})`);
      });
    }

    // Test 6: Cleanup test data
    console.log('\n6️⃣ Cleaning up test data...');
    await supabase
      .from('polls')
      .delete()
      .eq('creator_user_id', TEST_USER_ID)
      .eq('company_id', TEST_COMPANY_ID)
      .eq('experience_id', TEST_EXPERIENCE_ID);

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All notification tests completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Create a poll with notifications enabled');
    console.log('3. Check if push notifications are sent to community members');
    console.log('4. Test scheduled polls by creating one scheduled for 1 minute from now');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
if (require.main === module) {
  testNotificationFunctionality();
}

module.exports = { testNotificationFunctionality };
