'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { KeyStats } from '@/lib/types';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  Key, 
  TrendingDown, 
  TrendingUp,
  Calendar,
  BarChart3
} from 'lucide-react';

interface ApiKeyStatsDisplayProps {
  keyStats?: KeyStats;
}

export function ApiKeyStatsDisplay({ keyStats }: ApiKeyStatsDisplayProps) {
  if (!keyStats) {
    return (
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <Key className="h-4 w-4" />
            API Key Statistics
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">
            API key statistics unavailable - using demo data
          </p>
        </CardContent>
      </Card>
    );
  }

  const getDailyUsageColor = () => {
    if (keyStats.usagePercentage >= 90) return 'text-red-500';
    if (keyStats.usagePercentage >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getMonthlyUsageColor = () => {
    if (keyStats.monthlyUsagePercentage >= 90) return 'text-red-500';
    if (keyStats.monthlyUsagePercentage >= 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getStatusIcon = () => {
    if (keyStats.exhausted > 0 && keyStats.active === 0) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (keyStats.criticalKeys > 0) {
      return <TrendingDown className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const getOverallStatus = () => {
    if (keyStats.exhausted > 0 && keyStats.active === 0) return 'All Keys Exhausted';
    if (keyStats.criticalKeys > 0) return 'Critical Usage';
    if (keyStats.warningKeys > 0) return 'High Usage';
    return 'Healthy';
  };

  const getOverallStatusColor = () => {
    if (keyStats.exhausted > 0 && keyStats.active === 0) return 'destructive';
    if (keyStats.criticalKeys > 0) return 'default';
    if (keyStats.warningKeys > 0) return 'secondary';
    return 'default';
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Key Statistics
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <Badge variant={getOverallStatusColor()} className="text-xs">
              {getOverallStatus()}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Daily Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">Daily Usage</span>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold ${getDailyUsageColor()}`}>
                {keyStats.totalUsageToday.toLocaleString()} / {keyStats.totalCapacity.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                ({keyStats.usagePercentage}%)
              </span>
            </div>
          </div>
          <Progress 
            value={keyStats.usagePercentage} 
            className="h-1.5"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Remaining: {keyStats.remainingCapacity.toLocaleString()}</span>
            {keyStats.estimatedTimeToExhaustion && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {keyStats.estimatedTimeToExhaustion}
              </span>
            )}
          </div>
        </div>

        {/* Monthly Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium">Monthly Usage</span>
            </div>
            <div className="text-right">
              <span className={`text-xs font-bold ${getMonthlyUsageColor()}`}>
                {keyStats.totalUsageThisMonth.toLocaleString()} / {keyStats.totalMonthlyCapacity.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                ({keyStats.monthlyUsagePercentage}%)
              </span>
            </div>
          </div>
          <Progress 
            value={keyStats.monthlyUsagePercentage} 
            className="h-1.5"
          />
        </div>

        {/* Key Status Summary */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Active</span>
              <span className="text-xs font-bold text-green-600">{keyStats.active}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Exhausted</span>
              <span className="text-xs font-bold text-red-600">{keyStats.exhausted}</span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Warning</span>
              <span className="text-xs font-bold text-yellow-600">{keyStats.warningKeys}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Critical</span>
              <span className="text-xs font-bold text-red-600">{keyStats.criticalKeys}</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Database className="h-3 w-3" />
              Total Keys: {keyStats.total}
            </span>
            {keyStats.userProvidedKey && (
              <Badge variant="outline" className="text-xs">
                Using User Key
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}