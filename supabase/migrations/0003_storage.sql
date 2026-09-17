-- ════════════════════════════════════════════════════════════════════
-- HW-Track · 0003_storage.sql
-- Private bucket for component images, invoices, datasheets & documents.
-- Files are never public; the app hands out short-lived signed URLs.
-- ════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'hw-files', 'hw-files', false, 10485760, -- 10 MB per file
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'application/pdf',
    'text/plain', 'text/csv',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "hw-files: read with inventory.view"
  on storage.objects for select to authenticated
  using (bucket_id = 'hw-files' and public.has_permission('inventory.view'));

create policy "hw-files: upload with files.upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'hw-files'
    and public.has_permission('files.upload')
    and (storage.foldername(name))[1] = 'components'
  );

create policy "hw-files: delete with files.delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'hw-files' and public.has_permission('files.delete'));
