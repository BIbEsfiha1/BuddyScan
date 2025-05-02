'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Camera, Upload, Leaf, Bot, Loader2, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { analyzePlantPhoto, type AnalyzePlantPhotoOutput } from '@/ai/flows/analyze-plant-photo';
import type { DiaryEntry } from '@/types/diary-entry';
import { Progress } from '@/components/ui/progress';


const diaryEntrySchema = z.object({
  note: z.string().min(1, 'Note cannot be empty').max(500, 'Note too long'),
  stage: z.string().optional(), // Example: Vegetative, Flowering
  heightCm: z.number().positive().optional(),
  ec: z.number().positive().optional(),
  ph: z.number().min(0).max(14).optional(),
  temp: z.number().optional(),
  humidity: z.number().min(0).max(100).optional(),
  // Photo data is handled separately
});

type DiaryEntryFormData = z.infer<typeof diaryEntrySchema>;

interface DiaryEntryFormProps {
  plantId: string;
  onNewEntry: (entry: DiaryEntry) => void;
}

export function DiaryEntryForm({ plantId, onNewEntry }: DiaryEntryFormProps) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalyzePlantPhotoOutput | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);


  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<DiaryEntryFormData>({
    resolver: zodResolver(diaryEntrySchema),
    defaultValues: {
      note: '',
      // Add defaults for other fields if needed
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
        setAnalysisResult(null); // Reset analysis if new photo is selected
        setAnalysisError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleAnalyzePhoto = async () => {
    if (!photoPreview) return;

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
        // Ensure photoPreview is a valid data URI string
       if (typeof photoPreview !== 'string' || !photoPreview.startsWith('data:image')) {
         throw new Error('Invalid image data for analysis.');
       }
       const result = await analyzePlantPhoto({ photoDataUri: photoPreview });
       setAnalysisResult(result);
    } catch (error) {
      console.error('AI Analysis Error:', error);
      setAnalysisError('Failed to analyze photo. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onSubmit = async (data: DiaryEntryFormData) => {
     setIsSubmitting(true);
     setSubmitError(null);
     setUploadProgress(0); // Start progress


    // TODO: Replace with actual backend submission logic
    console.log('Submitting data:', data);
    console.log('Photo file:', photoFile);
    console.log('Analysis result:', analysisResult);

    // Simulate upload/save process
    try {
        // 1. Upload photo if exists (simulate progress)
        let photoUrl = null;
        if (photoFile && photoPreview) {
          // Simulate upload delay and progress
          for (let i = 1; i <= 5; i++) {
            await new Promise(res => setTimeout(res, 300));
            setUploadProgress(i * 20);
          }
          // In real app, get URL from upload response
          photoUrl = photoPreview; // Use preview as mock URL
          console.log('Simulated photo upload complete.');
        } else {
            setUploadProgress(100); // No photo to upload
        }


        // 2. Construct the new DiaryEntry object
        const newEntry: DiaryEntry = {
            id: `entry-${Date.now()}`, // Temporary ID
            plantId: plantId,
            timestamp: new Date().toISOString(),
            authorId: 'current-user', // Replace with actual user ID
            note: data.note,
            stage: data.stage,
            heightCm: data.heightCm,
            ec: data.ec,
            ph: data.ph,
            temp: data.temp,
            humidity: data.humidity,
            photoUrl: photoUrl,
            aiSummary: analysisResult?.analysisResult || null,
        };

        // 3. Simulate saving to backend
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('Simulated save complete:', newEntry);


        // 4. Call the callback to update the UI
        onNewEntry(newEntry);

        // 5. Reset form state
        form.reset();
        setPhotoPreview(null);
        setPhotoFile(null);
        setAnalysisResult(null);
        setAnalysisError(null);

    } catch (error) {
        console.error('Submission Error:', error);
        setSubmitError('Failed to save diary entry. Please try again.');
    } finally {
        setIsSubmitting(false);
        setUploadProgress(null); // Hide progress bar
    }
  };

  return (
    <Card className="shadow-lg border border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <Leaf className="text-primary" /> Add New Diary Entry
        </CardTitle>
        <CardDescription>Record observations, measurements, and add a photo for analysis.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Photo Section */}
            <FormItem>
               <FormLabel>Plant Photo</FormLabel>
               <Card className="border-dashed border-secondary/50 p-4">
                    <CardContent className="flex flex-col items-center justify-center gap-4 p-0">
                        {photoPreview ? (
                             <Image
                                data-ai-hint="cannabis plant close up"
                                src={photoPreview}
                                alt="Plant preview"
                                width={200}
                                height={150}
                                className="rounded-md max-h-40 w-auto object-cover"
                              />
                        ) : (
                           <div className="flex flex-col items-center text-muted-foreground p-6">
                                <Camera className="h-12 w-12 mb-2" />
                                <span>No photo selected</span>
                           </div>
                        )}
                        <Input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            ref={fileInputRef}
                            aria-label="Upload plant photo"
                         />
                         <Button type="button" variant="outline" onClick={triggerFileInput} disabled={isSubmitting || isAnalyzing}>
                            <Upload className="mr-2 h-4 w-4" /> Select Photo
                         </Button>
                         {photoPreview && (
                             <Button
                                type="button"
                                onClick={handleAnalyzePhoto}
                                disabled={!photoPreview || isAnalyzing || isSubmitting}
                                variant="secondary"
                                size="sm"
                              >
                                {isAnalyzing ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                                  </>
                                ) : (
                                  <>
                                    <Bot className="mr-2 h-4 w-4" /> Analyze with AI
                                  </>
                                )}
                             </Button>
                         )}
                     </CardContent>
               </Card>
               {analysisResult && (
                 <FormDescription className="text-accent-foreground bg-accent/20 p-2 rounded-md mt-2 flex items-center gap-1">
                    <Bot className="h-4 w-4 shrink-0"/> AI: {analysisResult.analysisResult}
                 </FormDescription>
               )}
                {analysisError && (
                  <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="h-4 w-4 shrink-0"/> {analysisError}
                  </p>
               )}
            </FormItem>


            {/* Note Section */}
            <FormField
              control={form.control}
              name="note"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observations / Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe what you see or actions taken..." {...field} disabled={isSubmitting}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Optional Measurement Fields - Example */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 <FormField
                   control={form.control}
                   name="stage"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Stage</FormLabel>
                       <FormControl>
                         {/* Consider using a Select component here */}
                         <Input placeholder="e.g., Flowering Week 3" {...field} disabled={isSubmitting}/>
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                <FormField
                    control={form.control}
                    name="heightCm"
                    render={({ field }) => (
                       <FormItem>
                         <FormLabel>Height (cm)</FormLabel>
                         <FormControl>
                            <Input type="number" step="0.1" placeholder="e.g., 45.5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} disabled={isSubmitting} />
                         </FormControl>
                         <FormMessage />
                       </FormItem>
                    )}
                 />
                 <FormField
                     control={form.control}
                     name="ec"
                     render={({ field }) => (
                         <FormItem>
                             <FormLabel>EC</FormLabel>
                             <FormControl>
                                 <Input type="number" step="0.1" placeholder="e.g., 1.6" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} disabled={isSubmitting} />
                             </FormControl>
                             <FormMessage />
                         </FormItem>
                     )}
                 />
                 <FormField
                     control={form.control}
                     name="ph"
                     render={({ field }) => (
                         <FormItem>
                             <FormLabel>pH</FormLabel>
                             <FormControl>
                                 <Input type="number" step="0.1" placeholder="e.g., 6.0" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} disabled={isSubmitting}/>
                             </FormControl>
                             <FormMessage />
                         </FormItem>
                     )}
                 />
                 <FormField
                     control={form.control}
                     name="temp"
                     render={({ field }) => (
                         <FormItem>
                             <FormLabel>Temp (°C)</FormLabel>
                             <FormControl>
                                 <Input type="number" step="0.1" placeholder="e.g., 24.5" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} disabled={isSubmitting}/>
                             </FormControl>
                             <FormMessage />
                         </FormItem>
                     )}
                 />
                 <FormField
                     control={form.control}
                     name="humidity"
                     render={({ field }) => (
                         <FormItem>
                             <FormLabel>Humidity (%)</FormLabel>
                             <FormControl>
                                 <Input type="number" step="1" placeholder="e.g., 55" {...field} onChange={e => field.onChange(e.target.value === '' ? undefined : +e.target.value)} disabled={isSubmitting} />
                             </FormControl>
                             <FormMessage />
                         </FormItem>
                     )}
                 />

            </div>

            {uploadProgress !== null && (
              <div className="space-y-1">
                  <FormLabel>Saving Progress</FormLabel>
                  <Progress value={uploadProgress} className="w-full h-2" />
              </div>
             )}

             {submitError && (
                <p className="text-sm font-medium text-destructive flex items-center gap-1"><AlertCircle className="h-4 w-4"/> {submitError}</p>
             )}


            <Button type="submit" className="w-full" disabled={isSubmitting || isAnalyzing}>
               {isSubmitting ? (
                 <>
                   <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Entry...
                 </>
               ) : (
                 'Save Diary Entry'
               )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
