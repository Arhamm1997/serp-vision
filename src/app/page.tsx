'use client';

import { useState } from 'react';
import type { SerpAnalysisResult } from '@/lib/types';
import { getSerpAnalysis } from '@/app/actions';
import { KeywordForm, type KeywordFormValues } from '@/components/keyword-form';
import { ResultsDisplay } from '@/components/results-display';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import Logo from '@/components/logo';

export default function Home() {
  const [analysis, setAnalysis] = useState<SerpAnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalysis = async (data: KeywordFormValues) => {
    setIsLoading(true);
    setAnalysis(null);
    setError(null);
    try {
      const result = await getSerpAnalysis(data);
      setAnalysis(result);
    } catch (e) {
      setError('An unexpected error occurred. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 sm:p-6 lg:p-8">
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
        <KeywordForm onSubmit={handleAnalysis} isLoading={isLoading} />
        
        {error && <div className="text-center text-destructive mt-8">{error}</div>}

        <div className="mt-12">
          {isLoading && <LoadingSkeleton />}
          {analysis && <ResultsDisplay analysis={analysis} />}
        </div>
      </main>
    </div>
  );
}
