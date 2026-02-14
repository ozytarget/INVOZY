CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  estimate_number VARCHAR(50) NOT NULL UNIQUE,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_address TEXT,
  project_title VARCHAR(255) NOT NULL,
  project_description TEXT,
  amount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  issued_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'Draft',
  notes TEXT,
  terms TEXT,
  tax_id VARCHAR(100),
  signature TEXT,
  is_signed BOOLEAN DEFAULT false,
  project_photos JSONB DEFAULT '[]'::jsonb,
  company_name VARCHAR(255),
  company_address TEXT,
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  company_logo TEXT,
  company_website VARCHAR(255),
  contractor_name VARCHAR(255),
  scheduling_url VARCHAR(255),
  search_field TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_estimates_user_id ON estimates(user_id);
CREATE INDEX IF NOT EXISTS idx_estimates_client_email ON estimates(client_email);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  invoice_number VARCHAR(50) NOT NULL UNIQUE,
  estimate_id UUID REFERENCES estimates(id),
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_phone VARCHAR(20),
  client_address TEXT,
  project_title VARCHAR(255) NOT NULL,
  project_description TEXT,
  amount DECIMAL(10, 2) DEFAULT 0,
  tax_rate DECIMAL(5, 2) DEFAULT 0,
  issued_date TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'Draft',
  notes TEXT,
  terms TEXT,
  tax_id VARCHAR(100),
  signature TEXT,
  is_signed BOOLEAN DEFAULT false,
  project_photos JSONB DEFAULT '[]'::jsonb,
  company_name VARCHAR(255),
  company_address TEXT,
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  company_logo TEXT,
  company_website VARCHAR(255),
  contractor_name VARCHAR(255),
  scheduling_url VARCHAR(255),
  search_field TEXT,
  line_items JSONB DEFAULT '[]'::jsonb,
  share_token UUID UNIQUE DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client_email ON invoices(client_email);
CREATE INDEX IF NOT EXISTS idx_invoices_estimate_id ON invoices(estimate_id);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  total_billed DECIMAL(10, 2) DEFAULT 0,
  document_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_date TIMESTAMPTZ DEFAULT now(),
  payment_method VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
