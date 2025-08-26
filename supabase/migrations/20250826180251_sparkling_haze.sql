/*
  # Enhanced Schema for Real-time Dashboard

  1. Schema Updates
    - Add risk_level and confidence to predictions table
    - Add building_data_id reference to predictions
    - Add indexes for better performance
    - Add triggers for real-time updates

  2. New Features
    - Real-time data synchronization
    - Project-specific data filtering
    - Enhanced analytics capabilities

  3. Performance Optimizations
    - Indexes for common queries
    - Efficient data relationships
*/

-- Add missing columns to predictions table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'predictions' AND column_name = 'risk_level'
  ) THEN
    ALTER TABLE predictions ADD COLUMN risk_level text CHECK (risk_level = ANY (ARRAY['Low'::text, 'Medium'::text, 'High'::text]));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'predictions' AND column_name = 'confidence'
  ) THEN
    ALTER TABLE predictions ADD COLUMN confidence numeric;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'predictions' AND column_name = 'building_data_id'
  ) THEN
    ALTER TABLE predictions ADD COLUMN building_data_id uuid REFERENCES building_data(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_building_data_project_id ON building_data(project_id);
CREATE INDEX IF NOT EXISTS idx_building_data_user_id ON building_data(user_id);
CREATE INDEX IF NOT EXISTS idx_building_data_building_id ON building_data(building_id);
CREATE INDEX IF NOT EXISTS idx_predictions_project_id ON predictions(project_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

-- Enable RLS for all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
DROP POLICY IF EXISTS "Users can read own projects" ON projects;
CREATE POLICY "Users can read own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own projects" ON projects;
CREATE POLICY "Users can insert own projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for building_data
DROP POLICY IF EXISTS "Users can read own building data" ON building_data;
CREATE POLICY "Users can read own building data"
  ON building_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own building data" ON building_data;
CREATE POLICY "Users can insert own building data"
  ON building_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own building data" ON building_data;
CREATE POLICY "Users can update own building data"
  ON building_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own building data" ON building_data;
CREATE POLICY "Users can delete own building data"
  ON building_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for predictions
DROP POLICY IF EXISTS "Users can read own predictions" ON predictions;
CREATE POLICY "Users can read own predictions"
  ON predictions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own predictions" ON predictions;
CREATE POLICY "Users can insert own predictions"
  ON predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own predictions" ON predictions;
CREATE POLICY "Users can update own predictions"
  ON predictions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own predictions" ON predictions;
CREATE POLICY "Users can delete own predictions"
  ON predictions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_building_data_updated_at ON building_data;
CREATE TRIGGER update_building_data_updated_at
  BEFORE UPDATE ON building_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();