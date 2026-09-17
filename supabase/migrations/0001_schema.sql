-- ════════════════════════════════════════════════════════════════════
-- HW-Track · 0001_schema.sql
-- Tables, permanent HW-IDs, role/permission model, movement tracking,
-- immutable audit logging and reporting functions.
-- Run in Supabase → SQL Editor (in order: 0001, 0002, 0003, then seed.sql)
-- ════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ─── Enums ──────────────────────────────────────────────────────────
create type public.app_role as enum ('super_admin', 'admin', 'inventory_manager', 'staff', 'viewer');
create type public.component_status as enum ('available', 'in_use', 'damaged', 'repair', 'retired');
create type public.file_kind as enum ('image', 'invoice', 'datasheet', 'document');
create type public.movement_type as enum (
  'created', 'assigned', 'transferred', 'returned', 'relocated',
  'status_changed', 'edited', 'archived', 'restored'
);
create type public.project_status as enum ('active', 'on_hold', 'completed', 'cancelled');

-- ─── Generic helpers ────────────────────────────────────────────────
create or replace function public.prevent_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Table "%" is append-only; % is not allowed', tg_table_name, tg_op
    using errcode = '42501';
end;
$$;

-- ─── Users & permissions ────────────────────────────────────────────
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null unique,
  full_name   text,
  role        public.app_role not null default 'viewer',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
-- Exactly one Super Admin can exist.
create unique index profiles_single_super_admin on public.profiles (role) where role = 'super_admin';

create table public.permissions (
  key          text primary key,
  label        text not null,
  description  text not null,
  group_name   text not null,
  sort_order   int  not null default 0
);

create table public.role_permissions (
  role        public.app_role not null,
  permission  text not null references public.permissions (key) on delete cascade,
  primary key (role, permission)
);

create table public.user_permissions (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  permission  text not null references public.permissions (key) on delete cascade,
  granted     boolean not null,
  primary key (user_id, permission)
);

insert into public.permissions (key, label, description, group_name, sort_order) values
  ('inventory.view',    'View inventory',        'See components, dashboard, projects, providers, vendors and locations', 'Inventory', 10),
  ('inventory.create',  'Add components',        'Create new component records',                                          'Inventory', 20),
  ('inventory.edit',    'Edit components',       'Change component details',                                              'Inventory', 30),
  ('inventory.assign',  'Assign & transfer',     'Assign, transfer, return, relocate and change status',                  'Inventory', 40),
  ('inventory.archive', 'Archive components',    'Archive and restore components',                                        'Inventory', 50),
  ('inventory.import',  'Import data',           'Bulk import components from CSV or Excel',                              'Inventory', 60),
  ('inventory.export',  'Export data',           'Download inventory as CSV or Excel',                                    'Inventory', 70),
  ('files.upload',      'Upload files',          'Attach images, invoices, datasheets and documents',                     'Files',     80),
  ('files.delete',      'Delete files',          'Remove attached files',                                                 'Files',     90),
  ('masters.manage',    'Manage reference data', 'Create and edit projects, providers, vendors, locations and categories', 'Reference data', 100),
  ('reports.view',      'View reports',          'Open and export reports',                                               'Insights',  110),
  ('audit.view',        'View audit log',        'Read the immutable audit trail',                                        'Insights',  120),
  ('settings.manage',   'Manage organization',   'Change organization name, currency and alert settings',                 'Administration', 130);

insert into public.role_permissions (role, permission)
select 'admin'::public.app_role, key from public.permissions
union all
select 'inventory_manager', unnest(array[
  'inventory.view','inventory.create','inventory.edit','inventory.assign','inventory.archive',
  'inventory.import','inventory.export','files.upload','files.delete','masters.manage',
  'reports.view','audit.view'])
union all
select 'staff', unnest(array[
  'inventory.view','inventory.create','inventory.edit','inventory.assign',
  'inventory.export','files.upload','reports.view'])
union all
select 'viewer', unnest(array['inventory.view','reports.view']);

-- Permission checks. SECURITY DEFINER so they can be used inside RLS policies
-- without recursion; they only ever evaluate the *calling* user (auth.uid()).
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active);
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and is_active and role = 'super_admin');
$$;

create or replace function public.has_permission(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when pr.role = 'super_admin' then true
      when up.granted is not null then up.granted
      else exists (select 1 from role_permissions rp where rp.role = pr.role and rp.permission = p)
    end
    from profiles pr
    left join user_permissions up on up.user_id = pr.id and up.permission = p
    where pr.id = auth.uid() and pr.is_active
  ), false);
$$;

create or replace function public.get_my_permissions()
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(k.key order by k.sort_order), '{}')
  from permissions k
  where has_permission(k.key);
$$;

-- New auth users get a profile: role viewer, DISABLED until the Super Admin
-- enables them. Users created from the Administration page are enabled in the
-- same request, so this only affects accounts created any other way (for
-- example if public sign-ups were accidentally left on in Supabase Auth).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, is_active)
  values (new.id, new.email, coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)), false)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Organization settings (single row) ─────────────────────────────
create table public.app_settings (
  id                   int primary key default 1 check (id = 1),
  org_name             text not null default 'HW-Track',
  currency             text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  warranty_alert_days  int  not null default 30 check (warranty_alert_days between 1 and 365),
  updated_at           timestamptz not null default now(),
  updated_by           uuid
);
insert into public.app_settings default values;

-- ─── Reference data ─────────────────────────────────────────────────
create table public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid default auth.uid()
);
create unique index categories_name_key on public.categories (lower(name));

create table public.projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  code         text,
  description  text,
  status       public.project_status not null default 'active',
  lead_name    text,
  start_date   date,
  end_date     date,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid default auth.uid(),
  constraint projects_dates_chk check (end_date is null or start_date is null or end_date >= start_date)
);
create unique index projects_name_key on public.projects (lower(name));
create unique index projects_code_key on public.projects (lower(code)) where code is not null;

create table public.providers (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(btrim(name)) > 0),
  provider_type  text,
  contact_name   text,
  email          text,
  phone          text,
  notes          text,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid default auth.uid()
);
create unique index providers_name_key on public.providers (lower(name));

create table public.vendors (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) > 0),
  contact_name  text,
  email         text,
  phone         text,
  website       text,
  address       text,
  tax_id        text,
  notes         text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid default auth.uid()
);
create unique index vendors_name_key on public.vendors (lower(name));

create table public.locations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  building     text,
  room         text,
  description  text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid default auth.uid()
);
create unique index locations_name_key on public.locations (lower(name));

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger categories_touch before update on public.categories for each row execute function public.touch_updated_at();
create trigger projects_touch   before update on public.projects   for each row execute function public.touch_updated_at();
create trigger providers_touch  before update on public.providers  for each row execute function public.touch_updated_at();
create trigger vendors_touch    before update on public.vendors    for each row execute function public.touch_updated_at();
create trigger locations_touch  before update on public.locations  for each row execute function public.touch_updated_at();
create trigger profiles_touch   before update on public.profiles   for each row execute function public.touch_updated_at();

-- ─── Components ─────────────────────────────────────────────────────
create sequence public.hw_id_seq start 1 no cycle;

create table public.components (
  id               uuid primary key default gen_random_uuid(),
  hw_id            text not null unique,
  -- required
  name             text not null check (length(btrim(name)) > 0),
  category_id      uuid not null references public.categories (id) on delete restrict,
  quantity         integer not null default 1 check (quantity >= 0),
  provider_id      uuid not null references public.providers (id) on delete restrict,
  current_owner    text not null check (length(btrim(current_owner)) > 0),
  status           public.component_status not null default 'available',
  received_date    date not null default current_date,
  -- optional (all nullable)
  manufacturer     text,
  model            text,
  part_number      text,
  serial_number    text,
  vendor_id        uuid references public.vendors (id) on delete restrict,
  purchase_date    date,
  unit_cost        numeric(14, 2) check (unit_cost is null or unit_cost >= 0),
  invoice_number   text,
  warranty_expiry  date,
  current_holder   text,
  location_id      uuid references public.locations (id) on delete restrict,
  project_id       uuid references public.projects (id) on delete restrict,
  description      text,
  specifications   text,
  notes            text,
  -- lifecycle
  archived_at      timestamptz,
  archived_by      uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid default auth.uid(),
  updated_by       uuid
);

create index components_status_idx    on public.components (status) where archived_at is null;
create index components_category_idx  on public.components (category_id);
create index components_provider_idx  on public.components (provider_id);
create index components_vendor_idx    on public.components (vendor_id);
create index components_location_idx  on public.components (location_id);
create index components_project_idx   on public.components (project_id);
create index components_archived_idx  on public.components (archived_at);
create index components_serial_idx    on public.components (serial_number);
create index components_received_idx  on public.components (received_date);
create index components_warranty_idx  on public.components (warranty_expiry) where warranty_expiry is not null;

-- Permanent, human-readable IDs: HW-000001 … HW-999999, then HW-1000000 …
create or replace function public.components_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n bigint := nextval('public.hw_id_seq');
begin
  new.hw_id := 'HW-' || case when n < 1000000 then lpad(n::text, 6, '0') else n::text end;
  new.created_at := now();
  new.updated_at := now();
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  new.archived_at := null;
  new.archived_by := null;
  new.name := btrim(new.name);
  new.current_owner := btrim(new.current_owner);
  return new;
end;
$$;

create or replace function public.components_before_update()
returns trigger language plpgsql as $$
begin
  -- identity & provenance can never change
  new.id := old.id;
  new.hw_id := old.hw_id;
  new.created_at := old.created_at;
  new.created_by := old.created_by;
  new.updated_at := now();
  new.updated_by := auth.uid();
  -- archive state only changes through set_component_archived()
  if coalesce(current_setting('hwtrack.allow_archive', true), '') <> 'on' then
    new.archived_at := old.archived_at;
    new.archived_by := old.archived_by;
  end if;
  -- archived records are read-only
  if old.archived_at is not null and new.archived_at is not null then
    raise exception 'Component % is archived. Restore it before making changes.', old.hw_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger components_bi before insert on public.components
  for each row execute function public.components_before_insert();
create trigger components_bu before update on public.components
  for each row execute function public.components_before_update();

-- ─── Movement / ownership history (append-only) ─────────────────────
create table public.component_movements (
  id                   bigint generated always as identity primary key,
  component_id         uuid not null references public.components (id) on delete restrict,
  movement_type        public.movement_type not null,
  from_owner           text,
  to_owner             text,
  from_holder          text,
  to_holder            text,
  from_location_id     uuid,
  to_location_id       uuid,
  from_location_name   text,
  to_location_name     text,
  from_project_id      uuid,
  to_project_id        uuid,
  from_project_name    text,
  to_project_name      text,
  from_status          public.component_status,
  to_status            public.component_status,
  quantity             integer,
  notes                text,
  performed_by         uuid,
  performed_by_email   text,
  created_at           timestamptz not null default now()
);
create index component_movements_component_idx on public.component_movements (component_id, created_at desc);
create index component_movements_created_idx on public.component_movements (created_at desc);

create trigger component_movements_immutable
  before update or delete on public.component_movements
  for each row execute function public.prevent_mutation();
create trigger component_movements_no_truncate
  before truncate on public.component_movements
  for each statement execute function public.prevent_mutation();

create or replace function public.components_track_movement()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_type    public.movement_type;
  v_forced  text := nullif(current_setting('hwtrack.movement_type', true), '');
  v_notes   text := nullif(current_setting('hwtrack.movement_notes', true), '');
  v_email   text;
begin
  select email into v_email from profiles where id = auth.uid();

  if tg_op = 'INSERT' then
    insert into component_movements (
      component_id, movement_type, to_owner, to_holder, to_location_id, to_location_name,
      to_project_id, to_project_name, to_status, quantity, notes, performed_by, performed_by_email)
    values (
      new.id, 'created', new.current_owner, new.current_holder, new.location_id,
      (select name from locations where id = new.location_id),
      new.project_id, (select name from projects where id = new.project_id),
      new.status, new.quantity, 'Component registered', auth.uid(), v_email);
    return new;
  end if;

  if v_forced is null
     and new.current_owner  is not distinct from old.current_owner
     and new.current_holder is not distinct from old.current_holder
     and new.location_id    is not distinct from old.location_id
     and new.project_id     is not distinct from old.project_id
     and new.status         is not distinct from old.status
     and new.archived_at    is not distinct from old.archived_at then
    return new; -- nothing movement-relevant changed
  end if;

  v_type := case
    when v_forced is not null then v_forced::public.movement_type
    when old.archived_at is null and new.archived_at is not null then 'archived'
    when old.archived_at is not null and new.archived_at is null then 'restored'
    when new.current_owner is distinct from old.current_owner then 'transferred'
    when new.current_holder is distinct from old.current_holder then 'assigned'
    when new.location_id is distinct from old.location_id then 'relocated'
    when new.status is distinct from old.status then 'status_changed'
    else 'edited'
  end;

  insert into component_movements (
    component_id, movement_type,
    from_owner, to_owner, from_holder, to_holder,
    from_location_id, to_location_id, from_location_name, to_location_name,
    from_project_id, to_project_id, from_project_name, to_project_name,
    from_status, to_status, quantity, notes, performed_by, performed_by_email)
  values (
    new.id, v_type,
    old.current_owner, new.current_owner, old.current_holder, new.current_holder,
    old.location_id, new.location_id,
    (select name from locations where id = old.location_id),
    (select name from locations where id = new.location_id),
    old.project_id, new.project_id,
    (select name from projects where id = old.project_id),
    (select name from projects where id = new.project_id),
    old.status, new.status, new.quantity, v_notes, auth.uid(), v_email);
  return new;
end;
$$;

create trigger components_movement_ai after insert on public.components
  for each row execute function public.components_track_movement();
create trigger components_movement_au after update on public.components
  for each row execute function public.components_track_movement();

-- ─── Files (metadata; binaries live in Supabase Storage) ────────────
create table public.component_files (
  id            uuid primary key default gen_random_uuid(),
  component_id  uuid not null references public.components (id) on delete restrict,
  kind          public.file_kind not null,
  storage_path  text not null unique,
  file_name     text not null,
  mime_type     text,
  size_bytes    bigint check (size_bytes is null or size_bytes >= 0),
  uploaded_by   uuid default auth.uid(),
  created_at    timestamptz not null default now()
);
create index component_files_component_idx on public.component_files (component_id);

-- ─── Immutable audit log ────────────────────────────────────────────
create table public.audit_logs (
  id              bigint generated always as identity primary key,
  occurred_at     timestamptz not null default now(),
  actor_id        uuid,
  actor_email     text,
  action          text not null,
  entity          text not null,
  entity_id       text,
  entity_label    text,
  changed_fields  text[],
  old_data        jsonb,
  new_data        jsonb,
  metadata        jsonb
);
create index audit_logs_occurred_idx on public.audit_logs (occurred_at desc);
create index audit_logs_entity_idx   on public.audit_logs (entity, entity_id);
create index audit_logs_actor_idx    on public.audit_logs (actor_id);

create trigger audit_logs_immutable
  before update or delete on public.audit_logs
  for each row execute function public.prevent_mutation();
create trigger audit_logs_no_truncate
  before truncate on public.audit_logs
  for each statement execute function public.prevent_mutation();

create or replace function public.audit_row_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_old     jsonb;
  v_new     jsonb;
  v_changed text[];
  v_actor   uuid := auth.uid();
  v_email   text;
begin
  if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;
  if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;

  if tg_op = 'UPDATE' then
    select array_agg(n.key order by n.key) into v_changed
    from jsonb_each(v_new) n
    where n.key not in ('updated_at', 'updated_by')
      and (v_old -> n.key) is distinct from n.value;
    if v_changed is null then
      return null; -- no meaningful change
    end if;
  end if;

  select email into v_email from profiles where id = v_actor;
  if v_email is null then
    v_email := coalesce(auth.jwt() ->> 'email', case when v_actor is null then 'system' end);
  end if;

  insert into audit_logs (actor_id, actor_email, action, entity, entity_id, entity_label,
                          changed_fields, old_data, new_data)
  values (
    v_actor, v_email, tg_op, tg_table_name,
    coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'user_id', v_old ->> 'user_id', v_new ->> 'role', v_old ->> 'role'),
    coalesce(v_new ->> 'hw_id', v_old ->> 'hw_id', v_new ->> 'name', v_old ->> 'name',
             v_new ->> 'email', v_old ->> 'email', v_new ->> 'file_name', v_old ->> 'file_name',
             v_new ->> 'permission', v_old ->> 'permission', v_new ->> 'org_name'),
    v_changed, v_old, v_new);
  return null;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles', 'role_permissions', 'user_permissions', 'app_settings', 'categories',
    'projects', 'providers', 'vendors', 'locations', 'components', 'component_files'
  ] loop
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row_change()', t || '_audit', t);
  end loop;
end;
$$;

-- Application-level events (sign-in, export, admin actions).
-- The actor is always taken from the JWT and cannot be forged.
create or replace function public.log_app_event(
  p_action text, p_entity text default 'app', p_entity_id text default null,
  p_label text default null, p_metadata jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_active_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_action not in ('auth.sign_in', 'auth.sign_out', 'data.export', 'data.import', 'report.export',
                      'admin.user_created', 'admin.password_reset', 'admin.user_enabled', 'admin.user_disabled') then
    raise exception 'Unknown audit event %', p_action;
  end if;
  if p_action like 'admin.%' and not is_super_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  insert into audit_logs (actor_id, actor_email, action, entity, entity_id, entity_label, metadata)
  values (auth.uid(), (select email from profiles where id = auth.uid()),
          p_action, p_entity, p_entity_id, p_label, p_metadata);
end;
$$;

-- ─── Search view ────────────────────────────────────────────────────
create view public.v_components with (security_invoker = true) as
select
  c.*,
  cat.name  as category_name,
  prv.name  as provider_name,
  ven.name  as vendor_name,
  loc.name  as location_name,
  prj.name  as project_name,
  prj.code  as project_code,
  (coalesce(c.unit_cost, 0) * c.quantity)::numeric(16, 2) as total_value,
  lower(concat_ws(' ',
    c.hw_id, c.name, cat.name, prv.name, ven.name, loc.name, prj.name, prj.code,
    c.current_owner, c.current_holder, c.manufacturer, c.model, c.part_number,
    c.serial_number, c.invoice_number, c.description, c.specifications, c.notes
  )) as search_text
from public.components c
join public.categories cat on cat.id = c.category_id
join public.providers prv on prv.id = c.provider_id
left join public.vendors ven on ven.id = c.vendor_id
left join public.locations loc on loc.id = c.location_id
left join public.projects prj on prj.id = c.project_id;

-- ─── Business operations (RPC) ──────────────────────────────────────
create or replace function public.move_component(
  p_component_id  uuid,
  p_type          public.movement_type,
  p_owner         text default null,
  p_holder        text default null,
  p_clear_holder  boolean default false,
  p_location_id   uuid default null,
  p_project_id    uuid default null,
  p_status        public.component_status default null,
  p_notes         text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_permission('inventory.assign') then
    raise exception 'You do not have permission to assign or transfer components' using errcode = '42501';
  end if;
  if p_type not in ('assigned', 'transferred', 'returned', 'relocated', 'status_changed') then
    raise exception 'Unsupported movement type %', p_type;
  end if;

  perform set_config('hwtrack.movement_type', p_type::text, true);
  perform set_config('hwtrack.movement_notes', coalesce(p_notes, ''), true);

  update components set
    current_owner  = coalesce(nullif(btrim(p_owner), ''), current_owner),
    current_holder = case when p_clear_holder then null
                          else coalesce(nullif(btrim(p_holder), ''), current_holder) end,
    location_id    = coalesce(p_location_id, location_id),
    project_id     = coalesce(p_project_id, project_id),
    status         = coalesce(p_status, status)
  where id = p_component_id and archived_at is null;

  if not found then
    raise exception 'Component not found or archived';
  end if;

  perform set_config('hwtrack.movement_type', '', true);
  perform set_config('hwtrack.movement_notes', '', true);
end;
$$;

create or replace function public.set_component_archived(
  p_component_id uuid, p_archived boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not has_permission('inventory.archive') then
    raise exception 'You do not have permission to archive components' using errcode = '42501';
  end if;

  perform set_config('hwtrack.allow_archive', 'on', true);
  perform set_config('hwtrack.movement_notes', coalesce(p_reason, ''), true);

  update components set
    archived_at = case when p_archived then now() else null end,
    archived_by = case when p_archived then auth.uid() else null end
  where id = p_component_id
    and (archived_at is null) = p_archived;

  if not found then
    raise exception 'Component not found or already %', case when p_archived then 'archived' else 'active' end;
  end if;

  perform set_config('hwtrack.allow_archive', '', true);
  perform set_config('hwtrack.movement_notes', '', true);
end;
$$;

create or replace function public.update_my_profile(p_full_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_active_user() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  update profiles set full_name = nullif(btrim(p_full_name), '') where id = auth.uid();
end;
$$;

-- ─── Super Admin operations ─────────────────────────────────────────
create or replace function public.admin_update_user(
  p_user_id uuid, p_full_name text default null,
  p_role public.app_role default null, p_is_active boolean default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then
    raise exception 'Only the Super Admin can manage users' using errcode = '42501';
  end if;
  if p_role = 'super_admin' then
    raise exception 'The Super Admin role cannot be assigned';
  end if;
  if exists (select 1 from profiles where id = p_user_id and role = 'super_admin') then
    raise exception 'The Super Admin account cannot be changed here';
  end if;
  update profiles set
    full_name = coalesce(nullif(btrim(p_full_name), ''), full_name),
    role      = coalesce(p_role, role),
    is_active = coalesce(p_is_active, is_active)
  where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

create or replace function public.admin_set_user_permission(
  p_user_id uuid, p_permission text, p_state text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then
    raise exception 'Only the Super Admin can manage permissions' using errcode = '42501';
  end if;
  if exists (select 1 from profiles where id = p_user_id and role = 'super_admin') then
    raise exception 'The Super Admin always has every permission';
  end if;
  if p_state = 'inherit' then
    delete from user_permissions where user_id = p_user_id and permission = p_permission;
  elsif p_state in ('grant', 'deny') then
    insert into user_permissions (user_id, permission, granted)
    values (p_user_id, p_permission, p_state = 'grant')
    on conflict (user_id, permission) do update set granted = excluded.granted;
  else
    raise exception 'Invalid state %', p_state;
  end if;
end;
$$;

create or replace function public.admin_set_role_permission(
  p_role public.app_role, p_permission text, p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_super_admin() then
    raise exception 'Only the Super Admin can manage permissions' using errcode = '42501';
  end if;
  if p_role = 'super_admin' then
    raise exception 'The Super Admin always has every permission';
  end if;
  if p_enabled then
    insert into role_permissions (role, permission) values (p_role, p_permission)
    on conflict do nothing;
  else
    delete from role_permissions where role = p_role and permission = p_permission;
  end if;
end;
$$;

-- ─── Reporting (SECURITY INVOKER → RLS applies) ─────────────────────
create or replace function public.dashboard_stats()
returns jsonb language sql stable security invoker set search_path = public as $$
  with active as (
    select * from components where archived_at is null
  ),
  settings as (
    select warranty_alert_days from app_settings where id = 1
  )
  select jsonb_build_object(
    'total_records', (select count(*) from active),
    'total_units',   (select coalesce(sum(quantity), 0) from active),
    'total_value',   (select coalesce(sum(coalesce(unit_cost, 0) * quantity), 0) from active),
    'archived',      (select count(*) from components where archived_at is not null),
    'by_status', (
      select coalesce(jsonb_object_agg(s.status, jsonb_build_object('records', s.records, 'units', s.units)), '{}'::jsonb)
      from (select status, count(*) as records, coalesce(sum(quantity), 0) as units from active group by status) s
    ),
    'by_category', (
      select coalesce(jsonb_agg(x order by x.units desc), '[]'::jsonb)
      from (
        select cat.name, count(*) as records, coalesce(sum(a.quantity), 0) as units,
               coalesce(sum(coalesce(a.unit_cost, 0) * a.quantity), 0) as value
        from active a join categories cat on cat.id = a.category_id
        group by cat.name order by units desc limit 10
      ) x
    ),
    'by_project', (
      select coalesce(jsonb_agg(x order by x.value desc), '[]'::jsonb)
      from (
        select coalesce(p.name, 'Unassigned') as name, count(*) as records,
               coalesce(sum(a.quantity), 0) as units,
               coalesce(sum(coalesce(a.unit_cost, 0) * a.quantity), 0) as value
        from active a left join projects p on p.id = a.project_id
        group by coalesce(p.name, 'Unassigned') order by value desc limit 8
      ) x
    ),
    'by_location', (
      select coalesce(jsonb_agg(x order by x.units desc), '[]'::jsonb)
      from (
        select coalesce(l.name, 'Unassigned') as name, count(*) as records, coalesce(sum(a.quantity), 0) as units
        from active a left join locations l on l.id = a.location_id
        group by coalesce(l.name, 'Unassigned') order by units desc limit 8
      ) x
    ),
    'monthly', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'month', to_char(g.m, 'YYYY-MM'),
               'records', coalesce(c.records, 0),
               'units', coalesce(c.units, 0)) order by g.m), '[]'::jsonb)
      from generate_series(
             date_trunc('month', current_date::timestamp) - interval '11 months',
             date_trunc('month', current_date::timestamp),
             interval '1 month') as g(m)
      left join (
        select date_trunc('month', received_date::timestamp) as mm, count(*) as records, coalesce(sum(quantity), 0) as units
        from active group by 1
      ) c on c.mm = g.m
    ),
    'warranty_expiring', (
      select count(*) from active
      where warranty_expiry between current_date and current_date + (select warranty_alert_days from settings)
    ),
    'recent_movements', (
      select coalesce(jsonb_agg(x order by x.created_at desc), '[]'::jsonb)
      from (
        select m.id, m.movement_type, m.created_at, m.performed_by_email, m.to_owner, m.to_holder,
               m.to_location_name, m.to_status, c.id as component_id, c.hw_id, c.name
        from component_movements m join components c on c.id = m.component_id
        order by m.created_at desc limit 8
      ) x
    )
  );
$$;

create or replace function public.report_grouped(p_group text, p_include_archived boolean default false)
returns table (
  group_label text, records bigint, units bigint,
  available bigint, in_use bigint, damaged bigint, repair bigint, retired bigint,
  total_value numeric)
language plpgsql stable security invoker set search_path = public as $$
begin
  if p_group not in ('category', 'project', 'location', 'provider', 'vendor', 'owner', 'holder', 'status') then
    raise exception 'Invalid grouping %', p_group;
  end if;
  return query
  select
    coalesce(case p_group
      when 'category' then v.category_name
      when 'project'  then v.project_name
      when 'location' then v.location_name
      when 'provider' then v.provider_name
      when 'vendor'   then v.vendor_name
      when 'owner'    then v.current_owner
      when 'holder'   then v.current_holder
      when 'status'   then v.status::text
    end, 'Unassigned') as group_label,
    count(*)::bigint,
    coalesce(sum(v.quantity), 0)::bigint,
    coalesce(sum(v.quantity) filter (where v.status = 'available'), 0)::bigint,
    coalesce(sum(v.quantity) filter (where v.status = 'in_use'), 0)::bigint,
    coalesce(sum(v.quantity) filter (where v.status = 'damaged'), 0)::bigint,
    coalesce(sum(v.quantity) filter (where v.status = 'repair'), 0)::bigint,
    coalesce(sum(v.quantity) filter (where v.status = 'retired'), 0)::bigint,
    coalesce(sum(v.total_value), 0)::numeric
  from v_components v
  where p_include_archived or v.archived_at is null
  group by 1
  order by 9 desc, 3 desc;
end;
$$;

create or replace function public.master_usage(p_entity text)
returns table (ref_id uuid, records bigint, units bigint)
language plpgsql stable security invoker set search_path = public as $$
declare
  v_col text := case p_entity
    when 'projects'   then 'project_id'
    when 'providers'  then 'provider_id'
    when 'vendors'    then 'vendor_id'
    when 'locations'  then 'location_id'
    when 'categories' then 'category_id'
  end;
begin
  if v_col is null then
    raise exception 'Invalid entity %', p_entity;
  end if;
  return query execute format(
    'select %1$I, count(*)::bigint, coalesce(sum(quantity), 0)::bigint
       from public.components where archived_at is null and %1$I is not null group by %1$I',
    v_col);
end;
$$;

create or replace function public.app_settings_touch()
returns trigger language plpgsql as $$
begin
  new.id := 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;
create trigger app_settings_bu before update on public.app_settings
  for each row execute function public.app_settings_touch();
