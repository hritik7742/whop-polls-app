'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Poll, PollOption } from '@/lib/db/polls';

export function useRealtimePolls(companyId: string, userId: string, initialPolls: Poll[] = []) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [loading, setLoading] = useState(initialPolls.length === 0);
  const [error, setError] = useState<string | null>(null);
  const subscriptionsRef = useRef<any[]>([]);

  // Optimistic vote update function - INSTANT like sending a text message
  const optimisticVote = useCallback((pollId: string, optionId: string) => {
    setPolls(prevPolls => {
      return prevPolls.map(poll => {
        if (poll.id === pollId) {
          const wasUserVoted = poll.user_voted;
          const previousVoteOptionId = poll.user_vote_option_id;
          
          // INSTANT update - no complex calculations, maintain original order
          const updatedOptions = poll.options.map(option => {
            if (option.id === optionId) {
              // Increment vote count for selected option
              return {
                ...option,
                vote_count: option.vote_count + 1
              };
            } else if (wasUserVoted && option.id === previousVoteOptionId) {
              // Decrement vote count for previously voted option
              return {
                ...option,
                vote_count: Math.max(option.vote_count - 1, 0)
              };
            }
            return option;
          });

          // INSTANT percentage calculation
          const totalVotes = updatedOptions.reduce((sum, opt) => sum + opt.vote_count, 0);
          const optionsWithPercentages = updatedOptions.map(option => ({
            ...option,
            percentage: totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0
          }));

          return {
            ...poll,
            options: optionsWithPercentages, // Options stay in original order
            total_votes: totalVotes,
            user_voted: true,
            user_vote_option_id: optionId
          };
        }
        return poll;
      });
    });
  }, []);

  // Optimized poll processing function
  const processPollsData = useCallback((pollsData: any[], optionsData: any[], votesData: any[]) => {
    const pollsMap = new Map();
    
    // Create polls map
    pollsData.forEach(poll => {
      pollsMap.set(poll.id, {
        ...poll,
        options: [],
        votes: [],
        total_votes: 0,
        user_voted: false,
        user_vote_option_id: null
      });
    });

    // Add options to polls in original order
    optionsData?.forEach(option => {
      const poll = pollsMap.get(option.poll_id);
      if (poll) {
        poll.options.push(option);
      }
    });

    // Sort options by created_at to maintain original order (with fallback to id for consistency)
    pollsMap.forEach(poll => {
      poll.options.sort((a: any, b: any) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        // Fallback to id for consistent ordering when timestamps are identical
        return a.id.localeCompare(b.id);
      });
    });

    // Add votes to polls and calculate totals
    votesData?.forEach(vote => {
      const poll = pollsMap.get(vote.poll_id);
      if (poll) {
        poll.votes.push(vote);
        // Check if this vote is from the current user
        if (vote.user_id === userId) {
          poll.user_voted = true;
          poll.user_vote_option_id = vote.option_id;
        }
      }
    });

    // Double-check user vote status for each poll
    pollsMap.forEach(poll => {
      if (!poll.user_voted) {
        const userVote = poll.votes.find((vote: any) => vote.user_id === userId);
        if (userVote) {
          poll.user_voted = true;
          poll.user_vote_option_id = userVote.option_id;
        }
      }
    });

    // Calculate totals and percentages - MAINTAIN ORIGINAL ORDER
    return Array.from(pollsMap.values()).map(poll => {
      const totalVotes = poll.options.reduce((sum: number, option: any) => sum + option.vote_count, 0);
      
      // Ensure options stay in original order (by created_at with id fallback)
      const sortedOptions = [...poll.options].sort((a, b) => {
        const timeA = new Date(a.created_at).getTime();
        const timeB = new Date(b.created_at).getTime();
        if (timeA !== timeB) {
          return timeA - timeB;
        }
        // Fallback to id for consistent ordering when timestamps are identical
        return a.id.localeCompare(b.id);
      });
      
      return {
        ...poll,
        total_votes: totalVotes,
        options: sortedOptions.map((option: any) => ({
          ...option,
          percentage: totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0
        }))
      };
    });
  }, [userId]);

  // Optimized fetch function
  const fetchPolls = useCallback(async () => {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty polls array');
      setPolls([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // First, activate any scheduled polls that are due
      const { error: activateError } = await supabase.rpc('activate_scheduled_polls');
      if (activateError) {
        console.warn('Failed to activate scheduled polls:', activateError);
      }
      
      // Update expired polls
      const { error: updateError } = await supabase
        .from('polls')
        .update({ status: 'expired' })
        .lt('expires_at', new Date().toISOString())
        .eq('status', 'active');

      if (updateError) console.warn('Failed to update expired polls:', updateError);

      // First get poll IDs
      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (pollsError) throw pollsError;

      const pollIds = pollsData?.map(poll => poll.id) || [];

      // Fetch options and votes in parallel if we have polls
      const [optionsResult, votesResult] = pollIds.length > 0 ? await Promise.all([
        supabase
          .from('poll_options')
          .select('*')
          .in('poll_id', pollIds)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }), // Secondary sort by id for consistency
        supabase
          .from('poll_votes')
          .select('user_id, option_id, poll_id')
          .in('poll_id', pollIds)
      ]) : [{ data: [] }, { data: [] }];

      const processedPolls = processPollsData(
        pollsData || [],
        optionsResult.data || [],
        votesResult.data || []
      );

      // Debug: Log vote data for troubleshooting
      console.log('📊 fetchPolls (useRealtimePolls) - Raw data:', {
        polls: pollsData?.length || 0,
        options: optionsResult.data?.length || 0,
        votes: votesResult.data?.length || 0,
        companyId,
        userId
      });
      
      if (votesResult.data && votesResult.data.length > 0) {
        console.log('📊 Vote data for user', userId, ':', votesResult.data);
        console.log('📊 Processed polls with vote details:', processedPolls.map(p => ({
          id: p.id,
          question: p.question.substring(0, 50) + '...',
          user_voted: p.user_voted,
          user_vote_option_id: p.user_vote_option_id,
          total_votes: p.total_votes,
          options: p.options.map((opt: PollOption) => ({ id: opt.id, vote_count: opt.vote_count, percentage: opt.percentage }))
        })));
      }

      setPolls(processedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  }, [companyId, processPollsData]);

  // Optimized real-time update handler
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('🔄 Real-time polls update received:', {
      table: payload.table,
      eventType: payload.eventType,
      new: payload.new,
      old: payload.old,
      companyId
    });
    
    // For vote changes, we need to refetch to get updated vote counts
    // For poll changes, we also need to refetch to get updated status
    // Always refetch for any change to ensure consistency
    console.log('🔄 Refetching polls due to real-time update...');
    fetchPolls();
  }, [fetchPolls, companyId]);

  useEffect(() => {
    fetchPolls();

    // Set up real-time subscriptions only if Supabase is configured
    if (!supabase) {
      return;
    }

    // Clear existing subscriptions
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];

    // Create subscriptions for all three tables
    const tables = ['polls', 'poll_options', 'poll_votes'];
    
    tables.forEach(table => {
      const channelName = `${table}_changes_${companyId}_${userId}`;
      const subscription = supabase!
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            ...(table === 'polls' ? { 
              filter: `company_id=eq.${companyId}` 
            } : table === 'poll_votes' ? {
              // For votes, we need to listen to all votes and filter in the handler
              // since we can't filter votes by company_id directly
            } : {})
          },
          (payload) => {
            console.log(`Real-time update from ${table}:`, payload);
            handleRealtimeUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log(`Subscription status for ${table}:`, status);
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${table} changes for company ${companyId}`);
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
  }, [companyId, fetchPolls, handleRealtimeUpdate]);

  return { polls, loading, error, refetch: fetchPolls, optimisticVote };
}
