create table public.employees (
  id uuid primary key references auth.users (id) on delete cascade,
  employee_code text not null unique
    check (employee_code ~ '^[A-Z0-9]{5}$'),
  full_name text not null
    check (char_length(btrim(full_name)) between 1 and 120),
  email text not null unique
    check (email = lower(email)),
  area text not null
    check (char_length(btrim(area)) between 1 and 80),
  created_at timestamptz not null default now()
);

alter table public.employees enable row level security;

grant select on public.employees to authenticated;

create policy "Employees can read their own record"
  on public.employees
  for select
  to authenticated
  using ((select auth.uid()) = id);

create schema if not exists private;

create or replace function private.handle_new_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.employees (id, employee_code, full_name, email, area)
  values (
    new.id,
    new.raw_user_meta_data ->> 'employee_code',
    new.raw_user_meta_data ->> 'full_name',
    lower(new.email),
    new.raw_user_meta_data ->> 'area'
  );
  return new;
end;
$$;

revoke all on function private.handle_new_employee() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_employee();
