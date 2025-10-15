'use client';

import { useEffect, useRef } from 'react';

export function useScheduledActivation() {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Function to activate scheduled polls and update expired polls
    const updatePollStatuses = async () => {
      try {
        // Activate scheduled polls
        const activationResponse = await fetch('/api/polls/activate-scheduled', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (activationResponse.ok) {
          const result = await activationResponse.json();
          if (result.success && result.activatedCount > 0) {
            console.log(`✅ Activated ${result.activatedCount} scheduled polls`);
          }
        }

        // Update expired polls
        const expiryResponse = await fetch('/api/polls/update-expired', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (expiryResponse.ok) {
          const expiryResult = await expiryResponse.json();
          if (expiryResult.success && expiryResult.expiredCount > 0) {
            console.log(`⏰ Updated ${expiryResult.expiredCount} expired polls`);
          }
        }
      } catch (error) {
        console.error('Error updating poll statuses:', error);
      }
    };

    // Update immediately when the hook is mounted
    updatePollStatuses();

    // Set up interval to check every 30 seconds
    intervalRef.current = setInterval(updatePollStatuses, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null; // This hook doesn't return anything, it just runs in the background
}
