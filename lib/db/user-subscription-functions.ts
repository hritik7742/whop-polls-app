import { createServerClient } from '@/lib/supabase';

export interface UserPollUsage {
  subscription_status: 'free' | 'pro' | 'cancelled';
  total_polls_created: number;
  active_polls_count: number;
  can_create_more: boolean;
  max_free_polls: number;
}

export interface UserSubscription {
  id: string;
  user_id: string;
  company_id: string;
  experience_id: string;
  subscription_status: 'free' | 'pro' | 'cancelled';
  plan_id?: string;
  access_pass_id?: string;
  subscription_started_at?: string;
  subscription_ends_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Get user's poll usage information
 */
export async function getUserPollUsage(
  userId: string,
  companyId: string,
  experienceId: string
): Promise<UserPollUsage | null> {
  const supabase = createServerClient();
  
  try {
    // Get subscription status
    const { data: subscriptionData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('subscription_status')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('experience_id', experienceId)
      .single();

    // Get poll usage data from user_poll_usage table
    const { data: usageData, error: usageError } = await supabase
      .from('user_poll_usage')
      .select('total_polls_created, active_polls_count')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('experience_id', experienceId)
      .single();

    const subscriptionStatus = subscriptionData?.subscription_status || 'free';
    const totalPolls = usageData?.total_polls_created || 0;
    const activePolls = usageData?.active_polls_count || 0;
    const maxFreePolls = 3;
    const canCreateMore = subscriptionStatus === 'pro' || activePolls < maxFreePolls;

    return {
      subscription_status: subscriptionStatus,
      total_polls_created: totalPolls,
      active_polls_count: activePolls,
      can_create_more: canCreateMore,
      max_free_polls: maxFreePolls
    };
  } catch (error) {
    console.error('Error getting user poll usage:', error);
    return {
      subscription_status: 'free',
      total_polls_created: 0,
      active_polls_count: 0,
      can_create_more: true,
      max_free_polls: 3
    };
  }
}

/**
 * Check if user can create more polls
 */
export async function canUserCreatePoll(
  userId: string,
  companyId: string,
  experienceId: string
): Promise<boolean> {
  const supabase = createServerClient();
  
  try {
    // Check subscription status
    const { data: subscriptionData, error: subError } = await supabase
      .from('user_subscriptions')
      .select('subscription_status')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('experience_id', experienceId)
      .single();

    // If user has pro subscription, they can create unlimited polls
    const subscriptionStatus = subscriptionData?.subscription_status || 'free';
    if (subscriptionStatus === 'pro') {
      return true;
    }

    // For free users, check active poll count from user_poll_usage table
    const { data: usageData, error: usageError } = await supabase
      .from('user_poll_usage')
      .select('active_polls_count')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('experience_id', experienceId)
      .single();

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking poll creation permission:', usageError);
      return false;
    }

    const activePollsCount = usageData?.active_polls_count || 0;
    return activePollsCount < 3; // Free users can create up to 3 active polls
  } catch (error) {
    console.error('Error checking poll creation permission:', error);
    return false;
  }
}

/**
 * Create or update user subscription
 */
export async function updateUserSubscription(
  userId: string,
  companyId: string,
  experienceId: string,
  subscriptionData: {
    subscription_status: 'free' | 'pro' | 'cancelled';
    plan_id?: string;
    access_pass_id?: string;
    subscription_started_at?: string;
    subscription_ends_at?: string;
  }
): Promise<UserSubscription | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      company_id: companyId,
      experience_id: experienceId,
      ...subscriptionData,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,company_id,experience_id'
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating user subscription:', error);
    return null;
  }

  return data;
}

/**
 * Get user subscription
 */
export async function getUserSubscription(
  userId: string,
  companyId: string,
  experienceId: string
): Promise<UserSubscription | null> {
  const supabase = createServerClient();
  
  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('experience_id', experienceId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    console.error('Error getting user subscription:', error);
    return null;
  }

  return data;
}

/**
 * Initialize user subscription (called when user first accesses the app)
 */
export async function initializeUserSubscription(
  userId: string,
  companyId: string,
  experienceId: string
): Promise<UserSubscription | null> {
  const supabase = createServerClient();
  
  try {
    // Check if subscription already exists
    const { data: existing, error: checkError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('company_id', companyId)
      .eq('experience_id', experienceId)
      .single();

    if (existing) {
      return existing;
    }

    // Create new free subscription
    const { data: newSubscription, error: createError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        company_id: companyId,
        experience_id: experienceId,
        subscription_status: 'free'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user subscription:', createError);
      return null;
    }

    return newSubscription;
  } catch (error) {
    console.error('Error initializing user subscription:', error);
    return null;
  }
}
