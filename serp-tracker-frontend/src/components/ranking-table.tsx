'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowUp,
  ArrowDown,
  Minus,
  Search,
  Download,
  TrendingUp,
  TrendingDown,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RankingData {
  keyword: string;
  rank: number;
  previousRank: number;
  url: string;
  title?: string;
  description?: string;
  totalResults?: number;
  location?: string;
  found?: boolean;
  historical?: { date: string; rank: number }[];
}

interface RankingTableProps {
  data: RankingData[];
  domain?: string;
  onDownload?: () => void;
}

type SortField = 'keyword' | 'rank' | 'change' | 'url' | 'totalResults';
type SortDirection = 'asc' | 'desc';

export function RankingTable({ data, domain, onDownload }: RankingTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Calculate rank change
  const enhancedData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      change: item.previousRank > 0 ? item.previousRank - item.rank : 0,
      changePercent:
        item.previousRank > 0
          ? (((item.previousRank - item.rank) / item.previousRank) * 100)
          : 0,
    }));
  }, [data]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return enhancedData;
    
    const query = searchQuery.toLowerCase();
    return enhancedData.filter(
      (item) =>
        item.keyword.toLowerCase().includes(query) ||
        (item.title?.toLowerCase() || '').includes(query) ||
        item.url.toLowerCase().includes(query) ||
        (item.description?.toLowerCase() || '').includes(query)
    );
  }, [enhancedData, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    const sorted = [...filteredData];
    
    sorted.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'keyword':
          aValue = a.keyword.toLowerCase();
          bValue = b.keyword.toLowerCase();
          break;
        case 'rank':
          aValue = a.rank || 999999;
          bValue = b.rank || 999999;
          break;
        case 'change':
          aValue = a.change;
          bValue = b.change;
          break;
        case 'url':
          aValue = a.url.toLowerCase();
          bValue = b.url.toLowerCase();
          break;
        case 'totalResults':
          aValue = a.totalResults || 0;
          bValue = b.totalResults || 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredData, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="ml-1 h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="ml-1 h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 h-4 w-4" />
    );
  };

  // Statistics
  const stats = useMemo(() => {
    const ranked = sortedData.filter((item) => item.found && item.rank > 0);
    const notFound = sortedData.filter((item) => !item.found || item.rank === 0);
    const topTen = ranked.filter((item) => item.rank <= 10);
    const improved = ranked.filter((item) => item.change > 0);
    const declined = ranked.filter((item) => item.change < 0);

    return {
      total: sortedData.length,
      ranked: ranked.length,
      notFound: notFound.length,
      topTen: topTen.length,
      improved: improved.length,
      declined: declined.length,
      avgRank:
        ranked.length > 0
          ? Math.round(ranked.reduce((sum, item) => sum + item.rank, 0) / ranked.length)
          : 0,
    };
  }, [sortedData]);

  const getRankBadgeVariant = (rank: number) => {
    if (rank === 0) return 'destructive';
    if (rank <= 3) return 'default';
    if (rank <= 10) return 'secondary';
    return 'outline';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-3 w-3 text-green-600" />;
    if (change < 0) return <ArrowDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-400" />;
  };

  const exportToCSV = () => {
    const headers = ['Keyword', 'Rank', 'Previous Rank', 'Change', 'URL', 'Title', 'Total Results', 'Location'];
    const csvRows = [headers.join(',')];

    sortedData.forEach((item) => {
      const row = [
        `"${item.keyword.replace(/"/g, '""')}"`,
        item.rank || 'Not Found',
        item.previousRank || 'N/A',
        item.change || 0,
        `"${item.url.replace(/"/g, '""')}"`,
        `"${(item.title || '').replace(/"/g, '""')}"`,
        item.totalResults || 0,
        `"${(item.location || '').replace(/"/g, '""')}"`,
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `ranking-report-${domain || 'results'}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onDownload) onDownload();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2 flex-wrap">
              <span className="whitespace-nowrap">📊 Ranking Table</span>
              {domain && <span className="text-base sm:text-lg text-muted-foreground truncate">- {domain}</span>}
            </CardTitle>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Comprehensive keyword ranking analysis and performance metrics
            </p>
          </div>
          <Button onClick={exportToCSV} variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Statistics Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-3 mt-4">
          <div className="bg-blue-50 dark:bg-blue-950 p-2 sm:p-3 rounded-lg">
            <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">Total Keywords</div>
            <div className="text-xl sm:text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-950 p-2 sm:p-3 rounded-lg">
            <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">Ranked</div>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.ranked}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 p-2 sm:p-3 rounded-lg">
            <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">Not Found</div>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.notFound}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950 p-2 sm:p-3 rounded-lg">
            <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">Top 10</div>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{stats.topTen}</div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950 p-2 sm:p-3 rounded-lg">
            <div className="text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">Avg Rank</div>
            <div className="text-xl sm:text-2xl font-bold text-purple-600">{stats.avgRank || 'N/A'}</div>
          </div>
          <div className="bg-teal-50 dark:bg-teal-950 p-2 sm:p-3 rounded-lg">
            <div className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
              <TrendingUp className="h-3 w-3 shrink-0" />
              <span className="overflow-hidden text-ellipsis">Improved</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-teal-600">{stats.improved}</div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950 p-2 sm:p-3 rounded-lg">
            <div className="text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap overflow-hidden text-ellipsis">
              <TrendingDown className="h-3 w-3 shrink-0" />
              <span className="overflow-hidden text-ellipsis">Declined</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-orange-600">{stats.declined}</div>
          </div>
        </div>

        {/* Search Filter */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search keywords, titles, URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[40px] sticky left-0 bg-muted/50 z-10">#</TableHead>
                  <TableHead className="min-w-[180px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('keyword')}
                      className="font-semibold hover:bg-transparent p-0 h-auto"
                    >
                      Keyword
                      {getSortIcon('keyword')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center w-[100px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('rank')}
                      className="font-semibold hover:bg-transparent p-0 h-auto"
                    >
                      Rank
                      {getSortIcon('rank')}
                    </Button>
                  </TableHead>
                  <TableHead className="text-center w-[90px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('change')}
                      className="font-semibold hover:bg-transparent p-0 h-auto"
                    >
                      Change
                      {getSortIcon('change')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[200px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('url')}
                      className="font-semibold hover:bg-transparent p-0 h-auto"
                    >
                      URL
                      {getSortIcon('url')}
                    </Button>
                  </TableHead>
                  <TableHead className="min-w-[200px]">Title</TableHead>
                  <TableHead className="min-w-[250px]">Description</TableHead>
                  <TableHead className="text-right w-[120px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('totalResults')}
                      className="font-semibold hover:bg-transparent p-0 h-auto"
                    >
                      Results
                      {getSortIcon('totalResults')}
                    </Button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? 'No results match your search criteria' : 'No ranking data available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedData.map((item, index) => (
                    <TableRow
                      key={`${item.keyword}-${index}`}
                      className={cn(
                        'hover:bg-muted/50 transition-colors',
                        !item.found && 'bg-red-50/50 dark:bg-red-950/20'
                      )}
                    >
                      <TableCell className="font-medium text-muted-foreground sticky left-0 bg-background">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="break-words">{item.keyword}</span>
                          {item.location && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              {item.location}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getRankBadgeVariant(item.rank)} className="whitespace-nowrap">
                          {item.rank > 0 ? `#${item.rank}` : 'Not Found'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {getChangeIcon(item.change)}
                          <span
                            className={cn(
                              'text-sm font-medium whitespace-nowrap',
                              item.change > 0 && 'text-green-600',
                              item.change < 0 && 'text-red-600',
                              item.change === 0 && 'text-gray-400'
                            )}
                          >
                            {item.change > 0 && '+'}
                            {item.change !== 0 ? item.change : '-'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.url ? (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1 break-all"
                          >
                            <span className="break-all">{item.url}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="break-words" title={item.title}>
                          {item.title || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="break-words text-sm text-muted-foreground" title={item.description}>
                          {item.description || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground whitespace-nowrap">
                        {item.totalResults ? item.totalResults.toLocaleString() : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {sortedData.length > 0 && (
          <div className="mt-4 text-sm text-muted-foreground text-center">
            Showing {sortedData.length} of {data.length} keyword{data.length !== 1 ? 's' : ''}
            {searchQuery && ` (filtered by "${searchQuery}")`}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
