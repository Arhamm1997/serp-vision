'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TrackingProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  percentComplete: number;
  currentBatch?: number;
  totalBatches?: number;
  estimatedTimeRemaining?: number;
}

interface KeywordTrackingProgressProps {
  progress: TrackingProgress;
  isTracking: boolean;
  className?: string;
}

export function KeywordTrackingProgress({ 
  progress, 
  isTracking,
  className 
}: KeywordTrackingProgressProps) {
  const { total, processed, successful, failed, percentComplete, currentBatch, totalBatches } = progress;

  // Calculate stats
  const remaining = total - processed;
  const successRate = processed > 0 ? Math.round((successful / processed) * 100) : 0;

  return (
    <Card className={cn('glass-card', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {isTracking ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Tracking Keywords...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Tracking Complete
              </>
            )}
          </CardTitle>
          <Badge variant={isTracking ? 'default' : 'secondary'} className="text-xs">
            {percentComplete}% Complete
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              {processed} of {total} keywords tracked
            </span>
            {currentBatch && totalBatches && (
              <span className="text-xs">
                Batch {currentBatch}/{totalBatches}
              </span>
            )}
          </div>
          <Progress 
            value={percentComplete} 
            className="h-3 bg-gray-200 dark:bg-gray-800"
          />
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Keywords */}
          <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600">Total</span>
            </div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {total}
            </div>
          </div>

          {/* Successful */}
          <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-xs font-medium text-green-600">Success</span>
            </div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {successful}
            </div>
            {processed > 0 && (
              <div className="text-xs text-green-600 mt-1">
                {successRate}% success rate
              </div>
            )}
          </div>

          {/* Failed */}
          <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs font-medium text-red-600">Failed</span>
            </div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {failed}
            </div>
          </div>

          {/* Remaining */}
          <div className="bg-orange-50 dark:bg-orange-950/30 p-3 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Loader2 className={cn(
                "h-4 w-4 text-orange-600",
                isTracking && "animate-spin"
              )} />
              <span className="text-xs font-medium text-orange-600">Remaining</span>
            </div>
            <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
              {remaining}
            </div>
          </div>
        </div>

        {/* Status Message */}
        {isTracking && (
          <div className="text-sm text-muted-foreground text-center py-2 bg-blue-50 dark:bg-blue-950/20 rounded">
            Processing keywords... This may take a few minutes.
          </div>
        )}

        {!isTracking && processed > 0 && (
          <div className="text-sm text-center py-2 bg-green-50 dark:bg-green-950/20 rounded">
            <span className="text-green-700 dark:text-green-400 font-medium">
              ✓ Tracking completed successfully!
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
