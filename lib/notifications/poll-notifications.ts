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

    // Prepare notification content
    const notificationInfo = {
      title: 'New Poll Available!',
      subtitle: company.name || 'Community Poll',
      content: poll.question.length > 100 
        ? poll.question.substring(0, 100) + '...' 
        : poll.question,
    };

    // Send push notification to all users in the experience
    // Using the correct Whop SDK method based on the documentation
    const notificationPayload = {
      title: notificationInfo.title,
      content: notificationInfo.content,
      experienceId: poll.experience_id,
      externalId: poll.id,
      isMention: true,
      restPath: `/experiences/${poll.experience_id}`,
      senderUserId: poll.creator_user_id,
    };

    console.log('Sending notification with payload:', notificationPayload);
    
    // Try to send the notification
    try {
      // Check if the method exists
      if (whopSdk.notifications && whopSdk.notifications.sendPushNotification) {
        await whopSdk.notifications.sendPushNotification(notificationPayload);
        console.log(`✅ Poll notification sent for poll ${poll.id} to all users in experience ${poll.experience_id}`);
      } else {
        console.error('❌ sendPushNotification method not available in Whop SDK');
        console.log('Available notification methods:', whopSdk.notifications ? Object.keys(whopSdk.notifications) : 'notifications object not found');
        console.log('Available SDK methods:', Object.keys(whopSdk));
      }
    } catch (sdkError) {
      console.error('❌ Error calling Whop SDK sendPushNotification:', sdkError);
      console.log('This might be due to:');
      console.log('1. Whop SDK not properly configured');
      console.log('2. Method name might be different');
      console.log('3. Missing required parameters');
    }
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
      await new Promise(resolve => setTimeout(resolve, 100));
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
