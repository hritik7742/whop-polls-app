import { whopSdk } from '@/lib/whop-sdk';
import { createServerClient } from '@/lib/supabase';

export interface PollInfo {
  id: string;
  question: string;
  creator_user_id: string;
  company_id: string;
  experience_id: string;
  send_notification: boolean;
}

export interface CompanyInfo {
  id: string;
  name: string;
}

/**
 * Send push notification when a poll becomes active
 * Following official Whop documentation approach
 * This is called when:
 * 1. A poll is created and launched immediately (status: 'active')
 * 2. A scheduled poll becomes active
 */
export async function sendPollActiveNotification(
  poll: PollInfo,
  company: CompanyInfo
) {
  try {
    // Only send notification if the poll creator enabled notifications
    if (!poll.send_notification) {
      console.log(`Poll ${poll.id} has notifications disabled, skipping notification`);
      return;
    }

    // Validate experience ID - it should start with 'exp_', not 'biz_'
    if (!poll.experience_id.startsWith('exp_')) {
      console.error(`❌ Invalid experience ID: ${poll.experience_id}. Experience IDs should start with 'exp_', not 'biz_'`);
      console.log('This is likely a company ID being used instead of an experience ID.');
      console.log('Please check your database and ensure polls are created with proper experience IDs.');
      return;
    }

    // Note: We can't list experience members with current SDK, but we'll send notification anyway
    console.log('📋 Sending notification to all members of experience:', poll.experience_id);

    // Send a push notification to everyone in the experience
    // Following official Whop documentation structure
    console.log('📤 Sending push notification...');
    await whopSdk.notifications.sendPushNotification({
      title: "New poll launched!", // Required!
      content: poll.question.length > 100 
        ? poll.question.substring(0, 100) + "..." 
        : poll.question, // Format the content as you wish
      experienceId: poll.experience_id, // send to all users with access to this experience
      isMention: true, // Set this to true to make everyone immediately get a mobile push notification
      senderUserId: poll.creator_user_id, // This will render this user's profile picture as the notification image
      restPath: `/polls/${poll.id}`, // Deep link to specific poll (fixed: added leading slash)
    });

    console.log(`✅ Poll notification sent for poll ${poll.id} to all users in experience ${poll.experience_id}`);
    console.log('🔍 Experience ID validation:', {
      experienceId: poll.experience_id,
      isCompanyId: poll.experience_id.startsWith('biz_'),
      isExperienceId: poll.experience_id.startsWith('exp_'),
      shouldBeExperienceId: 'Experience IDs should start with exp_, not biz_'
    });
    
  } catch (error) {
    console.error('Error sending poll notification:', error);
  }
}



/**
 * Send notification for multiple polls that became active
 * Used when scheduled polls are activated in batch
 */
export async function sendBatchPollNotifications(
  polls: PollInfo[],
  company: CompanyInfo
) {
  try {
    // Filter polls that have notifications enabled
    const pollsWithNotifications = polls.filter(poll => poll.send_notification);
    
    if (pollsWithNotifications.length === 0) {
      console.log('No polls with notifications enabled in batch');
      return;
    }

    console.log(`Sending notifications for ${pollsWithNotifications.length} polls`);

    // Send notifications for each poll
    for (const poll of pollsWithNotifications) {
      await sendPollActiveNotification(poll, company);
      // Add a small delay between notifications to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`✅ Batch notifications completed for ${pollsWithNotifications.length} polls`);
  } catch (error) {
    console.error('Error sending batch poll notifications:', error);
  }
}

/**
 * Get company information by ID
 */
export async function getCompanyInfo(companyId: string): Promise<CompanyInfo | null> {
  try {
    const company = await whopSdk.companies.getCompany({
      companyId: companyId,
    });

    return {
      id: company.id,
      name: (company as any).name || (company as any).title || 'Community'
    };
  } catch (error) {
    console.error('Error getting company info:', error);
    return {
      id: companyId,
      name: 'Community'
    };
  }
}

/**
 * Get poll information from database
 */
export async function getPollInfo(pollId: string): Promise<PollInfo | null> {
  try {
    const supabase = createServerClient();
    
    const { data: poll, error } = await supabase
      .from('polls')
      .select('id, question, creator_user_id, company_id, experience_id, send_notification')
      .eq('id', pollId)
      .single();

    if (error) {
      console.error('Error getting poll info:', error);
      return null;
    }

    return poll;
  } catch (error) {
    console.error('Error getting poll info:', error);
    return null;
  }
}

/**
 * Test notification function - send to specific users for testing
 * Usage: await testNotificationToUsers(['user_123', 'user_456'], 'Test poll', 'exp_123');
 */
export async function testNotificationToUsers(
  userIds: string[], 
  pollTitle: string, 
  experienceId: string,
  senderUserId: string
) {
  try {
    console.log('🧪 Testing notification to specific users...');
    console.log('📋 Target users:', userIds);
    
    // Send notification to specific users
    await whopSdk.notifications.sendPushNotification({
      title: "Test Poll Notification",
      content: pollTitle,
      experienceId: experienceId,
      userIds: userIds, // Send to specific users only
      isMention: true,
      senderUserId: senderUserId,
      restPath: `/test-poll`, // Fixed: added leading slash
    });

    console.log(`✅ Test notification sent to ${userIds.length} specific users`);
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
  }
}
