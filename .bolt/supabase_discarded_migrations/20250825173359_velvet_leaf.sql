/*
  # Projects and Enhanced Schema

  1. New Tables
    - `projects`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `name` (text) - Project name
      - `description` (text, nullable) - Project description
      - `city` (text, nullable) - Project location
      - `structural_system` (text, nullable) - e.g., Mega-Frame, Steel Frame
      - `progress_percent` (numeric) - Project completion percentage
      - `created_at` (timestamptz) - Project creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Schema Updates
    - Add `project_id` to `building_data` table
    - Add `project_id` to `predictions` table
    - Update RLS policies to support project-based access

  3. Security
    - Enable RLS on projects table
    - Users can only access their own projects
    - Building data and predictions are linked to projects
*/

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  city text,
  structural_system text,
  progress_percent numeric DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add project_id to existing tables if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'building_data' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE building_data ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'predictions' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE predictions ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable RLS for projects
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for projects
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

-- Trigger for projects updated_at
DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_building_data_project_id ON building_data(project_id);
CREATE INDEX IF NOT EXISTS idx_predictions_project_id ON predictions(project_id);