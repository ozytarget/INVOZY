
'use server';

import { getAIPoweredEstimateSuggestions, AIPoweredEstimateSuggestionsInput } from "@/ai/flows/ai-powered-estimate-suggestions";
import { generateWorkOrder, WorkOrderInput } from "@/ai/flows/generate-work-order";
import { Resend } from 'resend';
import DocumentEmail from '@/components/emails/document-email';
import WorkOrderEmail from '@/components/emails/work-order-email';
import { render } from '@react-email/components';
import { getAuthenticatedUser } from '@/lib/server-auth';
import { dbQuery } from '@/lib/server-db';

// Simple in-memory rate limiter (per-process, reset on deploy) — same pattern
// as src/app/api/auth/signin/route.ts, keyed by authenticated user id.
type RateLimitEntry = { count: number; resetAt: number };
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const AI_MAX_REQUESTS = 30;
const EMAIL_MAX_REQUESTS = 30;
const aiRequests = new Map<string, RateLimitEntry>();
const emailRequests = new Map<string, RateLimitEntry>();

function isRateLimited(requests: Map<string, RateLimitEntry>, key: string, maxRequests: number): boolean {
  const now = Date.now();
  const entry = requests.get(key);
  if (!entry || now > entry.resetAt) {
    requests.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > maxRequests;
}

const RATE_LIMIT_ERROR = 'Too many requests. Please try again later.';
const NOT_AUTHENTICATED_ERROR = 'Not authenticated.';

// Share tokens are UUIDs (see generateShareToken in use-documents and the
// validation in src/app/api/public/document/route.ts).
const SHARE_TOKEN_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that documentUrl points at our own app's public document page and
 * extracts the shareId. If NEXT_PUBLIC_APP_URL is defined at runtime the URL
 * origin must match it; otherwise we fall back to requiring the
 * /public/<shareId> path pattern on an absolute URL.
 */
function extractShareIdFromDocumentUrl(documentUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(documentUrl);
  } catch {
    return null;
  }

  // We only need a well-formed /public/<shareId> path with a valid token shape.
  // The real authorization gate is userOwnsSharedDocument() below, which ties the
  // shareId to the authenticated user in the database; the URL origin is not
  // trusted for security and is intentionally not matched against
  // NEXT_PUBLIC_APP_URL, so serving the app from an additional domain (e.g. a
  // Railway subdomain alongside a custom domain) cannot break document emails.
  const match = parsed.pathname.match(/^\/public\/([^/]+)\/?$/);
  if (!match || !SHARE_TOKEN_REGEX.test(match[1])) return null;

  return match[1];
}

/**
 * Ownership check: mirrors the lookup patterns of
 * src/app/api/public/document/route.ts (normalized app_documents table first,
 * then the legacy app_state blob), but scoped to the authenticated user.
 */
async function userOwnsSharedDocument(userId: string, shareId: string): Promise<boolean> {
  const normalized = await dbQuery<{ document_id: string }>(
    'SELECT document_id FROM app_documents WHERE share_token = $1 AND user_id = $2 LIMIT 1',
    [shareId, userId]
  );
  if (normalized.rows.length > 0) return true;

  const legacy = await dbQuery<{ user_id: string }>(
    `
      SELECT user_id
      FROM app_state,
      LATERAL jsonb_array_elements(documents_json) AS doc
      WHERE doc->>'share_token' = $1 AND user_id = $2
      LIMIT 1
    `,
    [shareId, userId]
  );
  return legacy.rows.length > 0;
}

/**
 * Checks that the recipient is one of the authenticated user's subcontractors
 * (normalized app_subcontractors table first, then the legacy app_state blob).
 */
async function userHasSubcontractorEmail(userId: string, email: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  const normalized = await dbQuery<{ subcontractor_id: string }>(
    `SELECT subcontractor_id FROM app_subcontractors
     WHERE user_id = $1 AND lower(subcontractor_json->>'email') = $2
     LIMIT 1`,
    [userId, normalizedEmail]
  );
  if (normalized.rows.length > 0) return true;

  const legacy = await dbQuery<{ user_id: string }>(
    `
      SELECT user_id
      FROM app_state,
      LATERAL jsonb_array_elements(subcontractors_json) AS sub
      WHERE user_id = $1 AND lower(sub->>'email') = $2
      LIMIT 1
    `,
    [userId, normalizedEmail]
  );
  return legacy.rows.length > 0;
}

const DIMENSIONS_REGEX = /(\d+(?:\.\d+)?)\s*(?:x|by|\*)\s*(\d+(?:\.\d+)?)/i;

type DimensionUnit = 'in' | 'ft' | 'yd';

const DOOR_WIDTHS_IN = [22, 24, 26, 28, 30, 32, 34, 36];
const DOOR_HEIGHTS_IN = [80, 84];

const findClosest = (value: number, options: number[]) =>
  options.reduce((prev, curr) => (Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev), options[0]);

const normalizeDoorSize = (widthIn: number, heightIn: number) => {
  const normalizedWidth = findClosest(widthIn, DOOR_WIDTHS_IN);
  const normalizedHeight = findClosest(heightIn, DOOR_HEIGHTS_IN);
  return {
    width: normalizedWidth,
    height: normalizedHeight,
    changed: normalizedWidth !== Math.round(widthIn) || normalizedHeight !== Math.round(heightIn),
  };
};

const toInches = (value: number, unit: DimensionUnit) => {
  if (unit === 'in') return value;
  if (unit === 'ft') return value * 12;
  return value * 36;
};

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
  const isDoor = /(door|puerta)/i.test(desc);
  const isWindow = /(window|ventana)/i.test(desc);
  const isFlooringJob = /(floor|flooring|lvp|vinyl|laminate|tile|piso|suelo|carpet|alfombra)/i.test(desc);

  let unit: DimensionUnit = 'ft';
  if (mentionsYards) {
    unit = 'yd';
  } else if (mentionsFeet) {
    unit = 'ft';
  } else if (mentionsInches || isDoor || isWindow) {
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

  return { width, length, squareFeet: Math.round(squareFeet * 100) / 100, unit, isDoor, isWindow };
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
    const doorSizeLabel = parsedArea?.isDoor
      ? (() => {
          const widthIn = toInches(parsedArea.width, parsedArea.unit);
          const heightIn = toInches(parsedArea.length, parsedArea.unit);
          const standard = normalizeDoorSize(widthIn, heightIn);
          return ` (${standard.width} in x ${standard.height} in)`;
        })()
      : '';
    materialLineItems.push(
      { description: `Pre-hung interior door unit${doorSizeLabel}`, quantity: 1, price: 179 },
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

  const scopeSummary = (() => {
    if (!parsedArea) {
      return `Scope summary: ${input.projectDescription}.`;
    }

    if (parsedArea.isDoor) {
      const widthIn = toInches(parsedArea.width, parsedArea.unit);
      const heightIn = toInches(parsedArea.length, parsedArea.unit);
      const standard = normalizeDoorSize(widthIn, heightIn);
      const measuredText = `${Math.round(widthIn)} in x ${Math.round(heightIn)} in`;
      return standard.changed
        ? `Scope summary: ${input.projectDescription}. Door size provided: ${measuredText}. Standard size used: ${standard.width} in x ${standard.height} in.`
        : `Scope summary: ${input.projectDescription}. Door size: ${measuredText}.`;
    }

    const areaSummary = `Estimated area interpreted as ${parsedArea.width} ${parsedArea.unit} x ${parsedArea.length} ${parsedArea.unit} = ${parsedArea.squareFeet} sq ft.`;
    return `Scope summary: ${input.projectDescription}. ${areaSummary}`;
  })();

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
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: NOT_AUTHENTICATED_ERROR };
  }
  if (isRateLimited(aiRequests, user.id, AI_MAX_REQUESTS)) {
    return { success: false, error: RATE_LIMIT_ERROR };
  }

  try {
    const output = await getAIPoweredEstimateSuggestions(input);
    return { success: true, data: output, source: 'ai' as const };
  } catch (error) {
    console.error(error);
    const fallback = getOfflineSuggestions(input);
    return { success: true, data: fallback, source: 'offline' as const };
  }
}

export async function getWorkOrder(input: WorkOrderInput) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: NOT_AUTHENTICATED_ERROR };
  }
  if (isRateLimited(aiRequests, user.id, AI_MAX_REQUESTS)) {
    return { success: false, error: RATE_LIMIT_ERROR };
  }

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
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: NOT_AUTHENTICATED_ERROR };
  }
  if (isRateLimited(emailRequests, user.id, EMAIL_MAX_REQUESTS)) {
    return { success: false, error: RATE_LIMIT_ERROR };
  }

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
      console.error('[Email] Invalid client email address provided');
      return { success: false, error: 'Invalid client email address.' };
    }

    // Ownership check: the link must point at our own /public/<shareId> page
    // and the shared document must belong to the authenticated user.
    const shareId = extractShareIdFromDocumentUrl(documentUrl);
    if (!shareId) {
      return { success: false, error: 'Document not found.' };
    }
    const ownsDocument = await userOwnsSharedDocument(user.id, shareId);
    if (!ownsDocument) {
      return { success: false, error: 'Document not found.' };
    }

    // Rebuild the link server-side from the validated shareId so the email can
    // never carry a client-chosen origin (anti-phishing). Prefer the canonical
    // app origin; fall back to the origin the caller used (already restricted
    // to a well-formed /public/<shareId> URL by the extraction above).
    let linkOrigin = new URL(documentUrl).origin;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      try {
        linkOrigin = new URL(appUrl).origin;
      } catch {
        // Misconfigured NEXT_PUBLIC_APP_URL: keep the caller's origin.
      }
    }
    const safeDocumentUrl = `${linkOrigin}/public/${shareId}`;

    // Only allow http(s) scheduling links in outgoing mail.
    let safeSchedulingUrl: string | undefined;
    if (schedulingUrl) {
      try {
        const parsedScheduling = new URL(schedulingUrl);
        if (parsedScheduling.protocol === 'https:' || parsedScheduling.protocol === 'http:') {
          safeSchedulingUrl = parsedScheduling.toString();
        }
      } catch {
        safeSchedulingUrl = undefined;
      }
    }

    const resend = new Resend(resendApiKey);

    const emailHtml = render(
      <DocumentEmail
        documentUrl={safeDocumentUrl}
        documentType={documentType}
        documentNumber={documentNumber}
        companyName={companyName}
        schedulingUrl={safeSchedulingUrl}
      />
    );

    const emailText = [
      `${documentType} ${documentNumber} from ${companyName}`,
      '',
      `You have received a new ${documentType.toLowerCase()} from ${companyName}.`,
      `View ${documentType.toLowerCase()}: ${safeDocumentUrl}`,
      '',
      ...(safeSchedulingUrl ? [`Schedule: ${safeSchedulingUrl}`] : []),
      `If you have any questions, reply to ${replyTo}.`,
    ].join('\n');

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
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: NOT_AUTHENTICATED_ERROR };
  }
  if (isRateLimited(emailRequests, user.id, EMAIL_MAX_REQUESTS)) {
    return { success: false, error: RATE_LIMIT_ERROR };
  }

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

    // Recipient must be one of the authenticated user's subcontractors.
    const isKnownSubcontractor = await userHasSubcontractorEmail(user.id, to);
    if (!isKnownSubcontractor) {
      return { success: false, error: 'Subcontractor not found.' };
    }

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

    return { success: true, data };
  } catch (error) {
    console.error('[WorkOrderEmail] Exception:', error);
    return { success: false, error: 'Failed to send work order email.' };
  }
}
