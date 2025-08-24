import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  FileText,
  Database,
  MessageSquare,
  TriangleAlert as AlertTriangle,
  TrendingUp,
  CircleCheck as CheckCircle,
} from 'lucide-react-native';
import { BuildingDataForm } from '@/components/forms/BuildingDataForm';
import { ApiService } from '@/lib/api'; // ✅ Make sure ApiService has predictFromText()

interface PredictionResult {
  Predicted_Risk: string;
  proba_High: number;
  proba_Medium: number;
  proba_Low: number;
  description: string;
}

export default function PredictScreen() {
  const [activeTab, setActiveTab] = useState<'form' | 'text'>('form'); // removed csv
  const [predictionResults, setPredictionResults] = useState<PredictionResult[]>([]);
  const [textInput, setTextInput] = useState('');
  const [loading, setLoading] = useState(false);

  const tabs = [
    { id: 'form', title: 'Form Input', icon: Database },
    // { id: 'csv', title: 'CSV Upload', icon: FileText }, // ❌ removed CSV
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

  // ✅ NEW: handle text prediction
  const handleTextPrediction = async () => {
    if (!textInput.trim()) return;

    try {
      setLoading(true);
      const predictions = await ApiService.predictFromText(textInput); // <-- your backend API
      setPredictionResults(predictions);
    } catch (error) {
      console.error('Text prediction error:', error);
    } finally {
      setLoading(false);
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
            <Text style={styles.inputLabel}>Enter Building Data (Text):</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Paste building details here..."
              value={textInput}
              onChangeText={setTextInput}
              multiline
            />
            <TouchableOpacity
              style={styles.predictButton}
              onPress={handleTextPrediction}
              disabled={loading}
            >
              <Text style={styles.predictButtonText}>
                {loading ? 'Predicting...' : 'Predict Risk'}
              </Text>
            </TouchableOpacity>
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
                    <View
                      style={[
                        styles.resultIcon,
                        { backgroundColor: `${getRiskColor(result.Predicted_Risk)}15` },
                      ]}
                    >
                      <RiskIcon
                        color={getRiskColor(result.Predicted_Risk)}
                        size={24}
                      />
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
                    {['High', 'Medium', 'Low'].map((level) => {
                      const prob =
                        result[`proba_${level}` as keyof PredictionResult] as number;
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
  content: { flex: 1 },
  textInputContainer: { padding: 20 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#374151' },
  textInput: {
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  predictButton: {
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  predictButtonText: { color: '#FFF', fontWeight: '600', fontSize: 16 },
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
  resultCard: {
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  resultInfo: { flex: 1 },
  resultRisk: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 4 },
  resultDescription: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  probabilitySection: { paddingTop: 16, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  probabilityTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  probabilityItem: { marginBottom: 8 },
  probabilityLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4, fontWeight: '500' },
  probabilityBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  probabilityBar: { height: '100%', borderRadius: 3 },
});
