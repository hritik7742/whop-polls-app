// User types
export interface User {
  id: string;
  name?: string | null | undefined;
  email?: string;
  avatar?: string;
}

// Company types
export interface Company {
  id: string;
  name?: string;
  description?: string;
  logo?: any; // Whop SDK returns complex logo object
}

// Experience types
export interface Experience {
  id: string;
  name?: string;
  description?: string | null;
  company?: Company;
  access_level?: string;
}

// Poll types
export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  vote_count: number;
  created_at?: string;
  percentage?: number;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  voted_at: string;
}

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
  votes?: PollVote[];
  total_votes: number;
  user_voted?: boolean;
  user_vote_option_id?: string;
}

// API types
export interface CreatePollRequest {
  question: string;
  options: { option_text: string }[];
  expires_at: string;
  scheduled_at?: string;
  is_anonymous?: boolean;
  send_notification?: boolean;
  company_id: string;
  experience_id: string;
}

export interface VoteRequest {
  option_id: string;
}

// Component prop types
export interface ExperienceViewProps {
  user: User;
  experience: Experience;
  accessLevel: string;
  polls: Poll[];
  userId: string;
  highlightPollId?: string; // Optional poll ID to highlight when coming from deep link
}

export interface DashboardViewProps {
  user: User;
  company: Company;
  accessLevel: string;
  polls: Poll[];
  userId: string;
  companyId: string;
  experiences: Experience[];
}

export interface PollCardProps {
  poll: Poll;
  onVote: (optionId: string) => Promise<void>;
  isVoting?: boolean;
  pollNumber?: number;
  showNumber?: boolean;
  isHighlighted?: boolean; // Whether this poll should be highlighted
}

export interface VoteOptionProps {
  option: PollOption;
  isSelected: boolean;
  isVoted: boolean;
  canVote: boolean;
  onVote: () => void;
  isVoting: boolean;
}

export interface PollsListProps {
  polls: Poll[];
  onVote: (pollId: string, optionId: string) => Promise<void>;
  isVoting: boolean;
  highlightPollId?: string; // Optional poll ID to highlight
}

// Hook types
export interface UseRealtimePollsReturn {
  polls: Poll[];
  loading: boolean;
}

// Error types
export interface ApiError {
  error: string;
  message?: string;
  statusCode?: number;
}
