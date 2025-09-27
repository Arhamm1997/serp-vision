'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Key, AlertCircle, Check, Loader2, Activity, TrendingUp, Clock, Zap, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ApiKeyManagerProps {
  onApiKeysChange: (keys: string[]) => void;
  onHide?: () => void;
}

interface ApiKeyStats {
  total: number;
  active: number;
  exhausted: number;
  paused: number;
  totalUsageToday: number;
  totalCapacity: number;
  usagePercentage: number;
  remainingCapacity: number;
  estimatedTimeToExhaustion?: string;
  criticalKeys: number;
  warningKeys: number;
  hasEnvironmentKeys: boolean;
  totalUsageThisMonth: number;
  totalMonthlyCapacity: number;
  monthlyUsagePercentage: number;
}

interface DetailedKeyStats {
  id: string;
  status: string;
  usedToday: number;
  dailyLimit: number;
  usagePercentage: number;
  remainingRequests: number;
  successRate: number;
  errorCount: number;
  lastUsed: string;
  priority: number;
  healthStatus: 'healthy' | 'warning' | 'critical' | 'exhausted';
  usedThisMonth: number;
  monthlyLimit: number;
  monthlyUsagePercentage: number;
  estimatedDailyExhaustion: string | null;
}

export function ApiKeyManager({ onApiKeysChange, onHide }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('apiKeys');
      return stored ? JSON.parse(stored) : [];
    }
    return [];
  });
  
  const [newKey, setNewKey] = useState('');
  const [activeKeyIdx, setActiveKeyIdx] = useState(0);
  const [isTestingKey, setIsTestingKey] = useState<number | null>(null);
  const [keyTestResults, setKeyTestResults] = useState<Map<number, { valid: boolean; message: string }>>(new Map());
  const [backendStats, setBackendStats] = useState<ApiKeyStats | null>(null);
  const [detailedStats, setDetailedStats] = useState<DetailedKeyStats[]>([]);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const { toast } = useToast();

  // Load backend stats on component mount and periodically
  useEffect(() => {
    fetchBackendStats();
    const interval = setInterval(fetchBackendStats, 5000); // Update every 5 seconds for more immediate feedback
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    onApiKeysChange(apiKeys);
  }, [apiKeys, onApiKeysChange]);

  const fetchBackendStats = async () => {
    setIsLoadingStats(true);
    try {
      const response = await fetch('http://localhost:5000/api/keys/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setBackendStats(data.data.summary);
        setDetailedStats(data.data.keys || []);
      }
    } catch (error) {
      console.warn('Failed to fetch backend API key stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const testNewApiKey = async (key: string) => {
    try {
      const response = await fetch('http://localhost:5000/api/keys/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: key })
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "API Key Valid",
          description: "The API key is working correctly and ready to be added.",
        });
        return true;
      } else {
        toast({
          variant: "destructive",
          title: "API Key Invalid",
          description: data.message || "The API key is not valid.",
        });
        return false;
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: "Unable to connect to backend for testing.",
      });
      return false;
    }
  };

  const addKey = async () => {
    if (!newKey || newKey.trim().length < 20) {
      toast({
        variant: "destructive",
        title: "Invalid API Key",
        description: "Please enter a valid API key (minimum 20 characters).",
      });
      return;
    }

    try {
      setIsTestingKey(-1); // Use -1 to indicate adding new key
      
      const response = await fetch('http://localhost:5000/api/keys/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: newKey.trim(),
          dailyLimit: 250,
          monthlyLimit: 250
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNewKey('');
        // Update backend stats with the response data
        if (data.data) {
          setBackendStats(data.data.summary);
          setDetailedStats(data.data.keys || []);
        }
        // Also refresh to make sure we have latest data
        fetchBackendStats();
        
        toast({
          title: "API Key Added",
          description: "The API key has been added successfully and is now active.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Add API Key",
          description: data.message || "Unable to add the API key.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to backend. Please try again.",
      });
    } finally {
      setIsTestingKey(null);
    }
  };

  const removeKey = async (keyId: string) => {
    try {
      const response = await fetch(`http://localhost:5000/api/keys/remove/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (data.success) {
        // Update backend stats with the response data
        if (data.data) {
          setBackendStats(data.data.summary);
          setDetailedStats(data.data.keys || []);
        }
        // Also refresh to make sure we have latest data
        fetchBackendStats();
        
        toast({
          title: "API Key Removed",
          description: "The API key has been removed successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Remove API Key",
          description: data.message || "Unable to remove the API key.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to backend. Please try again.",
      });
    }
  };

  const updateKeySettings = async (keyId: string, updates: { dailyLimit?: number; monthlyLimit?: number; priority?: number }) => {
    try {
      const response = await fetch(`http://localhost:5000/api/keys/update/${keyId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      const data = await response.json();

      if (data.success) {
        // Update backend stats with the response data
        if (data.data) {
          setBackendStats(data.data.summary);
          setDetailedStats(data.data.keys || []);
        }
        fetchBackendStats();
        
        toast({
          title: "API Key Updated",
          description: "The API key settings have been updated successfully.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to Update API Key",
          description: data.message || "Unable to update the API key.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to connect to backend. Please try again.",
      });
    }
    
    toast({
      title: "API Key Removed",
      description: `Key ${removedKey.slice(0, 8)}... has been removed.`,
    });
  };

  const setActiveKey = (idx: number) => {
    setActiveKeyIdx(idx);
    toast({
      title: "Active Key Changed",
      description: `Now using key ${apiKeys[idx].slice(0, 8)}...`,
    });
  };

  const getHealthBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      case 'exhausted': return 'outline';
      default: return 'default';
    }
  };

  const formatLastUsed = (lastUsed: string) => {
    try {
      const date = new Date(lastUsed);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Key Management
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBackendStats}
              disabled={isLoadingStats}
            >
              {isLoadingStats ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </Button>
            {onHide && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onHide}
              >
                Hide
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="user-keys" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="user-keys">Your Keys ({apiKeys.length})</TabsTrigger>
            <TabsTrigger value="backend-stats">Backend Stats</TabsTrigger>
            <TabsTrigger value="detailed-stats">Key Details</TabsTrigger>
          </TabsList>

          <TabsContent value="user-keys" className="space-y-4">
            {/* Add New Key */}
            <div className="space-y-2">
              <Label htmlFor="new-key">Add New SerpAPI Key</Label>
              <div className="flex gap-2">
                <Input
                  id="new-key"
                  type="password"
                  placeholder="Enter your SerpAPI key (64 characters)..."
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKey()}
                />
                <Button 
                  variant="outline"
                  onClick={() => testNewApiKey(newKey)}
                  disabled={!newKey.trim() || newKey.trim().length < 20}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Test
                </Button>
                <Button 
                  onClick={addKey} 
                  disabled={!newKey.trim() || isTestingKey === -1}
                >
                  {isTestingKey === -1 ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                SerpAPI keys are 64-character hexadecimal strings. Get yours from <a href="https://serpapi.com/manage-api-key" target="_blank" rel="noopener noreferrer" className="underline">SerpAPI Dashboard</a>.
              </p>
            </div>

            {/* Current Keys */}
            <div className="space-y-3">
              {apiKeys.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No API keys configured. Add your SerpAPI keys to start tracking keywords.
                    {backendStats?.hasEnvironmentKeys && (
                      <span className="block mt-1 text-sm text-muted-foreground">
                        Backend has environment keys available as fallback.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              ) : detailedStats.length > 0 ? (
                detailedStats.map((keyStats, idx) => {
                  return (
                    <Card key={keyStats.id} className="relative">
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Badge 
                              variant={keyStats.status === 'active' ? 'default' : keyStats.status === 'exhausted' ? 'destructive' : 'secondary'}
                            >
                              {keyStats.status.charAt(0).toUpperCase() + keyStats.status.slice(1)}
                            </Badge>
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {keyStats.id}
                            </code>
                            <Badge 
                              variant={
                                keyStats.healthStatus === 'healthy' ? 'default' : 
                                keyStats.healthStatus === 'warning' ? 'secondary' : 
                                keyStats.healthStatus === 'critical' ? 'destructive' : 'outline'
                              }
                            >
                              {keyStats.healthStatus}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeKey(keyStats.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        {/* Key Statistics */}
                        <div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Daily Usage:</span>
                            <span>{keyStats.usedToday.toLocaleString()} / {keyStats.dailyLimit.toLocaleString()}</span>
                          </div>
                          <Progress value={keyStats.usagePercentage} className="h-2" />
                          
                          <div className="flex justify-between text-sm">
                            <span>Monthly Usage:</span>
                            <span>{keyStats.usedThisMonth.toLocaleString()} / {keyStats.monthlyLimit.toLocaleString()}</span>
                          </div>
                          <Progress value={keyStats.monthlyUsagePercentage} className="h-2" />
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Success Rate:</span>
                              <div className="font-medium">{keyStats.successRate.toFixed(1)}%</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Errors:</span>
                              <div className="font-medium">{keyStats.errorCount}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Priority:</span>
                              <div className="font-medium">#{keyStats.priority}</div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Used:</span>
                              <div className="font-medium text-xs">
                                {new Date(keyStats.lastUsed).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          
                          {keyStats.estimatedDailyExhaustion && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Est. Exhaustion:</span>
                              <div className="font-medium text-orange-600">{keyStats.estimatedDailyExhaustion}</div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No API Keys Found</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your first SerpAPI key to start tracking keywords.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="backend-stats" className="space-y-4">
            {backendStats ? (
              <>
                {/* Overall Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Total Keys</span>
                      </div>
                      <p className="text-2xl font-bold">{backendStats.total}</p>
                      <p className="text-xs text-muted-foreground">
                        {backendStats.active} active
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Usage Today</span>
                      </div>
                      <p className="text-2xl font-bold">{backendStats.totalUsageToday.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">
                        of {backendStats.totalCapacity.toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Capacity</span>
                      </div>
                      <p className="text-2xl font-bold">{backendStats.usagePercentage}%</p>
                      <p className="text-xs text-muted-foreground">used</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm font-medium">Time Left</span>
                      </div>
                      <p className="text-lg font-bold">
                        {backendStats.estimatedTimeToExhaustion || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">estimated</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Usage Progress */}
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Daily Usage Progress</span>
                      <span className="text-sm text-muted-foreground">
                        {backendStats.remainingCapacity.toLocaleString()} remaining
                      </span>
                    </div>
                    <Progress value={backendStats.usagePercentage} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{backendStats.totalUsageToday.toLocaleString()} used</span>
                      <span>{backendStats.totalCapacity.toLocaleString()} total</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Alerts */}
                {(backendStats.criticalKeys > 0 || backendStats.warningKeys > 0) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {backendStats.criticalKeys > 0 && (
                        <span className="block">🔴 {backendStats.criticalKeys} keys are critically low (&gt;90% used)</span>
                      )}
                      {backendStats.warningKeys > 0 && (
                        <span className="block">🟡 {backendStats.warningKeys} keys need attention (&gt;75% used)</span>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
              </>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Unable to load backend statistics. Make sure the backend server is running.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>

          <TabsContent value="detailed-stats" className="space-y-4">
            {detailedStats.length > 0 ? (
              <div className="space-y-3">
                {detailedStats.map((key, idx) => (
                  <Card key={key.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <code className="text-sm bg-muted px-2 py-1 rounded">
                            Key {idx + 1}
                          </code>
                          <Badge variant={getHealthBadgeVariant(key.healthStatus)}>
                            {key.healthStatus}
                          </Badge>
                          <Badge variant="outline">
                            Priority {key.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Success: {key.successRate}%
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-sm font-medium">Daily Usage</p>
                          <div className="flex items-center gap-2">
                            <Progress value={key.usagePercentage} className="flex-1 h-2" />
                            <span className="text-xs">{key.usagePercentage}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {key.usedToday.toLocaleString()} / {key.dailyLimit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Monthly Usage</p>
                          <div className="flex items-center gap-2">
                            <Progress value={key.monthlyUsagePercentage} className="flex-1 h-2" />
                            <span className="text-xs">{key.monthlyUsagePercentage}%</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {key.usedThisMonth.toLocaleString()} / {key.monthlyLimit.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Remaining Today</p>
                          <p className="text-lg font-bold">{key.remainingRequests.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {key.estimatedDailyExhaustion || 'No estimate'}
                          </p>
                        </div>
                      </div>

                      <Separator className="my-2" />
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Errors: {key.errorCount}</span>
                        <span>Last used: {formatLastUsed(key.lastUsed)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No detailed API key statistics available. This requires backend environment keys to be configured.
                </AlertDescription>
              </Alert>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
