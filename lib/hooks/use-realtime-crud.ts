'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Poll } from '@/lib/db/polls';

interface UseRealtimeCrudProps {
  companyId: string;
  experienceId?: string;
  userId: string;
  initialPolls?: Poll[];
}

export function useRealtimeCrud({ companyId, experienceId, userId, initialPolls = [] }: UseRealtimeCrudProps) {
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [loading, setLoading] = useState(initialPolls.length === 0);
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
          vote_count: 0,
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

    // Then, add votes to polls
    votesData.forEach((vote: any) => {
      const poll = pollsMap.get(vote.poll_id);
      if (poll) {
        poll.votes.push(vote);
        
        // Update option vote counts
        const option = poll.options.find((opt: any) => opt.id === vote.option_id);
        if (option) {
          option.vote_count += 1;
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
      
      // Ensure options stay in original order (by created_at)
      const sortedOptions = [...poll.options].sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
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
      
      // First, activate any scheduled polls that are due
      const { error: activateError } = await supabase.rpc('activate_scheduled_polls');
      if (activateError) {
        console.warn('Failed to activate scheduled polls:', activateError);
      }

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

      const [pollsResult, optionsResult, votesResult] = await Promise.all([
        pollQuery,
        supabase.from('poll_options').select('*'),
        supabase.from('poll_votes').select('*')
      ]);

      if (pollsResult.error) {
        throw pollsResult.error;
      }

      const pollsData = pollsResult.data || [];
      const processedPolls = processPollsData(
        pollsData,
        optionsResult.data || [],
        votesResult.data || [],
        userId
      );

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
    console.log('Real-time CRUD update received:', payload);
    
    // Always refetch for any change to ensure consistency
    // This is especially important for vote updates and status changes
    fetchPolls();
  }, [fetchPolls]);

  // Set up real-time subscriptions
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
