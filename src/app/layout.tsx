import type { Metadata } from 'next';
import { Geist } from 'next/font/google'; // Keep only Geist Sans for simplicity unless Mono is needed
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CannaLog',
  description: 'Diário e Análise de Plantas de Cannabis', // Translated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Set lang to pt-BR. Dark theme is applied via globals.css :root and .dark selectors
    <html lang="pt-BR">
       {/* Add font variable and antialiased class for better font rendering */}
      <body className={`${geistSans.variable} font-sans antialiased bg-background text-foreground`}>
        {children}
        <Toaster /> {/* Add Toaster here */}
      </body>
    </html>
  );
}
