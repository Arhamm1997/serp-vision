'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { SerpAnalysisResult } from '@/lib/types';
import { getSerpAnalysis, checkBackendHealth, getApiKeyStats } from '@/app/actions';
import { KeywordForm, type KeywordFormValues } from '@/components/keyword-form';
import { ResultsDisplay } from '@/components/results-display';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { KeywordTrackingProgress, type TrackingProgress } from '@/components/keyword-tracking-progress';
import Logo from '@/components/logo';
import { Progress } from '@/components/ui/progress';
import { ApiKeyManager } from '@/components/api-key-manager';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function Home() {
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKeyManager, setShowApiKeyManager] = useState(false);
  const [apiKeyPassword, setApiKeyPassword] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const API_KEY_MANAGER_PASSWORD = '27774426'; // Change as needed
  
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('apiKeys');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  
  const [activeKeyIdx, setActiveKeyIdx] = useState(0);
  const [analysis, setAnalysis] = useState<SerpAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [totalKeywords, setTotalKeywords] = useState(0);
  const [trackingProgress, setTrackingProgress] = useState<TrackingProgress>({
    total: 0,
    processed: 0,
    successful: 0,
    failed: 0,
    percentComplete: 0
  });
  const [backendStatus, setBackendStatus] = useState<{
    connected: boolean | null;
    message: string;
  }>({
    connected: null,
    message: 'Checking backend connection...'
  });

  // Check backend connection on mount and periodically
  useEffect(() => {
    const checkHealth = async () => {
      const health = await checkBackendHealth();
      setBackendStatus({
        connected: health.connected,
        message: health.message
      });
    };

    // Initial check
    checkHealth();

    // Check every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleAnalysis = async (data: KeywordFormValues) => {
    setIsLoading(true);
    setAnalysis(null);
    setError(null);
    setProgress(0);

    const keywords = [...new Set(data.keywords.split(/\r?\n/).map(k => k.trim()).filter(Boolean))];
    setTotalKeywords(keywords.length);

    // Initialize tracking progress
    setTrackingProgress({
      total: keywords.length,
      processed: 0,
      successful: 0,
      failed: 0,
      percentComplete: 0
    });

    // Progress simulation with realistic messages
    const progressSteps = [
      'Initializing analysis...',
      'Connecting to search engines...',
      'Processing keywords...',
      'Fetching search results...',
      'Analyzing rankings...',
      'Generating insights...',
      'Finalizing results...'
    ];

    let currentStep = 0;
    setProgressMessage(progressSteps[0]);

    // Simulate progress with meaningful updates
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + Math.random() * 15 + 5, 95);
        
        // Update progress message based on progress
        const stepIndex = Math.floor((newProgress / 100) * progressSteps.length);
        if (stepIndex !== currentStep && stepIndex < progressSteps.length) {
          currentStep = stepIndex;
          setProgressMessage(progressSteps[stepIndex]);
        }
        
        // Update tracking progress
        const estimatedProcessed = Math.floor((newProgress / 100) * keywords.length);
        const estimatedSuccessful = Math.floor(estimatedProcessed * 0.85); // Estimate 85% success
        const estimatedFailed = estimatedProcessed - estimatedSuccessful;
        
        setTrackingProgress({
          total: keywords.length,
          processed: estimatedProcessed,
          successful: estimatedSuccessful,
          failed: estimatedFailed,
          percentComplete: Math.round(newProgress)
        });
        
        return newProgress;
      });
    }, 800);

    try {
      // Select API key if available
      const selectedApiKey = apiKeys.length > 0 ? apiKeys[activeKeyIdx] : undefined;
      
      if (apiKeys.length === 0) {
        console.warn('No API keys configured - using backend default keys');
      }

      const result = await getSerpAnalysis({ 
        ...data, 
        keywords: keywords.join('\n'),
        apiKey: selectedApiKey 
      });
      
      clearInterval(progressInterval);
      setProgress(100);
      setProgressMessage('Analysis complete!');
      
      // Update final tracking progress
      const finalSuccessful = result.serpData?.filter((d: any) => d.found).length || 0;
      const finalFailed = keywords.length - finalSuccessful;
      
      setTrackingProgress({
        total: keywords.length,
        processed: keywords.length,
        successful: finalSuccessful,
        failed: finalFailed,
        percentComplete: 100
      });
      
      // Small delay to show completion, then refresh stats
      setTimeout(async () => {
        setAnalysis(result);
        
        // Refresh API stats if we have real backend data - do this after setting analysis for immediate display
        if (result.keyStats && !result.aiInsights.includes('Backend connection failed')) {
          try {
            // Force a fresh stats fetch with timestamp to prevent caching
            const freshStatsUrl = `http://localhost:5000/api/keys/stats?t=${Date.now()}`;
            const response = await fetch(freshStatsUrl, {
              method: 'GET',
              cache: 'no-store',
              headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (response.ok) {
              const freshStatsData = await response.json();
              if (freshStatsData.success && freshStatsData.data?.summary) {
                // Update the analysis with fresh stats
                setAnalysis(prev => prev ? {
                  ...prev,
                  keyStats: freshStatsData.data.summary
                } : result);
              }
            }
          } catch (error) {
            console.warn('Failed to refresh API stats:', error);
          }
        }
        
        // Check if result contains warning about backend failure
        if (result.aiInsights.includes('Backend connection failed')) {
          setError('Backend connection failed. Showing demo data. Please check if the SERP tracker backend is running.');
        }
      }, 500);

    } catch (err: any) {
      clearInterval(progressInterval);
      console.error('Analysis failed:', err);
      
      setError(
        err.message || 
        'Analysis failed. Please check your connection and try again. If the problem persists, verify that the backend server is running.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const progressText = useMemo(() => {
    if (progress < 100) {
      return progressMessage || `Processing ${totalKeywords} keywords...`;
    }
    return `Successfully analyzed ${totalKeywords} keywords!`;
  }, [progress, progressMessage, totalKeywords]);

  const getBackendStatusDisplay = () => {
    if (backendStatus.connected === null) {
      return (
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
          <span className="text-sm">Checking backend...</span>
        </div>
      );
    } else if (backendStatus.connected) {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Backend Connected</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Backend Disconnected</span>
        </div>
      );
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Backend Status */}
      <div className="w-full max-w-6xl mb-4 flex justify-end">
        {getBackendStatusDisplay()}
      </div>

      {/* Backend Status Alert */}
      {backendStatus.connected === false && (
        <div className="w-full max-w-6xl mb-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Backend Connection Failed:</strong> {backendStatus.message}
              <br />
              <span className="text-sm">
                Make sure the SERP tracker backend is running on port 5000 and API keys are configured.
                The app will show demo data until the backend is available.
              </span>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Header */}
      <header className="w-full max-w-6xl mb-8 text-center">
        <div className="flex justify-center items-center gap-4 mb-4">
          <Logo className="w-12 h-12 text-primary" />
          <h1 className="text-4xl md:text-5xl font-headline font-bold tracking-tighter">
            SERP Vision
          </h1>
        </div>
        <p className="max-w-2xl mx-auto text-lg text-foreground/80">
          Unlock AI-powered insights to dominate search engine rankings. Enter your details below to start your analysis.
        </p>
      </header>

      <main className="w-full max-w-6xl">
        {/* API Key Management */}
        <div className="mb-6">
          {!showApiKeyManager ? (
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                onClick={() => setShowApiKeyManager(true)}
              >
                Manage API Keys ({apiKeys.length} configured)
              </Button>
              {apiKeys.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Using key: {apiKeys[activeKeyIdx]?.slice(0, 8)}...{apiKeys[activeKeyIdx]?.slice(-4)}
                </span>
              )}
            </div>
          ) : (
            apiKeyPassword === API_KEY_MANAGER_PASSWORD ? (
              <ApiKeyManager 
                onApiKeysChange={(keys) => {
                  setApiKeys(keys);
                  if (activeKeyIdx >= keys.length) {
                    setActiveKeyIdx(0);
                  }
                }} 
                onHide={() => { 
                  setShowApiKeyManager(false); 
                  setApiKeyPassword(''); 
                  setPasswordInput(''); 
                  setPasswordError(''); 
                }}
              />
            ) : (
              <div className="max-w-sm mx-auto p-6 border rounded-lg bg-background shadow-lg flex flex-col gap-4">
                <label className="block mb-2 font-semibold text-lg">Enter password to manage API keys:</label>
                <div className="relative mb-2">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full px-3 py-2 border rounded pr-16 text-lg bg-white text-black"
                    value={passwordInput}
                    onChange={e => setPasswordInput(e.target.value)}
                    placeholder="Password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (passwordInput === API_KEY_MANAGER_PASSWORD) {
                          setApiKeyPassword(passwordInput);
                        } else {
                          setPasswordError('Incorrect password');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-12 top-1/2 -translate-y-1/2 text-base px-2 bg-transparent"
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-base px-2 bg-transparent"
                    onClick={() => setPasswordInput('')}
                  >
                    ×
                  </button>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    className="bg-primary text-primary-foreground flex-1" 
                    onClick={() => {
                      if (passwordInput === API_KEY_MANAGER_PASSWORD) {
                        setApiKeyPassword(passwordInput);
                        setPasswordError('');
                      } else {
                        setPasswordError('Incorrect password');
                      }
                    }}
                  >
                    Unlock
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="flex-1" 
                    onClick={() => { 
                      setShowApiKeyManager(false); 
                      setPasswordInput(''); 
                      setPasswordError(''); 
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {passwordError && <div className="text-destructive mt-2 text-center">{passwordError}</div>}
              </div>
            )
          )}
        </div>

        {/* Keyword Form */}
        <KeywordForm onSubmit={handleAnalysis} isLoading={isLoading} />
        
        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress and Results */}
        <div className="mt-12">
          {isLoading && (
            <div className="space-y-6 mb-8">
              {/* New Progress Bar Component */}
              <KeywordTrackingProgress 
                progress={trackingProgress} 
                isTracking={isLoading}
                className="max-w-3xl mx-auto"
              />
              
              {/* Legacy Progress Display (can be removed if you prefer only the new component) */}
              <div className="w-full max-w-md mx-auto space-y-4">
                <p className="text-center text-foreground/80">{progressText}</p>
                <Progress value={progress} className="w-full" />
                <p className="text-center text-sm text-muted-foreground">
                  {progress < 100 ? `${Math.round(progress)}% complete` : 'Processing complete!'}
                </p>
              </div>
            </div>
          )}
          
          {analysis && (
            <div className="space-y-4">
              <ResultsDisplay analysis={analysis} />
            </div>
          )}
           
          {isLoading && !analysis && (
            <div className="mt-8">
              <LoadingSkeleton />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}