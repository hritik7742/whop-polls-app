'use client';

import { useState } from 'react';
import { Plus, Settings, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Poll } from '@/lib/db/polls';
import { DashboardTable } from '@/components/dashboard-table';
import { CreatePollDialog } from '@/components/create-poll-dialog';
import { PollsPerformanceChart } from '@/components/polls-performance-chart';
import { UpgradeToProModal } from '@/components/upgrade-to-pro-modal';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeCrud } from '@/lib/hooks/use-realtime-crud';
import { useScheduledActivation } from '@/lib/hooks/use-scheduled-activation';
import { useRealtimeUserSubscription } from '@/lib/hooks/use-realtime-user-subscription';
import { useRealtimeExperiences } from '@/lib/hooks/use-realtime-experiences';
import { DashboardViewProps } from '@/lib/types';
import { whopSdk } from '@/lib/whop-sdk';

export function DashboardView({
	user,
	company,
	accessLevel,
	polls: initialPolls,
	userId,
	companyId,
	experiences,
	headers
}: DashboardViewProps & { headers: Record<string, string> }) {
	const [activeTab, setActiveTab] = useState('polls');
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
	const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);
	const { toast } = useToast();
	
	// Real-time experiences data
	const { experiences: realtimeExperiences } = useRealtimeExperiences({ 
		companyId, 
		initialExperiences: experiences as any
	});
	
	// Get the first experience ID for real-time updates and subscription tracking
	const experienceId = realtimeExperiences && realtimeExperiences.length > 0 ? realtimeExperiences[0].id : null;
	
	// Use comprehensive real-time CRUD hook for live updates
	const { 
		polls, 
		refetch, 
		optimisticVote,
		optimisticCreatePoll,
		optimisticDeletePoll,
		optimisticUpdatePoll
	} = useRealtimeCrud({ 
		companyId, 
		experienceId: experienceId || undefined, 
		userId, 
		initialPolls 
	});
	
	// Debug logging for dashboard polls
	console.log('Dashboard View - Polls Debug:', {
		companyId,
		experienceId,
		pollsCount: polls?.length || 0,
		polls: polls?.map(p => ({ id: p.id, question: p.question.substring(0, 50) + '...', status: p.status }))
	});
	
	// Background activation of scheduled polls
	useScheduledActivation();

	// Real-time user subscription status (use experience ID if available)
	const { 
		usage, 
		canCreatePoll, 
		isProUser, 
		pollsRemaining,
		optimisticCreatePoll: optimisticCreatePollUsage,
		optimisticUpgradeToPro
	} = useRealtimeUserSubscription({
		userId,
		companyId,
		experienceId: experienceId || companyId // Use real experience ID if available
	});

	// Debug logging
	console.log('Dashboard subscription status:', {
		usage,
		canCreatePoll,
		isProUser,
		pollsRemaining,
		userId,
		companyId
	});

	const handleCreatePoll = async (data: {
		question: string;
		options: { option_text: string }[];
		expires_at: string;
		scheduled_at?: string;
		send_notification: boolean;
	}) => {
		// Check if user can create more polls
		if (!canCreatePoll) {
			toast({
				title: 'Poll Limit Reached',
				description: 'You have reached the maximum number of polls for the free plan. Please upgrade to Pro to create unlimited polls.',
				variant: 'destructive',
			});
			setIsUpgradeModalOpen(true);
			return;
		}

		setIsSubmitting(true);
		try {
		// Use the experience ID we already determined
		
		// If no experience ID, we can't create polls
		if (!experienceId) {
			toast({
				variant: "destructive",
				title: "No Experience Found",
				description: "Please create an experience in your Whop dashboard before creating polls.",
			});
			return;
		}
		
		console.log('Creating poll with experience ID:', experienceId);
		
		// Create optimistic poll for immediate UI update
		const optimisticPoll = {
			question: data.question,
			options: data.options.map(opt => ({
				...opt,
				id: `temp-${Date.now()}-${Math.random()}`,
				poll_id: `temp-poll-${Date.now()}`,
				vote_count: 0,
				percentage: 0,
				created_at: new Date().toISOString()
			})),
			company_id: companyId,
			experience_id: experienceId,
			creator_user_id: userId,
			expires_at: data.expires_at,
			scheduled_at: data.scheduled_at,
			send_notification: data.send_notification,
			status: (data.scheduled_at ? 'scheduled' : 'active') as 'active' | 'expired' | 'scheduled'
		};
		
		// Add optimistic poll to UI immediately
		optimisticCreatePoll(optimisticPoll);
		
		// Update usage count optimistically
		optimisticCreatePollUsage();
			
		const response = await fetch('/api/polls', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				...headers,
			},
			body: JSON.stringify({
				...data,
				company_id: companyId,
				experience_id: experienceId,
			}),
		});

			if (!response.ok) {
				const error = await response.json();
				
				// Handle subscription limit error
				if (error.requiresUpgrade) {
					toast({
						title: 'Poll Limit Reached',
						description: error.message,
						variant: 'destructive',
					});
					setIsUpgradeModalOpen(true);
					return;
				}
				
				if (error.details && Array.isArray(error.details)) {
					// Show detailed validation errors
					const errorMessages = error.details.map((detail: any) => `${detail.field}: ${detail.message}`).join(', ');
					throw new Error(`Validation failed: ${errorMessages}`);
				}
				throw new Error(error.error || 'Failed to create poll');
			}

			setIsCreateDialogOpen(false);
			toast({
				variant: "success",
				title: "Poll Created",
				description: "Your poll has been created successfully.",
			});
			// Real-time updates will handle UI refresh automatically
			// No need for window.location.reload()
		} catch (error) {
			console.error('Error creating poll:', error);
			let errorMessage = 'Failed to create poll. Please try again.';
			
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			
			toast({
				variant: "destructive",
				title: "Creation Failed",
				description: errorMessage,
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDeletePoll = async (pollId: string) => {
		setIsDeleting(true);
		try {
			// Remove poll from UI immediately (optimistic update)
			optimisticDeletePoll(pollId);
			
			const response = await fetch(`/api/polls/${pollId}`, {
				method: 'DELETE',
				headers: {
					...headers,
				},
			});

			if (!response.ok) {
				const error = await response.json();
				// If deletion failed, refetch to restore the poll
				refetch();
				throw new Error(error.error || 'Failed to delete poll');
			}

			toast({
				variant: "success",
				title: "Poll Deleted",
				description: "The poll has been deleted successfully.",
			});
			// Real-time updates will handle UI refresh automatically
			// No need for window.location.reload()
		} catch (error) {
			console.error('Error deleting poll:', error);
			toast({
				variant: "destructive",
				title: "Deletion Failed",
				description: error instanceof Error ? error.message : 'Failed to delete poll. Please try again.',
			});
		} finally {
			setIsDeleting(false);
		}
	};


	return (
		<div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
			{/* Professional Header */}
			<div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
				<div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
							<div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg flex-shrink-0">
								<Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
							</div>
							<div className="min-w-0 flex-1">
								<h1 className="text-lg sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent truncate">
									Dashboard
								</h1>
								<p className="text-sm sm:text-base text-muted-foreground truncate">
									<span className="hidden sm:inline">{company.name || 'Company'} • </span>Welcome back, {user.name || 'User'}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
							<Badge variant="secondary" className="px-2 py-1 sm:px-3 text-xs sm:text-sm hidden sm:inline-flex">
								{accessLevel}
							</Badge>
							{!isProUser && (
								<Badge variant="outline" className="px-2 py-1 sm:px-3 text-xs sm:text-sm hidden sm:inline-flex">
									{usage?.total_polls_created || 0}/3 polls
								</Badge>
							)}
							<Button
								onClick={() => setIsUpgradeModalOpen(true)}
								variant="outline"
								className={`${
									isProUser 
										? 'border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950' 
										: 'border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950'
								} text-xs sm:text-sm px-2 sm:px-4`}
								size="sm"
							>
								<Crown className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
								<span className="hidden sm:inline">
									{isProUser ? 'Pro Active' : 'Upgrade to Pro'}
								</span>
								<span className="sm:hidden">
									{isProUser ? 'Pro' : 'Pro'}
								</span>
							</Button>
							<Button
								onClick={() => setIsCreateDialogOpen(true)}
								className="bg-primary hover:bg-primary/90 shadow-sm text-xs sm:text-sm px-2 sm:px-4"
								size="sm"
							>
								<Plus className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
								<span className="hidden sm:inline">Create Poll</span>
								<span className="sm:hidden">Create</span>
							</Button>
						</div>
					</div>
				</div>
			</div>

			{/* Navigation Tabs */}
			<div className="border-b bg-card/30 backdrop-blur-sm">
				<div className="container mx-auto px-4 sm:px-6">
					<Tabs value={activeTab} onValueChange={setActiveTab}>
						<TabsList className="grid w-full grid-cols-2 max-w-sm sm:max-w-md bg-muted p-1 rounded-lg">
							<TabsTrigger 
								value="polls" 
								className="text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground rounded-md"
							>
								Polls
							</TabsTrigger>
							<TabsTrigger 
								value="dashboard" 
								className="text-sm sm:text-base data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground rounded-md"
							>
								Dashboard
							</TabsTrigger>
						</TabsList>
					</Tabs>
				</div>
			</div>

			{/* Real-time Usage Display */}
			{!isProUser && (
				<div className="border-b bg-amber-50 dark:bg-amber-950/20">
					<div className="container mx-auto px-4 sm:px-6 py-3">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-3">
								<div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
									<svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<div>
									<p className="text-sm font-medium text-amber-800 dark:text-amber-200">
										Free Plan Usage
									</p>
									<p className="text-xs text-amber-600 dark:text-amber-400">
										{usage?.total_polls_created || 0} of 3 polls created
									</p>
								</div>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-20 bg-amber-200 dark:bg-amber-800 rounded-full h-2">
									<div 
										className="bg-amber-500 h-2 rounded-full transition-all duration-300" 
										style={{ width: `${Math.min(((usage?.total_polls_created || 0) / 3) * 100, 100)}%` }}
									></div>
								</div>
								<Button
									onClick={() => setIsUpgradeModalOpen(true)}
									size="sm"
									className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3"
								>
									Upgrade
								</Button>
							</div>
						</div>
					</div>
				</div>
			)}

			{/* Main Content */}
			<div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
				<Tabs value={activeTab} onValueChange={setActiveTab}>
					<TabsContent value="polls" className="space-y-4 sm:space-y-6">
						<DashboardTable
							polls={polls}
							onDeletePoll={handleDeletePoll}
							isDeleting={isDeleting}
						/>
					</TabsContent>

					<TabsContent value="dashboard" className="space-y-4 sm:space-y-8">
						{/* Performance Chart with Stats */}
						<PollsPerformanceChart polls={polls} />
					</TabsContent>
				</Tabs>
			</div>

			{/* Create Poll Dialog */}
			<CreatePollDialog
				open={isCreateDialogOpen}
				onOpenChange={setIsCreateDialogOpen}
				onSubmit={handleCreatePoll}
				isSubmitting={isSubmitting}
			/>

			{/* Upgrade to Pro Modal */}
			<UpgradeToProModal 
				open={isUpgradeModalOpen} 
				onOpenChange={setIsUpgradeModalOpen}
				onUpgradeSuccess={optimisticUpgradeToPro}
				userId={userId}
				companyId={companyId}
				experienceId={experienceId || undefined}
			/>
		</div>
	);
}
