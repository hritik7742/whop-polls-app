'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Experience } from '@/lib/types';

interface UseRealtimeExperiencesProps {
  companyId: string;
  initialExperiences?: Experience[];
}

export function useRealtimeExperiences({ companyId, initialExperiences = [] }: UseRealtimeExperiencesProps) {
  const [experiences, setExperiences] = useState<Experience[]>(initialExperiences);
  const [loading, setLoading] = useState(initialExperiences.length === 0);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch experiences from server-side API
  const fetchExperiences = useCallback(async () => {
    try {
      setError(null);
      
      // Call server-side API to fetch experiences
      const response = await fetch(`/api/experiences?companyId=${companyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch experiences');
      }
      
      const data = await response.json();
      const fetchedExperiences = data.experiences || [];
      setExperiences(fetchedExperiences);
      
      console.log('Fetched experiences:', fetchedExperiences.map((exp: Experience) => ({ id: exp.id, name: exp.name })));
    } catch (error) {
      console.error('Error fetching experiences:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch experiences');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Set up periodic refresh for experiences (since Whop doesn't have real-time subscriptions)
  useEffect(() => {
    fetchExperiences();

    // Refresh experiences every 30 seconds to catch any changes
    intervalRef.current = setInterval(fetchExperiences, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchExperiences]);

  return { 
    experiences, 
    loading, 
    error, 
    refetch: fetchExperiences
  };
}
