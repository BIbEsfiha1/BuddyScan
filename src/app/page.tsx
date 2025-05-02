'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanLine } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();

  const handleScan = () => {
    // Simulate scanning a QR code for plant 'plant123'
    const simulatedQrCode = 'plant123';
    router.push(`/plant/${simulatedQrCode}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary/10">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="items-center text-center">
          <Image
             data-ai-hint="cannabis leaf logo"
             src="https://picsum.photos/seed/cannaloglogo/100/100" // Placeholder logo
             alt="CannaLog Logo"
             width={80}
             height={80}
             className="mb-4 rounded-full"
           />
          <CardTitle className="text-3xl font-bold text-primary">
            CannaLog
          </CardTitle>
          <p className="text-muted-foreground">Your Cannabis Plant Companion</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 p-6">
          <p className="text-center text-foreground/80">
            Scan your plant's QR code to view its diary and add new entries.
          </p>
          <Button
            size="lg"
            className="w-full text-lg"
            onClick={handleScan}
            aria-label="Scan Plant QR Code"
          >
            <ScanLine className="mr-2 h-6 w-6" />
            Scan Plant QR Code
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
