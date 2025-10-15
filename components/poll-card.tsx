'use client';

import { useState } from 'react';
import { Clock, Users, CheckCircle } from 'lucide-react';
import { Poll, PollOption } from '@/lib/db/polls';
import { formatDate, getPollStatus } from '@/lib/utils';
import { VoteOption } from './vote-option';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PollCardProps } from '@/lib/types';

export function PollCard({ poll, onVote, isVoting = false, pollNumber, showNumber = false }: PollCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(
    poll.user_vote_option_id || null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleVote = async (optionId: string) => {
    // Prevent voting if currently submitting
    if (isSubmitting || isVoting) return;
    
    // INSTANT VOTE - Update selected option immediately (like sending a text message)
    setSelectedOption(optionId);
    
    // Background sync - send to server without blocking UI
    setIsSubmitting(true);
    
    // Use setTimeout to make it truly non-blocking
    setTimeout(async () => {
      try {
        await onVote(optionId);
      } catch (error) {
        console.error('Background vote sync failed:', error);
        // Don't revert - let real-time updates handle it
        // Real-time updates will eventually sync correct data
      } finally {
        setIsSubmitting(false);
      }
    }, 0); // Execute in next tick - truly non-blocking
  };

  const status = getPollStatus(poll.expires_at);
  const canVote = status === 'active';

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader className="pb-3 sm:pb-6">
        <CardTitle className="text-lg sm:text-2xl leading-tight">
          {showNumber && pollNumber && (
            <span className="text-muted-foreground mr-2">{pollNumber}.</span>
          )}
          {poll.question}
        </CardTitle>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-3 sm:gap-1">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{poll.total_votes} votes</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs sm:text-sm">{formatDate(poll.created_at)}</span>
            </div>
          </div>
          <div className="flex items-center">
            <Badge variant={status === 'active' ? 'default' : 'secondary'} className="text-xs">
              {status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pt-3 sm:pt-6">
        {poll.options.map((option) => (
          <VoteOption
            key={option.id}
            option={option}
            isSelected={selectedOption === option.id}
            isVoted={poll.total_votes > 0} // Show percentages if anyone has voted
            canVote={canVote}
            onVote={() => handleVote(option.id)}
            isVoting={isVoting || isSubmitting}
          />
        ))}
      </CardContent>

      {/* Footer */}
      {poll.user_voted && (
        <div className="flex items-center gap-3 px-4 sm:px-6 pb-4 sm:pb-6 border-t border-border">
          <div className="p-1.5 sm:p-2 bg-green-100 rounded-full">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
          </div>
          <span className="text-muted-foreground text-xs sm:text-sm font-medium">
            You have voted on this poll
          </span>
        </div>
      )}
    </Card>
  );
}
