'use client';

import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Search, Link, MapPin, Loader2, Upload } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { countries } from '@/lib/countries';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  keywords: z.string().min(1, { message: 'Please enter at least one keyword.' }),
  url: z.string().min(1, { message: 'Please enter a valid URL.' }),
  location: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  businessName: z.string().min(1, { message: 'Please enter a business name.' }),
});

export type KeywordFormValues = z.infer<typeof formSchema>;

interface KeywordFormProps {
  onSubmit: (values: KeywordFormValues) => void;
  isLoading: boolean;
}

export function KeywordForm({ onSubmit, isLoading }: KeywordFormProps) {
  const form = useForm<KeywordFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      keywords: '',
      url: '',
      location: 'US',
      city: '',
      state: '',
      postalCode: '',
      businessName: '',
    },
  });
  
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFormSubmit = (values: KeywordFormValues) => {
    let { url, businessName } = values;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    onSubmit({ ...values, url, businessName });
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv') {
      toast({
        variant: 'destructive',
        title: 'Invalid File Type',
        description: 'Please upload a valid CSV file.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      // Assuming CSV has one column of keywords, or keywords are in the first column.
      const keywords = text.split('\n').map(row => row.split(',')[0].trim()).filter(Boolean);
      const currentKeywords = form.getValues('keywords');
      const newKeywords = [...(currentKeywords ? currentKeywords.split('\n') : []), ...keywords]
        .filter(Boolean)
        .join('\n');
      form.setValue('keywords', newKeywords, { shouldValidate: true });
       toast({
        title: 'Import Successful',
        description: `${keywords.length} keywords were imported.`,
      });
    };
    reader.readAsText(file);
    // Reset file input
    event.target.value = '';
  };


  return (
    <Card className="glass-card w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Start Your Analysis</CardTitle>
        <CardDescription>Enter keywords, your website, and a location to track your SERP performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                     <div className="flex justify-between items-center">
                      <FormLabel>Keyword(s)</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload />
                        Import CSV
                      </Button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                        accept=".csv"
                      />
                    </div>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., next.js features&#10;tailwind guide"
                        className="h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter keywords one per line, or import a CSV file.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., My Business" {...field} />
                    </FormControl>
                    <FormDescription>
                      The business name associated with these keywords.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website URL</FormLabel>
                    <div className="relative">
                      <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="example.com" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                     <FormDescription>
                      The website you want to check rankings for.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <div className="flex items-center gap-2">
                               <MapPin className="h-4 w-4 text-muted-foreground" />
                               <SelectValue placeholder="Select a country" />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map(country => (
                             <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormDescription>
                      The geographic location for the search.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., San Francisco" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., CA" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 94107" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Track Rankings
                </>
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
