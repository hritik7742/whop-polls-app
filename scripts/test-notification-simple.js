/**
 * Simple test script to verify notification functionality
 */

const { createServerClient } = require('@supabase/supabase-js');

async function testNotification() {
  console.log('🔔 Testing Notification Functionality...\n');

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
    console.log('1️⃣ Creating test poll with notifications...');
    const { data: poll, error: pollError } = await supabase
      .from('polls')
      .insert({
        question: 'Test Poll - Do you like push notifications?',
        company_id: 'biz_YX2FRzxxEDS7oz',
        experience_id: 'biz_YX2FRzxxEDS7oz',
        creator_user_id: 'user_YsPkGs1l1SAro',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'active',
        send_notification: true
      })
      .select()
      .single();

    if (pollError) {
      console.error('❌ Failed to create test poll:', pollError);
      return;
    }

    console.log('✅ Test poll created:', poll.id);
    console.log('   Question:', poll.question);
    console.log('   Notifications enabled:', poll.send_notification);

    // Test 2: Call the notification API
    console.log('\n2️⃣ Testing notification API...');
    try {
      const response = await fetch('http://localhost:3000/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'whop-dev-user-token': 'eyJhbGciOiJFUzI1NiJ9.eyJpc0RldiI6dHJ1ZSwiaWF0IjoxNzYwNjAxOTYxLCJleHAiOjE3NjA2ODgzNjEsInN1YiI6InVzZXJfWXNQa0dzMWwxU0FybyIsImlzcyI6InVybjp3aG9wY29tOmV4cC1wcm94eSIsImF1ZCI6ImFwcF9YNU44aGtEVzVRYnQzZSJ9.DG9VjtoBqa1GZOKFkaChs7uknonlCa8ZyfaxzM9JD9GdIUznnh4ZfmLniS_0PoDq-jNYn9Dg88VCrdbrKOx6-w'
        },
        body: JSON.stringify({
          question: 'API Test Poll - Are notifications working?',
          options: [
            { option_text: 'Yes, working great!' },
            { option_text: 'No, not working' }
          ],
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          send_notification: true,
          company_id: 'biz_YX2FRzxxEDS7oz',
          experience_id: 'biz_YX2FRzxxEDS7oz'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ API test successful!');
        console.log('   Poll created via API:', result.id);
        console.log('   Check your device for push notifications!');
      } else {
        const error = await response.json();
        console.error('❌ API test failed:', error);
      }
    } catch (apiError) {
      console.error('❌ API test failed (server not running):', apiError.message);
    }

    // Test 3: Cleanup
    console.log('\n3️⃣ Cleaning up test data...');
    await supabase
      .from('polls')
      .delete()
      .eq('id', poll.id);

    console.log('✅ Test completed!');
    console.log('\n📱 Check your device for push notifications!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testNotification();
}

module.exports = { testNotification };
