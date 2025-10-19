import { supabase, createServerClient } from '../supabase';

export interface Poll {
  id: string;
  question: string;
  company_id: string;
  experience_id: string;
  creator_user_id: string;
  expires_at: string;
  scheduled_at?: string;
  is_anonymous: boolean;
  send_notification: boolean;
  created_at: string;
  status: 'active' | 'expired' | 'scheduled';
  options: PollOption[];
  total_votes: number;
  user_voted?: boolean;
  user_vote_option_id?: string;
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
  percentage?: number;
}

export interface CreatePollData {
  question: string;
  company_id: string;
  experience_id: string;
  creator_user_id: string;
  expires_at: string;
  scheduled_at?: string;
  is_anonymous: boolean;
  send_notification: boolean;
  options: { option_text: string }[];
}

/**
 * Helper function to process polls data (consolidated logic)
 * @param polls - Array of poll objects from database
 * @param options - Array of poll options from database
 * @param votes - Array of poll votes from database
 * @param userId - ID of the current user
 * @returns Processed array of polls with options, votes, and calculated fields
 */
function processPollsData(polls: any[], options: any[], votes: any[], userId: string): Poll[] {
  const data = polls.map(poll => ({
    ...poll,
    options: options?.filter(opt => opt.poll_id === poll.id) || [],
    votes: votes?.filter(vote => vote.poll_id === poll.id) || []
  }));

  return data.map(poll => {
    const totalVotes = poll.options.reduce((sum: number, option: PollOption) => sum + option.vote_count, 0);
    
    return {
      ...poll,
      total_votes: totalVotes,
      user_voted: poll.votes.some((vote: any) => vote.user_id === userId),
      user_vote_option_id: poll.votes.find((vote: any) => vote.user_id === userId)?.option_id,
      options: poll.options.map((option: PollOption) => ({
        ...option,
        percentage: totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0
      }))
    };
  });
}

/**
 * Fetch polls by experience ID with optimized queries
 * @param experienceId - The experience ID to fetch polls for
 * @param userId - ID of the current user for vote status calculation
 * @returns Promise resolving to array of polls with options and vote data
 * @throws Error if database query fails
 */
export async function getPollsByExperience(experienceId: string, userId: string): Promise<Poll[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty polls array');
    return [];
  }

  // Update expired polls first
  const supabaseServer = createServerClient();
  await supabaseServer.rpc('update_poll_status');

  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .eq('experience_id', experienceId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Early return if no polls
  if (!polls || polls.length === 0) {
    return [];
  }

  // Fetch options and votes in parallel for better performance
  const pollIds = polls.map(poll => poll.id);
  
  const [optionsResult, votesResult] = await Promise.all([
    supabase
      .from('poll_options')
      .select('*')
      .in('poll_id', pollIds)
      .order('created_at', { ascending: true }), // Ensure options are in creation order
    supabase
      .from('poll_votes')
      .select('user_id, option_id, poll_id')
      .in('poll_id', pollIds)
  ]);

  return processPollsData(polls, optionsResult.data || [], votesResult.data || [], userId);
}

/**
 * Fetch polls by company ID (for dashboard) with optimized queries
 * @param companyId - The company ID to fetch polls for
 * @param userId - ID of the current user for vote status calculation
 * @returns Promise resolving to array of polls with options and vote data
 * @throws Error if database query fails
 */
export async function getPollsByCompany(companyId: string, userId: string): Promise<Poll[]> {
  if (!supabase) {
    console.warn('Supabase not configured, returning empty polls array');
    return [];
  }

  // Update expired polls first
  const supabaseServer = createServerClient();
  await supabaseServer.rpc('update_poll_status');

  const { data: polls, error } = await supabase
    .from('polls')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Early return if no polls
  if (!polls || polls.length === 0) {
    return [];
  }

  // Fetch options and votes in parallel for better performance
  const pollIds = polls.map(poll => poll.id);
  
  const [optionsResult, votesResult] = await Promise.all([
    supabase
      .from('poll_options')
      .select('*')
      .in('poll_id', pollIds)
      .order('created_at', { ascending: true }), // Ensure options are in creation order
    supabase
      .from('poll_votes')
      .select('user_id, option_id, poll_id')
      .in('poll_id', pollIds)
  ]);

  return processPollsData(polls, optionsResult.data || [], votesResult.data || [], userId);
}

/**
 * Create a new poll with options
 * @param pollData - Poll creation data including question, options, and metadata
 * @returns Promise resolving to the created poll with options
 * @throws Error if poll creation fails
 */
export async function createPoll(pollData: CreatePollData): Promise<Poll> {
  const supabaseServer = createServerClient();
  
  try {
    // Determine poll status based on scheduled_at
    const now = new Date();
    const scheduledAt = pollData.scheduled_at ? new Date(pollData.scheduled_at) : null;
    const status = scheduledAt && scheduledAt > now ? 'scheduled' : 'active';

    // Insert poll
    const { data: poll, error: pollError } = await supabaseServer
      .from('polls')
      .insert({
        question: pollData.question,
        company_id: pollData.company_id,
        experience_id: pollData.experience_id,
        creator_user_id: pollData.creator_user_id,
        expires_at: pollData.expires_at,
        scheduled_at: pollData.scheduled_at,
        is_anonymous: pollData.is_anonymous,
        send_notification: pollData.send_notification,
        status: status,
      })
      .select()
      .single();

    if (pollError) throw pollError;

    // Insert poll options in batch
    const optionsData = pollData.options.map(option => ({
      poll_id: poll.id,
      option_text: option.option_text,
      vote_count: 0
    }));

    const { data: options, error: optionsError } = await supabaseServer
      .from('poll_options')
      .insert(optionsData)
      .select();

    if (optionsError) throw optionsError;

    // Return formatted poll with options
    return {
      ...poll,
      options: options?.map(option => ({
        ...option,
        percentage: 0
      })) || [],
      total_votes: 0,
      user_voted: false
    };
  } catch (error) {
    console.error('Error creating poll:', error);
    throw error;
  }
}

/**
 * Vote on a poll option
 * @param pollId - ID of the poll to vote on
 * @param optionId - ID of the option to vote for
 * @param userId - ID of the user voting
 * @throws Error if user has already voted or if vote fails
 */
export async function voteOnPoll(pollId: string, optionId: string, userId: string): Promise<void> {
  const supabaseServer = createServerClient();

  console.log('🗳️ voteOnPoll called:', { pollId, optionId, userId });

  // Use a transaction-like approach with error handling
  try {
    // Check if user already voted
    const { data: existingVote, error: checkError } = await supabaseServer
      .from('poll_votes')
      .select('id, option_id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingVote) {
      // User has already voted - update their vote
      console.log('🔄 User already voted, updating vote:', { existingVote, newOptionId: optionId });
      const oldOptionId = existingVote.option_id;
      
      // Update the vote to the new option
      const { error: updateError } = await supabaseServer
        .from('poll_votes')
        .update({ option_id: optionId })
        .eq('id', existingVote.id);

      if (updateError) throw updateError;

      // Decrement old option count and increment new option count
      const { error: decrementError } = await supabaseServer
        .rpc('decrement_vote_count', { option_id: oldOptionId });
      
      if (decrementError) throw decrementError;

      const { error: incrementError } = await supabaseServer
        .rpc('increment_vote_count', { option_id: optionId });

      if (incrementError) throw incrementError;
      console.log('✅ Vote updated successfully');
    } else {
      // User hasn't voted yet - insert new vote
      console.log('➕ User voting for the first time, inserting new vote');
      const { error: voteError } = await supabaseServer
        .from('poll_votes')
        .insert({
          poll_id: pollId,
          option_id: optionId,
          user_id: userId
        });

      if (voteError) {
        console.error('❌ Error inserting vote:', voteError);
        throw voteError;
      }

      // Update vote count using atomic increment
      const { error: countError } = await supabaseServer
        .rpc('increment_vote_count', { option_id: optionId });

      if (countError) {
        console.error('❌ Error incrementing vote count:', countError);
        throw countError;
      }
      console.log('✅ Vote inserted successfully');
    }

  } catch (error) {
    console.error('Error in voteOnPoll:', error);
    throw error;
  }
}

/**
 * Check if user has voted on a specific poll
 * @param pollId - ID of the poll to check
 * @param userId - ID of the user to check
 * @returns Promise resolving to boolean indicating if user has voted
 */
export async function hasUserVoted(pollId: string, userId: string): Promise<boolean> {
  if (!supabase) {
    console.warn('Supabase not configured, returning false for hasUserVoted');
    return false;
  }

  const { data, error } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return !!data;
}

/**
 * Delete a poll (only by creator)
 * @param pollId - ID of the poll to delete
 * @param userId - ID of the user attempting to delete
 * @throws Error if user is not authorized or deletion fails
 */
export async function deletePoll(pollId: string, userId: string): Promise<void> {
  const supabaseServer = createServerClient();

  // Verify user is the creator
  const { data: poll } = await supabaseServer
    .from('polls')
    .select('creator_user_id')
    .eq('id', pollId)
    .single();

  if (!poll || poll.creator_user_id !== userId) {
    throw new Error('Unauthorized to delete this poll');
  }

  // Delete poll (cascade will handle related records)
  const { error } = await supabaseServer
    .from('polls')
    .delete()
    .eq('id', pollId);

  if (error) throw error;
}
