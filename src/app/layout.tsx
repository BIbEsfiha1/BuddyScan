
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter or Geist as preferred
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import AppHeader from '@/components/app-header'; // Import the new AppHeader
// Removed Geist Sans import as Inter is used
// import { GeistSans } from 'geist/font/sans';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'BudScan', // Updated title
  description: 'Diário e Análise Inteligente de Plantas', // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Set lang to pt-BR. Dark theme is applied via globals.css :root and .dark selectors
    <html lang="pt-BR" suppressHydrationWarning>
      {/* No whitespace or comments directly inside <html> */}
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark" // Default to dark theme
            enableSystem
            disableTransitionOnChange
        >
            {/* Removed AuthProvider wrapper */}
            <div className="relative flex min-h-screen flex-col">
              <AppHeader /> {/* Render header unconditionally */}
              {/* Main content */}
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
