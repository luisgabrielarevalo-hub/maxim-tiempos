alter table public.employees rename column area to cargo;

alter table public.employees rename constraint employees_area_check to employees_cargo_check;

create or replace function private.handle_new_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.employees (id, employee_code, full_name, email, cargo)
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
