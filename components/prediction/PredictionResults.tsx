import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TriangleAlert as AlertTriangle, TrendingUp, CircleCheck as CheckCircle } from 'lucide-react-native';

interface PredictionResult {
  Predicted_Risk: string;
  proba_High: number;
  proba_Medium: number;
  proba_Low: number;
  description: string;
}

interface PredictionResultsProps {
  results: PredictionResult[];
}

export function PredictionResults({ results }: PredictionResultsProps) {
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

  if (!results || results.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Prediction Results</Text>
      <Text style={styles.subtitle}>AI risk assessment completed</Text>
      
      {results.map((result, index) => {
        const RiskIcon = getRiskIcon(result.Predicted_Risk);
        const riskColor = getRiskColor(result.Predicted_Risk);
        
        return (
          <View key={index} style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <View style={[styles.resultIcon, { backgroundColor: `${riskColor}15` }]}>
                <RiskIcon color={riskColor} size={24} />
              </View>
              <View style={styles.resultInfo}>
                <Text style={[styles.resultRisk, { color: riskColor }]}>
                  Risk Level: {result.Predicted_Risk}
                </Text>
                <Text style={styles.resultDescription}>
                  {result.description || 'Risk assessment completed'}
                </Text>
              </View>
            </View>

            <View style={styles.confidenceSection}>
              <Text style={styles.confidenceTitle}>Confidence Distribution</Text>
              <View style={styles.confidenceGrid}>
                {['High', 'Medium', 'Low'].map((level) => {
                  const prob = result[`proba_${level}` as keyof PredictionResult] as number;
                  const percentage = Math.round((prob || 0) * 100);
                  const levelColor = getRiskColor(level);
                  
                  return (
                    <View key={level} style={styles.confidenceItem}>
                      <View style={styles.confidenceHeader}>
                        <View style={[styles.confidenceDot, { backgroundColor: levelColor }]} />
                        <Text style={styles.confidenceLabel}>{level}</Text>
                      </View>
                      <Text style={[styles.confidenceValue, { color: levelColor }]}>
                        {percentage}%
                      </Text>
                      <View style={styles.confidenceBarContainer}>
                        <View
                          style={[
                            styles.confidenceBar,
                            {
                              width: `${percentage}%`,
                              backgroundColor: levelColor,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Risk Insights */}
            <View style={styles.insightsSection}>
              <Text style={styles.insightsTitle}>Key Insights</Text>
              <View style={styles.insightsList}>
                <View style={styles.insightItem}>
                  <View style={[styles.insightDot, { backgroundColor: riskColor }]} />
                  <Text style={styles.insightText}>
                    Primary risk classification: {result.Predicted_Risk}
                  </Text>
                </View>
                <View style={styles.insightItem}>
                  <View style={styles.insightDot} />
                  <Text style={styles.insightText}>
                    Confidence level: {Math.round(Math.max(
                      result.proba_High || 0,
                      result.proba_Medium || 0,
                      result.proba_Low || 0
                    ) * 100)}%
                  </Text>
                </View>
                {result.Predicted_Risk === 'High' && (
                  <View style={styles.insightItem}>
                    <View style={[styles.insightDot, { backgroundColor: '#EF4444' }]} />
                    <Text style={styles.insightText}>
                      Immediate attention required - review risk factors
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  resultInfo: {
    flex: 1,
  },
  resultRisk: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  confidenceSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    marginBottom: 20,
  },
  confidenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  confidenceGrid: {
    gap: 12,
  },
  confidenceItem: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
  },
  confidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confidenceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  confidenceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginLeft: 8,
  },
  confidenceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  confidenceBarContainer: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  confidenceBar: {
    height: '100%',
    borderRadius: 3,
  },
  insightsSection: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  insightsList: {
    gap: 8,
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3B82F6',
    marginRight: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
    lineHeight: 20,
  },
});