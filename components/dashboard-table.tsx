'use client';

import { useState } from 'react';
import { Search, MoreHorizontal, Trash2, BarChart3, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Poll } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { PollAnalyticsModal } from '@/components/poll-analytics-modal';
import { DeletePollDialog } from '@/components/delete-poll-dialog';
import { ReadMoreText } from '@/components/ui/read-more-text';

interface DashboardTableProps {
  polls: Poll[];
  onDeletePoll: (pollId: string) => Promise<void>;
  isDeleting?: boolean;
}

export function DashboardTable({ polls, onDeletePoll, isDeleting = false }: DashboardTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pollToDelete, setPollToDelete] = useState<Poll | null>(null);

  const filteredPolls = polls.filter(poll => {
    const matchesSearch = poll.question.toLowerCase().includes(searchQuery.toLowerCase());
    let matchesTab = false;
    
    if (activeTab === 'all') {
      matchesTab = true;
    } else if (activeTab === 'scheduled') {
      matchesTab = poll.status === 'scheduled';
    } else {
      matchesTab = poll.status === activeTab;
    }
    
    return matchesSearch && matchesTab;
  });

  const handleDelete = (poll: Poll) => {
    setPollToDelete(poll);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (pollToDelete) {
      await onDeletePoll(pollToDelete.id);
      setPollToDelete(null);
    }
  };

  const handleViewAnalytics = (poll: Poll) => {
    setSelectedPoll(poll);
    setIsAnalyticsOpen(true);
  };

  const handleCloseAnalytics = () => {
    setIsAnalyticsOpen(false);
    setSelectedPoll(null);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 sm:w-auto bg-muted p-1 rounded-lg">
            <TabsTrigger 
              value="all" 
              className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground rounded-md"
            >
              All
            </TabsTrigger>
            <TabsTrigger 
              value="active" 
              className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground rounded-md"
            >
              Active
            </TabsTrigger>
            <TabsTrigger 
              value="expired" 
              className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground rounded-md"
            >
              Expired
            </TabsTrigger>
            <TabsTrigger 
              value="scheduled" 
              className="text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground rounded-md"
            >
              Scheduled
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search polls..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="text-left p-4 font-medium">Poll</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-left p-4 font-medium">Votes</th>
                <th className="text-left p-4 font-medium">Created</th>
                <th className="text-left p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPolls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-muted-foreground">
                    {searchQuery ? 'No polls match your search' : 'No polls found'}
                  </td>
                </tr>
              ) : (
                filteredPolls.map((poll) => (
                  <tr key={poll.id} className="border-b hover:bg-muted/25">
                    <td className="p-4">
                      <div className="space-y-1">
                        <ReadMoreText 
                          text={poll.question}
                          maxLength={30}
                          className="font-medium"
                        />
                        <p className="text-sm text-muted-foreground">
                          {poll.options.length} options
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge variant={
                              poll.status === 'active' ? 'success' : 
                              poll.status === 'scheduled' ? 'default' : 
                              'secondary'
                            } className="cursor-help">
                              {poll.status === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                              {poll.status}
                            </Badge>
                          </TooltipTrigger>
                          {poll.status === 'scheduled' && poll.scheduled_at && (
                            <TooltipContent>
                              <p className="font-medium">Scheduled for:</p>
                              <p className="text-sm">{new Date(poll.scheduled_at).toLocaleString()}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{poll.total_votes}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-sm text-muted-foreground">
                        {formatDate(poll.created_at)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAnalytics(poll)}
                          className="text-primary hover:text-primary"
                        >
                          <BarChart3 className="h-4 w-4 mr-1" />
                          Analytics
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(poll)}
                          disabled={isDeleting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {filteredPolls.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground border rounded-lg">
            {searchQuery ? 'No polls match your search' : 'No polls found'}
          </div>
        ) : (
          filteredPolls.map((poll) => (
            <div key={poll.id} className="border rounded-lg p-4 space-y-3">
              <div className="space-y-2">
                <ReadMoreText 
                  text={poll.question}
                  maxLength={50}
                  className="font-medium text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {poll.options.length} options • {formatDate(poll.created_at)}
                </p>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant={
                          poll.status === 'active' ? 'success' : 
                          poll.status === 'scheduled' ? 'default' : 
                          'secondary'
                        } className="cursor-help text-xs">
                          {poll.status === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                          {poll.status}
                        </Badge>
                      </TooltipTrigger>
                      {poll.status === 'scheduled' && poll.scheduled_at && (
                        <TooltipContent>
                          <p className="font-medium">Scheduled for:</p>
                          <p className="text-sm">{new Date(poll.scheduled_at).toLocaleString()}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  <span className="text-sm font-medium">{poll.total_votes} votes</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAnalytics(poll)}
                    className="text-primary hover:text-primary text-xs px-2"
                  >
                    <BarChart3 className="h-3 w-3 mr-1" />
                    Analytics
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(poll)}
                    disabled={isDeleting}
                    className="text-destructive hover:text-destructive h-8 w-8"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Analytics Modal */}
      <PollAnalyticsModal
        poll={selectedPoll}
        isOpen={isAnalyticsOpen}
        onClose={handleCloseAnalytics}
      />

      {/* Delete Confirmation Dialog */}
      <DeletePollDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
