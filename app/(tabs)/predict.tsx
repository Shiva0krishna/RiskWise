import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Button,
  Alert,
} from 'react-native';
import { FileText, Database, MessageSquare, TriangleAlert as AlertTriangle, TrendingUp, CircleCheck as CheckCircle } from 'lucide-react-native';
import { BuildingDataForm } from '@/components/forms/BuildingDataForm';

interface PredictionResult {
  Predicted_Risk: string;
  proba_High: number;
  proba_Medium: number;
  proba_Low: number;
  description: string;
}

export default function PredictScreen() {
  const [activeTab, setActiveTab] = useState<'form' | 'text'>('form');
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [inputText, setInputText] = useState('');

  const tabs = [
    { id: 'form', title: 'Form Input', icon: Database },
    // CSV is disabled for now
    // { id: 'csv', title: 'CSV Upload', icon: FileText },
    { id: 'text', title: 'Text Input', icon: MessageSquare },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'High': return AlertTriangle;
      case 'Medium': return TrendingUp;
      case 'Low': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const handlePredictionComplete = (results: PredictionResult[]) => {
    setPredictionResults(results);
  };

  // 📌 Call backend for text prediction
  const handleTextPrediction = async () => {
    if (!inputText.trim()) {
      Alert.alert("Input Required", "Please enter some text for prediction.");
      return;
    }
    try {
      const response = await fetch("http://127.0.0.1:8000/predict/text", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
        },
        body: inputText,
      });

      if (!response.ok) throw new Error("Failed to fetch predictions");
      const data = await response.json();

      if (data && data.predictions) {
        setPredictionResults([data.predictions]);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to fetch prediction from API");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Risk Prediction</Text>
        <Text style={styles.subtitle}>
          Analyze building construction risks using AI
        </Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
            ]}
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
          <BuildingDataForm onPredictionComplete={handlePredictionComplete} />
        )}

        {activeTab === 'text' && (
          <View style={styles.textInputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Enter building/project details..."
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <Button title="Predict Risk" onPress={handleTextPrediction} />
          </View>
        )}
      </View>

      {/* Results */}
      {predictionResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Prediction Results</Text>
          <ScrollView style={styles.resultsList}>
            {predictionResults.map((result, index) => {
              const RiskIcon = getRiskIcon(result.Predicted_Risk);
              return (
                <View key={index} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <View style={[
                      styles.resultIcon,
                      { backgroundColor: `${getRiskColor(result.Predicted_Risk)}15` }
                    ]}>
                      <RiskIcon color={getRiskColor(result.Predicted_Risk)} size={24} />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultRisk}>
                        Risk Level: {result.Predicted_Risk}
                      </Text>
                      <Text style={styles.resultDescription}>
                        {result.description}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.probabilitySection}>
                    <Text style={styles.probabilityTitle}>Risk Probabilities:</Text>
                    {['High', 'Medium', 'Low'].map(level => {
                      const prob = result[`proba_${level}` as keyof PredictionResult] as number;
                      const percentage = Math.round(prob * 100);
                      return (
                        <View key={level} style={styles.probabilityItem}>
                          <Text style={styles.probabilityLabel}>
                            {level}: {percentage}%
                          </Text>
                          <View style={styles.probabilityBarContainer}>
                            <View
                              style={[
                                styles.probabilityBar,
                                {
                                  width: `${percentage}%`,
                                  backgroundColor: getRiskColor(level),
                                },
                              ]}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 },
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
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 8, gap: 8,
  },
  activeTab: { backgroundColor: '#EBF8FF' },
  tabText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  activeTabText: { color: '#3B82F6', fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 24 },
  textInputContainer: { marginBottom: 20 },
  textInput: {
    height: 120, borderColor: '#D1D5DB', borderWidth: 1, borderRadius: 8,
    padding: 12, marginBottom: 12, backgroundColor: '#FFFFFF', textAlignVertical: 'top',
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  resultsTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  resultsList: { flex: 1 },
  resultCard: { backgroundColor: '#F9FAFB', padding: 16, borderRadius: 12, marginBottom: 12 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  resultIcon: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginRight: 16,
  },
  resultInfo: { flex: 1 },
  resultRisk: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  resultDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  probabilitySection: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  probabilityTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  probabilityItem: { marginBottom: 8 },
  probabilityLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  probabilityBarContainer: { height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' },
  probabilityBar: { height: '100%', borderRadius: 3 },
});
