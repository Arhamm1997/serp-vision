'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Search, Link, MapPin, Loader2 } from 'lucide-react';

const formSchema = z.object({
  keywords: z.string().min(3, { message: 'Please enter at least one keyword.' }),
  url: z.string().url({ message: 'Please enter a valid URL.' }),
  location: z.string().min(2, { message: 'Please enter a location.' }),
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
      location: 'United States',
    },
  });

  return (
    <Card className="glass-card w-full">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Start Your Analysis</CardTitle>
        <CardDescription>Enter keywords, your website, and a location to track your SERP performance.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="keywords"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Keywords</FormLabel>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="e.g., next.js features, tailwind guide" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormDescription>
                      Comma-separated keywords you want to track.
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
                        <Input placeholder="https://example.com" {...field} className="pl-10" />
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
                    <FormLabel>Location</FormLabel>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="e.g., California, United States" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormDescription>
                      The geographic location for the search.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
