import { CardContent } from '@/components/ui/card';

interface AiInsightsProps {
  insights: string;
}

export function AiInsights({ insights }: AiInsightsProps) {
  return (
    <CardContent>
      <p className="text-foreground/90 whitespace-pre-line">{insights}</p>
    </CardContent>
  );
}
