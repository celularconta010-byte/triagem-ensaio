-- Criar tabela de participantes
CREATE TABLE IF NOT EXISTS public.attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ministry TEXT NOT NULL,
  role TEXT NOT NULL,
  instrument TEXT NOT NULL,
  level TEXT NOT NULL,
  city TEXT NOT NULL,
  timestamp BIGINT NOT NULL
);

-- Criar tabela de metadados do evento
CREATE TABLE IF NOT EXISTS public.event_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "eventTitle" TEXT,
  local TEXT,
  date TEXT,
  anciao TEXT,
  regionais TEXT,
  palavra TEXT,
  hinos TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar acesso público (opcional, dependendo da sua política de RLS)
ALTER TABLE public.attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_metadata ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes se houver, para evitar erro de duplicidade
DROP POLICY IF EXISTS "Allow all for anon" ON public.attendees;
DROP POLICY IF EXISTS "Allow all for anon" ON public.event_metadata;

-- Criar políticas permitindo tudo para usuários anônimos (ou usando a anon key)
CREATE POLICY "Allow all for anon" ON public.attendees FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON public.event_metadata FOR ALL TO anon USING (true) WITH CHECK (true);
