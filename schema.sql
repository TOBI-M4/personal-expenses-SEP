-- ==============================================================================
-- Supabase PostgreSQL Schema for Expense Tracker App (Table-Based Authentication)
-- ==============================================================================
-- Description:
--   Complete database schema tailored for Supabase backend with:
--   - Custom `public.users` table for credentials storage & SHA-256 password hashes
--   - `public.user_settings` table for monthly budgets, themes, currency preferences
--   - `public.categories` table for 9 system defaults + user custom categories
--   - `public.expenses` table for multi-tenant transactions linked to `public.users(id)`
--   - Permissive Row Level Security (RLS) policies for anon key client operations
--   - Automatic timestamp triggers (updated_at)
--   - High-performance query indexes for fast dashboard queries and date/category filtering
--   - Default seed data matching frontend categories and colors
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Utility Trigger Function: Automatic `updated_at` Timestamp
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. Table: `public.users` (Custom Credential & Profile Storage)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    name VARCHAR(100) DEFAULT '',
    avatar_url TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Case-insensitive unique index on email
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON public.users (LOWER(email));

-- Trigger for users updated_at
DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS for users with open policy for anon client
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;
CREATE POLICY "Allow all operations on users"
    ON public.users
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 4. Table: `public.user_settings` (Profile & Preferences)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY,
    monthly_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_budget >= 0),
    theme VARCHAR(20) NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    currency VARCHAR(10) NOT NULL DEFAULT 'Rs.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely set foreign key constraint to public.users(id)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_settings_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_settings DROP CONSTRAINT user_settings_user_id_fkey;
    END IF;
    ALTER TABLE public.user_settings 
        ADD CONSTRAINT user_settings_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Trigger for user_settings updated_at
DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS for user_settings with open policy
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on user_settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can view their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can insert their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can update their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Users can delete their own settings" ON public.user_settings;

CREATE POLICY "Allow all operations on user_settings"
    ON public.user_settings
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 5. Table: `public.categories` (System Defaults & Custom User Categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#6b7280',
    icon VARCHAR(50) DEFAULT 'Tag',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely set foreign key constraint to public.users(id)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'categories_user_id_fkey'
    ) THEN
        ALTER TABLE public.categories DROP CONSTRAINT categories_user_id_fkey;
    END IF;
    ALTER TABLE public.categories 
        ADD CONSTRAINT categories_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Prevent duplicate category names for the same user or system default
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_unique 
    ON public.categories (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name));

-- Enable RLS for categories with open policy
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view system and their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert their own custom categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own custom categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own custom categories" ON public.categories;

CREATE POLICY "Allow all operations on categories"
    ON public.categories
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 6. Table: `public.expenses` (Core Transaction Data)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    category VARCHAR(50) NOT NULL,
    category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    description VARCHAR(100) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash' 
        CHECK (payment_method IN ('Cash', 'Card', 'Bank Transfer', 'Digital Wallet', 'Other')),
    note VARCHAR(255) DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Safely set foreign key constraint to public.users(id)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'expenses_user_id_fkey'
    ) THEN
        ALTER TABLE public.expenses DROP CONSTRAINT expenses_user_id_fkey;
    END IF;
    ALTER TABLE public.expenses 
        ADD CONSTRAINT expenses_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Trigger for expenses updated_at
DROP TRIGGER IF EXISTS trg_expenses_updated_at ON public.expenses;
CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS for expenses with open policy
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can view their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can insert their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can update their own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can delete their own expenses" ON public.expenses;

CREATE POLICY "Allow all operations on expenses"
    ON public.expenses
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- ==============================================================================
-- 7. High-Performance Query Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON public.expenses(user_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- ==============================================================================
-- 8. Seed Data: Default Categories Matching Frontend
-- ==============================================================================
INSERT INTO public.categories (user_id, name, color, icon, is_default)
VALUES
    (NULL, 'Food', '#f97316', 'Utensils', TRUE),
    (NULL, 'Transportation', '#3b82f6', 'Bus', TRUE),
    (NULL, 'Housing', '#8b5cf6', 'Home', TRUE),
    (NULL, 'Utilities', '#06b6d4', 'Zap', TRUE),
    (NULL, 'Entertainment', '#ec4899', 'Film', TRUE),
    (NULL, 'Health', '#ef4444', 'HeartPulse', TRUE),
    (NULL, 'Education', '#14b8a6', 'GraduationCap', TRUE),
    (NULL, 'Shopping', '#eab308', 'ShoppingBag', TRUE),
    (NULL, 'Other', '#6b7280', 'MoreHorizontal', TRUE)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 9. Analytical / Summary Views
-- ==============================================================================

-- View: Monthly Spending Summary per User
CREATE OR REPLACE VIEW public.v_monthly_spending AS
SELECT 
    user_id,
    TO_CHAR(date, 'YYYY-MM') AS month,
    COUNT(id) AS total_transactions,
    SUM(amount) AS total_spent,
    AVG(amount) AS avg_per_transaction
FROM public.expenses
GROUP BY user_id, TO_CHAR(date, 'YYYY-MM');

-- View: Category Spending Breakdown per User
CREATE OR REPLACE VIEW public.v_category_spending AS
SELECT 
    user_id,
    category,
    TO_CHAR(date, 'YYYY-MM') AS month,
    COUNT(id) AS transaction_count,
    SUM(amount) AS total_spent
FROM public.expenses
GROUP BY user_id, category, TO_CHAR(date, 'YYYY-MM');
