/*
  # Add Risk Level to Building Data

  1. Schema Updates
    - Add `risk_level` column to `building_data` table
    - This will store the predicted risk level for each building entry
    - Allows for better analytics and filtering

  2. Data Migration
    - Add the new column with proper constraints
    - Create index for performance
*/

-- Add risk_level column to building_data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'building_data' AND column_name = 'risk_level'
  ) THEN
    ALTER TABLE building_data ADD COLUMN risk_level text CHECK (risk_level IN ('Low', 'Medium', 'High'));
  END IF;
END $$;

-- Create index for risk_level filtering
CREATE INDEX IF NOT EXISTS idx_building_data_risk_level ON building_data(risk_level);
CREATE INDEX IF NOT EXISTS idx_building_data_user_project ON building_data(user_id, project_id);