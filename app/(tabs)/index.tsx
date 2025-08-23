import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChartBar as BarChart3, FileText, Shield, TrendingUp, TriangleAlert as AlertTriangle, CircleCheck as CheckCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalPredictions: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  recentPredictions: any[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalPredictions: 0,
    highRiskCount: 0,
    mediumRiskCount: 0,
    lowRiskCount: 0,
    recentPredictions: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      const { data: predictions, error } = await supabase
        .from('predictions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalPredictions = predictions?.length || 0;
      let highRiskCount = 0;
      let mediumRiskCount = 0;
      let lowRiskCount = 0;

      predictions?.forEach((prediction) => {
        const results = prediction.results;
        if (Array.isArray(results)) {
          results.forEach((result) => {
            if (result.Predicted_Risk === 'High') highRiskCount++;
            else if (result.Predicted_Risk === 'Medium') mediumRiskCount++;
            else if (result.Predicted_Risk === 'Low') lowRiskCount++;
          });
        }
      });

      setStats({
        totalPredictions,
        highRiskCount,
        mediumRiskCount,
        lowRiskCount,
        recentPredictions: predictions?.slice(0, 5) || [],
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const quickActions = [
    {
      icon: FileText,
      title: 'Upload CSV',
      description: 'Batch risk prediction',
      color: '#3B82F6',
      route: '/(tabs)/upload',
    },
    {
      icon: BarChart3,
      title: 'View Predictions',
      description: 'Analysis history',
      color: '#10B981',
      route: '/(tabs)/predictions',
    },
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
      default: return Shield;
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#3B82F6', '#6366F1']}
        style={styles.header}
      >
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.user_metadata?.full_name || 'User'}!</Text>
        <Text style={styles.subtitle}>Risk Assessment Dashboard</Text>
      </LinearGradient>

      <View style={styles.content}>
        {/* Stats Overview */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <BarChart3 color="#3B82F6" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.totalPredictions}</Text>
            <Text style={styles.statLabel}>Total Predictions</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle color="#EF4444" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.highRiskCount}</Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#FFFBEB' }]}>
              <TrendingUp color="#F59E0B" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.mediumRiskCount}</Text>
            <Text style={styles.statLabel}>Medium Risk</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: '#F0FDF4' }]}>
              <CheckCircle color="#10B981" size={24} />
            </View>
            <Text style={styles.statValue}>{stats.lowRiskCount}</Text>
            <Text style={styles.statLabel}>Low Risk</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            {quickActions.map((action, index) => (
              <TouchableOpacity key={index} style={styles.actionCard}>
                <View style={[styles.actionIcon, { backgroundColor: `${action.color}15` }]}>
                  <action.icon color={action.color} size={28} />
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>{action.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Predictions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Predictions</Text>
          {stats.recentPredictions.length > 0 ? (
            <View style={styles.predictionsContainer}>
              {stats.recentPredictions.map((prediction, index) => {
                const firstResult = Array.isArray(prediction.results) ? prediction.results[0] : null;
                const RiskIcon = firstResult ? getRiskIcon(firstResult.Predicted_Risk) : Shield;
                
                return (
                  <View key={index} style={styles.predictionCard}>
                    <View style={styles.predictionHeader}>
                      <View style={[
                        styles.predictionIcon,
                        { backgroundColor: `${getRiskColor(firstResult?.Predicted_Risk || 'Low')}15` }
                      ]}>
                        <RiskIcon 
                          color={getRiskColor(firstResult?.Predicted_Risk || 'Low')} 
                          size={20} 
                        />
                      </View>
                      <View style={styles.predictionInfo}>
                        <Text style={styles.predictionType}>
                          {prediction.prediction_type.toUpperCase()} Prediction
                        </Text>
                        <Text style={styles.predictionDate}>
                          {new Date(prediction.created_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <View style={styles.predictionRisk}>
                        <Text style={[
                          styles.riskBadge,
                          { color: getRiskColor(firstResult?.Predicted_Risk || 'Low') }
                        ]}>
                          {firstResult?.Predicted_Risk || 'Unknown'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Shield color="#9CA3AF" size={48} />
              <Text style={styles.emptyStateText}>No predictions yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Upload a CSV file or create a prediction to get started
              </Text>
            </View>
          )}
        </View>
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
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#D1D5DB',
  },
  content: {
    padding: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EBF8FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  predictionsContainer: {
    gap: 12,
  },
  predictionCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  predictionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  predictionInfo: {
    flex: 1,
  },
  predictionType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  predictionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  predictionRisk: {
    alignItems: 'flex-end',
  },
  riskBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});