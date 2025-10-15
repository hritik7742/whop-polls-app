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
  
  const { data, error } = await supabase.rpc('get_user_poll_usage', {
    p_user_id: userId,
    p_company_id: companyId,
    p_experience_id: experienceId
  });

  if (error) {
    console.error('Error getting user poll usage:', error);
    return null;
  }

  return data?.[0] || {
    subscription_status: 'free',
    total_polls_created: 0,
    active_polls_count: 0,
    can_create_more: true,
    max_free_polls: 3
  };
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
  
  const { data, error } = await supabase.rpc('can_user_create_poll', {
    p_user_id: userId,
    p_company_id: companyId,
    p_experience_id: experienceId
  });

  if (error) {
    console.error('Error checking poll creation permission:', error);
    return false;
  }

  return data || false;
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
  
  // Check if subscription already exists
  const existing = await getUserSubscription(userId, companyId, experienceId);
  if (existing) {
    return existing;
  }

  // Create new free subscription
  return await updateUserSubscription(userId, companyId, experienceId, {
    subscription_status: 'free'
  });
}
