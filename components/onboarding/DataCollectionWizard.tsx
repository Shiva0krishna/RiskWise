import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Building, MapPin, Settings, CircleCheck as CheckCircle } from 'lucide-react-native';
import { Picker } from '@react-native-picker/picker';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: any;
}

interface ProjectData {
  name: string;
  description: string;
  city: string;
  structural_system: string;
  progress_percent: number;
}

interface SampleBuildingData {
  building_id: string;
  floors: number;
  height_m: number;
  total_area_m2: number;
  material: string;
  structural_risk_index: number;
  facade_complexity_index: number;
  project_duration_days: number;
  delay_index: number;
  cost_overrun_percent: number;
  safety_incident_count: number;
  resource_allocation_efficiency: number;
  max_vibration_mm_s: number;
  avg_tilt_deg: number;
  avg_temperature_c: number;
  humidity_percent: number;
  equipment_usage_rate_percent: number;
  crane_alerts_count: number;
  cobie_assets: number;
  cobie_systems: number;
}

interface DataCollectionWizardProps {
  onComplete: () => void;
}

export function DataCollectionWizard({ onComplete }: DataCollectionWizardProps) {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState<ProjectData>({
    name: '',
    description: '',
    city: '',
    structural_system: 'Frame',
    progress_percent: 0,
  });
  const [sampleData, setSampleData] = useState<SampleBuildingData>({
    building_id: '',
    floors: 10,
    height_m: 30,
    total_area_m2: 5000,
    material: 'Concrete',
    structural_risk_index: 0.3,
    facade_complexity_index: 0.4,
    project_duration_days: 365,
    delay_index: 0.1,
    cost_overrun_percent: 5,
    safety_incident_count: 1,
    resource_allocation_efficiency: 0.8,
    max_vibration_mm_s: 2.5,
    avg_tilt_deg: 0.1,
    avg_temperature_c: 22,
    humidity_percent: 60,
    equipment_usage_rate_percent: 75,
    crane_alerts_count: 2,
    cobie_assets: 150,
    cobie_systems: 25,
  });

  const steps: WizardStep[] = [
    {
      id: 'project',
      title: 'Create Your First Project',
      description: 'Set up a construction project to start monitoring risks',
      icon: Building,
    },
    {
      id: 'location',
      title: 'Project Details',
      description: 'Add location and structural system information',
      icon: MapPin,
    },
    {
      id: 'sample-data',
      title: 'Sample Building Data',
      description: 'Add initial building data to populate your dashboard',
      icon: Settings,
    },
    {
      id: 'complete',
      title: 'Setup Complete',
      description: 'Your dashboard is ready with sample data',
      icon: CheckCircle,
    },
  ];

  const materials = ['Concrete', 'Steel', 'Wood', 'Masonry', 'Composite'];
  const structuralSystems = ['Frame', 'Shear Wall', 'Truss', 'Arch', 'Shell', 'Mega-Frame'];

  const handleNext = async () => {
    if (currentStep === steps.length - 1) {
      onComplete();
      return;
    }

    if (currentStep === 2) {
      await createProjectWithData();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const createProjectWithData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: projectData.name,
          description: projectData.description,
          city: projectData.city,
          structural_system: projectData.structural_system,
          progress_percent: projectData.progress_percent,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Create sample building data
      const { data: buildingData, error: buildingError } = await supabase
        .from('building_data')
        .insert({
          user_id: user.id,
          project_id: project.id,
          building_id: sampleData.building_id || `${project.name}-BLDG-001`,
          city: projectData.city,
          comparable_project: `${projectData.city} Reference Project`,
          floors: sampleData.floors,
          height_m: sampleData.height_m,
          total_area_m2: sampleData.total_area_m2,
          material: sampleData.material,
          structural_system: projectData.structural_system,
          structural_risk_index: sampleData.structural_risk_index,
          facade_complexity_index: sampleData.facade_complexity_index,
          project_duration_days: sampleData.project_duration_days,
          delay_index: sampleData.delay_index,
          cost_overrun_percent: sampleData.cost_overrun_percent,
          safety_incident_count: sampleData.safety_incident_count,
          resource_allocation_efficiency: sampleData.resource_allocation_efficiency,
          max_vibration_mm_s: sampleData.max_vibration_mm_s,
          avg_tilt_deg: sampleData.avg_tilt_deg,
          avg_temperature_c: sampleData.avg_temperature_c,
          humidity_percent: sampleData.humidity_percent,
          equipment_usage_rate_percent: sampleData.equipment_usage_rate_percent,
          crane_alerts_count: sampleData.crane_alerts_count,
          cobie_assets: sampleData.cobie_assets,
          cobie_systems: sampleData.cobie_systems,
        })
        .select()
        .single();

      if (buildingError) throw buildingError;

      // Create sample prediction
      const samplePrediction = {
        Predicted_Risk: sampleData.delay_index > 0.3 ? 'High' : sampleData.delay_index > 0.15 ? 'Medium' : 'Low',
        proba_High: sampleData.delay_index > 0.3 ? 0.75 : 0.15,
        proba_Medium: sampleData.delay_index > 0.15 ? 0.6 : 0.25,
        proba_Low: sampleData.delay_index <= 0.15 ? 0.8 : 0.1,
        description: 'Initial risk assessment based on project parameters',
      };

      const { error: predictionError } = await supabase
        .from('predictions')
        .insert({
          user_id: user.id,
          project_id: project.id,
          prediction_type: 'json',
          input_data: sampleData,
          results: [samplePrediction],
          risk_level: samplePrediction.Predicted_Risk,
          confidence: Math.max(samplePrediction.proba_High, samplePrediction.proba_Medium, samplePrediction.proba_Low),
          building_data_id: buildingData.id,
        });

      if (predictionError) throw predictionError;

      setCurrentStep(prev => prev + 1);
    } catch (error) {
      console.error('Error creating project:', error);
      Alert.alert('Error', 'Failed to create project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 0:
        return projectData.name.trim().length > 0;
      case 1:
        return projectData.city.trim().length > 0 && projectData.structural_system.length > 0;
      case 2:
        return sampleData.building_id.trim().length > 0;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.stepContent}>
            <Input
              label="Project Name"
              value={projectData.name}
              onChangeText={(value) => setProjectData(prev => ({ ...prev, name: value }))}
              placeholder="e.g., Downtown Office Complex"
            />
            <Input
              label="Project Description"
              value={projectData.description}
              onChangeText={(value) => setProjectData(prev => ({ ...prev, description: value }))}
              placeholder="Brief description of the project"
              multiline
            />
            <Input
              label="Progress Percentage"
              value={projectData.progress_percent.toString()}
              onChangeText={(value) => setProjectData(prev => ({ 
                ...prev, 
                progress_percent: parseFloat(value) || 0 
              }))}
              placeholder="Current completion percentage"
              keyboardType="numeric"
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.stepContent}>
            <Input
              label="City"
              value={projectData.city}
              onChangeText={(value) => setProjectData(prev => ({ ...prev, city: value }))}
              placeholder="e.g., London, New York, Tokyo"
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.label}>Structural System</Text>
              <View style={styles.picker}>
                <Picker
                  selectedValue={projectData.structural_system}
                  onValueChange={(value) => setProjectData(prev => ({ ...prev, structural_system: value }))}
                >
                  {structuralSystems.map((system) => (
                    <Picker.Item key={system} label={system} value={system} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepDescription}>
              Add initial building data to populate your dashboard with meaningful insights.
            </Text>
            
            <Input
              label="Building ID"
              value={sampleData.building_id}
              onChangeText={(value) => setSampleData(prev => ({ ...prev, building_id: value }))}
              placeholder={`${projectData.name}-BLDG-001`}
            />

            <View style={styles.quickFillContainer}>
              <Text style={styles.quickFillTitle}>Quick Fill Options:</Text>
              <View style={styles.quickFillButtons}>
                <TouchableOpacity
                  style={styles.quickFillButton}
                  onPress={() => setSampleData(prev => ({
                    ...prev,
                    floors: 15,
                    height_m: 45,
                    total_area_m2: 8000,
                    delay_index: 0.4,
                    cost_overrun_percent: 18,
                    safety_incident_count: 4,
                  }))}
                >
                  <Text style={styles.quickFillButtonText}>High Risk Sample</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickFillButton}
                  onPress={() => setSampleData(prev => ({
                    ...prev,
                    floors: 8,
                    height_m: 25,
                    total_area_m2: 3000,
                    delay_index: 0.05,
                    cost_overrun_percent: 2,
                    safety_incident_count: 0,
                  }))}
                >
                  <Text style={styles.quickFillButtonText}>Low Risk Sample</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.sampleDataGrid}>
              <Input
                label="Floors"
                value={sampleData.floors.toString()}
                onChangeText={(value) => setSampleData(prev => ({ 
                  ...prev, 
                  floors: parseInt(value) || 0 
                }))}
                keyboardType="numeric"
              />
              <Input
                label="Height (m)"
                value={sampleData.height_m.toString()}
                onChangeText={(value) => setSampleData(prev => ({ 
                  ...prev, 
                  height_m: parseFloat(value) || 0 
                }))}
                keyboardType="numeric"
              />
              <Input
                label="Total Area (m²)"
                value={sampleData.total_area_m2.toString()}
                onChangeText={(value) => setSampleData(prev => ({ 
                  ...prev, 
                  total_area_m2: parseFloat(value) || 0 
                }))}
                keyboardType="numeric"
              />
              
              <View style={styles.pickerContainer}>
                <Text style={styles.label}>Material</Text>
                <View style={styles.picker}>
                  <Picker
                    selectedValue={sampleData.material}
                    onValueChange={(value) => setSampleData(prev => ({ ...prev, material: value }))}
                  >
                    {materials.map((material) => (
                      <Picker.Item key={material} label={material} value={material} />
                    ))}
                  </Picker>
                </View>
              </View>

              <Input
                label="Delay Index (0-1)"
                value={sampleData.delay_index.toString()}
                onChangeText={(value) => setSampleData(prev => ({ 
                  ...prev, 
                  delay_index: parseFloat(value) || 0 
                }))}
                keyboardType="numeric"
              />
              <Input
                label="Cost Overrun (%)"
                value={sampleData.cost_overrun_percent.toString()}
                onChangeText={(value) => setSampleData(prev => ({ 
                  ...prev, 
                  cost_overrun_percent: parseFloat(value) || 0 
                }))}
                keyboardType="numeric"
              />
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <View style={styles.completionContainer}>
              <CheckCircle color="#10B981" size={64} />
              <Text style={styles.completionTitle}>Setup Complete!</Text>
              <Text style={styles.completionDescription}>
                Your project "{projectData.name}" has been created with sample data. 
                You can now explore the dashboard and start monitoring risks in real-time.
              </Text>
              
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Project Summary</Text>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Name:</Text>
                  <Text style={styles.summaryValue}>{projectData.name}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Location:</Text>
                  <Text style={styles.summaryValue}>{projectData.city}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>System:</Text>
                  <Text style={styles.summaryValue}>{projectData.structural_system}</Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={styles.summaryLabel}>Progress:</Text>
                  <Text style={styles.summaryValue}>{projectData.progress_percent}%</Text>
                </View>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal visible={true} animationType="slide" presentationStyle="fullScreen">
      <LinearGradient
        colors={['#1E40AF', '#3B82F6']}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Welcome to RiskWise</Text>
          <Text style={styles.subtitle}>Let's set up your first project</Text>
          
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${((currentStep + 1) / steps.length) * 100}%` }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              Step {currentStep + 1} of {steps.length}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepIcon}>
                {React.createElement(steps[currentStep].icon, {
                  color: '#3B82F6',
                  size: 32,
                })}
              </View>
              <View style={styles.stepInfo}>
                <Text style={styles.stepTitle}>{steps[currentStep].title}</Text>
                <Text style={styles.stepDescription}>{steps[currentStep].description}</Text>
              </View>
            </View>

            {renderStepContent()}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          {currentStep > 0 && currentStep < steps.length - 1 && (
            <Button
              title="Back"
              onPress={() => setCurrentStep(prev => prev - 1)}
              variant="outline"
              style={styles.backButton}
            />
          )}
          <Button
            title={currentStep === steps.length - 1 ? 'Start Using Dashboard' : 'Continue'}
            onPress={handleNext}
            loading={loading}
            disabled={!validateCurrentStep()}
            style={styles.nextButton}
          />
        </View>
      </LinearGradient>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    textAlign: 'center',
    marginBottom: 32,
  },
  progressContainer: {
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  stepCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  stepIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  stepContent: {
    gap: 16,
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
  quickFillContainer: {
    marginBottom: 20,
  },
  quickFillTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  quickFillButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  quickFillButton: {
    flex: 1,
    backgroundColor: '#EBF8FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  quickFillButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  sampleDataGrid: {
    gap: 12,
  },
  completionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
  },
  completionDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  summaryCard: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    width: '100%',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  backButton: {
    flex: 1,
    borderColor: '#FFFFFF',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#FFFFFF',
  },
});