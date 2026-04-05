
'use server';

import { getAIPoweredEstimateSuggestions, AIPoweredEstimateSuggestionsInput } from "@/ai/flows/ai-powered-estimate-suggestions";
import { generateWorkOrder, WorkOrderInput } from "@/ai/flows/generate-work-order";
import { Resend } from 'resend';
import DocumentEmail from '@/components/emails/document-email';
import WorkOrderEmail from '@/components/emails/work-order-email';
import { render } from '@react-email/components';

const DIMENSIONS_REGEX = /(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)/i;

type DimensionUnit = 'in' | 'ft' | 'yd';

function parseSquareFootage(projectDescription: string) {
  const match = projectDescription.match(DIMENSIONS_REGEX);
  if (!match) return null;

  const rawWidth = Number(match[1]);
  const rawLength = Number(match[2]);

  if (!Number.isFinite(rawWidth) || !Number.isFinite(rawLength) || rawWidth <= 0 || rawLength <= 0) {
    return null;
  }

  const desc = projectDescription.toLowerCase();
  const mentionsInches = /\b(in|inch|inches|\")\b/i.test(desc);
  const mentionsFeet = /\b(ft|feet|foot|\')\b/i.test(desc);
  const mentionsYards = /\b(yd|yds|yard|yards)\b/i.test(desc);
  const isDoorOrWindow = /(door|window|puerta|ventana)/i.test(desc);
  const isFlooringJob = /(floor|flooring|lvp|vinyl|laminate|tile|piso|suelo|carpet|alfombra)/i.test(desc);

  let unit: DimensionUnit = 'ft';
  if (mentionsYards) {
    unit = 'yd';
  } else if (mentionsFeet) {
    unit = 'ft';
  } else if (mentionsInches || isDoorOrWindow) {
    unit = 'in';
  } else if (isFlooringJob) {
    unit = 'ft';
  } else if (rawWidth > 40 || rawLength > 40) {
    unit = 'in';
  }

  const width = rawWidth;
  const length = rawLength;
  const squareFeet = unit === 'in'
    ? (width * length) / 144
    : unit === 'yd'
      ? (width * length) * 9
      : width * length;

  return { width, length, squareFeet: Math.round(squareFeet * 100) / 100, unit };
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
    ? `Scope summary: ${input.projectDescription}. Estimated area interpreted as ${parsedArea.width} ${parsedArea.unit} x ${parsedArea.length} ${parsedArea.unit} = ${parsedArea.squareFeet} sq ft.`
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
  companyEmail,
  schedulingUrl,
}: {
  to: string;
  documentUrl: string;
  documentType: 'Estimate' | 'Invoice';
  documentNumber: string;
  companyName: string;
  companyEmail?: string;
  schedulingUrl?: string;
}) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
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

    const rawFrom = fromEmail.trim();
    const normalizedFromEmail = rawFrom.includes('@') ? rawFrom : `noreply@${rawFrom}`;
    const safeCompanyName = (companyName || 'INVOZY').replace(/[^a-zA-Z0-9 .,&\-]/g, '').trim().slice(0, 100) || 'INVOZY';
    const fromValue = `"${safeCompanyName}" <${normalizedFromEmail}>`;
    const replyTo = companyEmail && emailRegex.test(companyEmail) ? companyEmail : normalizedFromEmail;

    if (!emailRegex.test(normalizedFromEmail)) {
      console.error('[Email] Invalid RESEND_FROM_EMAIL format:', fromEmail);
      return {
        success: false,
        error: `Invalid RESEND_FROM_EMAIL format: ${fromEmail}. Use example: noreply@mail.invozzy.com`,
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
        schedulingUrl={schedulingUrl}
      />
    );

    const emailText = [
      `${documentType} ${documentNumber} from ${companyName}`,
      '',
      `You have received a new ${documentType.toLowerCase()} from ${companyName}.`,
      `View ${documentType.toLowerCase()}: ${documentUrl}`,
      '',
      ...(schedulingUrl ? [`Schedule: ${schedulingUrl}`] : []),
      `If you have any questions, reply to ${replyTo}.`,
    ].join('\n');

    console.log('[Email] Sending', documentType, documentNumber, 'to:', to);

    const { data, error } = await resend.emails.send({
      from: fromValue,
      reply_to: replyTo,
      to: [to],
      subject: `${companyName} - ${documentType} ${documentNumber}`,
      html: emailHtml,
      text: emailText,
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

export async function sendWorkOrderEmail({
  to,
  subcontractorName,
  projectTitle,
  clientName,
  clientAddress,
  invoiceNumber,
  tasks,
  materials,
  tools,
  companyName,
  companyEmail,
}: {
  to: string;
  subcontractorName: string;
  projectTitle: string;
  clientName: string;
  clientAddress: string;
  invoiceNumber?: string;
  tasks: string[];
  materials: string[];
  tools: string[];
  companyName: string;
  companyEmail?: string;
}) {
  try {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!resendApiKey) return { success: false, error: 'Missing RESEND_API_KEY.' };
    if (!fromEmail) return { success: false, error: 'Missing RESEND_FROM_EMAIL.' };

    const rawFrom = fromEmail.trim();
    const normalizedFromEmail = rawFrom.includes('@') ? rawFrom : `noreply@${rawFrom}`;
    const safeCompanyName = (companyName || 'INVOZY').replace(/[^a-zA-Z0-9 .,&\-]/g, '').trim().slice(0, 100) || 'INVOZY';
    const fromValue = `"${safeCompanyName}" <${normalizedFromEmail}>`;
    const replyTo = companyEmail && emailRegex.test(companyEmail) ? companyEmail : normalizedFromEmail;

    if (!to || !emailRegex.test(to)) return { success: false, error: 'Invalid subcontractor email.' };

    const resend = new Resend(resendApiKey);

    const emailHtml = render(
      <WorkOrderEmail
        subcontractorName={subcontractorName}
        projectTitle={projectTitle}
        clientName={clientName}
        clientAddress={clientAddress}
        tasks={tasks}
        materials={materials}
        tools={tools}
        companyName={safeCompanyName}
      />
    );

    const tasksList = tasks.map((t, i) => `${i + 1}. ${t}`).join('\n');

    const emailText = [
      `${safeCompanyName} — Work Order: ${projectTitle}`,
      '',
      `Hi ${subcontractorName},`,
      '',
      'Please review the details below for the upcoming job.',
      '',
      `Project: ${projectTitle}`,
      `Client: ${clientName}`,
      `Job Site: ${clientAddress}`,
      '',
      'Scope of Work:',
      tasksList,
      '',
      `Materials: ${materials.join(', ')}`,
      `Tools: ${tools.join(', ')}`,
      '',
      'If you have any questions, please reply to this email.',
      '',
      `Thank you,`,
      safeCompanyName,
    ].join('\n');

    const { data, error } = await resend.emails.send({
      from: fromValue,
      reply_to: replyTo,
      to: [to],
      subject: `${safeCompanyName} - Work Order${invoiceNumber ? ` (${invoiceNumber})` : ''}: ${projectTitle}`,
      html: emailHtml,
      text: emailText,
    });

    if (error) {
      console.error('[WorkOrderEmail] Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log('[WorkOrderEmail] ✓ Sent to', to);
    return { success: true, data };
  } catch (error) {
    console.error('[WorkOrderEmail] Exception:', error);
    return { success: false, error: 'Failed to send work order email.' };
  }
}
