
'use server';

import { getAIPoweredEstimateSuggestions, AIPoweredEstimateSuggestionsInput } from "@/ai/flows/ai-powered-estimate-suggestions";
import { generateWorkOrder, WorkOrderInput } from "@/ai/flows/generate-work-order";
import { Resend } from 'resend';
import DocumentEmail from '@/components/emails/document-email';
import { render } from '@react-email/components';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function getSuggestions(input: AIPoweredEstimateSuggestionsInput) {
  try {
    const output = await getAIPoweredEstimateSuggestions(input);
    return { success: true, data: output };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Failed to get AI suggestions.' };
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
    const emailHtml = render(
      <DocumentEmail
        documentUrl={documentUrl}
        documentType={documentType}
        documentNumber={documentNumber}
        companyName={companyName}
      />
    );

    const { data, error } = await resend.emails.send({
      from: `invozzy <onboarding@resend.dev>`,
      to: [to],
      subject: `${documentType} ${documentNumber} from ${companyName}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Email sending error:', error);
    return { success: false, error: 'Failed to send email.' };
  }
}
