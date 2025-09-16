import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

export interface ApiKeyManagerProps {
  onApiKeysChange: (keys: string[]) => void;
}

export function ApiKeyManager({ onApiKeysChange }: ApiKeyManagerProps) {
  const [apiKeys, setApiKeys] = useState<string[]>(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('apiKeys') : null;
    return stored ? JSON.parse(stored) : [];
  });
  const [newKey, setNewKey] = useState('');
  const [activeKeyIdx, setActiveKeyIdx] = useState(0);

  useEffect(() => {
    localStorage.setItem('apiKeys', JSON.stringify(apiKeys));
    onApiKeysChange(apiKeys);
  }, [apiKeys, onApiKeysChange]);

  const addKey = () => {
    if (newKey && !apiKeys.includes(newKey)) {
      setApiKeys([...apiKeys, newKey]);
      setNewKey('');
    }
  };

  const removeKey = (idx: number) => {
    setApiKeys(apiKeys.filter((_, i) => i !== idx));
    if (activeKeyIdx === idx) setActiveKeyIdx(0);
  };

  const setActiveKey = (idx: number) => {
    setActiveKeyIdx(idx);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>API Key Manager</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Enter new API key"
            value={newKey}
            onChange={e => setNewKey(e.target.value)}
          />
          <Button onClick={addKey} disabled={!newKey}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {apiKeys.map((key, idx) => (
            <Badge
              key={key}
              className={`cursor-pointer ${activeKeyIdx === idx ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}
              onClick={() => setActiveKey(idx)}
            >
              {key.slice(0, 8)}...{' '}
              <button type="button" className="ml-1 text-xs px-1" onClick={e => { e.stopPropagation(); removeKey(idx); }}>
                ×
              </button>
            </Badge>
          ))}
        </div>
        {apiKeys.length > 0 && (
          <div className="mt-2 text-sm">Active Key: <span className="font-mono">{apiKeys[activeKeyIdx]}</span></div>
        )}
      </CardContent>
    </Card>
  );
}
