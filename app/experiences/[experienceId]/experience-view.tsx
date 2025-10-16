'use client';

import { useState, useEffect, useRef } from 'react';
import { Poll } from '@/lib/db/polls';
import { PollsList } from '@/components/polls-list';
import { useRealtimeCrud } from '@/lib/hooks/use-realtime-crud';
import { useScheduledActivation } from '@/lib/hooks/use-scheduled-activation';
import { useToast } from '@/components/ui/use-toast';
import { PollsListSkeleton } from '@/components/loading-skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExperienceViewProps } from '@/lib/types';
// Removed direct SDK import - will use API instead

export function ExperienceView({
	user,
	experience,
	accessLevel,
	polls: initialPolls,
	userId,
	headers,
	highlightPollId
}: ExperienceViewProps & { headers: Record<string, string> }) {
	const [isVoting, setIsVoting] = useState(false);
	const [activeTab, setActiveTab] = useState('active');
	const { toast } = useToast();
	
	// Use comprehensive real-time CRUD hook for live updates
	const { 
		polls: allPolls, 
		loading, 
		optimisticVote,
		optimisticCreatePoll,
		optimisticDeletePoll,
		optimisticUpdatePoll
	} = useRealtimeCrud({ 
		companyId: experience.company?.id || experience.id, 
		experienceId: experience.id,
		userId, 
		initialPolls 
	});
	
	// Background activation of scheduled polls
	useScheduledActivation();
	
	// Track previous polls to detect new ones
	const previousPollsRef = useRef<Poll[]>([]);
	const notifiedPollsRef = useRef<Set<string>>(new Set());
	
	// Monitor for new polls and send notifications
	useEffect(() => {
		if (loading || !allPolls.length) return;
		
		const currentPolls = allPolls;
		const previousPolls = previousPollsRef.current;
		
		console.log('🔍 Notification check:', {
			currentPollsCount: currentPolls.length,
			previousPollsCount: previousPolls.length,
			notifiedPollsCount: notifiedPollsRef.current.size,
			notifiedPolls: Array.from(notifiedPollsRef.current)
		});
		
		// Debug: Show current and previous poll statuses
		console.log('📊 Current polls statuses:', currentPolls.map(p => ({ id: p.id, status: p.status, send_notification: p.send_notification })));
		console.log('📊 Previous polls statuses:', previousPolls.map(p => ({ id: p.id, status: p.status, send_notification: p.send_notification })));
		
		// Find new polls and newly activated scheduled polls that haven't been notified yet
		const newPolls = currentPolls.filter(poll => {
			const isNew = !previousPolls.some(prevPoll => prevPoll.id === poll.id);
			const notNotified = !notifiedPollsRef.current.has(poll.id);
			const isActive = poll.status === 'active';
			const hasNotificationEnabled = poll.send_notification;
			
			// Check if this poll was previously scheduled and is now active (newly activated)
			const wasScheduled = previousPolls.some(prevPoll => 
				prevPoll.id === poll.id && prevPoll.status === 'scheduled'
			);
			const isNewlyActivated = wasScheduled && isActive;
			
			// Debug: Show which polls are being checked for activation
			if (wasScheduled) {
				console.log(`🔄 Poll ${poll.id} was scheduled, now checking if activated:`, {
					wasScheduled,
					isActive,
					isNewlyActivated,
					previousStatus: previousPolls.find(p => p.id === poll.id)?.status,
					currentStatus: poll.status
				});
			}
			
			// Send notification for:
			// 1. New polls that haven't been notified yet
			// 2. Scheduled polls that just became active
			const shouldNotify = (isNew || isNewlyActivated) && notNotified && isActive && hasNotificationEnabled;
			
			console.log(`🔍 Checking poll ${poll.id}:`, {
				isNew,
				wasScheduled,
				isNewlyActivated,
				notNotified,
				isActive,
				hasNotificationEnabled,
				shouldNotify,
				createdAt: poll.created_at
			});
			
			return shouldNotify;
		});
		
		console.log(`📊 Found ${newPolls.length} new/newly activated polls to notify:`, newPolls.map(p => p.id));
		
		// Send notifications for new polls and newly activated scheduled polls via API
		newPolls.forEach(async (poll) => {
			// Mark as notified IMMEDIATELY to prevent duplicate calls
			notifiedPollsRef.current.add(poll.id);
			
			try {
				console.log('🔔 New/Newly activated poll detected in experience view:', {
					pollId: poll.id,
					question: poll.question.substring(0, 50) + '...',
					experienceId: experience.id,
					notificationEnabled: poll.send_notification
				});
				
				console.log('📋 Sending notification to all members of experience:', experience.id);
				console.log('💡 To see who receives notifications, check your Whop dashboard or mobile app');
				
				// Send notification via server API
				console.log('📤 Calling server API to send notification...');
				const response = await fetch('/api/polls/notify', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						pollId: poll.id,
						question: poll.question,
						experienceId: experience.id,
						creatorUserId: poll.creator_user_id,
						send_notification: poll.send_notification,
						created_at: poll.created_at
					})
				});

				if (response.ok) {
					const result = await response.json();
					console.log(`✅ Server notification sent for poll ${poll.id}:`, result.message);
				} else {
					const error = await response.json();
					console.error('❌ Server notification failed:', error);
					// If API call failed, remove from notified set so it can be retried
					notifiedPollsRef.current.delete(poll.id);
				}
				
			} catch (error) {
				console.error('❌ Error calling notification API:', error);
				// If API call failed, remove from notified set so it can be retried
				notifiedPollsRef.current.delete(poll.id);
			}
		});
		
		// Update previous polls reference
		previousPollsRef.current = currentPolls;
		
	}, [allPolls, loading, experience.id]);
	
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
									highlightPollId={highlightPollId}
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
									highlightPollId={highlightPollId}
								/>
							)}
						</TabsContent>
					</Tabs>
				</div>
			</div>
		</div>
	);
}
