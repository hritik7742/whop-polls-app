const { createClient } = require('@supabase/supabase-js');

// You'll need to replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for admin operations

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSubscriptionUpdate() {
  console.log('🔍 Testing subscription status update...\n');

  // You need to replace this with your actual user ID (much simpler now!)
  // You can find this in your browser's developer tools when on the dashboard
  const testUserId = 'YOUR_USER_ID_HERE'; // Replace with actual user ID

  if (testUserId === 'YOUR_USER_ID_HERE') {
    console.log('❌ Please update the script with your actual user ID:');
    console.log('   1. Open your dashboard in the browser');
    console.log('   2. Open Developer Tools (F12)');
    console.log('   3. Go to Console tab');
    console.log('   4. Look for logs that show userId');
    console.log('   5. Update this script with that value\n');
    return;
  }

  try {
    // First, let's check the current subscription status (much simpler!)
    console.log('📊 Checking current subscription status...');
    const { data: currentSubscription, error: fetchError } = await supabase
      .from('user_subscriptions_simple')
      .select('*')
      .eq('user_id', testUserId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('❌ Error fetching current subscription:', fetchError);
      return;
    }

    console.log('Current subscription status:', currentSubscription || 'No subscription found');

    // Now let's update it to 'pro' (much simpler!)
    console.log('\n🔄 Updating subscription to "pro"...');
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('user_subscriptions_simple')
      .upsert({
        user_id: testUserId,
        subscription_status: 'pro',
        plan_id: 'test_pro_plan',
        access_pass_id: 'test_access_pass',
        subscription_started_at: new Date().toISOString(),
        subscription_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating subscription:', updateError);
      return;
    }

    console.log('✅ Subscription updated successfully:', updatedSubscription);

    // Let's also check the polls count (across all companies/experiences)
    console.log('\n📈 Checking polls count...');
    const { data: pollsData, error: pollsError } = await supabase
      .from('polls')
      .select('id, created_at, status')
      .eq('creator_user_id', testUserId);

    if (pollsError) {
      console.error('❌ Error fetching polls:', pollsError);
      return;
    }

    const totalPolls = pollsData?.length || 0;
    const activePolls = pollsData?.filter(poll => poll.status === 'active').length || 0;

    console.log(`📊 Polls summary: ${totalPolls} total, ${activePolls} active`);

    console.log('\n🎯 Test completed! Now:');
    console.log('   1. Go to your dashboard in the browser');
    console.log('   2. Check if the "Upgrade to Pro" button changed to "Pro Activated"');
    console.log('   3. If it didn\'t change, check the browser console for any errors');
    console.log('   4. The real-time subscription should update automatically');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the test
testSubscriptionUpdate();
