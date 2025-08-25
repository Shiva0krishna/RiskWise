/*
  # Add Projects Schema and Update Relationships

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text, project name)
      - `description` (text, optional description)
      - `city` (text, project location)
      - `structural_system` (text, building structure type)
      - `progress_percent` (numeric, completion percentage)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Schema Updates
    - Add `project_id` column to `building_data` table
    - Add `project_id` column to `predictions` table
    - Create foreign key relationships

  3. Security
    - Enable RLS on `projects` table
    - Add policies for authenticated users to manage their own projects
    - Update existing policies for building_data and predictions

  4. Performance
    - Add indexes for efficient querying
    - Add triggers for automatic timestamp updates
</*/

-- 1. Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  city text,
  structural_system text,
  progress_percent numeric DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 2. Add project_id to building_data if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'building_data' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE building_data ADD COLUMN project_id uuid;
  END IF;
END $$;

-- 3. Add project_id to predictions if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'predictions' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE predictions ADD COLUMN project_id uuid;
  END IF;
END $$;

-- 4. Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'projects_user_id_fkey'
  ) THEN
    ALTER TABLE projects ADD CONSTRAINT projects_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'building_data_project_id_fkey'
  ) THEN
    ALTER TABLE building_data ADD CONSTRAINT building_data_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'predictions_project_id_fkey'
  ) THEN
    ALTER TABLE predictions ADD CONSTRAINT predictions_project_id_fkey 
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. Enable RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for projects
CREATE POLICY "Users can read own projects"
  ON projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_building_data_project_id ON building_data(project_id);
CREATE INDEX IF NOT EXISTS idx_predictions_project_id ON predictions(project_id);

-- 8. Add trigger for projects updated_at
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();