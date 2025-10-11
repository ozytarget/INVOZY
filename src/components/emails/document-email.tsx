import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface DocumentEmailProps {
  documentType?: 'Estimate' | 'Invoice';
  documentNumber?: string;
  companyName?: string;
  documentUrl?: string;
}

export const DocumentEmail = ({
  documentType = 'Invoice',
  documentNumber = 'INV-001',
  companyName = 'Your Company',
  documentUrl = 'http://localhost:9002',
}: DocumentEmailProps) => (
  <Html>
    <Head />
    <Preview>
      You have a new {documentType.toLowerCase()} from {companyName}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          New {documentType} from {companyName}
        </Heading>
        <Text style={text}>
          You have received a new {documentType.toLowerCase()} ({documentNumber}) from{' '}
          {companyName}.
        </Text>
        <Text style={text}>
          Please click the button below to view the document.
        </Text>
        <Button
          style={button}
          href={documentUrl}
        >
          View {documentType}
        </Button>
        <Text style={text}>
          If you have any questions, please reply to this email.
        </Text>
        <Text style={text}>Thank you,</Text>
        <Text style={text}>{companyName}</Text>
      </Container>
    </Body>
  </Html>
);

export default DocumentEmail;

const main = {
  backgroundColor: '#f6f9fc',
  padding: '10px 0',
  fontFamily: 'Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #f0f0f0',
  padding: '45px',
  borderRadius: '4px',
  margin: '0 auto',
  maxWidth: '600px',
};

const h1 = {
  color: '#1d1d1f',
  fontSize: '28px',
  fontWeight: 'bold',
  marginBottom: '30px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '16px',
};

const button = {
  backgroundColor: '#0070f3',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 20px',
  fontWeight: 'bold',
};
