-- ============================================
-- Enable Row Level Security
-- ============================================

ALTER TABLE trucks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dockets ENABLE ROW LEVEL SECURITY;
ALTER TABLE docket_loads ENABLE ROW LEVEL SECURITY;


-- ============================================
-- TRUCKS
-- ============================================

CREATE POLICY "Authenticated users can view trucks"
ON trucks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create trucks"
ON trucks
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update trucks"
ON trucks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete trucks"
ON trucks
FOR DELETE
TO authenticated
USING (true);


-- ============================================
-- DOCKETS
-- ============================================

CREATE POLICY "Authenticated users can view dockets"
ON dockets
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create dockets"
ON dockets
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update dockets"
ON dockets
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete dockets"
ON dockets
FOR DELETE
TO authenticated
USING (true);


-- ============================================
-- DOCKET LOADS
-- ============================================

CREATE POLICY "Authenticated users can view docket loads"
ON docket_loads
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create docket loads"
ON docket_loads
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update docket loads"
ON docket_loads
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete docket loads"
ON docket_loads
FOR DELETE
TO authenticated
USING (true);