
'use server';

import { getAIPoweredEstimateSuggestions, AIPoweredEstimateSuggestionsInput } from "@/ai/flows/ai-powered-estimate-suggestions";
import { generateWorkOrder, WorkOrderInput } from "@/ai/flows/generate-work-order";
import { Resend } from 'resend';
import DocumentEmail from '@/components/emails/document-email';
import { render } from '@react-email/components';

const DIMENSIONS_REGEX = /(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)/i;

function parseSquareFootage(projectDescription: string) {
  const match = projectDescription.match(DIMENSIONS_REGEX);
  if (!match) return null;

  const width = Number(match[1]);
  const length = Number(match[2]);

  if (!Number.isFinite(width) || !Number.isFinite(length) || width <= 0 || length <= 0) {
    return null;
  }

  const squareFeet = Math.round(width * length);
  return { width, length, squareFeet };
}

function getOfflineSuggestions(input: AIPoweredEstimateSuggestionsInput) {
  const desc = input.projectDescription.toLowerCase();
  const parsedArea = parseSquareFootage(input.projectDescription);
  const isFlooringJob = /(floor|flooring|lvp|vinyl|laminate|tile|piso|suelo)/i.test(desc);

  const materialLineItems = [
    { description: 'General construction supplies', quantity: 1, price: 45 },
    { description: 'Fasteners and consumables pack', quantity: 1, price: 28 },
  ];

  const laborLineItems = [
    { description: 'Site prep and protection', quantity: 1, price: 90 },
    { description: 'Core installation labor', quantity: 1, price: 320 },
    { description: 'Final cleanup and quality check', quantity: 1, price: 75 },
  ];

  if (desc.includes('door')) {
    materialLineItems.push(
      { description: 'Pre-hung interior door unit', quantity: 1, price: 179 },
      { description: 'Door hardware kit', quantity: 1, price: 49 },
      { description: 'Trim and finishing materials', quantity: 1, price: 42 }
    );
    laborLineItems.push({ description: 'Remove existing door and install new unit', quantity: 1, price: 260 });
  }

  if (desc.includes('paint')) {
    materialLineItems.push(
      { description: 'Interior paint (gallon)', quantity: 2, price: 42 },
      { description: 'Painter tape, roller, and tray set', quantity: 1, price: 24 }
    );
    laborLineItems.push({ description: 'Surface prep and painting labor', quantity: 1, price: 280 });
  }

  if (isFlooringJob && parsedArea) {
    const areaWithWaste = Math.ceil(parsedArea.squareFeet * 1.1);
    const lvpBoxes = Math.ceil(areaWithWaste / 24);
    const underlaymentRolls = Math.max(1, Math.ceil(parsedArea.squareFeet / 100));
    const transitionPieces = Math.max(1, Math.ceil(parsedArea.squareFeet / 120));

    materialLineItems.push(
      { description: 'LVP flooring boxes (24 sq ft each)', quantity: lvpBoxes, price: 48 },
      { description: 'Underlayment rolls', quantity: underlaymentRolls, price: 36 },
      { description: 'Transition and trim pieces', quantity: transitionPieces, price: 22 }
    );

    laborLineItems.push(
      { description: `Floor prep and leveling (${parsedArea.squareFeet} sq ft area)`, quantity: 1, price: Math.round(parsedArea.squareFeet * 1.2) },
      { description: `LVP installation (${parsedArea.squareFeet} sq ft area)`, quantity: 1, price: Math.round(parsedArea.squareFeet * 3.5) }
    );
  }

  const scopeSummary = parsedArea
    ? `Scope summary: ${input.projectDescription}. Estimated area interpreted as ${parsedArea.width} x ${parsedArea.length} = ${parsedArea.squareFeet} sq ft.`
    : `Scope summary: ${input.projectDescription}.`;

  const notes = [
    scopeSummary,
    'Line items were generated from the described scope and selected trade activities.',
    'Review quantities and unit prices before sending the estimate to the client.',
  ].join(' ');

  return {
    materialLineItems,
    laborLineItems,
    notes,
  };
}

export async function getSuggestions(input: AIPoweredEstimateSuggestionsInput) {
  try {
    const output = await getAIPoweredEstimateSuggestions(input);
    return { success: true, data: output };
  } catch (error) {
    console.error(error);
    const fallback = getOfflineSuggestions(input);
    return { success: true, data: fallback };
  }
}

export async function getWorkOrder(input: WorkOrderInput) {
  try {
    const output = await generateWorkOrder(input);
    return { success: true, data: output };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to generate work order.' };
  }
}


export async function sendDocumentEmail({
  to,
  documentUrl,
  documentType,
  documentNumber,
  companyName,
}: {
  to: string;
  documentUrl: string;
  documentType: 'Estimate' | 'Invoice';
  documentNumber: string;
  companyName: string;
}) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    
    if (!resendApiKey) {
      console.error('[Email] Missing RESEND_API_KEY');
      return { success: false, error: 'Missing RESEND_API_KEY in environment.' };
    }

    if (!fromEmail) {
      console.error('[Email] Missing RESEND_FROM_EMAIL');
      return {
        success: false,
        error: 'Missing RESEND_FROM_EMAIL. Set a verified sender like noreply@mail.invozzy.com',
      };
    }

    if (!to || !to.includes('@')) {
      console.error('[Email] Invalid client email:', to);
      return { success: false, error: 'Invalid client email address.' };
    }

    const resend = new Resend(resendApiKey);

    const emailHtml = render(
      <DocumentEmail
        documentUrl={documentUrl}
        documentType={documentType}
        documentNumber={documentNumber}
        companyName={companyName}
      />
    );

    console.log('[Email] Sending', documentType, documentNumber, 'to:', to);

    const { data, error } = await resend.emails.send({
      // Use plain verified sender to avoid invalid display-name formatting issues.
      from: fromEmail,
      to: [to],
      subject: `${documentType} ${documentNumber} from ${companyName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('[Email] Resend API error:', error);
      return { success: false, error: error.message };
    }

    console.log('[Email] ✓ Sent successfully to', to);
    return { success: true, data };
  } catch (error) {
    console.error('[Email] Exception:', error);
    return { success: false, error: 'Failed to send email.' };
  }
}
