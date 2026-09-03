-- ============================================
-- Migration: Relate dockets to trucks
-- ============================================

-- 1. Add truck_id to dockets
ALTER TABLE dockets
ADD COLUMN truck_id UUID;


-- 2. Add foreign key relationship
ALTER TABLE dockets
ADD CONSTRAINT fk_dockets_truck
FOREIGN KEY (truck_id)
REFERENCES trucks(id)
ON DELETE SET NULL;


-- 3. Add an index for faster truck/docket queries
CREATE INDEX idx_dockets_truck_id
ON dockets(truck_id);


-- 4. Remove duplicated truck information from dockets
ALTER TABLE dockets
DROP COLUMN truck_number;

ALTER TABLE dockets
DROP COLUMN vehicle_registration;