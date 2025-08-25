import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Lightbulb, TriangleAlert as AlertTriangle, TrendingUp, ArrowRight } from 'lucide-react-native';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'schedule' | 'cost' | 'safety' | 'quality';
  action: string;
}

interface ActionRecommendationPanelProps {
  recommendations: Recommendation[];
}

export function ActionRecommendationPanel({ recommendations }: ActionRecommendationPanelProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high': return AlertTriangle;
      case 'medium': return TrendingUp;
      case 'low': return Lightbulb;
      default: return Lightbulb;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'schedule': return '#3B82F6';
      case 'cost': return '#EF4444';
      case 'safety': return '#F59E0B';
      case 'quality': return '#10B981';
      default: return '#6B7280';
    }
  };

  const sortedRecommendations = recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Lightbulb color="#F59E0B" size={24} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Action Recommendations</Text>
          <Text style={styles.subtitle}>AI-generated insights and next steps</Text>
        </View>
      </View>
      
      <View style={styles.recommendationsContainer}>
        {sortedRecommendations.length > 0 ? (
          sortedRecommendations.map((recommendation) => {
            const PriorityIcon = getPriorityIcon(recommendation.priority);
            const priorityColor = getPriorityColor(recommendation.priority);
            const categoryColor = getCategoryColor(recommendation.category);
            
            return (
              <TouchableOpacity
                key={recommendation.id}
                style={styles.recommendationCard}
                activeOpacity={0.7}
              >
                <View style={styles.recommendationHeader}>
                  <View style={styles.prioritySection}>
                    <View style={[
                      styles.priorityIcon,
                      { backgroundColor: `${priorityColor}15` }
                    ]}>
                      <PriorityIcon color={priorityColor} size={16} />
                    </View>
                    <View style={styles.recommendationInfo}>
                      <View style={styles.titleRow}>
                        <Text style={styles.recommendationTitle}>
                          {recommendation.title}
                        </Text>
                        <View style={[
                          styles.categoryBadge,
                          { backgroundColor: `${categoryColor}15` }
                        ]}>
                          <Text style={[styles.categoryText, { color: categoryColor }]}>
                            {recommendation.category}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.recommendationDescription}>
                        {recommendation.description}
                      </Text>
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