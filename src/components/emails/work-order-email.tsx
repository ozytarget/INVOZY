import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
  Row,
  Column,
} from '@react-email/components';
import * as React from 'react';

interface WorkOrderEmailProps {
  subcontractorName?: string;
  projectTitle?: string;
  clientName?: string;
  clientAddress?: string;
  tasks?: string[];
  materials?: string[];
  tools?: string[];
  companyName?: string;
}

export const WorkOrderEmail = ({
  subcontractorName = 'Contractor',
  projectTitle = 'Project',
  clientName = '',
  clientAddress = '',
  tasks = [],
  materials = [],
  tools = [],
  companyName = 'Company',
}: WorkOrderEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {companyName} — Work Order: {projectTitle}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Text style={headerCompany}>{companyName}</Text>
          <Heading style={h1}>Work Order</Heading>
        </Section>

        <Text style={greeting}>
          Hi {subcontractorName},
        </Text>
        <Text style={text}>
          Please review the details below for the upcoming job. Contact us if you have any questions before starting.
        </Text>

        <Section style={infoBox}>
          <Row>
            <Column style={infoLabel}>Project</Column>
            <Column style={infoValue}>{projectTitle}</Column>
          </Row>
          <Row>
            <Column style={infoLabel}>Client</Column>
            <Column style={infoValue}>{clientName}</Column>
          </Row>
          {clientAddress && (
            <Row>
              <Column style={infoLabel}>Job Site</Column>
              <Column style={infoValue}>{clientAddress}</Column>
            </Row>
          )}
        </Section>

        {tasks.length > 0 && (
          <Section>
            <Heading as="h2" style={h2}>Scope of Work</Heading>
            {tasks.map((task, i) => (
              <Text key={i} style={listItem}>
                {i + 1}. {task}
              </Text>
            ))}
          </Section>
        )}

        {materials.length > 0 && (
          <Section>
            <Heading as="h2" style={h2}>Materials</Heading>
            <Text style={text}>{materials.join(' · ')}</Text>
          </Section>
        )}

        {tools.length > 0 && (
          <Section>
            <Heading as="h2" style={h2}>Tools Required</Heading>
            <Text style={text}>{tools.join(' · ')}</Text>
          </Section>
        )}

        <Hr style={hr} />

        <Text style={text}>
          If you have any questions about this work order, please reply to this email.
        </Text>
        <Text style={text}>
          Thank you,
        </Text>
        <Text style={signoff}>{companyName}</Text>

        <Hr style={hr} />
        <Text style={footer}>
          Sent via INVOZY on behalf of {companyName}.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default WorkOrderEmail;

const main = {
  backgroundColor: '#f6f9fc',
  padding: '10px 0',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #e8e8e8',
  padding: '40px 48px',
  borderRadius: '6px',
  margin: '0 auto',
  maxWidth: '600px',
};

const header = {
  marginBottom: '24px',
};

const headerCompany = {
  color: '#6b7280',
  fontSize: '14px',
  fontWeight: '600' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.5px',
  margin: '0 0 4px 0',
};

const h1 = {
  color: '#111827',
  fontSize: '26px',
  fontWeight: 'bold' as const,
  margin: '0',
  lineHeight: '32px',
};

const h2 = {
  color: '#111827',
  fontSize: '18px',
  fontWeight: '600' as const,
  marginTop: '28px',
  marginBottom: '12px',
  lineHeight: '24px',
};

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  marginBottom: '4px',
};

const text = {
  color: '#4b5563',
  fontSize: '15px',
  lineHeight: '24px',
  marginBottom: '12px',
};

const infoBox = {
  backgroundColor: '#f9fafb',
  border: '1px solid #e5e7eb',
  borderRadius: '6px',
  padding: '16px 20px',
  marginTop: '16px',
  marginBottom: '8px',
};

const infoLabel = {
  color: '#6b7280',
  fontSize: '13px',
  fontWeight: '600' as const,
  width: '80px',
  paddingTop: '6px',
  paddingBottom: '6px',
  verticalAlign: 'top' as const,
};

const infoValue = {
  color: '#111827',
  fontSize: '15px',
  paddingTop: '6px',
  paddingBottom: '6px',
  verticalAlign: 'top' as const,
};

const listItem = {
  color: '#374151',
  fontSize: '15px',
  lineHeight: '24px',
  marginBottom: '4px',
  paddingLeft: '4px',
};

const hr = {
  borderColor: '#e5e7eb',
  margin: '24px 0',
};

const signoff = {
  color: '#111827',
  fontSize: '15px',
  fontWeight: '600' as const,
  marginBottom: '0',
};

const footer = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '18px',
  marginBottom: '0',
};
