'use client';

import { PollOption } from '@/lib/db/polls';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { VoteOptionProps } from '@/lib/types';

export function VoteOption({
  option,
  isSelected,
  isVoted,
  canVote,
  onVote,
  isVoting
}: VoteOptionProps) {
  const percentage = option.percentage || 0;
  const hasVotes = option.vote_count > 0;

  return (
    <div className="relative">
      <Button
        variant="ghost"
        className={cn(
          "w-full p-4 h-auto justify-start text-left transition-all duration-300 relative overflow-hidden hover-lift",
          "bg-muted/50 border border-border dark:bg-muted/30 dark:border-border/50",
          "hover:bg-muted hover:border-border/80 dark:hover:bg-muted/50 dark:hover:border-border/70",
          isSelected && "bg-primary/10 border-primary/30 dark:bg-primary/20 dark:border-primary/40",
          !canVote && "cursor-default hover:bg-muted/50 dark:hover:bg-muted/30",
          isVoting && "opacity-50 cursor-not-allowed"
        )}
        onClick={canVote ? onVote : undefined}
        disabled={!canVote || isVoting}
      >
        {/* Background fill based on vote percentage - show for all options */}
        <div 
          className="absolute inset-0 bg-primary/20 transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
        
        <div className="flex items-center justify-between w-full relative z-10">
          <div className="flex items-center gap-3">
            {/* Remove radio button indicator - no dots */}
            <span className="text-foreground font-medium">
              {option.option_text}
            </span>
          </div>
          
          {/* Vote count and percentage - show for all options */}
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-sm font-medium">
              ({option.vote_count}) {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
        
        {/* Progress bar at bottom - show for all options */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </Button>
    </div>
  );
}
