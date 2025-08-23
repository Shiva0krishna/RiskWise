/*
  # Risk Predictions Schema

  1. New Tables
    - `predictions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `prediction_type` (text) - 'csv', 'json', 'text'
      - `input_data` (jsonb) - Store the input data
      - `results` (jsonb) - Store prediction results
      - `file_name` (text, nullable) - Original file name for CSV uploads
      - `created_at` (timestamptz) - Prediction timestamp

    - `building_data`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `building_id` (text) - User's building identifier
      - `city` (text)
      - `comparable_project` (text)
      - `floors` (integer)
      - `height_m` (numeric)
      - `total_area_m2` (numeric)
      - `material` (text)
      - `structural_system` (text)
      - `structural_risk_index` (numeric)
      - `facade_complexity_index` (numeric)
      - `project_duration_days` (integer)
      - `delay_index` (numeric)
      - `cost_overrun_percent` (numeric)
      - `safety_incident_count` (integer)
      - `resource_allocation_efficiency` (numeric)
      - `max_vibration_mm_s` (numeric)
      - `avg_tilt_deg` (numeric)
      - `avg_temperature_c` (numeric)
      - `humidity_percent` (numeric)
      - `equipment_usage_rate_percent` (numeric)
      - `crane_alerts_count` (integer)
      - `cobie_assets` (integer)
      - `cobie_systems` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Users can only access their own data
*/

-- Create predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  prediction_type text NOT NULL CHECK (prediction_type IN ('csv', 'json', 'text')),
  input_data jsonb NOT NULL,
  results jsonb NOT NULL,
  file_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create building_data table
CREATE TABLE IF NOT EXISTS building_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  building_id text NOT NULL,
  city text,
  comparable_project text,
  floors integer,
  height_m numeric,
  total_area_m2 numeric,
  material text,
  structural_system text,
  structural_risk_index numeric,
  facade_complexity_index numeric,
  project_duration_days integer,
  delay_index numeric,
  cost_overrun_percent numeric,
  safety_incident_count integer,
  resource_allocation_efficiency numeric,
  max_vibration_mm_s numeric,
  avg_tilt_deg numeric,
  avg_temperature_c numeric,
  humidity_percent numeric,
  equipment_usage_rate_percent numeric,
  crane_alerts_count integer,
  cobie_assets integer,
  cobie_systems integer,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_data ENABLE ROW LEVEL SECURITY;

-- Predictions policies
CREATE POLICY "Users can read own predictions"
  ON predictions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own predictions"
  ON predictions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own predictions"
  ON predictions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own predictions"
  ON predictions
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Building data policies
CREATE POLICY "Users can read own building data"
  ON building_data
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own building data"
  ON building_data
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own building data"
  ON building_data
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own building data"
  ON building_data
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger for building_data updated_at
DROP TRIGGER IF EXISTS update_building_data_updated_at ON building_data;
CREATE TRIGGER update_building_data_updated_at
  BEFORE UPDATE ON building_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_predictions_user_id ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_created_at ON predictions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_building_data_user_id ON building_data(user_id);
CREATE INDEX IF NOT EXISTS idx_building_data_building_id ON building_data(building_id);