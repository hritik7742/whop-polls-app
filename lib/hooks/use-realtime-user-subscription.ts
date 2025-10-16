'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface UseRealtimeUserSubscriptionProps {
  userId: string;
  companyId: string;
  experienceId?: string;
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
      
      // Fetch user poll usage
      const { data: usageData, error: usageError } = await supabase
        .from('user_poll_usage')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('experience_id', experienceId || companyId)
        .single();

      // Fetch user subscription
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('company_id', companyId)
        .eq('experience_id', experienceId || companyId)
        .single();

      if (usageError && usageError.code !== 'PGRST116') {
        console.error('Error fetching user usage:', usageError);
      }

      if (subscriptionError && subscriptionError.code !== 'PGRST116') {
        console.error('Error fetching user subscription:', subscriptionError);
      }

      // Calculate subscription status
      const usage = usageData || {
        total_polls_created: 0,
        active_polls_count: 0,
        last_poll_created_at: null
      };

      const subscription = subscriptionData || {
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

    // Create subscriptions for user subscription tables
    const tables = ['user_poll_usage', 'user_subscriptions'];
    
    tables.forEach(table => {
      const channelName = `user_subscription_${table}_changes_${userId}_${companyId}`;
      const subscription = supabase!
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            filter: `user_id=eq.${userId}`
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
    ...data,
    loading, 
    error, 
    refetch: fetchUserSubscription,
    optimisticCreatePoll,
    optimisticUpgradeToPro
  };
}
