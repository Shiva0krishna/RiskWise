import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import {
  FileText,
  Database,
  MessageSquare,
  TriangleAlert as AlertTriangle,
  TrendingUp,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ApiService } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { BuildingDataForm } from '@/components/forms/BuildingDataForm';
import { ProjectSelector } from '@/components/dashboard/ProjectSelector';
import { Button } from '@/components/ui/Button';
import { PredictionResults } from '@/components/prediction/PredictionResults';

interface Project {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  structural_system: string | null;
  progress_percent: number | null;
  created_at: string;
  updated_at: string;
}

interface PredictionResult {
  Predicted_Risk: string;
  proba_High: number;
  proba_Medium: number;
  proba_Low: number;
  description: string;
}

export default function PredictScreen() {
  const [activeTab, setActiveTab] = useState<'form' | 'text'>('form');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [inputText, setInputText] = useState('');
  const [saveToProject, setSaveToProject] = useState(true);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const tabs = [
    { id: 'form', title: 'Form Input', icon: Database },
    { id: 'text', title: 'Text Input', icon: MessageSquare },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High':
        return '#EF4444';
      case 'Medium':
        return '#F59E0B';
      case 'Low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'High':
        return AlertTriangle;
      case 'Medium':
        return TrendingUp;
      case 'Low':
        return CheckCircle;
      default:
        return CheckCircle;
    }
  };

  const handlePredictionComplete = (results: PredictionResult[]) => {
    setPredictionResults(results);
  };

  const handleTextPrediction = async () => {
    if (!inputText.trim()) {
      Alert.alert('Input Required', 'Please enter some text for prediction.');
      return;
    }
    
    setLoading(true);
    try {
      const predictions = await ApiService.predictFromText(inputText);
      
      // Save to database if user wants to save to project
      if (saveToProject && user) {
        const { error } = await supabase.from('predictions').insert({
          user_id: user.id,
          prediction_type: 'text',
          input_data: { interactive_text: inputText },
          results: predictions,
          project_id: selectedProject?.id || null,
          risk_level: predictions.length > 0 ? predictions[0].Predicted_Risk : null,
          confidence: predictions.length > 0 ? Math.max(
            predictions[0].proba_High || 0,
            predictions[0].proba_Medium || 0,
            predictions[0].proba_Low || 0
          ) : null,
        });

        if (error) throw error;
      } else if (user) {
        // Save without project association
        const { error } = await supabase.from('predictions').insert({
          user_id: user.id,
          prediction_type: 'text',
          input_data: { interactive_text: inputText },
          results: predictions,
          project_id: null,
        });

        if (error) throw error;
      }

      setPredictionResults(predictions);
      
      if (!saveToProject) {
        Alert.alert('Prediction Complete', 'Results generated (not saved to project)');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to get prediction from API');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Risk Prediction</Text>
        <Text style={styles.subtitle}>
          Analyze building construction risks using AI
        </Text>
      </View>

      <ProjectSelector
        selectedProject={selectedProject}
        onProjectSelect={setSelectedProject}
      />

      {/* Save to Project Toggle */}
      <View style={styles.saveToggleContainer}>
        <View style={styles.saveToggleContent}>
          <Text style={styles.saveToggleLabel}>Save to Project</Text>
          <Text style={styles.saveToggleDescription}>
            {saveToProject 
              ? 'Predictions will be saved to the selected project' 
              : 'Predictions will be generated for knowledge only'}
          </Text>
        </View>
        <Switch
          value={saveToProject}
          onValueChange={setSaveToProject}
          trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
          thumbColor={saveToProject ? '#3B82F6' : '#6B7280'}
        />
      </View>
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id as any)}
          >
            <tab.icon
              color={activeTab === tab.id ? '#3B82F6' : '#6B7280'}
              size={20}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === tab.id && styles.activeTabText,
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeTab === 'form' && (
          <BuildingDataForm 
            onPredictionComplete={handlePredictionComplete}
            selectedProject={selectedProject}
            saveToProject={saveToProject}
          />
        )}

        {activeTab === 'text' && (
          <View style={styles.textInputContainer}>
            <Text style={styles.textInputTitle}>Interactive Text Prediction</Text>
            <Text style={styles.textInputSubtitle}>
              Describe your building project in natural language
            </Text>
            <TextInput
              style={styles.textInput}
              placeholder="Example: 'A 20-story concrete building in London with steel frame structure, currently 75% complete, experiencing some delays and cost overruns...'"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <Button 
              title="Predict Risk" 
              onPress={handleTextPrediction}
              loading={loading}
            />
          </View>
        )}

        {/* Results directly below input */}
        {predictionResults.length > 0 && (
          <PredictionResults results={predictionResults} />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: '#6B7280' },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  activeTab: { backgroundColor: '#EBF8FF' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  activeTabText: { color: '#3B82F6', fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 24 },
  saveToggleContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  saveToggleContent: {
    flex: 1,
    marginRight: 16,
  },
  saveToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  saveToggleDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  textInputContainer: { marginBottom: 20 },
  textInputTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  textInputSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  textInput: {
    height: 140,
    borderColor: '#D1D5DB',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    textAlignVertical: 'top',
    fontSize: 16,
    lineHeight: 24,
  },
});