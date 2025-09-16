'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { SerpData } from '@/lib/types';
import { Download, FileText, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface DownloadButtonProps {
  data: SerpData[];
}

export function DownloadButton({ data }: DownloadButtonProps) {
  const handleDownload = (format: 'csv' | 'xlsx') => {
    const dataToExport = data.map(item => ({
      Keyword: item.keyword,
      Title: item.title || '',
      Description: item.description || '',
      Rank: item.rank,
      'Previous Rank': item.previousRank,
      URL: item.url,
      'Last 8 Weeks History': item.historical.map(h => h.rank).join(', '),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SERP Data');

    if (format === 'xlsx') {
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
      saveAs(blob, 'serp-vision-analysis.xlsx');
    } else {
      const csvOutput = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csvOutput], { type: 'text/csv;charset=utf-8;' });
      saveAs(blob, 'serp-vision-analysis.csv');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
  <Button className="border border-primary bg-background text-primary font-semibold px-4 py-2 rounded-lg hover:bg-primary hover:text-background transition-all duration-200">
          <Download />
          Download Results
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={() => handleDownload('csv')}>
          <FileText className="mr-2" />
          Download as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('xlsx')}>
          <FileSpreadsheet className="mr-2" />
          Download as Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
