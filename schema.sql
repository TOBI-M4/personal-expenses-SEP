-- ==============================================================================
-- Supabase PostgreSQL Schema for Expense Tracker App
-- ==============================================================================
-- Description:
--   Complete database schema tailored for Supabase backend with:
--   - User Settings / Profiles linked to auth.users
--   - Dynamic Categories (default system categories + custom user categories)
--   - Expenses table with all fields, validations, and constraints
--   - Row Level Security (RLS) policies for secure multi-tenant isolation
--   - Automatic timestamp triggers (updated_at)
--   - Automatic new user initialization trigger (auth.users -> user_settings)
--   - Optimized indexes for fast dashboard queries and date/category filtering
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
-- 3. Table: `public.user_settings` (Profile & Preferences)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    monthly_budget NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (monthly_budget >= 0),
    theme VARCHAR(20) NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'system')),
    currency VARCHAR(10) NOT NULL DEFAULT 'Rs.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for user_settings updated_at
CREATE TRIGGER trg_user_settings_updated_at
    BEFORE UPDATE ON public.user_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies for user_settings
CREATE POLICY "Users can view their own settings"
    ON public.user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.user_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
    ON public.user_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. Table: `public.categories` (System Defaults & Custom User Categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- NULL means system global category
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#6b7280',
    icon VARCHAR(50) DEFAULT 'Tag',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate category names for the same user or system default
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name_unique 
    ON public.categories (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), LOWER(name));

-- Enable RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Policies for categories
CREATE POLICY "Users can view system and their own categories"
    ON public.categories
    FOR SELECT
    USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can insert their own custom categories"
    ON public.categories
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own custom categories"
    ON public.categories
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own custom categories"
    ON public.categories
    FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. Table: `public.expenses` (Core Transaction Data)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
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

-- Trigger for expenses updated_at
CREATE TRIGGER trg_expenses_updated_at
    BEFORE UPDATE ON public.expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Enable RLS for expenses
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policies for expenses
CREATE POLICY "Users can view their own expenses"
    ON public.expenses
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
    ON public.expenses
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
    ON public.expenses
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
    ON public.expenses
    FOR DELETE
    USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. High-Performance Query Indexes
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON public.expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON public.expenses(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON public.expenses(user_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- ==============================================================================
-- 7. Auto-Create User Settings on Auth Sign-Up Trigger
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id, monthly_budget, theme, currency)
    VALUES (NEW.id, 0.00, 'light', 'Rs.')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

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
-- 9. Analytical / Summary Views (Helper Views for Supabase API)
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
