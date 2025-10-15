'use client';

import { useState } from 'react';
import { Poll } from '@/lib/db/polls';
import { PollsList } from '@/components/polls-list';
import { useRealtimePolls } from '@/lib/hooks/use-realtime-polls';
import { useScheduledActivation } from '@/lib/hooks/use-scheduled-activation';
import { useToast } from '@/components/ui/use-toast';
import { PollsListSkeleton } from '@/components/loading-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExperienceViewProps } from '@/lib/types';

export function ExperienceView({
	user,
	experience,
	accessLevel,
	polls: initialPolls,
	userId,
	headers
}: ExperienceViewProps & { headers: Record<string, string> }) {
	const [isVoting, setIsVoting] = useState(false);
	const [activeTab, setActiveTab] = useState('active');
	const { toast } = useToast();
	
	// Use real-time polls hook for live updates
	const { polls: allPolls, loading, optimisticVote } = useRealtimePolls(experience.company?.id || experience.id, userId);
	
	// Background activation of scheduled polls
	useScheduledActivation();
	
	// Filter polls based on active tab
	const getFilteredPolls = () => {
		switch (activeTab) {
			case 'active':
				return allPolls.filter(poll => poll.status === 'active');
			case 'expired':
				return allPolls.filter(poll => poll.status === 'expired');
			default:
				return allPolls.filter(poll => poll.status === 'active');
		}
	};
	
	const polls = getFilteredPolls();
	
	// Debug logging
	console.log('Experience view - All polls:', allPolls.length);
	console.log('Experience view - Active tab:', activeTab);
	console.log('Experience view - Filtered polls:', polls.length);
	console.log('Experience view - Poll statuses:', allPolls.map(p => ({ id: p.id, status: p.status, question: p.question.substring(0, 30) + '...' })));


	const handleVote = async (pollId: string, optionId: string) => {
		// Check if user is currently voting, prevent multiple votes
		if (isVoting) {
			return;
		}

		// INSTANT VOTE - Update UI immediately (like sending a text message)
		optimisticVote(pollId, optionId);
		
		// Background sync - send to server without blocking UI
		setIsVoting(true);
		
		// Use setTimeout to make it truly non-blocking
		setTimeout(async () => {
			try {
				const response = await fetch(`/api/polls/${pollId}/vote`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						...headers,
					},
					body: JSON.stringify({ option_id: optionId }),
				});

				if (!response.ok) {
					const error = await response.json();
					console.error('Background vote sync failed:', error);
					// Don't show error to user - just log it
					// Real-time updates will eventually sync correct data
				}
			} catch (error) {
				console.error('Background vote sync error:', error);
				// Don't show error to user - just log it
				// Real-time updates will eventually sync correct data
			} finally {
				setIsVoting(false);
			}
		}, 0); // Execute in next tick - truly non-blocking
	};

	return (
		<div className="min-h-screen bg-background">
			{/* Minimal Header */}
			<div className="bg-card border-b border-border sticky top-0 z-50">
				<div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
							<div className="p-1 sm:p-1.5 bg-primary/10 rounded-lg flex-shrink-0">
								<svg className="h-4 w-4 sm:h-5 sm:w-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="text-lg sm:text-xl font-semibold text-foreground truncate">
									Community Polls
								</h1>
								<p className="text-xs sm:text-sm text-muted-foreground">
									Share your voice
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
							<div className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
								Member
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* Polls Content with Tabs */}
			<div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
				<div className="max-w-4xl mx-auto">
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className="grid w-full grid-cols-2 max-w-sm sm:max-w-md mb-4 sm:mb-6 bg-muted p-1 rounded-lg">
							<TabsTrigger 
								value="active" 
								className="text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground rounded-md"
							>
								Active
							</TabsTrigger>
							<TabsTrigger 
								value="expired" 
								className="text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground rounded-md"
							>
								Expired
							</TabsTrigger>
						</TabsList>
						
						<TabsContent value="active" className="space-y-3 sm:space-y-4">
							{loading ? (
								<PollsListSkeleton />
							) : (
								<PollsList
									polls={polls}
									onVote={handleVote}
									isVoting={isVoting}
								/>
							)}
						</TabsContent>
						
						<TabsContent value="expired" className="space-y-3 sm:space-y-4">
							{loading ? (
								<PollsListSkeleton />
							) : (
								<PollsList
									polls={polls}
									onVote={handleVote}
									isVoting={isVoting}
								/>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
