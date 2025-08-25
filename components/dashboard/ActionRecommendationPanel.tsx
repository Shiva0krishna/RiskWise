import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lightbulb, TriangleAlert as AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react-native';

interface ActionRecommendationPanelProps {
  recommendations: string[];
  loading?: boolean;
}

export function ActionRecommendationPanel({ recommendations, loading = false }: ActionRecommendationPanelProps) {
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Lightbulb color="#F59E0B" size={24} />
          <View style={styles.headerText}>
            <Text style={styles.title}>AI Recommendations</Text>
            <Text style={styles.subtitle}>Generating insights...</Text>
          </View>
        </View>
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>🤖 AI is analyzing your project data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Lightbulb color="#F59E0B" size={24} />
        <View style={styles.headerText}>
          <Text style={styles.title}>AI Recommendations</Text>
          <Text style={styles.subtitle}>AI-generated insights and next steps</Text>
        </View>
      </View>
      
      <View style={styles.recommendationsContainer}>
        {recommendations.length > 0 ? (
          recommendations.map((recommendation, index) => {
            return (
              <TouchableOpacity
                key={index}
                style={styles.recommendationCard}
                activeOpacity={0.7}
              >
                <View style={styles.recommendationHeader}>
                  <View style={styles.recommendationNumber}>
                    <Text style={styles.numberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationText}>
                      {recommendation}
                    </Text>
                  </View>
                  <View style={styles.actionIcon}>
                    <ArrowRight color="#9CA3AF" size={16} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Lightbulb color="#9CA3AF" size={48} />
            <Text style={styles.emptyStateText}>No recommendations available</Text>
            <Text style={styles.emptyStateSubtext}>
              Recommendations will appear based on risk analysis
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
                    </View>
                  </View>
                  <ArrowRight color="#9CA3AF" size={16} />
                </View>
                
                <View style={styles.actionSection}>
                  <Text style={styles.actionLabel}>Recommended Action:</Text>
                  <Text style={styles.actionText}>{recommendation.action}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Lightbulb color="#9CA3AF" size={48} />
            <Text style={styles.emptyStateText}>No recommendations available</Text>
            <Text style={styles.emptyStateSubtext}>
              Recommendations will appear based on risk analysis
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recommendationNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  numberText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
    fontWeight: '500',
  },
  actionIcon: {
    marginLeft: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 20,
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    marginLeft: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  prioritySection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  priorityIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recommendationInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  recommendationDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  actionSection: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});