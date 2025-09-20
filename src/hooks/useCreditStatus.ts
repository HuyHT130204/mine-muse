'use client';

import { useState, useEffect } from 'react';

interface CreditStatus {
  hasCredits: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useCreditStatus() {
  const [status, setStatus] = useState<CreditStatus>({
    hasCredits: true,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const checkCredits = async () => {
      try {
        setStatus(prev => ({ ...prev, isLoading: true, error: null }));
        
        // Try to make a simple API call to test Claude credits
        const response = await fetch('/api/test-claude-credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            test: 'credit_check'
          })
        });

        if (response.ok) {
          const result = await response.json();
          setStatus({
            hasCredits: result.success || false,
            isLoading: false,
            error: null
          });
        } else {
          setStatus({
            hasCredits: false,
            isLoading: false,
            error: 'Failed to check credits'
          });
        }
      } catch (error) {
        console.error('Error checking Claude credits:', error);
        setStatus({
          hasCredits: false,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    checkCredits();
  }, []);

  return status;
}
