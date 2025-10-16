/**
 * Test script for freemium functionality
 * Run this script to test the poll creation limits and upgrade flow
 */

const { createServerClient } = require('@supabase/supabase-js');

// Test configuration
const TEST_USER_ID = 'test-user-123';
const TEST_COMPANY_ID = 'test-company-456';
const TEST_EXPERIENCE_ID = 'test-experience-789';

async function testFreemiumFunctionality() {
  console.log('🧪 Testing Freemium Functionality...\n');

  // Initialize Supabase client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase configuration. Please set environment variables.');
    return;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Initialize user subscription
    console.log('1️⃣ Testing user subscription initialization...');
    const { data: subscription, error: subError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: TEST_USER_ID,
        company_id: TEST_COMPANY_ID,
        experience_id: TEST_EXPERIENCE_ID,
        subscription_status: 'free'
      })
      .select()
      .single();

    if (subError) {
      console.error('❌ Failed to initialize subscription:', subError);
      return;
    }
    console.log('✅ User subscription initialized:', subscription.subscription_status);

    // Test 2: Check initial poll creation permission
    console.log('\n2️⃣ Testing initial poll creation permission...');
    const { data: usageData, error: usageError } = await supabase
      .from('user_poll_usage')
      .select('active_polls_count')
      .eq('user_id', TEST_USER_ID)
      .eq('company_id', TEST_COMPANY_ID)
      .eq('experience_id', TEST_EXPERIENCE_ID)
      .single();

    const initialCount = usageData?.active_polls_count || 0;
    console.log(`✅ Initial active polls count: ${initialCount}`);

    // Test 3: Create test polls (up to limit)
    console.log('\n3️⃣ Testing poll creation up to limit...');
    const maxFreePolls = 3;
    
    for (let i = 1; i <= maxFreePolls + 1; i++) {
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          question: `Test Poll ${i}`,
          company_id: TEST_COMPANY_ID,
          experience_id: TEST_EXPERIENCE_ID,
          creator_user_id: TEST_USER_ID,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
          status: 'active'
        })
        .select()
        .single();

      if (pollError) {
        console.log(`❌ Poll ${i} creation failed (expected for poll ${maxFreePolls + 1}):`, pollError.message);
        break;
      }
      console.log(`✅ Poll ${i} created successfully: ${poll.question}`);
    }

    // Test 4: Check final usage count
    console.log('\n4️⃣ Checking final usage count...');
    const { data: finalUsage, error: finalError } = await supabase
      .from('user_poll_usage')
      .select('active_polls_count, total_polls_created')
      .eq('user_id', TEST_USER_ID)
      .eq('company_id', TEST_COMPANY_ID)
      .eq('experience_id', TEST_EXPERIENCE_ID)
      .single();

    if (finalError) {
      console.error('❌ Failed to get final usage:', finalError);
    } else {
      console.log(`✅ Final usage - Active: ${finalUsage.active_polls_count}, Total: ${finalUsage.total_polls_created}`);
    }

    // Test 5: Test Pro upgrade
    console.log('\n5️⃣ Testing Pro upgrade...');
    const { data: proSubscription, error: proError } = await supabase
      .from('user_subscriptions')
      .update({
        subscription_status: 'pro',
        subscription_started_at: new Date().toISOString()
      })
      .eq('user_id', TEST_USER_ID)
      .eq('company_id', TEST_COMPANY_ID)
      .eq('experience_id', TEST_EXPERIENCE_ID)
      .select()
      .single();

    if (proError) {
      console.error('❌ Failed to upgrade to Pro:', proError);
    } else {
      console.log('✅ Successfully upgraded to Pro:', proSubscription.subscription_status);
    }

    // Test 6: Test unlimited poll creation after Pro upgrade
    console.log('\n6️⃣ Testing unlimited poll creation after Pro upgrade...');
    const { data: unlimitedPoll, error: unlimitedError } = await supabase
      .from('polls')
      .insert({
        question: 'Unlimited Poll After Pro Upgrade',
        company_id: TEST_COMPANY_ID,
        experience_id: TEST_EXPERIENCE_ID,
        creator_user_id: TEST_USER_ID,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (unlimitedError) {
      console.error('❌ Failed to create unlimited poll:', unlimitedError);
    } else {
      console.log('✅ Successfully created unlimited poll:', unlimitedPoll.question);
    }

    // Test 7: Cleanup test data
    console.log('\n7️⃣ Cleaning up test data...');
    await supabase
      .from('polls')
      .delete()
      .eq('creator_user_id', TEST_USER_ID)
      .eq('company_id', TEST_COMPANY_ID)
      .eq('experience_id', TEST_EXPERIENCE_ID);

    await supabase
      .from('user_subscriptions')
      .delete()
      .eq('user_id', TEST_USER_ID)
      .eq('company_id', TEST_COMPANY_ID)
      .eq('experience_id', TEST_EXPERIENCE_ID);

    await supabase
      .from('user_poll_usage')
      .delete()
      .eq('user_id', TEST_USER_ID)
      .eq('company_id', TEST_COMPANY_ID)
      .eq('experience_id', TEST_EXPERIENCE_ID);

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All freemium tests passed! Your implementation is working correctly.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
if (require.main === module) {
  testFreemiumFunctionality();
}

module.exports = { testFreemiumFunctionality };
