import type { Metadata } from 'next';
import Image from 'next/image';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const metadata: Metadata = {
  title: 'SERP Vision',
  description: 'Track and analyze your search engine rankings with AI-powered insights.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const heroBg = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        {heroBg && (
          <Image
            src={heroBg.imageUrl}
            alt={heroBg.description}
            fill
            className="-z-10 object-cover opacity-30"
            priority
          />
        )}
        <div className="relative z-0">
          {children}
          <Toaster />
        </div>
      </body>
    </html>
  );
}
