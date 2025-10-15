"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, BarChart3, Calendar, Award, Clock } from "lucide-react"
import { Poll } from "@/lib/types"
import { ReadMoreText } from "@/components/ui/read-more-text"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PollAnalyticsModalProps {
  poll: Poll | null
  isOpen: boolean
  onClose: () => void
}

export function PollAnalyticsModal({ poll, isOpen, onClose }: PollAnalyticsModalProps) {
  if (!poll) return null

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400'
      case 'expired': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }

  const topOption = poll.options.reduce((prev, current) => 
    (prev.vote_count > current.vote_count) ? prev : current
  )

  const sortedOptions = [...poll.options].sort((a, b) => b.vote_count - a.vote_count)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-4 pb-6">
          <div className="space-y-3">
            <DialogTitle className="text-2xl font-bold text-foreground leading-tight">
              <ReadMoreText 
                text={poll.question}
                maxLength={30}
                className="text-2xl font-bold text-foreground leading-tight"
              />
            </DialogTitle>
            <div className="flex items-center gap-3">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge 
                      variant="outline" 
                      className={`${getStatusColor(poll.status)} font-medium px-3 py-1 cursor-help`}
                    >
                      {poll.status === 'scheduled' && <Clock className="h-3 w-3 mr-1" />}
                      {poll.status.charAt(0).toUpperCase() + poll.status.slice(1)}
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
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {formatDate(poll.created_at)}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                    <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Total Votes</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{poll.total_votes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                    <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-900 dark:text-emerald-100">Poll Options</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{poll.options.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Poll Results with Progress Bars */}
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="h-5 w-5 text-primary" />
                Poll Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sortedOptions.map((option, index) => {
                const percentage = option.percentage || 0
                const isTopChoice = index === 0
                
                return (
                  <div key={option.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          isTopChoice 
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white shadow-lg' 
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                        <ReadMoreText 
                          text={option.option_text}
                          maxLength={30}
                          className="font-medium text-foreground"
                        />
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-foreground">{option.vote_count}</div>
                        <div className="text-sm text-muted-foreground">
                          {percentage.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative">
                      <Progress value={percentage} className="h-4" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-white mix-blend-difference">
                          {percentage > 5 ? `${percentage.toFixed(1)}%` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <Button variant="outline" onClick={onClose} className="px-6">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}