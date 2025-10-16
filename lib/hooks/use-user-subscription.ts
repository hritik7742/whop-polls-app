'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { UserPollUsage } from '@/lib/db/user-subscription-functions';

interface UseUserSubscriptionProps {
  userId: string;
  companyId: string;
  experienceId: string;
}

export function useUserSubscription({ userId, companyId, experienceId }: UseUserSubscriptionProps) {
  const [usage, setUsage] = useState<UserPollUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = useCallback(async () => {
    if (!userId || !companyId || !experienceId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/user/subscription?userId=${userId}&companyId=${companyId}&experienceId=${experienceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user subscription');
      }

      const data = await response.json();
      setUsage(data);
    } catch (err) {
      console.error('Error fetching user subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [userId, companyId, experienceId]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Set up real-time subscription for user subscription changes
  useEffect(() => {
    if (!userId || !companyId || !experienceId || !supabase) return;

    // Subscribe to user_subscriptions table changes
    const subscription = supabase
      .channel(`user_subscription_${userId}_${companyId}_${experienceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_subscriptions',
          filter: `user_id=eq.${userId},company_id=eq.${companyId},experience_id=eq.${experienceId}`,
        },
        (payload) => {
          console.log('User subscription changed:', payload);
          // Refetch usage when subscription changes
          fetchUsage();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_poll_usage',
          filter: `user_id=eq.${userId},company_id=eq.${companyId},experience_id=eq.${experienceId}`,
        },
        (payload) => {
          console.log('User poll usage changed:', payload);
          // Refetch usage when poll usage changes
          fetchUsage();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'polls',
          filter: `creator_user_id=eq.${userId},company_id=eq.${companyId},experience_id=eq.${experienceId}`,
        },
        (payload) => {
          console.log('Poll created/deleted, refetching usage:', payload);
          // Refetch usage when polls are created or deleted
          fetchUsage();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId, companyId, experienceId, fetchUsage]);

  const canCreatePoll = usage?.can_create_more ?? true;
  const isProUser = usage?.subscription_status === 'pro';
  const pollsRemaining = isProUser ? 'unlimited' : Math.max(0, (usage?.max_free_polls ?? 3) - (usage?.active_polls_count ?? 0));

  return {
    usage,
    loading,
    error,
    canCreatePoll,
    isProUser,
    pollsRemaining,
    refetch: fetchUsage,
  };
}
