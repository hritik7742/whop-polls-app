'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRealtimePolls } from '@/lib/hooks/use-realtime-polls';
import { supabase } from '@/lib/supabase';

interface RealtimeTestProps {
  companyId: string;
  userId: string;
}

export function RealtimeTest({ companyId, userId }: RealtimeTestProps) {
  const { polls, loading, error, refetch } = useRealtimePolls(companyId, userId);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const [isRunningTests, setIsRunningTests] = useState(false);

  const runTests = async () => {
    setIsRunningTests(true);
    const results: Record<string, boolean> = {};

    try {
      // Test 1: Database Connection
      console.log('Testing database connection...');
      if (supabase) {
        const { data, error } = await supabase.from('polls').select('count').limit(1);
        results.databaseConnection = !error;
        console.log('Database connection test:', !error ? 'PASS' : 'FAIL', error);
      } else {
        results.databaseConnection = false;
        console.log('Database connection test: FAIL - Supabase not configured');
      }

      // Test 2: Real-time Subscriptions
      console.log('Testing real-time subscriptions...');
      let subscriptionWorking = false;
      
      if (supabase) {
        const testChannel = supabase
          .channel('test_channel')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'polls',
            filter: `company_id=eq.${companyId}`
          }, (payload) => {
            console.log('Test subscription received:', payload);
            subscriptionWorking = true;
          })
          .subscribe((status) => {
            console.log('Test subscription status:', status);
            if (status === 'SUBSCRIBED') {
              setTimeout(() => {
                testChannel.unsubscribe();
                results.realtimeSubscriptions = subscriptionWorking;
                console.log('Real-time subscriptions test:', subscriptionWorking ? 'PASS' : 'FAIL');
              }, 2000);
            }
          });
      } else {
        results.realtimeSubscriptions = false;
        console.log('Real-time subscriptions test: FAIL - Supabase not configured');
      }

      // Test 3: Poll Creation
      console.log('Testing poll creation...');
      try {
        const testPoll = {
          question: 'Test Poll for Real-time Testing',
          company_id: companyId,
          experience_id: companyId,
          creator_user_id: userId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          is_anonymous: false,
          send_notification: false,
          options: [
            { option_text: 'Option 1' },
            { option_text: 'Option 2' }
          ]
        };

        const response = await fetch('/api/polls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(testPoll),
        });

        results.pollCreation = response.ok;
        console.log('Poll creation test:', response.ok ? 'PASS' : 'FAIL', response.status);
      } catch (error) {
        results.pollCreation = false;
        console.log('Poll creation test: FAIL', error);
      }

      // Test 4: Data Fetching
      console.log('Testing data fetching...');
      results.dataFetching = polls.length >= 0 && !loading;
      console.log('Data fetching test:', results.dataFetching ? 'PASS' : 'FAIL');

      // Test 5: Error Handling
      console.log('Testing error handling...');
      results.errorHandling = error === null;
      console.log('Error handling test:', results.errorHandling ? 'PASS' : 'FAIL');

    } catch (error) {
      console.error('Test suite error:', error);
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  const getTestStatus = (testName: string) => {
    if (testResults[testName] === undefined) return 'pending';
    return testResults[testName] ? 'pass' : 'fail';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'bg-green-500';
      case 'fail': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pass': return 'PASS';
      case 'fail': return 'FAIL';
      default: return 'PENDING';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Real-time Functionality Test Suite
          <Button 
            onClick={runTests} 
            disabled={isRunningTests}
            variant="outline"
          >
            {isRunningTests ? 'Running Tests...' : 'Run Tests'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'databaseConnection', label: 'Database Connection' },
            { name: 'realtimeSubscriptions', label: 'Real-time Subscriptions' },
            { name: 'pollCreation', label: 'Poll Creation' },
            { name: 'dataFetching', label: 'Data Fetching' },
            { name: 'errorHandling', label: 'Error Handling' }
          ].map(({ name, label }) => (
            <div key={name} className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">{label}</span>
              <Badge 
                variant="secondary" 
                className={`${getStatusColor(getTestStatus(name))} text-white`}
              >
                {getStatusText(getTestStatus(name))}
              </Badge>
            </div>
          ))}
        </div>

        {/* Current Status */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Current Status</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">Polls Count</h4>
              <p className="text-2xl font-bold">{polls.length}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">Loading State</h4>
              <p className="text-2xl font-bold">{loading ? 'Yes' : 'No'}</p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium text-sm text-muted-foreground">Error State</h4>
              <p className="text-2xl font-bold">{error ? 'Yes' : 'No'}</p>
            </div>
          </div>

          {error && (
            <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
              <h4 className="font-medium text-red-800">Error Details</h4>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* Manual Actions */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Manual Actions</h3>
          <div className="flex gap-2">
            <Button onClick={refetch} variant="outline">
              Refresh Data
            </Button>
            <Button 
              onClick={() => console.log('Current polls:', polls)} 
              variant="outline"
            >
              Log Polls to Console
            </Button>
          </div>
        </div>

        {/* Real-time Events Log */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Real-time Events</h3>
          <div className="p-4 border rounded-lg bg-gray-50 max-h-40 overflow-y-auto">
            <p className="text-sm text-muted-foreground">
              Check the browser console for real-time event logs. 
              Events will appear when polls are created, updated, or when votes are cast.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
