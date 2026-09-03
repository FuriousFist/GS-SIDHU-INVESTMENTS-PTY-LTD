-- ============================================================
-- MAKE DOCKET IMPORTS IDEMPOTENT
-- ============================================================

-- Remove any existing duplicate dockets before creating
-- the unique constraint.
--
-- Keep the oldest record for each business-level docket.
DELETE FROM dockets a
USING dockets b
WHERE
    a.id <> b.id
    AND a.docket_number = b.docket_number
    AND a.docket_type = b.docket_type
    AND a.plant_number = b.plant_number
    AND a.created_at > b.created_at;


-- Prevent duplicate docket records at the database level.
CREATE UNIQUE INDEX IF NOT EXISTS
idx_dockets_unique_business_docket
ON dockets (
    docket_number,
    docket_type,
    plant_number
);


-- Useful for looking up source information later.
CREATE INDEX IF NOT EXISTS
idx_dockets_source_email
ON dockets (source_email);