'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { initializeUserSubscription } from '@/lib/db/user-subscription-functions';

interface UseRealtimeUserSubscriptionProps {
  userId: string;
  companyId: string; // Keep for poll filtering, but not for subscription
  experienceId?: string; // Keep for poll filtering, but not for subscription
}

interface UserSubscriptionData {
  usage: {
    total_polls_created: number;
    active_polls_count: number;
    last_poll_created_at: string | null;
  };
  subscription: {
    subscription_status: string;
    plan_id: string | null;
    access_pass_id: string | null;
    subscription_started_at: string | null;
    subscription_ends_at: string | null;
  };
  canCreatePoll: boolean;
  isProUser: boolean;
  pollsRemaining: number;
}

export function useRealtimeUserSubscription({ userId, companyId, experienceId }: UseRealtimeUserSubscriptionProps) {
  const [data, setData] = useState<UserSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const subscriptionsRef = useRef<any[]>([]);

  // Optimistic poll creation - increment usage immediately
  const optimisticCreatePoll = useCallback(() => {
    setData(prevData => {
      if (!prevData) return prevData;
      
      const newTotalPolls = prevData.usage.total_polls_created + 1;
      const newActivePolls = prevData.usage.active_polls_count + 1;
      const isProUser = prevData.subscription.subscription_status === 'pro';
      const freeLimit = 3;
      const pollsRemaining = isProUser ? Infinity : Math.max(0, freeLimit - newTotalPolls);
      const canCreatePoll = isProUser || newTotalPolls < freeLimit;
      
      return {
        ...prevData,
        usage: {
          ...prevData.usage,
          total_polls_created: newTotalPolls,
          active_polls_count: newActivePolls,
          last_poll_created_at: new Date().toISOString()
        },
        canCreatePoll,
        pollsRemaining
      };
    });
  }, []);

  // Optimistic poll deletion - decrement usage immediately
  const optimisticDeletePoll = useCallback(() => {
    setData(prevData => {
      if (!prevData) return prevData;
      
      const newTotalPolls = Math.max(0, prevData.usage.total_polls_created - 1);
      const newActivePolls = Math.max(0, prevData.usage.active_polls_count - 1);
      const isProUser = prevData.subscription.subscription_status === 'pro';
      const freeLimit = 3;
      const pollsRemaining = isProUser ? Infinity : Math.max(0, freeLimit - newTotalPolls);
      const canCreatePoll = isProUser || newTotalPolls < freeLimit;
      
      return {
        ...prevData,
        usage: {
          ...prevData.usage,
          total_polls_created: newTotalPolls,
          active_polls_count: newActivePolls
        },
        canCreatePoll,
        pollsRemaining
      };
    });
  }, []);

  // Optimistic subscription upgrade - upgrade to pro immediately
  const optimisticUpgradeToPro = useCallback(() => {
    setData(prevData => {
      if (!prevData) return prevData;
      
      return {
        ...prevData,
        subscription: {
          ...prevData.subscription,
          subscription_status: 'pro',
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 year from now
        },
        isProUser: true,
        canCreatePoll: true,
        pollsRemaining: Infinity
      };
    });
  }, []);

  // Fetch user subscription data
  const fetchUserSubscription = useCallback(async () => {
    if (!supabase) {
      console.warn('Supabase not configured for user subscription');
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Fetch user subscription (user-based only)
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions_simple')
        .select('*')
        .eq('user_id', userId)
        .single();

      // Calculate poll usage directly from polls table (more reliable)
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select('id, created_at, status')
        .eq('creator_user_id', userId)
        .eq('company_id', companyId)
        .eq('experience_id', experienceId || companyId);

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error fetching user subscription:', subscriptionError);
      }

      if (pollsError) {
        console.error('Error fetching user polls:', pollsError);
      }

      // If no subscription data found, initialize it with default free status
      let finalSubscriptionData = subscriptionData;
      if (!subscriptionData && subscriptionError?.code === 'PGRST116') {
        console.log('No subscription found, initializing user subscription...');
        try {
          const { data: newSubscription, error: insertError } = await supabase
            .from('user_subscriptions_simple')
            .insert({
              user_id: userId,
              subscription_status: 'free',
              plan_id: null,
              access_pass_id: null,
              subscription_started_at: null,
              subscription_ends_at: null
            })
            .select()
            .single();
          
          if (insertError) {
            console.error('Error creating user subscription:', insertError);
          } else {
            finalSubscriptionData = newSubscription;
            console.log('User subscription initialized:', finalSubscriptionData);
          }
        } catch (initError) {
          console.error('Error initializing user subscription:', initError);
        }
      }

      // Calculate usage from actual polls data
      const totalPollsCreated = pollsData?.length || 0;
      const activePollsCount = pollsData?.filter(poll => poll.status === 'active').length || 0;
      const lastPollCreatedAt = pollsData && pollsData.length > 0 
        ? pollsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at
        : null;

      const usage = {
        total_polls_created: totalPollsCreated,
        active_polls_count: activePollsCount,
        last_poll_created_at: lastPollCreatedAt
      };

      const subscription = finalSubscriptionData || {
        subscription_status: 'free',
        plan_id: null,
        access_pass_id: null,
        subscription_started_at: null,
        subscription_ends_at: null
      };

      const isProUser = subscription.subscription_status === 'pro';
      const freeLimit = 3; // Free users can create 3 polls
      const pollsRemaining = isProUser ? Infinity : Math.max(0, freeLimit - usage.total_polls_created);
      const canCreatePoll = isProUser || usage.total_polls_created < freeLimit;

      console.log('User subscription data:', {
        userId,
        companyId,
        experienceId,
        usage,
        subscription,
        isProUser,
        canCreatePoll,
        pollsRemaining,
        subscriptionQuery: `user_id=${userId} (user-based only)`
      });

      setData({
        usage,
        subscription,
        canCreatePoll,
        isProUser,
        pollsRemaining
      });

    } catch (error) {
      console.error('Error fetching user subscription:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch subscription data');
    } finally {
      setLoading(false);
    }
  }, [userId, companyId, experienceId]);

  // Real-time update handler
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('Real-time user subscription update received:', payload);
    
    // Refetch data when subscription or usage changes
    fetchUserSubscription();
  }, [fetchUserSubscription]);

  // Set up real-time subscriptions
  useEffect(() => {
    fetchUserSubscription();

    // Set up real-time subscriptions only if Supabase is configured
    if (!supabase) {
      return;
    }

    // Clear existing subscriptions
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];

    // Create subscriptions for user subscription tables AND polls table
    const tables = ['user_subscriptions_simple', 'polls'];
    
    tables.forEach(table => {
      const channelName = `user_subscription_${table}_changes_${userId}`;
      const filter = table === 'polls' 
        ? `company_id=eq.${companyId}` 
        : `user_id=eq.${userId}`; // Much simpler - just user_id for subscription
      
      console.log(`Setting up real-time subscription for ${table}:`, {
        channelName,
        filter,
        userId,
        companyId,
        experienceId
      });
      
      const subscription = supabase!
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: filter
          },
          (payload) => {
            console.log(`Real-time user subscription update from ${table}:`, payload);
            handleRealtimeUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log(`User subscription subscription status for ${table}:`, status);
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${table} changes for user ${userId}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Error subscribing to ${table} changes`);
            setError(`Failed to subscribe to ${table} updates`);
          } else if (status === 'TIMED_OUT') {
            console.warn(`⏰ Subscription to ${table} timed out`);
          } else if (status === 'CLOSED') {
            console.log(`🔒 Subscription to ${table} closed`);
          }
        });
      
      subscriptionsRef.current.push(subscription);
    });

    return () => {
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [userId, companyId, fetchUserSubscription, handleRealtimeUpdate]);

  return { 
    usage: data?.usage,
    subscription: data?.subscription,
    canCreatePoll: data?.canCreatePoll,
    isProUser: data?.isProUser,
    pollsRemaining: data?.pollsRemaining,
    loading, 
    error, 
    refetch: fetchUserSubscription,
    optimisticCreatePoll,
    optimisticDeletePoll,
    optimisticUpgradeToPro
  };
}
