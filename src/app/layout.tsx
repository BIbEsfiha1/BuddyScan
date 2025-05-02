
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter or Geist as preferred
import './globals.css';
import { Toaster } from '@/components/ui/toaster'; // Import Toaster
import { ThemeProvider } from '@/components/theme-provider'; // Import ThemeProvider
import ThemeToggle from '@/components/theme-toggle'; // Import ThemeToggle

const inter = Inter({
  variable: '--font-inter',
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
    <html lang="pt-BR" suppressHydrationWarning> {/* No whitespace here */}
      {/* Add font variable and antialiased class for better font rendering */}
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark" // Default to dark theme as requested
            enableSystem
            disableTransitionOnChange
        >
            <div className="relative min-h-screen">
              {/* Place ThemeToggle in a fixed position (e.g., top right) */}
              <div className="absolute top-4 right-4 z-50">
                <ThemeToggle />
              </div>
              {children}
            </div>
            <Toaster /> {/* Add Toaster here */}
        </ThemeProvider>
      </body>
    </html>
  );
}
