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
             check (status in ('paga','adiantada','atrasada','off','atrasada_mais','isenta')),
  meta       text not null default '',
  notes      text not null default '',
  created_at timestamptz not null default now()
);

-- Atualiza bancos criados com versões anteriores (nova situação "isenta")
alter table public.members drop constraint if exists members_status_check;
alter table public.members add constraint members_status_check
  check (status in ('paga','adiantada','atrasada','off','atrasada_mais','isenta'));

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

-- ---------- Correções (antes do cadastro, para não duplicar) ----------
-- ID da Jade é 5892 (estava 58892)
update public.members set game_id = '5892' where game_id = '58892' and name = 'Jade';

-- ---------- Cadastro inicial: moradores, membros e soldados ----------
-- Só cria quem ainda não existe (compara pelo ID). Quem já existe não é alterado.
insert into public.members (game_id, name, cargo, status)
select v.game_id, v.name, v.cargo, v.status from (values
  ('54528',  'Style',            'morador',  'paga'),
  ('31616',  'Golda',            'morador',  'paga'),
  ('48731',  'Rafa',             'morador',  'paga'),
  ('5892',   'Jade',             'morador',  'paga'),
  ('12963',  'Mandela',          'morador',  'paga'),
  ('48232',  'Victor Oliveira',  'morador',  'atrasada'),
  ('55738',  'LV',               'morador',  'atrasada'),
  ('40579',  'Lara',             'morador',  'atrasada'),
  ('25597',  'Paraíba',          'morador',  'isenta'),
  ('9432',   'Pablo',            'morador',  'isenta'),
  ('32586',  'Júlio',            'morador',  'isenta'),
  ('26477',  'Biel',             'morador',  'isenta'),
  ('49039',  'Diego',            'morador',  'isenta'),
  ('58893',  'Bernardo',         'morador',  'isenta'),
  ('28550',  'Pichote',          'morador',  'isenta'),
  ('53134',  'Jalambe',          'morador',  'isenta'),
  ('17635',  'Maxi',             'morador',  'isenta'),
  ('49310',  'Tiagueira',        'morador',  'isenta'),
  ('57858',  'Mac',              'morador',  'isenta'),
  ('57',     'Dani',             'morador',  'isenta'),
  ('25329',  'Neclass',          'morador',  'isenta'),
  ('54736',  'Marcin',           'morador',  'isenta'),
  ('59724',  'João',             'morador',  'isenta'),
  ('59596',  'Davi',             'morador',  'isenta'),
  ('55559',  'HEITTS',           'morador',  'isenta'),
  ('27278',  'Dinho',            'morador',  'isenta'),
  ('36723',  'Ice',              'morador',  'isenta'),
  ('59668',  'Hudson',           'morador',  'isenta'),
  ('59584',  'Matheus',          'morador',  'isenta'),
  ('59975',  'Skank',            'morador',  'isenta'),
  ('47632',  'Drey',             'morador',  'isenta'),
  ('59982',  'Mauro',            'morador',  'isenta'),
  ('59939',  'Gamibé',           'morador',  'isenta'),
  ('19839',  'Psico',            'morador',  'isenta'),
  ('57062',  'HRZ',              'morador',  'isenta'),
  ('17231',  'Índio',            'morador',  'isenta'),
  ('60176',  'Costela',          'morador',  'isenta'),
  ('60330',  'Ajás',             'morador',  'isenta'),
  ('58868',  'Rick XT',          'morador',  'isenta'),
  ('11350',  'Leozinho',         'membro',   'paga'),
  ('57865',  'Jonatas',          'membro',   'paga'),
  ('57627',  'Alec',             'membro',   'paga'),
  ('55987',  'Michael Jackson',  'membro',   'paga'),
  ('55913',  'Senna',            'membro',   'paga'),
  ('23960',  'Alves',            'membro',   'paga'),
  ('57755',  'Alves',            'membro',   'paga'),
  ('29705',  'Teixeira',         'membro',   'paga'),
  ('656',    'THS',              'membro',   'paga'),
  ('55934',  'Blood',            'membro',   'atrasada'),
  ('51617',  'Benjamin',         'membro',   'atrasada'),
  ('58259',  'Levi',             'membro',   'atrasada'),
  ('27331',  'Zarate',           'membro',   'off'),
  ('47408',  'Pé de Pato',       'membro',   'off'),
  ('14040',  'Gemini',           'soldado',  'paga'),
  ('570',    'Silas',            'soldado',  'paga'),
  ('27992',  'BG',               'soldado',  'paga'),
  ('15054',  'Duda',             'soldado',  'paga'),
  ('15645',  'Hanabi',           'soldado',  'paga'),
  ('577',    'Strong',           'soldado',  'paga'),
  ('43303',  'Maicon',           'soldado',  'paga'),
  ('30240',  'Boca',             'soldado',  'atrasada'),
  ('9695',   'Vitor',            'soldado',  'atrasada'),
  ('49620',  'Dedé',             'soldado',  'atrasada'),
  ('54073',  'Rian',             'soldado',  'atrasada'),
  ('576',    'Marcelo',          'soldado',  'atrasada'),
  ('15939',  'JNE',              'soldado',  'off')
) v (game_id, name, cargo, status)
where not exists (select 1 from public.members m where m.game_id = v.game_id);
