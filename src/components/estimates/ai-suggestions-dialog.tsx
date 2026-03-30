
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
import { getSuggestions } from "@/app/actions";
import { AIPoweredEstimateSuggestionsOutput, AIPoweredEstimateSuggestionsInput } from '@/ai/flows/ai-powered-estimate-suggestions';
import { Wand2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { ScrollArea } from '../ui/scroll-area';
import { Checkbox } from '../ui/checkbox';
import type { LineItem } from '@/lib/types';

const DIMENSIONS_REGEX = /(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)/i;

type AiSuggestionsDialogProps = {
  projectDescription: string;
  projectLocation: string;
  onApplyLineItems: (lineItems: Omit<LineItem, 'id'>[]) => void;
  onApplyNotes: (notes: string) => void;
  onApplyTerms: (terms: string) => void;
};

export function AiSuggestionsDialog({
  projectDescription,
  projectLocation,
  onApplyLineItems,
  onApplyNotes,
  onApplyTerms
}: AiSuggestionsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AIPoweredEstimateSuggestionsOutput | null>(null);
  const { toast } = useToast();
  const [selectedMaterials, setSelectedMaterials] = useState<number[]>([]);
  const [selectedLabor, setSelectedLabor] = useState<number[]>([]);

  useEffect(() => {
    if (suggestions) {
      // By default, select all items when they are loaded.
      setSelectedMaterials(suggestions.materialLineItems.map((_, index) => index));
      setSelectedLabor(suggestions.laborLineItems.map((_, index) => index));
    }
  }, [suggestions]);


  const handleGenerate = async () => {
    setIsLoading(true);
    setSuggestions(null);

    const input: AIPoweredEstimateSuggestionsInput = {
      projectDescription,
      location: projectLocation,
    };

    try {
      const result = await getSuggestions(input);

      if (result.success && result.data) {
        setSuggestions(result.data);
        return;
      }

      const errorMessage =
        'error' in result && typeof result.error === 'string'
          ? result.error
          : undefined;

      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage || 'Could not generate suggestions.',
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Could not generate suggestions.',
      });
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = async () => {
    if (!projectDescription?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Project Description Required',
        description: 'Add a project description to generate AI suggestions.',
      });
      return;
    }

    setIsOpen(true);
    await handleGenerate();
  }
  
  const handleApplyAndClose = () => {
    if (suggestions) {
      const materialsToApply = suggestions.materialLineItems.filter((_, index) => selectedMaterials.includes(index));
      const laborToApply = suggestions.laborLineItems.filter((_, index) => selectedLabor.includes(index));
      const itemsToApply = [...materialsToApply, ...laborToApply];

      const materialNames = materialsToApply.map(item => item.description).slice(0, 5);
      const laborNames = laborToApply.map(item => item.description).slice(0, 5);
      const dimensions = projectDescription.match(DIMENSIONS_REGEX);
      const sqftSummary = dimensions
        ? `Measured area: ${dimensions[1]} x ${dimensions[2]} = ${Math.round(Number(dimensions[1]) * Number(dimensions[2]))} sq ft.`
        : null;

      const notes = [
        `Scope summary: ${projectDescription.trim()}.`,
        sqftSummary,
        materialNames.length > 0
          ? `Included materials: ${materialNames.join(', ')}${materialsToApply.length > 5 ? ', and additional materials' : ''}.`
          : 'No material items were selected in this estimate draft.',
        laborNames.length > 0
          ? `Included labor: ${laborNames.join(', ')}${laborToApply.length > 5 ? ', and additional labor tasks' : ''}.`
          : 'No labor tasks were selected in this estimate draft.',
        'Scope, quantities, and labor tasks are based on the selected line items and can be adjusted before sending.',
      ].filter(Boolean).join('\n\n');

      const terms = [
        `This estimate includes ${materialsToApply.length} material item(s) and ${laborToApply.length} labor task(s) listed above.`,
        'Any work, materials, or scope changes not included in these line items will be quoted separately as a change order.',
        'Client approval is required before work starts. Estimated timeline and scheduling are subject to material availability and site access.',
        'Payment terms: 50% deposit to schedule, remaining balance due at project completion unless otherwise agreed in writing.',
      ].join('\n\n');

      if (itemsToApply.length > 0) {
        onApplyLineItems(itemsToApply);
      }
      onApplyNotes(notes);
      onApplyTerms(terms);
      toast({
        title: 'Suggestions Applied',
        description: `${itemsToApply.length} line item(s), notes, and terms were added to your estimate.`,
      });
    }
    setIsOpen(false);
  }

  const handleSelectAll = (type: 'material' | 'labor', checked: boolean) => {
    if (type === 'material' && suggestions) {
        setSelectedMaterials(checked ? suggestions.materialLineItems.map((_, index) => index) : []);
    } else if (type === 'labor' && suggestions) {
        setSelectedLabor(checked ? suggestions.laborLineItems.map((_, index) => index) : []);
    }
  };

  const handleSelectItem = (type: 'material' | 'labor', index: number, checked: boolean) => {
    const setter = type === 'material' ? setSelectedMaterials : setSelectedLabor;
    setter(prev => {
        if (checked) {
            return [...prev, index];
        } else {
            return prev.filter(itemIndex => itemIndex !== index);
        }
    });
  };

  const renderTable = (
    title: string,
    items: AIPoweredEstimateSuggestionsOutput['materialLineItems'],
    selected: number[],
    type: 'material' | 'labor'
  ) => (
    <div>
        <h3 className="font-semibold mb-2">{title}</h3>
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox 
                                checked={items.length > 0 && selected.length === items.length}
                                onCheckedChange={(checked) => handleSelectAll(type, !!checked)}
                                aria-label={`Select all ${type} items`}
                            />
                        </TableHead>
                        <TableHead className="w-[55%]">Description</TableHead>
                        <TableHead className="text-center">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item, index) => (
                        <TableRow key={index}>
                            <TableCell>
                                <Checkbox
                                    checked={selected.includes(index)}
                                    onCheckedChange={(checked) => handleSelectItem(type, index, !!checked)}
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
    </div>
  );

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
            </DialogDescription>
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
                        <div className='space-y-6'>
                            {renderTable('Materials', suggestions.materialLineItems, selectedMaterials, 'material')}
                            {renderTable('Labor', suggestions.laborLineItems, selectedLabor, 'labor')}
                            
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
