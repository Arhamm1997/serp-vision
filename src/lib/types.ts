export type HistoricalData = {
  date: string;
  rank: number;
};

export type SerpData = {
  keyword: string;
  rank: number;
  previousRank: number;
  url: string;
  historical: HistoricalData[];
};

export type SerpAnalysisResult = {
  serpData: SerpData[];
  aiInsights: string;
};
