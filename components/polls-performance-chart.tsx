'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Poll } from '@/lib/db/polls';

interface PollsPerformanceChartProps {
  polls: Poll[];
}

export function PollsPerformanceChart({ polls }: PollsPerformanceChartProps) {
  // Process data for the last 7 days
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date;
    });

    return last7Days.map(date => {
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      
      // Count polls created on this day
      const pollsCreated = polls.filter(poll => {
        const pollDate = new Date(poll.created_at).toISOString().split('T')[0];
        return pollDate === dateStr;
      }).length;

      // Count total votes on polls created on this day
      const totalVotes = polls.filter(poll => {
        const pollDate = new Date(poll.created_at).toISOString().split('T')[0];
        return pollDate === dateStr;
      }).reduce((sum, poll) => sum + poll.total_votes, 0);

      // Calculate average votes per poll
      const avgVotes = pollsCreated > 0 ? Math.round(totalVotes / pollsCreated) : 0;

      return {
        day: dayName,
        date: dateStr,
        polls: pollsCreated,
        votes: totalVotes,
        avgVotes: avgVotes,
        engagement: pollsCreated > 0 ? Math.round((totalVotes / pollsCreated) * 100) / 100 : 0
      };
    });
  }, [polls]);

  // Calculate overall stats
  const totalPolls = polls.length;
  const totalVotes = polls.reduce((sum, poll) => sum + poll.total_votes, 0);
  const avgVotesPerPoll = totalPolls > 0 ? Math.round(totalVotes / totalPolls) : 0;
  const activePolls = polls.filter(poll => poll.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Polls</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPolls}</div>
            <p className="text-xs text-muted-foreground">
              {activePolls} active polls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" />
                <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" />
                <path d="M13 12h3a2 2 0 0 1 2 2v1" />
                <path d="M8 12H5a2 2 0 0 0-2 2v1" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVotes}</div>
            <p className="text-xs text-muted-foreground">
              {avgVotesPerPoll} avg per poll
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgVotesPerPoll}</div>
            <p className="text-xs text-muted-foreground">
              votes per poll
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rate</CardTitle>
            <div className="h-4 w-4 text-muted-foreground">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalPolls > 0 ? Math.round((activePolls / totalPolls) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              polls still active
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Poll Performance (Last 7 Days)</CardTitle>
          <CardDescription>
            Track poll creation and engagement trends over the past week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] sm:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <defs>
                  <linearGradient id="colorPolls" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="day" 
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  className="text-xs fill-muted-foreground"
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                {label}
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[0]?.value} polls
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[0.70rem] uppercase text-muted-foreground">
                                Votes
                              </span>
                              <span className="font-bold text-muted-foreground">
                                {payload[1]?.value} votes
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="polls"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorPolls)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="votes"
                  stroke="hsl(var(--chart-2))"
                  fillOpacity={1}
                  fill="url(#colorVotes)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          {/* Chart Legend */}
          <div className="flex items-center justify-center space-x-6 mt-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span className="text-sm text-muted-foreground">Polls Created</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-chart-2"></div>
              <span className="text-sm text-muted-foreground">Total Votes</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
