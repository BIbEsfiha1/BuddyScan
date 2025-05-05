// src/app/(landing)/page.tsx
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, ScanLine, BookOpenText, BrainCircuit, BarChart } from '@/components/ui/lucide-icons'; // Using centralized icons

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background via-muted/5 to-primary/10 text-foreground">

       {/* Header Section for Landing Page */}
       <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
         <div className="container flex h-16 items-center justify-between">
           {/* Logo */}
           <Link href="/" className="flex items-center gap-2 mr-6">
              <Image
                 src="/buddyscan-logo.png" // Path to the logo in the public folder
                 alt="BuddyScan Logo"
                 width={140} // Adjust width as needed
                 height={40} // Adjust height as needed
                 priority
              />
           </Link>
            {/* Navigation/Actions */}
           <nav className="flex items-center gap-4">
              <Button variant="ghost" asChild>
                 <Link href="#features">Funcionalidades</Link>
              </Button>
               <Button variant="ghost" asChild>
                 <Link href="#how-it-works">Como Funciona</Link>
               </Button>
               <Button asChild className="button">
                 <Link href="/dashboard">Acessar o App</Link>
              </Button>
           </nav>
         </div>
       </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 lg:py-40 xl:py-48 bg-gradient-to-b from-primary/10 to-transparent">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tighter text-primary sm:text-5xl xl:text-6xl/none">
                    BuddyScan: Cultivo Inteligente ao Seu Alcance
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Monitore, analise e otimize suas plantas de cannabis com tecnologia QR Code e inteligência artificial. Simplifique seu cultivo e maximize seus resultados.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  {/* Ensure this button navigates correctly based on routing setup */}
                   <Button size="lg" asChild className="button">
                     <Link href="/dashboard">Acessar o App</Link>
                   </Button>
                  {/* Optional: Add a secondary button like "Learn More" */}
                  {/*
                  <Button size="lg" variant="outline" asChild className="button">
                    <Link href="#features">Saiba Mais</Link>
                  </Button>
                   */}
                </div>
              </div>
              <Image
                data-ai-hint="modern cannabis cultivation technology app interface"
                src="https://picsum.photos/seed/buddyscan-hero/600/400" // Updated seed
                width="600"
                height="400"
                alt="BuddyScan Hero Image" // Updated alt text
                className="mx-auto aspect-video overflow-hidden rounded-xl object-cover sm:w-full lg:order-last lg:aspect-square shadow-lg border border-primary/20"
              />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm text-muted-foreground">Principais Funcionalidades</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Tudo que você precisa para um Cultivo de Sucesso</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Do QR Code ao diário detalhado e análises inteligentes, o BuddyScan oferece as ferramentas certas.
                </p>
              </div>
            </div>
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-2 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              <Card className="card hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl"><ScanLine className="h-6 w-6 text-primary"/>Identificação Rápida</CardTitle>
                  <CardDescription>Escaneie o QR Code único de cada planta para acesso instantâneo ao seu histórico e status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Image data-ai-hint="qr code scanning cannabis plant" src="https://picsum.photos/seed/buddyscan-qr/300/200" width={300} height={200} alt="QR Code Scan" className="rounded-md object-cover"/>
                </CardContent>
              </Card>
              <Card className="card hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl"><BookOpenText className="h-6 w-6 text-primary"/>Diário de Cultivo Detalhado</CardTitle>
                  <CardDescription>Registre notas, medições (pH, EC, altura), fotos e acompanhe cada fase do desenvolvimento.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Image data-ai-hint="digital plant diary cannabis notes" src="https://picsum.photos/seed/buddyscan-diary/300/200" width={300} height={200} alt="Plant Diary" className="rounded-md object-cover"/>
                </CardContent>
              </Card>
              <Card className="card hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl"><BrainCircuit className="h-6 w-6 text-primary"/>Análise Inteligente por IA</CardTitle>
                  <CardDescription>Tire fotos e obtenha análises da nossa IA sobre possíveis problemas, deficiências ou doenças.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Image data-ai-hint="ai analysis plant health cannabis leaves" src="https://picsum.photos/seed/buddyscan-ai/300/200" width={300} height={200} alt="AI Analysis" className="rounded-md object-cover"/>
                </CardContent>
              </Card>
               <Card className="card hover:border-primary/30 transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl"><BarChart className="h-6 w-6 text-primary"/>Acompanhamento de Status</CardTitle>
                  <CardDescription>Gerencie facilmente o estágio de cada planta (Vegetativo, Floração, etc.) e identifique quais precisam de atenção.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Image data-ai-hint="cannabis plant growth stages tracking dashboard" src="https://picsum.photos/seed/buddyscan-status/300/200" width={300} height={200} alt="Status Tracking" className="rounded-md object-cover"/>
                </CardContent>
              </Card>
              <Card className="card hover:border-primary/30 transition-all duration-300 lg:col-span-2"> {/* Example spanning 2 columns */}
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl"><CheckCircle className="h-6 w-6 text-primary"/>Organização e Eficiência</CardTitle>
                  <CardDescription>Mantenha todas as informações centralizadas, filtre por sala ou status e tenha um controle completo do seu cultivo.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Image data-ai-hint="organized cannabis grow room inventory system" src="https://picsum.photos/seed/buddyscan-org/620/200" width={620} height={200} alt="Organization" className="rounded-md object-cover w-full"/>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-b from-muted/10 to-transparent">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">Comece a Usar em 3 Passos Simples</h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Simplifique seu gerenciamento de cultivo agora mesmo.
              </p>
            </div>
            <div className="mx-auto w-full max-w-4xl pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-card transition-colors duration-200">
                   <div className="p-3 rounded-full bg-primary/10 text-primary mb-2"><span className="text-2xl font-bold">1</span></div>
                  <h3 className="text-xl font-bold">Cadastre</h3>
                  <p className="text-sm text-muted-foreground">Registre suas plantas e gere um QR Code único para cada uma.</p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-card transition-colors duration-200">
                   <div className="p-3 rounded-full bg-primary/10 text-primary mb-2"><span className="text-2xl font-bold">2</span></div>
                  <h3 className="text-xl font-bold">Escaneie e Registre</h3>
                  <p className="text-sm text-muted-foreground">Use o scanner para acessar a planta e adicione entradas no diário (fotos, notas, medições).</p>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-card transition-colors duration-200">
                  <div className="p-3 rounded-full bg-primary/10 text-primary mb-2"><span className="text-2xl font-bold">3</span></div>
                  <h3 className="text-xl font-bold">Analise e Otimize</h3>
                  <p className="text-sm text-muted-foreground">Utilize a análise de IA e o histórico para tomar as melhores decisões para seu cultivo.</p>
                </div>
              </div>
            </div>
             <div className="mt-10">
                 {/* Ensure this button navigates correctly based on routing setup */}
                  <Button size="lg" asChild className="button">
                     <Link href="/dashboard">Começar Agora</Link>
                  </Button>
             </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BuddyScan. Todos os direitos reservados.</p> {/* Updated name */}
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-muted-foreground" prefetch={false}>
            Termos de Serviço
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4 text-muted-foreground" prefetch={false}>
            Política de Privacidade
          </Link>
        </nav>
      </footer>
    </div>
  );
}