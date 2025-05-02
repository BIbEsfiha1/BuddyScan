'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScanLine, PlusCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const router = useRouter();
  const { toast } = useToast();

  const handleScan = () => {
    // Simulate scanning a QR code for plant 'plant123'
    const simulatedQrCode = 'plant123';
    router.push(`/plant/${simulatedQrCode}`);
  };

  const handleRegister = () => {
    // Placeholder for registration functionality
    // router.push('/register'); // Navigate to register page when created
    console.log('Navigate to register page...');
    toast({
      title: 'Funcionalidade Indisponível',
      description: 'A página de cadastro de plantas ainda não foi implementada.',
      variant: 'destructive',
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background to-secondary/10">
      <Card className="w-full max-w-md shadow-lg border-primary/20">
        <CardHeader className="items-center text-center">
          <Image
             data-ai-hint="cannabis leaf logo green dark" // Updated hint
             src="https://picsum.photos/seed/cannabis-logo-dark/100/100" // Updated seed
             alt="CannaLog Logo"
             width={80}
             height={80}
             className="mb-4 rounded-full"
           />
          <CardTitle className="text-3xl font-bold text-primary">
            CannaLog
          </CardTitle>
          <p className="text-muted-foreground">Seu Companheiro para Plantas de Cannabis</p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 p-6">
           <Button
            size="lg"
            className="w-full text-lg"
            onClick={handleRegister}
            aria-label="Cadastrar Nova Planta"
            // variant="outline" // Optional: different style for register
          >
            <PlusCircle className="mr-2 h-6 w-6" />
            Cadastrar Planta
          </Button>
          <Button
            size="lg"
            className="w-full text-lg"
            onClick={handleScan}
            aria-label="Escanear QR Code da Planta"
          >
            <ScanLine className="mr-2 h-6 w-6" />
            Escanear QR Code
          </Button>
           <p className="text-center text-foreground/70 text-sm mt-4">
             Cadastre uma nova planta ou escaneie o QR code de uma existente para acessar seu diário.
           </p>
        </CardContent>
      </Card>
    </div>
  );
}
