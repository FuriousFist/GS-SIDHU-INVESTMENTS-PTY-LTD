-- ============================================================
-- COMPANIES, TRAILERS AND COMPLIANCE DOCUMENTS
--
-- A company is a contracting entity we hold a supplier contract
-- under (one for Holcim, one for Barro). Each company, truck and
-- trailer has a checklist of compliance documents, every document
-- keeps a full version history, and the newest version's expiry
-- date drives the Verified / Expiring / Expired status shown on
-- the dashboard.
--
-- Additive only: no existing views or functions are touched.
-- ============================================================


-- ============================================================
-- COMPANIES
-- ============================================================

create table companies (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    supplier text not null check (supplier in ('Holcim', 'Barro')),
    sole_trader boolean not null default false,
    abn text,
    acn text,
    notes text,
    created_at timestamptz default now()
);

-- One placeholder company per supplier we already have trucks for.
-- The names are placeholders - the user renames them in the UI.
-- Holcim is contracted as a sole trader, Barro is not (per the
-- supplier portals).
insert into companies (name, supplier, sole_trader)
select distinct
    company || ' contract',
    company,
    company = 'Holcim'
from trucks
where company in ('Holcim', 'Barro');


-- ============================================================
-- TRUCKS: COMPANY LINK, REGISTRATION STATE, BASE LOCATION, TYPE
-- ============================================================

alter table trucks add column company_id uuid references companies(id);
alter table trucks add column registration_state text
    check (registration_state in ('QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT'));
alter table trucks add column base_location text;

create index trucks_company_id_idx on trucks (company_id);

-- The existing `company` text column stays (get_truck_summary
-- returns it); company_id is backfilled from it.
update trucks t
set company_id = c.id
from companies c
where c.supplier = t.company
  and t.company_id is null;

-- truck_type was free text and never written by the scraper.
-- Normalise anything already there, then constrain it.
update trucks
set truck_type = lower(trim(truck_type))
where truck_type is not null;

update trucks
set truck_type = null
where truck_type is not null
  and truck_type not in ('agitator', 'tipper');

alter table trucks add constraint trucks_truck_type_check
    check (truck_type is null or truck_type in ('agitator', 'tipper'));


-- ============================================================
-- TRAILERS
--
-- One trailer per truck (tippers only - enforced in the app).
-- ============================================================

create table trailers (
    id uuid primary key default gen_random_uuid(),
    truck_id uuid not null unique references trucks(id) on delete cascade,
    registration text,
    registration_state text
        check (registration_state in ('QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT')),
    notes text,
    created_at timestamptz default now()
);


-- ============================================================
-- DOCUMENT TYPES
--
-- The catalogue of documents each supplier asks for, per scope.
-- Company-scope types are templates (a company can hold several
-- documents of one type, distinguished by `documents.label`);
-- truck/trailer-scope types are a fixed checklist.
-- ============================================================

create table document_types (
    id uuid primary key default gen_random_uuid(),
    code text unique not null,
    name text not null,
    scope text not null check (scope in ('company', 'truck', 'trailer')),
    category text check (category in ('insurance', 'other')),   -- company scope only
    supplier text check (supplier in ('Holcim', 'Barro')),      -- null applies to both
    required boolean not null default false,
    default_never_expires boolean not null default false,
    sort_order int not null default 0
);


-- ============================================================
-- DOCUMENTS AND VERSIONS
--
-- A document belongs to exactly one owner (company, truck or
-- trailer) and may have many versions; `current_version_id` is
-- the newest. Replaced versions are never deleted.
-- ============================================================

create table documents (
    id uuid primary key default gen_random_uuid(),
    document_type_id uuid not null references document_types(id),
    company_id uuid references companies(id) on delete cascade,
    truck_id uuid references trucks(id) on delete cascade,
    trailer_id uuid references trailers(id) on delete cascade,
    label text,
    current_version_id uuid,
    created_at timestamptz default now(),
    check (num_nonnulls(company_id, truck_id, trailer_id) = 1)
);

create table document_versions (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references documents(id) on delete cascade,
    storage_path text not null,
    file_name text not null,
    mime_type text not null,
    size_bytes bigint,
    expiry_date date,
    never_expires boolean not null default false,
    uploaded_by uuid references auth.users(id),
    uploaded_at timestamptz not null default now(),
    check (never_expires or expiry_date is not null)
);

alter table documents
    add constraint documents_current_version_id_fkey
    foreign key (current_version_id) references document_versions(id);

create index documents_document_type_id_idx on documents (document_type_id);
create index documents_company_id_idx on documents (company_id);
create index documents_truck_id_idx on documents (truck_id);
create index documents_trailer_id_idx on documents (trailer_id);
create index documents_current_version_id_idx on documents (current_version_id);
create index document_versions_document_id_idx on document_versions (document_id);
create index document_versions_uploaded_by_idx on document_versions (uploaded_by);


-- ============================================================
-- ROW LEVEL SECURITY
--
-- Same policies as trucks: any authenticated user has full access.
-- ============================================================

alter table companies enable row level security;
alter table trailers enable row level security;
alter table document_types enable row level security;
alter table documents enable row level security;
alter table document_versions enable row level security;

-- COMPANIES
create policy "Authenticated users can view companies"
on companies for select to authenticated using (true);

create policy "Authenticated users can create companies"
on companies for insert to authenticated with check (true);

create policy "Authenticated users can update companies"
on companies for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete companies"
on companies for delete to authenticated using (true);

-- TRAILERS
create policy "Authenticated users can view trailers"
on trailers for select to authenticated using (true);

create policy "Authenticated users can create trailers"
on trailers for insert to authenticated with check (true);

create policy "Authenticated users can update trailers"
on trailers for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete trailers"
on trailers for delete to authenticated using (true);

-- DOCUMENT TYPES
create policy "Authenticated users can view document types"
on document_types for select to authenticated using (true);

create policy "Authenticated users can create document types"
on document_types for insert to authenticated with check (true);

create policy "Authenticated users can update document types"
on document_types for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete document types"
on document_types for delete to authenticated using (true);

-- DOCUMENTS
create policy "Authenticated users can view documents"
on documents for select to authenticated using (true);

create policy "Authenticated users can create documents"
on documents for insert to authenticated with check (true);

create policy "Authenticated users can update documents"
on documents for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete documents"
on documents for delete to authenticated using (true);

-- DOCUMENT VERSIONS
create policy "Authenticated users can view document versions"
on document_versions for select to authenticated using (true);

create policy "Authenticated users can create document versions"
on document_versions for insert to authenticated with check (true);

create policy "Authenticated users can update document versions"
on document_versions for update to authenticated using (true) with check (true);

create policy "Authenticated users can delete document versions"
on document_versions for delete to authenticated using (true);


-- ============================================================
-- STORAGE BUCKET
--
-- Object path convention:
--   {scope}/{ownerId}/{documentId}/{timestamp}-{fileName}
-- ============================================================

insert into storage.buckets (id, name, public)
values ('compliance-documents', 'compliance-documents', false)
on conflict (id) do nothing;

create policy "Authenticated users can view compliance documents"
on storage.objects for select to authenticated
using (bucket_id = 'compliance-documents');

create policy "Authenticated users can upload compliance documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'compliance-documents');

create policy "Authenticated users can update compliance documents"
on storage.objects for update to authenticated
using (bucket_id = 'compliance-documents')
with check (bucket_id = 'compliance-documents');


-- ============================================================
-- SEED DOCUMENT TYPES
-- ============================================================

insert into document_types
    (code, name, scope, category, supplier, required, default_never_expires, sort_order)
values
    -- Company / Holcim / insurance
    ('holcim_company_workcover',
     'Workcover Registration Certificate or Workers'' Compensation Insurance (WA)',
     'company', 'insurance', 'Holcim', false, false, 10),
    ('holcim_company_pli',
     'Public Liability Insurance',
     'company', 'insurance', 'Holcim', false, false, 20),

    -- Company / Holcim / other
    ('holcim_company_contract',
     'Contract - signed/executed',
     'company', 'other', 'Holcim', false, false, 10),
    ('holcim_company_motor_vehicle_insurance',
     'Insurance - Motor Vehicle',
     'company', 'other', 'Holcim', false, false, 20),
    ('holcim_company_nhvas_mass',
     'NHVAS - Mass Accreditation',
     'company', 'other', 'Holcim', false, false, 30),
    ('holcim_company_nhvas_maintenance',
     'NHVAS - Maintenance Accreditation',
     'company', 'other', 'Holcim', false, false, 40),
    ('holcim_company_pbs_permit',
     'PBS Permit',
     'company', 'other', 'Holcim', false, false, 50),
    ('holcim_company_bank_details',
     'Bank Details',
     'company', 'other', 'Holcim', false, true, 60),
    ('holcim_company_service_maintenance_declaration',
     'Service & Maintenance Declaration',
     'company', 'other', 'Holcim', false, true, 70),
    ('holcim_company_wrong_product_insurance',
     'Insurance - Wrong Product Delivery Insurance Certificate',
     'company', 'other', 'Holcim', false, false, 80),
    ('holcim_company_acn',
     'Australian Company Number',
     'company', 'other', 'Holcim', false, true, 90),
    ('holcim_company_policies_confirmation',
     'Holcim Policies Confirmation',
     'company', 'other', 'Holcim', false, true, 100),
    ('holcim_company_abn',
     'Australian Business Number',
     'company', 'other', 'Holcim', false, true, 110),
    ('holcim_company_motor_vehicle_insurance_2',
     'Insurance - Motor Vehicle 2',
     'company', 'other', 'Holcim', false, false, 120),

    -- Company / Barro / insurance
    ('barro_company_pli',
     'Public Liability Insurance',
     'company', 'insurance', 'Barro', false, false, 10),
    ('barro_company_workcover',
     'Workcover Registration Certificate',
     'company', 'insurance', 'Barro', false, false, 20),

    -- Company / Barro / other
    ('barro_company_certificate_of_incorporation',
     'Certificate of Incorporation of your Company',
     'company', 'other', 'Barro', false, true, 10),
    ('barro_company_asic_statement',
     'ASIC Company Statement',
     'company', 'other', 'Barro', false, true, 20),
    ('barro_company_right_to_work_declaration',
     'Declaration that each person employed or contracted by the Contractor is allowed to work in Australia (Migration Act 1958 as varied from time to time)',
     'company', 'other', 'Barro', false, true, 30),
    ('barro_company_heavy_vehicle_licence',
     'Heavy Vehicle Licence',
     'company', 'other', 'Barro', false, false, 40),

    -- Truck / Barro (all required)
    ('barro_truck_registration',
     'Registration Certificate',
     'truck', null, 'Barro', true, false, 10),
    ('barro_truck_insurance',
     'Insurance',
     'truck', null, 'Barro', true, false, 20),
    ('barro_truck_tare_certificate',
     'Tare Certificate',
     'truck', null, 'Barro', true, false, 30),
    ('barro_truck_inspection_report',
     'Inspection Report',
     'truck', null, 'Barro', true, false, 40),

    -- Truck / Holcim (agitators and tipper prime movers)
    ('holcim_truck_registration',
     'Registration Certificate',
     'truck', null, 'Holcim', true, false, 10),
    ('holcim_truck_photos',
     'Photos of Transport',
     'truck', null, 'Holcim', false, true, 20),
    ('holcim_truck_pbs_approval',
     'PBS Approval',
     'truck', null, 'Holcim', false, false, 30),
    ('holcim_truck_service_report',
     'Vehicle Service Report',
     'truck', null, 'Holcim', false, false, 40),
    ('holcim_truck_certificate_of_inspection',
     'Certificate of Inspection',
     'truck', null, 'Holcim', false, false, 50),
    ('holcim_truck_nhvr_accreditation',
     'NHVR Accreditation Certificate',
     'truck', null, 'Holcim', false, false, 60),
    ('holcim_truck_wa_amms_permit',
     'WA AMMS Permit',
     'truck', null, 'Holcim', false, false, 70),
    ('holcim_truck_min_safety_hardware',
     'Minimum Safety Hardware Inspection',
     'truck', null, 'Holcim', false, false, 80),
    ('holcim_truck_pressure_vessel',
     'Pressure Vessel Registration Number',
     'truck', null, 'Holcim', false, false, 90),
    ('holcim_truck_barrel_thickness',
     'Agitator Barrel Thickness Inspection',
     'truck', null, 'Holcim', false, false, 100),
    ('holcim_truck_load_restraint',
     'Load Restraint Inspection',
     'truck', null, 'Holcim', false, false, 110),
    ('holcim_truck_safety_sticker',
     'Safety Sticker Inspection',
     'truck', null, 'Holcim', false, false, 120),
    ('holcim_truck_agitator_inspection',
     'Agitator Inspection Certificate',
     'truck', null, 'Holcim', false, false, 130),
    ('holcim_truck_hydraulic_service',
     'Hydraulic Service Certificate',
     'truck', null, 'Holcim', false, false, 140),

    -- Trailer / Holcim
    ('holcim_trailer_registration',
     'Registration Certificate',
     'trailer', null, 'Holcim', true, false, 10),
    ('holcim_trailer_photos',
     'Photos of Transport',
     'trailer', null, 'Holcim', false, true, 20),
    ('holcim_trailer_pbs_approval',
     'PBS Approval',
     'trailer', null, 'Holcim', false, false, 30),
    ('holcim_trailer_service_report',
     'Vehicle Service Report',
     'trailer', null, 'Holcim', false, false, 40),
    ('holcim_trailer_certificate_of_inspection',
     'Certificate of Inspection',
     'trailer', null, 'Holcim', false, false, 50),
    ('holcim_trailer_nhvr_accreditation',
     'NHVR Accreditation Certificate',
     'trailer', null, 'Holcim', false, false, 60),
    ('holcim_trailer_min_safety_hardware',
     'Minimum Safety Hardware Inspection',
     'trailer', null, 'Holcim', false, false, 70),
    ('holcim_trailer_pressure_vessel',
     'Pressure Vessel Registration Number',
     'trailer', null, 'Holcim', false, false, 80);
