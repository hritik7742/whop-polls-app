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
import { useRealtimePolls } from '@/lib/hooks/use-realtime-polls';
import { useScheduledActivation } from '@/lib/hooks/use-scheduled-activation';
import { DashboardViewProps } from '@/lib/types';

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
	
	// Use real-time polls hook for live updates
	const { polls, refetch } = useRealtimePolls(companyId, userId);
	
	// Background activation of scheduled polls
	useScheduledActivation();

	const handleCreatePoll = async (data: {
		question: string;
		options: { option_text: string }[];
		expires_at: string;
		scheduled_at?: string;
		send_notification: boolean;
	}) => {
		setIsSubmitting(true);
		try {
			// Use the first experience ID if available, otherwise fall back to companyId
			const experienceId = experiences && experiences.length > 0 ? experiences[0].id : companyId;
			
			
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
			const response = await fetch(`/api/polls/${pollId}`, {
				method: 'DELETE',
				headers: {
					...headers,
				},
			});

			if (!response.ok) {
				const error = await response.json();
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
							<Button
								onClick={() => setIsUpgradeModalOpen(true)}
								variant="outline"
								className="border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950 text-xs sm:text-sm px-2 sm:px-4"
								size="sm"
							>
								<Crown className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
								<span className="hidden sm:inline">Upgrade to Pro</span>
								<span className="sm:hidden">Pro</span>
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
			/>
		</div>
	);
}
