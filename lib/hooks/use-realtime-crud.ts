'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Poll, PollOption } from '@/lib/db/polls';

interface UseRealtimeCrudProps {
  companyId: string;
  experienceId?: string;
  userId: string;
  initialPolls?: Poll[];
}

export function useRealtimeCrud({ companyId, experienceId, userId, initialPolls = [] }: UseRealtimeCrudProps) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [loading, setLoading] = useState(false); // Start with false since we have initial polls
  const [error, setError] = useState<string | null>(null);
  const subscriptionsRef = useRef<any[]>([]);

  // Process polls data with options and votes
  const processPollsData = useCallback((pollsData: any[], optionsData: any[], votesData: any[], userId: string) => {
    const pollsMap = new Map();

    // First, create polls with their options
    pollsData.forEach((poll: any) => {
      const pollOptions = optionsData
        .filter((option: any) => option.poll_id === poll.id)
        .map((option: any) => ({
          ...option,
          // Keep the vote_count from the database (updated by increment_vote_count function)
          percentage: 0
        }));

      pollsMap.set(poll.id, {
        ...poll,
        options: pollOptions,
        total_votes: 0,
        user_voted: false,
        user_vote_option_id: null,
        votes: []
      });
    });

    // Then, add votes to polls (for user vote tracking only)
    votesData.forEach((vote: any) => {
      const poll = pollsMap.get(vote.poll_id);
      if (poll) {
        poll.votes.push(vote);
        
        // Note: vote_count is already set from the database (poll_options table)
        // We don't need to increment it here since it's maintained by the increment_vote_count function
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
            options: optionsWithPercentages,
            total_votes: totalVotes,
            user_voted: true,
            user_vote_option_id: optionId
          };
        }
        return poll;
      });
    });
  }, []);

  // Optimistic poll creation - add poll immediately to UI
  const optimisticCreatePoll = useCallback((newPoll: Partial<Poll>) => {
    setPolls(prevPolls => {
      const pollWithDefaults = {
        ...newPoll,
        id: newPoll.id || `temp-${Date.now()}`,
        total_votes: 0,
        user_voted: false,
        user_vote_option_id: undefined,
        options: newPoll.options || [],
        votes: [],
        created_at: new Date().toISOString(),
        status: newPoll.status || 'active'
      } as Poll;
      
      return [pollWithDefaults, ...prevPolls];
    });
  }, []);

  // Optimistic poll deletion - remove poll immediately from UI
  const optimisticDeletePoll = useCallback((pollId: string) => {
    setPolls(prevPolls => prevPolls.filter(poll => poll.id !== pollId));
  }, []);

  // Optimistic poll update - update poll immediately in UI
  const optimisticUpdatePoll = useCallback((pollId: string, updates: Partial<Poll>) => {
    setPolls(prevPolls => 
      prevPolls.map(poll => 
        poll.id === pollId ? { ...poll, ...updates } : poll
      )
    );
  }, []);

  // Fetch polls with real-time data
  const fetchPolls = useCallback(async () => {
    if (!supabase) {
      console.warn('Supabase not configured, returning empty polls array');
      setPolls([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Note: Status updates are handled server-side in getPollsByCompany/getPollsByExperience
      // to avoid race conditions and duplicate updates

      // Build the query based on whether we're filtering by experience or company
      const pollQuery = supabase
        .from('polls')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply filters
      if (experienceId) {
        pollQuery.eq('experience_id', experienceId);
      } else {
        pollQuery.eq('company_id', companyId);
      }

      const pollsResult = await pollQuery;
      
      if (pollsResult.error) {
        throw pollsResult.error;
      }

      const pollsData = pollsResult.data || [];
      
      // Early return if no polls
      if (pollsData.length === 0) {
        setPolls([]);
        setLoading(false);
        return;
      }

      // Get poll IDs for filtering options and votes
      const pollIds = pollsData.map(poll => poll.id);

      const [optionsResult, votesResult] = await Promise.all([
        supabase
          .from('poll_options')
          .select('*')
          .in('poll_id', pollIds)
          .order('created_at', { ascending: true })
          .order('id', { ascending: true }),
        supabase
          .from('poll_votes')
          .select('*')
          .in('poll_id', pollIds)
      ]);

      const optionsData = optionsResult.data || [];
      const votesData = votesResult.data || [];
      
      console.log('📊 fetchPolls - Raw data:', {
        polls: pollsData.length,
        options: optionsData.length,
        votes: votesData.length,
        companyId,
        experienceId
      });
      
      const processedPolls = processPollsData(
        pollsData,
        optionsData,
        votesData,
        userId
      );

      console.log('📊 fetchPolls - Processed polls:', processedPolls.length, processedPolls.map(p => ({ 
        id: p.id, 
        status: p.status,
        total_votes: p.total_votes,
        options: p.options.map((opt: PollOption) => ({ id: opt.id, vote_count: opt.vote_count, percentage: opt.percentage }))
      })));
      setPolls(processedPolls);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch polls');
    } finally {
      setLoading(false);
    }
  }, [companyId, experienceId, processPollsData]);

  // Real-time update handler
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('🔄 Real-time CRUD update received:', {
      table: payload.table,
      eventType: payload.eventType,
      new: payload.new,
      old: payload.old,
      companyId,
      experienceId
    });
    
    // For vote changes, we need to refetch to get updated vote counts
    // For poll changes, we also need to refetch to get updated status
    // Always refetch for any change to ensure consistency
    console.log('🔄 Refetching polls due to real-time update...');
    fetchPolls();
  }, [fetchPolls, companyId, experienceId]);

  // Set up real-time subscriptions
  useEffect(() => {
    // Add a small delay to prevent race condition with initial polls
    const timer = setTimeout(() => {
      fetchPolls();
    }, 100);

    // Set up real-time subscriptions only if Supabase is configured
    if (!supabase) {
      return;
    }

    console.log('🔧 Setting up real-time subscriptions for polls');

    // Clear existing subscriptions
    subscriptionsRef.current.forEach(sub => sub.unsubscribe());
    subscriptionsRef.current = [];

    // Create subscriptions for all three tables
    const tables = ['polls', 'poll_options', 'poll_votes'];
    
    tables.forEach(table => {
      const channelName = `crud_${table}_changes_${companyId}_${userId}`;
      const subscription = supabase!
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: table,
            ...(table === 'polls' ? { 
              filter: experienceId ? `experience_id=eq.${experienceId}` : `company_id=eq.${companyId}` 
            } : table === 'poll_votes' ? {
              // For votes, we need to listen to all votes and filter in the handler
              // since we can't filter votes by company_id directly
            } : {})
          },
          (payload) => {
            console.log(`Real-time CRUD update from ${table}:`, payload);
            handleRealtimeUpdate(payload);
          }
        )
        .subscribe((status) => {
          console.log(`CRUD subscription status for ${table}:`, status);
          if (status === 'SUBSCRIBED') {
            console.log(`✅ Subscribed to ${table} CRUD changes for ${experienceId ? `experience ${experienceId}` : `company ${companyId}`}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`❌ Error subscribing to ${table} CRUD changes`);
            setError(`Failed to subscribe to ${table} updates`);
          } else if (status === 'TIMED_OUT') {
            console.warn(`⏰ Subscription to ${table} CRUD timed out`);
          } else if (status === 'CLOSED') {
            console.log(`🔒 Subscription to ${table} CRUD closed`);
          }
        });
      
      subscriptionsRef.current.push(subscription);
    });

    return () => {
      clearTimeout(timer);
      subscriptionsRef.current.forEach(sub => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [companyId, experienceId, fetchPolls, handleRealtimeUpdate, userId]);

  return { 
    polls, 
    loading, 
    error, 
    refetch: fetchPolls, 
    optimisticVote,
    optimisticCreatePoll,
    optimisticDeletePoll,
    optimisticUpdatePoll
  };
}
