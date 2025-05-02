
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter or Geist as preferred
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { ThemeProvider } from '@/components/theme-provider';
import ThemeToggle from '@/components/theme-toggle';
import { AuthProvider } from '@/context/auth-context'; // Import AuthProvider
import AppHeader from '@/components/app-header'; // Import the new AppHeader

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'CannaLog',
  description: 'Diário e Análise de Plantas de Cannabis',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider> {/* Wrap content with AuthProvider */}
            <div className="relative flex min-h-screen flex-col">
              {/* Render header conditionally based on auth state (logic inside AppHeader) */}
              <AppHeader />
              {/* Main content */}
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </AuthProvider> {/* Close AuthProvider */}
        </ThemeProvider>
      </body>
    </html>
  );
}
