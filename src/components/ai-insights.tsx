import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface AiInsightsProps {
  insights: string;
}

export function AiInsights({ insights }: AiInsightsProps) {
  return (
    <Card className="glass-card border-primary/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline text-xl">
          <Sparkles className="h-5 w-5 text-primary" />
          AI-Powered Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-foreground/90 whitespace-pre-line">{insights}</p>
      </CardContent>
    </Card>
  );
}
