'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getSuggestions } from '@/app/actions';
import { AIPoweredEstimateSuggestionsOutput } from '@/ai/flows/ai-powered-estimate-suggestions';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AiSuggestionsDialogProps = {
  projectDetails: string;
  currentPricing: string;
  onApplySuggestions: (suggestions: Partial<AIPoweredEstimateSuggestionsOutput>) => void;
};

export function AiSuggestionsDialog({
  projectDetails,
  currentPricing,
  onApplySuggestions,
}: AiSuggestionsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AIPoweredEstimateSuggestionsOutput | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setSuggestions(null);

    const result = await getSuggestions({
      projectDetails,
      currentPricing,
    });

    setIsLoading(false);
    if (result.success && result.data) {
      setSuggestions(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Could not generate suggestions.',
      });
      setIsOpen(false);
    }
  };

  const handleOpen = () => {
    if (!projectDetails.trim()) {
        toast({
            variant: 'destructive',
            title: 'Project Details Required',
            description: 'Please provide a project description before generating suggestions.',
        });
        return;
    }
    setIsOpen(true);
    handleGenerate();
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={handleOpen}>
        <Wand2 className="mr-2 h-4 w-4" />
        AI-Powered Assistance
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="font-headline">AI-Powered Suggestions</DialogTitle>
            <DialogDescription>
              Here are some suggestions to improve your estimate.
            </DialogDescription>
          </DialogHeader>
          
            {isLoading && (
                <div className="flex flex-col items-center justify-center gap-4 p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Generating suggestions...</p>
                </div>
            )}

            {suggestions && (
                <div className="grid gap-4 py-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium">Suggested Pricing</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{suggestions.suggestedPricing}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium">Refined Description</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">{suggestions.refinedDescription}</p>
                            <Button variant="link" size="sm" className="p-0 h-auto" onClick={() => onApplySuggestions({ refinedDescription: suggestions.refinedDescription })}>
                                Apply Description
                            </Button>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base font-medium">Potential Upsells</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">{suggestions.potentialUpsells}</p>
                        </CardContent>
                    </Card>
                </div>
            )}
          
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
