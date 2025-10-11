
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
import { Checkbox } from '../ui/checkbox';

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
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  useEffect(() => {
    if (suggestions) {
      // By default, select all items when they are loaded.
      setSelectedItems(suggestions.lineItems.map((_, index) => index));
    }
  }, [suggestions]);


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
      const itemsToApply = suggestions.lineItems.filter((_, index) => selectedItems.includes(index));
      if (itemsToApply.length > 0) {
        onApplyLineItems(itemsToApply);
      }
      onApplyNotes(suggestions.notes);
      toast({
        title: 'Suggestions Applied',
        description: `${itemsToApply.length} line item(s) and notes have been added to your estimate.`,
      });
    }
    setIsOpen(false);
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked && suggestions) {
      setSelectedItems(suggestions.lineItems.map((_, index) => index));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (index: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, index]);
    } else {
      setSelectedItems(prev => prev.filter(itemIndex => itemIndex !== index));
    }
  };


  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        <Wand2 className="mr-2 h-4 w-4" />
        Generate
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">AI-Powered Estimate</DialogTitle>
            <DialogDescription>
              Review and select the items to add to your estimate.
            </Dialog-Description>
          </DialogHeader>
          
            {isLoading && (
                <div className="flex flex-col items-center justify-center gap-4 p-8 flex-1">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Generating your detailed estimate...</p>
                </div>
            )}

            {suggestions && (
                <div className="flex-1 overflow-hidden">
                    <ScrollArea className="h-full pr-6">
                        <div className='space-y-4'>
                        <h3 className="font-semibold">Line Items</h3>
                        <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-10">
                                      <Checkbox 
                                        checked={suggestions.lineItems.length > 0 && selectedItems.length === suggestions.lineItems.length}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all items"
                                      />
                                    </TableHead>
                                    <TableHead className="w-[55%]">Description</TableHead>
                                    <TableHead className="text-center">Qty</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {suggestions.lineItems.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                          <Checkbox
                                            checked={selectedItems.includes(index)}
                                            onCheckedChange={(checked) => handleSelectItem(index, !!checked)}
                                            aria-label={`Select item ${index + 1}`}
                                          />
                                        </TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell className="text-center">{item.quantity}</TableCell>
                                        <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${(item.quantity * item.price).toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        </div>
                        
                        <h3 className="font-semibold mt-4">Notes for Client</h3>
                        <p className="text-sm text-muted-foreground p-4 border rounded-md bg-muted/50 whitespace-pre-wrap">{suggestions.notes}</p>
                        </div>
                    </ScrollArea>
                </div>
            )}
          
          <DialogFooter className="mt-auto pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
            {suggestions && <Button type="button" onClick={handleApplyAndClose}>Apply Selected Items</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
