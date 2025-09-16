'use client';

import React, { useState, useEffect, useMemo } from 'react';
import type { SerpAnalysisResult } from '@/lib/types';
import { getSerpAnalysis } from '@/app/actions';
import { KeywordForm, type KeywordFormValues } from '@/components/keyword-form';
import { ResultsDisplay } from '@/components/results-display';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import Logo from '@/components/logo';
import { Progress } from '@/components/ui/progress';
import { ApiKeyManager } from '@/components/api-key-manager';
import { Button } from '@/components/ui/button';

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
  const [totalKeywords, setTotalKeywords] = useState(0);
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  // Check backend connection on mount
  useEffect(() => {
    fetch('http://localhost:5000/api/health')
      .then(res => setBackendConnected(res.ok))
      .catch(() => setBackendConnected(false));
  }, []);

  const handleAnalysis = async (data: KeywordFormValues) => {
    setIsLoading(true);
    setAnalysis(null);
    setError(null);
    setProgress(0);

    const keywords = [...new Set(data.keywords.split(/\r?\n/).map(k => k.trim()).filter(Boolean))];
    setTotalKeywords(keywords.length);

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + 5;
      });
    }, 200);

    try {
      let result = null;
      let triedKeys = 0;
      let lastError = null;
      for (let i = 0; i < apiKeys.length; i++) {
        const apiKey = apiKeys[(activeKeyIdx + i) % apiKeys.length];
        try {
          result = await getSerpAnalysis({ ...data, keywords, apiKey });
          setActiveKeyIdx((activeKeyIdx + i) % apiKeys.length);
          break;
        } catch (err) {
          lastError = err;
          triedKeys++;
        }
      }
      if (!result) throw lastError || new Error('No API keys available');
      setProgress(100);
      setAnalysis(result);
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
      console.error(e);
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  };

  const progressText = useMemo(() => {
    if (progress < 100) {
      const keywordsDone = Math.floor((progress / 100) * totalKeywords);
      return `Analyzing ${keywordsDone} of ${totalKeywords} keywords...`;
    }
    return `Analyzed all ${totalKeywords} keywords!`;
  }, [progress, totalKeywords]);


  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-6xl mb-2 flex justify-end">
        {backendConnected === null ? (
          <span className="text-muted-foreground">Checking backend...</span>
        ) : backendConnected ? (
          <span className="text-green-600 font-semibold">Backend Connected</span>
        ) : (
          <span className="text-red-600 font-semibold">Backend Disconnected</span>
        )}
      </div>
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
        <div className="mb-4">
          {!showApiKeyManager ? (
            <Button
              className="border border-primary bg-background text-primary font-semibold py-2 px-6 rounded-lg shadow-sm hover:bg-primary hover:text-background transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
              onClick={() => setShowApiKeyManager(true)}
              data-variant="outline"
            >
              Manage API Keys
            </Button>
          ) : (
            apiKeyPassword === API_KEY_MANAGER_PASSWORD ? (
              <div className="relative">
                <ApiKeyManager onApiKeysChange={setApiKeys} />
                <Button className="absolute top-2 right-2 bg-secondary text-secondary-foreground" onClick={() => { setShowApiKeyManager(false); setApiKeyPassword(''); setPasswordInput(''); setPasswordError(''); }}>Hide</Button>
              </div>
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
                  <Button className="bg-primary text-primary-foreground flex-1" onClick={() => {
                    if (passwordInput === API_KEY_MANAGER_PASSWORD) {
                      setApiKeyPassword(passwordInput);
                    } else {
                      setPasswordError('Incorrect password');
                    }
                  }}>Unlock</Button>
                  <Button className="bg-secondary text-secondary-foreground flex-1" onClick={() => { setShowApiKeyManager(false); setPasswordInput(''); setPasswordError(''); }}>Hide</Button>
                  <Button className="flex-1" onClick={() => { setShowApiKeyManager(false); setPasswordInput(''); setPasswordError(''); }}>Cancel</Button>
                </div>
                {passwordError && <div className="text-destructive mt-2 text-center">{passwordError}</div>}
              </div>
            )
          )}
        </div>
        <KeywordForm onSubmit={handleAnalysis} isLoading={isLoading} />
        
        {error && <div className="text-center text-destructive mt-8">{error}</div>}

        <div className="mt-12">
          {isLoading && (
             <div className="w-full max-w-md mx-auto space-y-4">
              <p className="text-center text-foreground/80">{progressText}</p>
              <Progress value={progress} className="w-full" />
            </div>
          )}
          {analysis && <ResultsDisplay analysis={analysis} />}
           {isLoading && !analysis && <div className="mt-8"><LoadingSkeleton /></div>}
        </div>
      </main>
    </div>
  );
}
