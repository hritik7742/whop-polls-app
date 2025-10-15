'use client';

import { Poll } from '@/lib/db/polls';
import { PollCard } from './poll-card';
import { Card, CardContent } from '@/components/ui/card';
import { PollsListProps } from '@/lib/types';

export function PollsList({ polls, onVote, isVoting = false }: PollsListProps) {
  const handleVote = async (pollId: string, optionId: string) => {
    await onVote(pollId, optionId);
  };

  if (polls.length === 0) {
    return (
      <div className="text-center py-16">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No polls available
            </h3>
            <p className="text-muted-foreground text-sm">
              Check back soon for new community polls and voting opportunities.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {polls.map((poll, index) => (
        <PollCard
          key={poll.id}
          poll={poll}
          onVote={(optionId) => handleVote(poll.id, optionId)}
          isVoting={isVoting}
          pollNumber={index + 1}
          showNumber={polls.length > 1}
        />
      ))}
    </div>
  );
}