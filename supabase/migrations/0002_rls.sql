-- ════════════════════════════════════════════════════════════════════
-- HW-Track · 0002_rls.sql
-- Row Level Security: every read and write is checked in the database,
-- so permissions hold even if someone calls the Supabase API directly.
-- ════════════════════════════════════════════════════════════════════

-- Anonymous visitors get nothing.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

alter table public.profiles            enable row level security;
alter table public.permissions         enable row level security;
alter table public.role_permissions    enable row level security;
alter table public.user_permissions    enable row level security;
alter table public.app_settings        enable row level security;
alter table public.categories          enable row level security;
alter table public.projects            enable row level security;
alter table public.providers           enable row level security;
alter table public.vendors             enable row level security;
alter table public.locations           enable row level security;
alter table public.components          enable row level security;
alter table public.component_movements enable row level security;
alter table public.component_files     enable row level security;
alter table public.audit_logs          enable row level security;

-- Profiles: you see yourself; the Super Admin sees everyone.
-- All writes go through SECURITY DEFINER functions (update_my_profile, admin_*).
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_super_admin());

-- Permission catalogue
create policy permissions_select on public.permissions
  for select to authenticated using (public.is_active_user());
create policy role_permissions_select on public.role_permissions
  for select to authenticated using (public.is_active_user());
create policy user_permissions_select on public.user_permissions
  for select to authenticated using (user_id = auth.uid() or public.is_super_admin());

-- Organization settings
create policy app_settings_select on public.app_settings
  for select to authenticated using (public.is_active_user());
create policy app_settings_update on public.app_settings
  for update to authenticated
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

-- Reference data
do $$
declare t text;
begin
  foreach t in array array['categories', 'projects', 'providers', 'vendors', 'locations'] loop
    execute format('create policy %I on public.%I for select to authenticated using (public.has_permission(''inventory.view''))', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.has_permission(''masters.manage''))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.has_permission(''masters.manage'')) with check (public.has_permission(''masters.manage''))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.has_permission(''masters.manage''))', t || '_delete', t);
  end loop;
end;
$$;

-- Components: no DELETE policy at all → records can only be archived.
create policy components_select on public.components
  for select to authenticated using (public.has_permission('inventory.view'));
create policy components_insert on public.components
  for insert to authenticated with check (public.has_permission('inventory.create'));
create policy components_update on public.components
  for update to authenticated
  using (public.has_permission('inventory.edit'))
  with check (public.has_permission('inventory.edit'));

-- Movement history: read-only for clients (written by triggers).
create policy component_movements_select on public.component_movements
  for select to authenticated using (public.has_permission('inventory.view'));

-- Files
create policy component_files_select on public.component_files
  for select to authenticated using (public.has_permission('inventory.view'));
create policy component_files_insert on public.component_files
  for insert to authenticated with check (public.has_permission('files.upload'));
create policy component_files_delete on public.component_files
  for delete to authenticated using (public.has_permission('files.delete'));

-- Audit log: read-only, and only with audit.view.
create policy audit_logs_select on public.audit_logs
  for select to authenticated using (public.has_permission('audit.view'));

-- Belt and braces: clients can never write history tables directly.
revoke insert, update, delete, truncate on public.audit_logs from authenticated;
revoke insert, update, delete, truncate on public.component_movements from authenticated;
revoke insert, update, delete, truncate on public.permissions from authenticated;
revoke insert, update, delete, truncate on public.role_permissions from authenticated;
revoke insert, update, delete, truncate on public.user_permissions from authenticated;
revoke insert, update, delete, truncate on public.profiles from authenticated;
revoke delete, truncate on public.components from authenticated;
revoke usage, select, update on sequence public.hw_id_seq from authenticated;

-- Functions: callable by signed-in users only.
do $$
declare f text;
begin
  foreach f in array array[
    'public.is_active_user()',
    'public.is_super_admin()',
    'public.has_permission(text)',
    'public.get_my_permissions()',
    'public.log_app_event(text, text, text, text, jsonb)',
    'public.move_component(uuid, public.movement_type, text, text, boolean, uuid, uuid, public.component_status, text)',
    'public.set_component_archived(uuid, boolean, text)',
    'public.update_my_profile(text)',
    'public.admin_update_user(uuid, text, public.app_role, boolean)',
    'public.admin_set_user_permission(uuid, text, text)',
    'public.admin_set_role_permission(public.app_role, text, boolean)',
    'public.dashboard_stats()',
    'public.report_grouped(text, boolean)',
    'public.master_usage(text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end;
$$;

-- Trigger functions (handle_new_user, audit_row_change, components_*) return
-- type "trigger", which PostgREST cannot invoke, so they are not exposed.
