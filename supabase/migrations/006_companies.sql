-- ─────────────────────────────────────────────────────────────────
-- 006_companies.sql
-- Companies table: organizations can manage multiple client companies.
-- Interviews can be linked to a company for organized hiring pipelines.
-- ─────────────────────────────────────────────────────────────────

create table if not exists companies (
  id            text primary key default gen_random_uuid()::text,
  "organizationId" text not null references organizations(id) on delete cascade,
  name          text not null,
  website       text,
  industry      text,
  size          text,
  logo_url      text,
  notes         text,
  "createdAt"   timestamptz not null default now(),
  "updatedAt"   timestamptz not null default now()
);

create index if not exists companies_org_idx on companies("organizationId");

-- Add companyId to interviews (nullable — existing interviews unaffected)
alter table interviews
  add column if not exists "companyId" text references companies(id) on delete set null;

create index if not exists interviews_company_idx on interviews("companyId");

-- Auto-update updatedAt
create or replace function update_companies_updated_at()
returns trigger language plpgsql as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$;

drop trigger if exists companies_updated_at on companies;
create trigger companies_updated_at
  before update on companies
  for each row execute function update_companies_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────
alter table companies enable row level security;

-- Members of the org can read companies
create policy "org members can read companies"
  on companies for select
  using (
    exists (
      select 1 from organization_members om
      where om."workspaceId" = companies."organizationId"
        and om."userId" = auth.uid()::text
    )
  );

-- Members can insert companies into their org
create policy "org members can insert companies"
  on companies for insert
  with check (
    exists (
      select 1 from organization_members om
      where om."workspaceId" = companies."organizationId"
        and om."userId" = auth.uid()::text
    )
  );

-- Members can update companies in their org
create policy "org members can update companies"
  on companies for update
  using (
    exists (
      select 1 from organization_members om
      where om."workspaceId" = companies."organizationId"
        and om."userId" = auth.uid()::text
    )
  );

-- Only admins/owners can delete companies
create policy "org admins can delete companies"
  on companies for delete
  using (
    exists (
      select 1 from organization_members om
      where om."workspaceId" = companies."organizationId"
        and om."userId" = auth.uid()::text
        and om.role in ('OWNER', 'ADMIN')
    )
  );
