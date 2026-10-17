-- =====================================================================
-- SALA DE METAS CREW — banco de dados
-- Cole TUDO no SQL Editor do Supabase e clique RUN.
-- Pode rodar de novo sem problema (não duplica nada).
-- =====================================================================

-- ---------- Remove o antigo "código da gerência" (caso uma versão anterior tenha sido rodada) ----------
drop trigger if exists checar_convite on auth.users;
drop function if exists public.checar_convite();
drop table if exists public.config_privada;

-- ---------- Salas de farm (membros) ----------
create table if not exists public.members (
  id         uuid primary key default gen_random_uuid(),
  game_id    text not null,
  name       text not null,
  cargo      text not null check (cargo in ('gerencia','soldado','membro','morador')),
  status     text not null default 'paga'
             check (status in ('paga','adiantada','atrasada','off','atrasada_mais')),
  meta       text not null default '',
  notes      text not null default '',
  created_at timestamptz not null default now()
);

-- ---------- Uma linha por semana de cada membro ----------
create table if not exists public.weeks (
  member_id  uuid not null references public.members on delete cascade,
  week_start date not null,          -- segunda-feira da semana
  status     text not null default 'pendente'
             check (status in ('pendente','entregue','nao_entregue')),
  note       text not null default '',
  updated_at timestamptz not null default now(),
  primary key (member_id, week_start)
);

-- ---------- Imagens anexadas ----------
create table if not exists public.images (
  id         uuid primary key default gen_random_uuid(),
  member_id  uuid not null references public.members on delete cascade,
  week_start date not null,
  path       text not null,
  created_at timestamptz not null default now()
);
create index if not exists images_member_idx on public.images (member_id);

-- ---------- Permissões: quem está logado pode fazer tudo; sem login, nada ----------
alter table public.members enable row level security;
alter table public.weeks   enable row level security;
alter table public.images  enable row level security;

drop policy if exists "logado acesso total" on public.members;
drop policy if exists "logado acesso total" on public.weeks;
drop policy if exists "logado acesso total" on public.images;
create policy "logado acesso total" on public.members for all to authenticated using (true) with check (true);
create policy "logado acesso total" on public.weeks   for all to authenticated using (true) with check (true);
create policy "logado acesso total" on public.images  for all to authenticated using (true) with check (true);

-- ---------- Armazenamento das imagens (pasta privada, máx 5 MB por imagem) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('metas', 'metas', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "metas: logado ve"     on storage.objects;
drop policy if exists "metas: logado envia"  on storage.objects;
drop policy if exists "metas: logado apaga"  on storage.objects;
create policy "metas: logado ve"    on storage.objects for select to authenticated using (bucket_id = 'metas');
create policy "metas: logado envia" on storage.objects for insert to authenticated with check (bucket_id = 'metas');
create policy "metas: logado apaga" on storage.objects for delete to authenticated using (bucket_id = 'metas');

-- ---------- Moradores iniciais (todos com meta paga; só entra se o banco estiver vazio) ----------
insert into public.members (game_id, name, cargo, status)
select * from (values
  ('54528', 'Style',           'morador', 'paga'),
  ('48232', 'Victor Oliveira', 'morador', 'paga'),
  ('31616', 'Golda',           'morador', 'paga'),
  ('55738', 'LV',              'morador', 'paga'),
  ('25597', 'Paraíba',         'morador', 'paga'),
  ('9432',  'Pablo',           'morador', 'paga'),
  ('32586', 'Júlio',           'morador', 'paga'),
  ('48731', 'Rafa',            'morador', 'paga'),
  ('40579', 'Lara',            'morador', 'paga'),
  ('26477', 'Biel',            'morador', 'paga'),
  ('49039', 'Diego',           'morador', 'paga'),
  ('58892', 'Jade',            'morador', 'paga'),
  ('58893', 'Bernardo',        'morador', 'paga'),
  ('28550', 'Pichote',         'morador', 'paga'),
  ('53134', 'Jalambe',         'morador', 'paga'),
  ('17635', 'Maxi',            'morador', 'paga'),
  ('49310', 'Tiagueira',       'morador', 'paga'),
  ('57858', 'Mac',             'morador', 'paga'),
  ('57',    'Dani',            'morador', 'paga'),
  ('25329', 'Neclass',         'morador', 'paga'),
  ('54736', 'Marcin',          'morador', 'paga'),
  ('59724', 'João',            'morador', 'paga'),
  ('59596', 'Davi',            'morador', 'paga'),
  ('55559', 'HEITTS',          'morador', 'paga'),
  ('27278', 'Dinho',           'morador', 'paga'),
  ('36723', 'Ice',             'morador', 'paga'),
  ('59668', 'Hudson',          'morador', 'paga'),
  ('59584', 'Matheus',         'morador', 'paga'),
  ('59975', 'Skank',           'morador', 'paga'),
  ('47632', 'Drey',            'morador', 'paga'),
  ('59982', 'Mauro',           'morador', 'paga'),
  ('59939', 'Gamibé',          'morador', 'paga'),
  ('19839', 'Psico',           'morador', 'paga'),
  ('57062', 'HRZ',             'morador', 'paga'),
  ('17231', 'Índio',           'morador', 'paga'),
  ('60176', 'Costela',         'morador', 'paga'),
  ('12963', 'Mandela',         'morador', 'paga'),
  ('60330', 'Ajás',            'morador', 'paga'),
  ('58868', 'Rick XT',         'morador', 'paga')
) v (game_id, name, cargo, status)
where not exists (select 1 from public.members);

