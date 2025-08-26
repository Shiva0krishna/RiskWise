import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { ChartBar as BarChart3, FileText, Calendar, TriangleAlert as AlertTriangle, TrendingUp, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Prediction {
  id: string;
  prediction_type: 'csv' | 'json' | 'text';
  input_data: any;
  results: any[];
  file_name: string | null;
  created_at: string;
}

export default function PredictionsScreen() {
  const { user } = useAuth();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null);

  const loadPredictions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPredictions(data || []);
    } catch (error) {
      console.error('Error loading predictions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadPredictions();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPredictions();
  };

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
      default: return BarChart3;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'csv': return FileText;
      case 'json': return BarChart3;
      case 'text': return FileText;
      default: return FileText;
    }
  };

  const calculateRiskSummary = (results: any[]) => {
    const summary = { High: 0, Medium: 0, Low: 0 };
    if (Array.isArray(results) && results.length > 0) {
      results.forEach(result => {
        if (result && result.Predicted_Risk && result.Predicted_Risk in summary) {
          summary[result.Predicted_Risk as keyof typeof summary]++;
        }
      });
    }
    return summary;
  };

  if (selectedPrediction) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setSelectedPrediction(null)}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Prediction Details</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <View style={styles.detailIcon}>
                {React.createElement(getTypeIcon(selectedPrediction.prediction_type), {
                  color: '#3B82F6',
                  size: 24,
                })}
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailTitle}>
                  {selectedPrediction.prediction_type.toUpperCase()} Prediction
                </Text>
                <Text style={styles.detailDate}>
                  {new Date(selectedPrediction.created_at).toLocaleString()}
                </Text>
                {selectedPrediction.file_name && (
                  <Text style={styles.detailFileName}>
                    File: {selectedPrediction.file_name}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.resultsSummary}>
              <Text style={styles.summaryTitle}>Risk Summary</Text>
              <View style={styles.riskCounts}>
                {Object.entries(calculateRiskSummary(selectedPrediction.results)).map(([risk, count]) => (
                  <View key={risk} style={styles.riskCount}>
                    <View style={[styles.riskDot, { backgroundColor: getRiskColor(risk) }]} />
                    <Text style={styles.riskCountText}>{risk}: {count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Individual Results</Text>
            {Array.isArray(selectedPrediction.results) && selectedPrediction.results.map((result, index) => {
              if (!result || !result.Predicted_Risk) return null;
              const RiskIcon = getRiskIcon(result.Predicted_Risk);
              return (
                <View key={index} style={styles.resultItem}>
                  <View style={styles.resultHeader}>
                    <View style={[
                      styles.resultIcon,
                      { backgroundColor: `${getRiskColor(result.Predicted_Risk)}15` }
                    ]}>
                      <RiskIcon color={getRiskColor(result.Predicted_Risk)} size={20} />
                    </View>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultRisk}>
                        Risk Level: {result.Predicted_Risk}
                      </Text>
                      <Text style={styles.resultDescription}>
                        {result.description || 'No description available'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.probabilitySection}>
                    <Text style={styles.probabilityTitle}>Risk Probabilities:</Text>
                    <View style={styles.probabilityBars}>
                      {['High', 'Medium', 'Low'].map(level => {
                        const prob = result[`proba_${level}`] || 0;
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
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>Prediction History</Text>
        <Text style={styles.subtitle}>
          View and analyze your risk prediction results
        </Text>
      </View>

      <View style={styles.content}>
        {predictions.length > 0 ? (
          <View style={styles.predictionsContainer}>
            {predictions.map((prediction) => {
              const TypeIcon = getTypeIcon(prediction.prediction_type);
              const riskSummary = calculateRiskSummary(prediction.results);
              const totalResults = Array.isArray(prediction.results) ? prediction.results.length : 0;

              return (
                <TouchableOpacity
                  key={prediction.id}
                  style={styles.predictionCard}
                  onPress={() => setSelectedPrediction(prediction)}
                >
                  <View style={styles.predictionHeader}>
                    <View style={styles.predictionIcon}>
                      <TypeIcon color="#3B82F6" size={24} />
                    </View>
                    <View style={styles.predictionInfo}>
                      <Text style={styles.predictionType}>
                        {prediction.prediction_type.toUpperCase()} Prediction
                      </Text>
                      <Text style={styles.predictionDate}>
                        {new Date(prediction.created_at).toLocaleDateString()}
                      </Text>
                      {prediction.file_name && (
                        <Text style={styles.predictionFileName}>
                          {prediction.file_name}
                        </Text>
                      )}
                    </View>
                    <View style={styles.predictionStats}>
                      <Text style={styles.totalResults}>{totalResults}</Text>
                      <Text style={styles.totalResultsLabel}>Results</Text>
                    </View>
                  </View>

                  <View style={styles.predictionSummary}>
                    <View style={styles.riskSummaryContainer}>
                      {Object.entries(riskSummary).map(([risk, count]) => (
                        <View key={risk} style={styles.riskSummaryItem}>
                          <View style={[styles.riskDot, { backgroundColor: getRiskColor(risk) }]} />
                          <Text style={styles.riskSummaryText}>
                            {risk}: {count}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <BarChart3 color="#9CA3AF" size={64} />
            <Text style={styles.emptyStateTitle}>No Predictions Yet</Text>
            <Text style={styles.emptyStateText}>
              Use the Predict tab to create your first risk assessment
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  content: {
    padding: 24,
  },
  predictionsContainer: {
    gap: 16,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  predictionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  predictionDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  predictionFileName: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  predictionStats: {
    alignItems: 'center',
  },
  totalResults: {
    fontSize: 24,
    fontWeight: '700',
    color: '#3B82F6',
  },
  totalResultsLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  predictionSummary: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  riskSummaryContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  riskSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  riskSummaryText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  detailIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  detailInfo: {
    flex: 1,
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  detailDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  detailFileName: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  resultsSummary: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  riskCounts: {
    flexDirection: 'row',
    gap: 20,
  },
  riskCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskCountText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  resultsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  resultItem: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultRisk: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  probabilitySection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  probabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  probabilityBars: {
    gap: 8,
  },
  probabilityItem: {
    marginBottom: 8,
  },
  probabilityLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  probabilityBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  probabilityBar: {
    height: '100%',
    borderRadius: 3,
  },
});