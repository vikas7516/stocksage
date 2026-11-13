-- Run this in your Supabase SQL Editor (project → SQL Editor → New Query)

-- 1. User profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    preferred_market TEXT DEFAULT 'NSE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. NSE ticker mapping table
CREATE TABLE IF NOT EXISTS public.ticker_map (
    id SERIAL PRIMARY KEY,
    company_name TEXT NOT NULL,
    ticker_symbol TEXT NOT NULL UNIQUE,
    yfinance_symbol TEXT NOT NULL,
    exchange TEXT DEFAULT 'NSE',
    sector TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast text search
CREATE INDEX IF NOT EXISTS idx_ticker_map_name ON public.ticker_map USING GIN (to_tsvector('english', company_name));
CREATE INDEX IF NOT EXISTS idx_ticker_map_symbol ON public.ticker_map (ticker_symbol);

-- 3. Research tasks
CREATE TABLE IF NOT EXISTS public.research_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker_symbol TEXT NOT NULL,
    yfinance_symbol TEXT NOT NULL,
    market TEXT DEFAULT 'NSE',
    requested_period TEXT DEFAULT '3mo',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Agent results (one row per agent per task)
CREATE TABLE IF NOT EXISTS public.agent_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.research_tasks(id) ON DELETE CASCADE,
    agent_name TEXT NOT NULL CHECK (agent_name IN ('fundamental', 'technical', 'news', 'risk', 'supervisor')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
    output_json JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Research reports
CREATE TABLE IF NOT EXISTS public.research_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL UNIQUE REFERENCES public.research_tasks(id) ON DELETE CASCADE,
    report_content TEXT,
    summary TEXT,
    recommendation TEXT CHECK (recommendation IN ('BUY', 'HOLD', 'SELL', 'NEUTRAL')),
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    limitations TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Source documents
CREATE TABLE IF NOT EXISTS public.source_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.research_tasks(id) ON DELETE CASCADE,
    agent_name TEXT,
    source_type TEXT,
    title TEXT,
    source_url TEXT,
    published_at TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ DEFAULT NOW(),
    content_hash TEXT
);

-- 7. Saved stocks (watchlist)
CREATE TABLE IF NOT EXISTS public.saved_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    ticker_symbol TEXT NOT NULL,
    company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, ticker_symbol)
);

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- Users can only see their own data
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.source_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_stocks ENABLE ROW LEVEL SECURITY;

-- ticker_map is public read (anyone can search stocks)
ALTER TABLE public.ticker_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ticker_map_public_read" ON public.ticker_map FOR SELECT USING (TRUE);

-- Profiles: users see only their own
CREATE POLICY "profiles_own" ON public.profiles FOR ALL USING (auth.uid() = id);

-- Research tasks: users see only their own
CREATE POLICY "tasks_own" ON public.research_tasks FOR ALL USING (auth.uid() = user_id);

-- Agent results: users see results for their tasks
CREATE POLICY "agent_results_own" ON public.agent_results FOR SELECT
    USING (task_id IN (SELECT id FROM public.research_tasks WHERE user_id = auth.uid()));

-- Reports: same
CREATE POLICY "reports_own" ON public.research_reports FOR SELECT
    USING (task_id IN (SELECT id FROM public.research_tasks WHERE user_id = auth.uid()));

-- Sources: same
CREATE POLICY "sources_own" ON public.source_documents FOR SELECT
    USING (task_id IN (SELECT id FROM public.research_tasks WHERE user_id = auth.uid()));

-- Saved stocks: users manage their own
CREATE POLICY "saved_stocks_own" ON public.saved_stocks FOR ALL USING (auth.uid() = user_id);
