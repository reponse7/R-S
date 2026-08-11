-- Run this in the Supabase SQL Editor for RS Inventory

-- Wipe old tables if they exist
DROP TABLE IF EXISTS auth_users;
DROP TABLE IF EXISTS transaction_logs;
DROP TABLE IF EXISTS purchase_orders;
DROP TABLE IF EXISTS client_orders;
DROP TABLE IF EXISTS supplier_profiles;
DROP TABLE IF EXISTS client_profiles;
DROP TABLE IF EXISTS stock_items;

CREATE TABLE auth_users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    pin VARCHAR(4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE stock_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    attributes JSONB DEFAULT '{}'::jsonb,
    quantity NUMERIC DEFAULT 0,
    unit TEXT,
    reorder_point NUMERIC DEFAULT 0,
    safety_stock NUMERIC DEFAULT 0,
    supplier_id UUID,
    unit_cost NUMERIC DEFAULT 0,
    unit_cost_currency TEXT DEFAULT 'RWF',
    location TEXT,
    batch_ref TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    raw_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE client_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    company_name TEXT NOT NULL,
    tin TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    region TEXT,
    payment_terms TEXT,
    credit_limit NUMERIC DEFAULT 0,
    credit_currency TEXT DEFAULT 'RWF',
    notes TEXT,
    raw_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE supplier_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    categories JSONB DEFAULT '[]'::jsonb,
    payment_terms TEXT,
    contact_info TEXT,
    address TEXT,
    lead_time_days INTEGER DEFAULT 0,
    preferred_currency TEXT DEFAULT 'RWF',
    raw_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE client_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    client_id UUID REFERENCES client_profiles(id),
    order_reference TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    quantity NUMERIC DEFAULT 0,
    delivery_date DATE,
    status TEXT DEFAULT 'Pending',
    total_value NUMERIC DEFAULT 0,
    total_value_currency TEXT DEFAULT 'RWF',
    raw_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE purchase_orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supplier_id UUID REFERENCES supplier_profiles(id),
    material_name TEXT NOT NULL,
    quantity NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    specifications JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'In Production',
    order_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    target_date TIMESTAMP WITH TIME ZONE,
    port_location TEXT,
    raw_metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE transaction_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    type TEXT NOT NULL,
    item_id UUID REFERENCES stock_items(id),
    quantity NUMERIC NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    purpose TEXT,
    client_id UUID REFERENCES client_profiles(id),
    client_name_override TEXT,
    raw_metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS (Row Level Security) and set to true, but we'll allow all for this MVP
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to auth_users" ON auth_users FOR ALL USING (true);
CREATE POLICY "Allow all access to stock_items" ON stock_items FOR ALL USING (true);
CREATE POLICY "Allow all access to client_profiles" ON client_profiles FOR ALL USING (true);
CREATE POLICY "Allow all access to supplier_profiles" ON supplier_profiles FOR ALL USING (true);
CREATE POLICY "Allow all access to client_orders" ON client_orders FOR ALL USING (true);
CREATE POLICY "Allow all access to purchase_orders" ON purchase_orders FOR ALL USING (true);
CREATE POLICY "Allow all access to transaction_logs" ON transaction_logs FOR ALL USING (true);
