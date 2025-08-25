import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ApiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
}

interface BuildingData {
  Building_ID: string;
  City: string;
  Comparable_Project: string;
  Floors: number;
  Height_m: number;
  Total_Area_m2: number;
  Material: string;
  Structural_System: string;
  Structural_Risk_Index: number;
  Facade_Complexity_Index: number;
  Project_Duration_days: number;
  Delay_Index: number;
  'Cost_Overrun_%': number;
  Safety_Incident_Count: number;
  Resource_Allocation_Efficiency: number;
  Max_Vibration_mm_s: number;
  Avg_Tilt_deg: number;
  Avg_Temperature_C: number;
  'Humidity_%': number;
  'Equipment_Usage_Rate_%': number;
  Crane_Alerts_Count: number;
  COBie_Assets: number;
  COBie_Systems: number;
}

interface BuildingDataFormProps {
  onPredictionComplete: (results: any[]) => void;
  selectedProject?: Project | null;
  saveToProject?: boolean;
}

export function BuildingDataForm({ onPredictionComplete, selectedProject, saveToProject = true }: BuildingDataFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<BuildingData>>({
    Building_ID: '',
    City: '',
    Comparable_Project: '',
    Material: 'Concrete',
    Structural_System: 'Frame',
  });

  const materials = ['Concrete', 'Steel', 'Wood', 'Masonry', 'Composite'];
  const structuralSystems = ['Frame', 'Shear Wall', 'Truss', 'Arch', 'Shell'];

  const handleInputChange = (field: keyof BuildingData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    const requiredFields = [
      'Building_ID', 'City', 'Comparable_Project', 'Floors', 'Height_m',
      'Total_Area_m2', 'Material', 'Structural_System'
    ];

    for (const field of requiredFields) {
      if (!formData[field as keyof BuildingData]) {
        Alert.alert('Validation Error', `${field.replace(/_/g, ' ')} is required`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Call prediction API
      const predictions = await ApiService.predictFromJson(formData);

      // Save to database if user wants to save to project
      if (saveToProject && user) {
        // Save prediction
        const { error: predictionError } = await supabase
          .from('predictions')
          .insert({
            user_id: user.id,
            prediction_type: 'json',
            input_data: formData,
            results: predictions,
            project_id: selectedProject?.id || null,
          });

        if (predictionError) throw predictionError;

        // Save building data
        const { error: buildingError } = await supabase
          .from('building_data')
          .insert({
            user_id: user.id,
            building_id: formData.Building_ID || '',
            city: formData.City || null,
            floors: formData.Floors || null,
            height_m: formData.Height_m || null,
            total_area_m2: formData.Total_Area_m2 || null,
            material: formData.Material || null,
            structural_system: formData.Structural_System || null,
            structural_risk_index: formData.Structural_Risk_Index || null,
            facade_complexity_index: formData.Facade_Complexity_Index || null,
            project_duration_days: formData.Project_Duration_days || null,
            delay_index: formData.Delay_Index || null,
            cost_overrun_percent: formData['Cost_Overrun_%'] || null,
            safety_incident_count: formData.Safety_Incident_Count || null,
            resource_allocation_efficiency: formData.Resource_Allocation_Efficiency || null,
            max_vibration_mm_s: formData.Max_Vibration_mm_s || null,
            avg_tilt_deg: formData.Avg_Tilt_deg || null,
            avg_temperature_c: formData.Avg_Temperature_C || null,
            humidity_percent: formData['Humidity_%'] || null,
            equipment_usage_rate_percent: formData['Equipment_Usage_Rate_%'] || null,
            crane_alerts_count: formData.Crane_Alerts_Count || null,
            cobie_assets: formData.COBie_Assets || null,
            cobie_systems: formData.COBie_Systems || null,
            project_id: selectedProject?.id || null,
          });

        if (buildingError) throw buildingError;
      }

      onPredictionComplete(predictions);

      if (!saveToProject) {
        Alert.alert('Prediction Complete', 'Results generated (not saved to project)');
      } else if (Platform.OS !== 'web') {
        Alert.alert('Success', 'Prediction completed and saved to project!');
      }
    } catch (error) {
      console.error('Prediction error:', error);
      const message = error instanceof Error ? error.message : 'Prediction failed';
      
      if (Platform.OS === 'web') {
        // Handle web error display
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Building Risk Assessment</Text>
      <Text style={styles.subtitle}>Enter building details for risk prediction</Text>

      <View style={styles.form}>
        <Input
          label="Building ID"
          value={formData.Building_ID || ''}
          onChangeText={(value) => handleInputChange('Building_ID', value)}
          placeholder="Enter building identifier"
        />

        <Input
          label="City"
          value={formData.City || ''}
          onChangeText={(value) => handleInputChange('City', value)}
          placeholder="Enter city name"
        />

        <Input
          label="Comparable Project"
          value={formData.Comparable_Project || ''}
          onChangeText={(value) => handleInputChange('Comparable_Project', value)}
          placeholder="Enter comparable project name"
        />

        <Input
          label="Number of Floors"
          value={formData.Floors?.toString() || ''}
          onChangeText={(value) => handleInputChange('Floors', parseInt(value) || 0)}
          placeholder="Enter number of floors"
          keyboardType="numeric"
        />

        <Input
          label="Height (meters)"
          value={formData.Height_m?.toString() || ''}
          onChangeText={(value) => handleInputChange('Height_m', parseFloat(value) || 0)}
          placeholder="Enter height in meters"
          keyboardType="numeric"
        />

        <Input
          label="Total Area (m²)"
          value={formData.Total_Area_m2?.toString() || ''}
          onChangeText={(value) => handleInputChange('Total_Area_m2', parseFloat(value) || 0)}
          placeholder="Enter total area in square meters"
          keyboardType="numeric"
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Material</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={formData.Material}
              onValueChange={(value) => handleInputChange('Material', value)}
            >
              {materials.map((material) => (
                <Picker.Item key={material} label={material} value={material} />
              ))}
            </Picker>
          </View>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Structural System</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={formData.Structural_System}
              onValueChange={(value) => handleInputChange('Structural_System', value)}
            >
              {structuralSystems.map((system) => (
                <Picker.Item key={system} label={system} value={system} />
              ))}
            </Picker>
          </View>
        </View>

        <Input
          label="Structural Risk Index (0-1)"
          value={formData.Structural_Risk_Index?.toString() || ''}
          onChangeText={(value) => handleInputChange('Structural_Risk_Index', parseFloat(value) || 0)}
          placeholder="Enter structural risk index"
          keyboardType="numeric"
        />

        <Input
          label="Facade Complexity Index (0-1)"
          value={formData.Facade_Complexity_Index?.toString() || ''}
          onChangeText={(value) => handleInputChange('Facade_Complexity_Index', parseFloat(value) || 0)}
          placeholder="Enter facade complexity index"
          keyboardType="numeric"
        />

        <Input
          label="Project Duration (days)"
          value={formData.Project_Duration_days?.toString() || ''}
          onChangeText={(value) => handleInputChange('Project_Duration_days', parseInt(value) || 0)}
          placeholder="Enter project duration in days"
          keyboardType="numeric"
        />

        <Input
          label="Delay Index (0-1)"
          value={formData.Delay_Index?.toString() || ''}
          onChangeText={(value) => handleInputChange('Delay_Index', parseFloat(value) || 0)}
          placeholder="Enter delay index"
          keyboardType="numeric"
        />

        <Input
          label="Cost Overrun (%)"
          value={formData['Cost_Overrun_%']?.toString() || ''}
          onChangeText={(value) => handleInputChange('Cost_Overrun_%', parseFloat(value) || 0)}
          placeholder="Enter cost overrun percentage"
          keyboardType="numeric"
        />

        <Input
          label="Safety Incident Count"
          value={formData.Safety_Incident_Count?.toString() || ''}
          onChangeText={(value) => handleInputChange('Safety_Incident_Count', parseInt(value) || 0)}
          placeholder="Enter safety incident count"
          keyboardType="numeric"
        />

        <Input
          label="Resource Allocation Efficiency (0-1)"
          value={formData.Resource_Allocation_Efficiency?.toString() || ''}
          onChangeText={(value) => handleInputChange('Resource_Allocation_Efficiency', parseFloat(value) || 0)}
          placeholder="Enter resource allocation efficiency"
          keyboardType="numeric"
        />

        <Input
          label="Max Vibration (mm/s)"
          value={formData.Max_Vibration_mm_s?.toString() || ''}
          onChangeText={(value) => handleInputChange('Max_Vibration_mm_s', parseFloat(value) || 0)}
          placeholder="Enter max vibration"
          keyboardType="numeric"
        />

        <Input
          label="Average Tilt (degrees)"
          value={formData.Avg_Tilt_deg?.toString() || ''}
          onChangeText={(value) => handleInputChange('Avg_Tilt_deg', parseFloat(value) || 0)}
          placeholder="Enter average tilt"
          keyboardType="numeric"
        />

        <Input
          label="Average Temperature (°C)"
          value={formData.Avg_Temperature_C?.toString() || ''}
          onChangeText={(value) => handleInputChange('Avg_Temperature_C', parseFloat(value) || 0)}
          placeholder="Enter average temperature"
          keyboardType="numeric"
        />

        <Input
          label="Humidity (%)"
          value={formData['Humidity_%']?.toString() || ''}
          onChangeText={(value) => handleInputChange('Humidity_%', parseFloat(value) || 0)}
          placeholder="Enter humidity percentage"
          keyboardType="numeric"
        />

        <Input
          label="Equipment Usage Rate (%)"
          value={formData['Equipment_Usage_Rate_%']?.toString() || ''}
          onChangeText={(value) => handleInputChange('Equipment_Usage_Rate_%', parseFloat(value) || 0)}
          placeholder="Enter equipment usage rate"
          keyboardType="numeric"
        />

        <Input
          label="Crane Alerts Count"
          value={formData.Crane_Alerts_Count?.toString() || ''}
          onChangeText={(value) => handleInputChange('Crane_Alerts_Count', parseInt(value) || 0)}
          placeholder="Enter crane alerts count"
          keyboardType="numeric"
        />

        <Input
          label="COBie Assets"
          value={formData.COBie_Assets?.toString() || ''}
          onChangeText={(value) => handleInputChange('COBie_Assets', parseInt(value) || 0)}
          placeholder="Enter COBie assets count"
          keyboardType="numeric"
        />

        <Input
          label="COBie Systems"
          value={formData.COBie_Systems?.toString() || ''}
          onChangeText={(value) => handleInputChange('COBie_Systems', parseInt(value) || 0)}
          placeholder="Enter COBie systems count"
          keyboardType="numeric"
        />

        <Button
          title="Predict Risk"
          onPress={handleSubmit}
          loading={loading}
          style={styles.submitButton}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    padding: 24,
  },
  pickerContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  picker: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    minHeight: 56,
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#3B82F6',
  },
});