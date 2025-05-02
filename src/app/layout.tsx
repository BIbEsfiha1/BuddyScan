
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter or Geist as preferred
import './globals.css';
// import { Toaster } from '@/components/ui/toaster'; // Removed Toaster
import { ThemeProvider } from '@/components/theme-provider';
// import AppHeader from '@/components/app-header'; // Removed AppHeader
// Removed Geist Sans import as Inter is used
// import { GeistSans } from 'geist/font/sans';
import { AuthProvider } from '@/context/auth-context'; // Import AuthProvider

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
            {/* Wrap everything in AuthProvider */}
            <AuthProvider>
                {/* Removed AppHeader and Toaster from RootLayout */}
                {/* Children will now render either the LandingPage or the AppLayout */}
                {children}
                {/* <Toaster /> */} {/* Moved to AppLayout or can be kept here if needed globally */}
             </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
