'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getSuggestions } from '@/app/actions';
import { AIPoweredEstimateSuggestionsOutput, AIPoweredEstimateSuggestionsInput } from '@/ai/flows/ai-powered-estimate-suggestions';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';

type AiSuggestionsDialogProps = {
  projectDescription: string;
  projectLocation: string;
  onApplyLineItems: (lineItems: AIPoweredEstimateSuggestionsOutput['lineItems']) => void;
  onApplyNotes: (notes: string) => void;
};

export function AiSuggestionsDialog({
  projectDescription,
  projectLocation,
  onApplyLineItems,
  onApplyNotes
}: AiSuggestionsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AIPoweredEstimateSuggestionsOutput | null>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setIsLoading(true);
    setSuggestions(null);

    const input: AIPoweredEstimateSuggestionsInput = {
      projectDescription,
      location: projectLocation,
    };

    const result = await getSuggestions(input);

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
    if (!projectDescription.trim()) {
        toast({
            variant: 'destructive',
            title: 'Project Description Required',
            description: 'Please provide a project description before generating suggestions.',
        });
        return;
    }
    if (!projectLocation.trim()) {
        toast({
            variant: 'destructive',
            title: 'Company Address Required',
            description: 'Please set your company address in the Manage > Settings page for accurate AI labor costs.',
        });
        return;
    }
    setIsOpen(true);
    handleGenerate();
  }
  
  const handleApplyAndClose = () => {
    if (suggestions) {
      onApplyLineItems(suggestions.lineItems);
      onApplyNotes(suggestions.notes);
      toast({
        title: 'Suggestions Applied',
        description: 'Line items and notes have been added to your estimate.',
      });
    }
    setIsOpen(false);
  }

  return (
    <>
      <Button type="button" variant="outline" onClick={handleOpen}>
        <Wand2 className="mr-2 h-4 w-4" />
        AI-Powered Estimate
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">AI-Powered Estimate</DialogTitle>
            <DialogDescription>
              Here is a detailed breakdown of materials and labor for your project. Review and apply to your estimate.
            </DialogDescription>
          </DialogHeader>
          
            {isLoading && (
                <div className="flex flex-col items-center justify-center gap-4 p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Generating your detailed estimate...</p>
                </div>
            )}

            {suggestions && (
                <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                        <div className='pr-6'>
                        <h3 className="font-semibold mb-2">Line Items</h3>
                        <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60%]">Description</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suggestions.lineItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${(item.quantity * item.price).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                        
                        <h3 className="font-semibold mt-4 mb-2">Notes for Client</h3>
                        <p className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50 whitespace-pre-wrap">{suggestions.notes}</p>
                        </div>
                    </ScrollArea>
                </div>
            )}
          
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            {suggestions && <Button type="button" onClick={handleApplyAndClose}>Apply Items & Notes</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
