import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { sendBatchPollNotifications, getCompanyInfo } from '@/lib/notifications/poll-notifications';

export async function GET(request: NextRequest) {
  try {
    // Check for authorization (you can add API key validation here)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabaseServer = createServerClient();
    
    // Activate scheduled polls that are due
    const { data, error } = await supabaseServer.rpc('activate_scheduled_polls');
    
    if (error) {
      console.error('Error activating scheduled polls:', error);
      return NextResponse.json(
        { error: 'Failed to activate scheduled polls' },
        { status: 500 }
      );
    }

    // Get the count of activated polls with full details for notifications
    const { data: activatedPolls, error: countError } = await supabaseServer
      .from('polls')
      .select('id, question, scheduled_at, creator_user_id, company_id, experience_id, send_notification')
      .eq('status', 'active')
      .gte('scheduled_at', new Date(Date.now() - 60000).toISOString()) // Polls activated in the last minute
      .not('scheduled_at', 'is', null);

    if (countError) {
      console.error('Error counting activated polls:', countError);
    }

    const activatedCount = activatedPolls?.length || 0;
    
    console.log(`✅ Activated ${activatedCount} scheduled polls`);
    
    // Send notifications for activated polls
    if (activatedCount > 0) {
      console.log('Activated polls:', activatedPolls?.map(p => ({ id: p.id, question: p.question.substring(0, 50) + '...' })));
      
      try {
        // Group polls by company to send notifications efficiently
        const pollsByCompany = new Map<string, any[]>();
        
        for (const poll of activatedPolls || []) {
          if (!pollsByCompany.has(poll.company_id)) {
            pollsByCompany.set(poll.company_id, []);
          }
          pollsByCompany.get(poll.company_id)!.push(poll);
        }

        // Send notifications for each company
        for (const [companyId, polls] of pollsByCompany) {
          const company = await getCompanyInfo(companyId);
          if (company) {
            await sendBatchPollNotifications(polls, company);
          }
        }
      } catch (notificationError) {
        console.error('Error sending notifications for activated polls:', notificationError);
        // Don't fail the activation if notifications fail
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled polls activation completed',
      activatedCount,
      activatedPolls: activatedPolls?.map(p => ({ id: p.id, question: p.question })) || []
    });

  } catch (error) {
    console.error('Error in activate-polls cron job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
