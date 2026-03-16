/**
 * React hook for managing render jobs with polling and state management.
 * Handles job creation, polling, and error handling.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { consola } from 'consola';
import {
    createRenderJob,
    getRenderJob,
    pollRenderJob,
    Job,
    RenderJobRequest,
} from '@/lib/api-client';

export interface UseRenderJobOptions {
    autoPolling?: boolean;
    pollInterval?: number;
    onProgress?: (job: Job) => void;
    onComplete?: (job: Job) => void;
    onError?: (error: Error) => void;
}

export interface UseRenderJobReturn {
    job: Job | null;
    isLoading: boolean;
    isPolling: boolean;
    error: Error | null;
    progress: number;
    createJob: (request: RenderJobRequest) => Promise<string>;
    fetchJob: (jobId: string) => Promise<void>;
    resetJob: () => void;
    cancelPolling: () => void;
}

/**
 * Hook for managing a single render job lifecycle.
 */
export function useRenderJob(options: UseRenderJobOptions = {}): UseRenderJobReturn {
    const {
        autoPolling = true,
        pollInterval = 1000,
        onProgress,
        onComplete,
        onError,
    } = options;

    const [job, setJob] = useState<Job | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isPolling, setIsPolling] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Create a new render job
    const createJob = useCallback(
        async (request: RenderJobRequest): Promise<string> => {
            try {
                setIsLoading(true);
                setError(null);
                
                const response = await createRenderJob(request);
                const newJob = await getRenderJob(response.jobId);
                
                setJob(newJob);
                
                if (autoPolling && newJob.status !== 'completed') {
                    startPolling(response.jobId);
                }
                
                return response.jobId;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                onError?.(error);
                throw error;
            } finally {
                setIsLoading(false);
            }
        },
        [autoPolling, onError]
    );

    // Fetch a specific job by ID
    const fetchJob = useCallback(async (jobId: string) => {
        try {
            setIsLoading(true);
            const fetchedJob = await getRenderJob(jobId);
            setJob(fetchedJob);
            
            if (autoPolling && fetchedJob.status !== 'completed' && fetchedJob.status !== 'error') {
                startPolling(jobId);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            onError?.(error);
        } finally {
            setIsLoading(false);
        }
    }, [autoPolling, onError]);

    // Start polling for job updates
    const startPolling = useCallback((jobId: string) => {
        if (pollingRef.current) return;
        
        setIsPolling(true);
        
        const poll = async () => {
            try {
                const updatedJob = await getRenderJob(jobId);
                setJob(updatedJob);
                onProgress?.(updatedJob);

                if (updatedJob.status === 'completed') {
                    setIsPolling(false);
                    onComplete?.(updatedJob);
                    if (pollingRef.current) clearTimeout(pollingRef.current);
                    pollingRef.current = null;
                    return;
                }

                if (updatedJob.status === 'error') {
                    setIsPolling(false);
                    const error = new Error(updatedJob.error || 'Render job failed');
                    setError(error);
                    onError?.(error);
                    if (pollingRef.current) clearTimeout(pollingRef.current);
                    pollingRef.current = null;
                    return;
                }

                pollingRef.current = setTimeout(poll, pollInterval);
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                setIsPolling(false);
                if (pollingRef.current) clearTimeout(pollingRef.current);
                pollingRef.current = null;
            }
        };

        pollingRef.current = setTimeout(poll, pollInterval);
    }, [pollInterval, onProgress, onComplete, onError]);

    // Cancel polling
    const cancelPolling = useCallback(() => {
        if (pollingRef.current) {
            clearTimeout(pollingRef.current);
            pollingRef.current = null;
        }
        setIsPolling(false);
    }, []);

    // Reset job state
    const resetJob = useCallback(() => {
        cancelPolling();
        setJob(null);
        setError(null);
        setIsLoading(false);
    }, [cancelPolling]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            cancelPolling();
        };
    }, [cancelPolling]);

    return {
        job,
        isLoading,
        isPolling,
        error,
        progress: job?.progress || 0,
        createJob,
        fetchJob,
        resetJob,
        cancelPolling,
    };
}

/**
 * Hook for managing multiple render jobs (queue/history).
 */
export interface UseRenderJobsReturn {
    jobs: Job[];
    isLoading: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
}

export function useRenderJobs(): UseRenderJobsReturn {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const refetch = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);
            
            // This assumes you have a listRenderJobs function in api-client.ts
            const response = await fetch('/api/jobs');
            if (!response.ok) throw new Error('Failed to fetch jobs');
            
            const data = await response.json();
            setJobs(data.jobs || []);
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setError(error);
            consola.error('Failed to fetch render jobs:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refetch();
    }, [refetch]);

    return { jobs, isLoading, error, refetch };
}

export default {
    useRenderJob,
    useRenderJobs,
};
