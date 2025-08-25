import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building, TrendingUp, Shield, Target, BarChart3 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { GeminiService } from '@/lib/gemini';
import { ProjectSelector } from '@/components/dashboard/ProjectSelector';
import { RiskGauge } from '@/components/dashboard/RiskGauge';
import { RiskDriversPanel } from '@/components/dashboard/RiskDriversPanel';
import { IoTSensorPanel } from '@/components/dashboard/IoTSensorPanel';
import { ProjectKPIPanel } from '@/components/dashboard/ProjectKPIPanel';
import { RiskTimelinePanel } from '@/components/dashboard/RiskTimelinePanel';
import { ActionRecommendationPanel } from '@/components/dashboard/ActionRecommendationPanel';

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

interface DashboardData {
  currentRisk: 'Low' | 'Medium' | 'High';
  confidence: number;
  riskDrivers: any[];
  sensorData: any;
  kpiData: any;
  timelineData: any[];
  recommendations: string[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    currentRisk: 'Low',
    confidence: 0.75,
    riskDrivers: [],
    sensorData: null,
    kpiData: null,
    timelineData: [],
    recommendations: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      loadDashboardData();
    }
  }, [selectedProject]);

  const loadDashboardData = async () => {
    if (!selectedProject || !user) return;

    try {
      // Load predictions for this project
      const { data: predictions, error: predictionsError } = await supabase
        .from('predictions')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false });

      if (predictionsError) throw predictionsError;

      // Load building data for this project
      const { data: buildingData, error: buildingError } = await supabase
        .from('building_data')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (buildingError) throw buildingError;

      // Process data for dashboard
      const processedData = await processDashboardData(predictions || [], buildingData || []);
      setDashboardData(processedData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processDashboardData = async (predictions: any[], buildingData: any[]): Promise<DashboardData> => {
    // Get latest prediction for current risk
    const latestPrediction = predictions[0];
    let currentRisk: 'Low' | 'Medium' | 'High' = 'Low';
    let confidence = 0.75;

    if (latestPrediction && latestPrediction.results && latestPrediction.results.length > 0) {
      const result = latestPrediction.results[0];
      currentRisk = result.Predicted_Risk || 'Low';
      confidence = Math.max(
        result.proba_High || 0,
        result.proba_Medium || 0,
        result.proba_Low || 0
      );
    }

    // Generate risk drivers from building data
    const riskDrivers = buildingData.length > 0 ? generateRiskDrivers(buildingData[0]) : [];

    // Generate sensor data based on building data
    const sensorData = generateSensorData(buildingData[0]);

    // Generate KPI data based on building data
    const kpiData = generateKPIData(buildingData[0], predictions);

    // Generate timeline from predictions
    const timelineData = predictions.slice(0, 10).reverse().map(p => ({
      date: p.created_at,
      riskLevel: p.results?.[0]?.Predicted_Risk || 'Low',
      confidence: Math.max(
        p.results?.[0]?.proba_High || 0,
        p.results?.[0]?.proba_Medium || 0,
        p.results?.[0]?.proba_Low || 0
      ),
    }));

    // Generate AI recommendations
    let recommendations: string[] = [];
    if (selectedProject && riskDrivers.length > 0) {
      setLoadingRecommendations(true);
      try {
        recommendations = await GeminiService.generateRecommendations(
          currentRisk,
          riskDrivers,
          selectedProject,
          sensorData
        );
      } catch (error) {
        console.error('Error generating recommendations:', error);
        recommendations = generateFallbackRecommendations(riskDrivers, currentRisk);
      } finally {
        setLoadingRecommendations(false);
      }
    }

    return {
      currentRisk,
      confidence,
      riskDrivers,
      sensorData,
      kpiData,
      timelineData,
      recommendations,
    };
  };

  const generateSensorData = (building: any) => {
    if (!building) {
      return {
        vibration: { current: 2.3, threshold: 5.0, trend: [1.8, 2.1, 2.3, 2.7, 2.3, 2.1, 2.3] },
        craneAlerts: { count: 3, weeklyTrend: [1, 2, 0, 3, 1, 2, 3] },
        tilt: { current: 0.8, threshold: 2.0 },
      };
    }

    return {
      vibration: {
        current: building.max_vibration_mm_s || 2.3,
        threshold: 5.0,
        trend: generateTrendData(building.max_vibration_mm_s || 2.3, 7),
      },
      craneAlerts: {
        count: building.crane_alerts_count || 0,
        weeklyTrend: generateTrendData(building.crane_alerts_count || 0, 7, true),
      },
      tilt: {
        current: building.avg_tilt_deg || 0.8,
        threshold: 2.0,
      },
    };
  };

  const generateKPIData = (building: any, predictions: any[]) => {
    if (!building) {
      return {
        schedule: { delayIndex: [0.1, 0.15, 0.2, 0.25, 0.35, 0.4, 0.35], currentDelay: 0.35 },
        cost: { overrunPercent: 15.2, baseline: 10.0, trend: [5, 8, 12, 15, 18, 15, 15.2] },
        efficiency: { current: 78, target: 85 },
      };
    }

    const delayIndex = building.delay_index || 0.1;
    const costOverrun = building.cost_overrun_percent || 5;
    const efficiency = (building.resource_allocation_efficiency || 0.78) * 100;

    return {
      schedule: {
        delayIndex: generateTrendData(delayIndex, 7),
        currentDelay: delayIndex,
      },
      cost: {
        overrunPercent: costOverrun,
        baseline: 10.0,
        trend: generateTrendData(costOverrun, 7),
      },
      efficiency: {
        current: Math.round(efficiency),
        target: 85,
      },
    };
  };

  const generateTrendData = (current: number, length: number, isInteger = false) => {
    const data = [];
    const variation = current * 0.3; // 30% variation
    
    for (let i = 0; i < length; i++) {
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      const value = current + (variation * randomFactor);
      data.push(isInteger ? Math.max(0, Math.round(value)) : Math.max(0, value));
    }
    
    // Ensure the last value is the current value
    data[data.length - 1] = current;
    return data;
  };

  const generateRiskDrivers = (building: any) => {
    if (!building) return [];
    
    const drivers = [];
    
    if (building.delay_index !== null) {
      drivers.push({
        factor: 'Delay Index',
        value: building.delay_index,
        threshold: 0.3,
        importance: Math.min(building.delay_index / 0.3, 1),
        status: building.delay_index > 0.3 ? 'critical' : building.delay_index > 0.2 ? 'warning' : 'normal',
      });
    }

    if (building.cost_overrun_percent !== null) {
      drivers.push({
        factor: 'Cost Overrun %',
        value: building.cost_overrun_percent,
        threshold: 10,
        importance: Math.min(building.cost_overrun_percent / 20, 1),
        status: building.cost_overrun_percent > 15 ? 'critical' : building.cost_overrun_percent > 10 ? 'warning' : 'normal',
      });
    }

    if (building.safety_incident_count !== null) {
      drivers.push({
        factor: 'Safety Incidents',
        value: building.safety_incident_count,
        threshold: 2,
        importance: Math.min(building.safety_incident_count / 5, 1),
        status: building.safety_incident_count > 3 ? 'critical' : building.safety_incident_count > 1 ? 'warning' : 'normal',
      });
    }

    if (building.structural_risk_index !== null) {
      drivers.push({
        factor: 'Structural Risk Index',
        value: building.structural_risk_index,
        threshold: 0.7,
        importance: building.structural_risk_index,
        status: building.structural_risk_index > 0.8 ? 'critical' : building.structural_risk_index > 0.6 ? 'warning' : 'normal',
      });
    }

    if (building.facade_complexity_index !== null) {
      drivers.push({
        factor: 'Facade Complexity',
        value: building.facade_complexity_index,
        threshold: 0.6,
        importance: building.facade_complexity_index,
        status: building.facade_complexity_index > 0.7 ? 'critical' : building.facade_complexity_index > 0.5 ? 'warning' : 'normal',
      });
    }

    if (building.resource_allocation_efficiency !== null) {
      drivers.push({
        factor: 'Resource Efficiency',
        value: building.resource_allocation_efficiency,
        threshold: 0.8,
        importance: 1 - building.resource_allocation_efficiency,
        status: building.resource_allocation_efficiency < 0.6 ? 'critical' : building.resource_allocation_efficiency < 0.7 ? 'warning' : 'normal',
      });
    }

    return drivers;
  };

  const generateFallbackRecommendations = (drivers: any[], riskLevel: string): string[] => {
    const recommendations: string[] = [];
    
    drivers.forEach((driver) => {
      if (driver.status === 'critical') {
        switch (driver.factor) {
          case 'Delay Index':
            recommendations.push('Reallocate resources to critical path activities and facade works to reduce delays');
            break;
          case 'Cost Overrun %':
            recommendations.push('Review budget allocation and implement strict cost control measures');
            break;
          case 'Safety Incidents':
            recommendations.push('Conduct immediate safety audit and reinforce safety protocols');
            break;
          case 'Structural Risk Index':
            recommendations.push('Schedule structural engineering review and inspection');
            break;
        }
      }
    });

    if (riskLevel === 'High' && recommendations.length === 0) {
      recommendations.push('Implement comprehensive risk mitigation strategy and increase monitoring frequency');
    }

    return recommendations;
  };

  const getProjectStats = () => {
    return {
      totalPredictions: dashboardData.timelineData.length,
      highRiskCount: dashboardData.timelineData.filter(d => d.riskLevel === 'High').length,
      avgConfidence: dashboardData.timelineData.length > 0 
        ? Math.round(dashboardData.timelineData.reduce((sum, d) => sum + d.confidence, 0) / dashboardData.timelineData.length * 100)
        : 0,
    };
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (!selectedProject) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#1E40AF', '#3B82F6']}
          style={styles.header}
        >
          <Text style={styles.title}>Live Risk Dashboard</Text>
          <Text style={styles.subtitle}>Select a project to view risk analytics</Text>
        </LinearGradient>
        
        <ProjectSelector
          selectedProject={selectedProject}
          onProjectSelect={setSelectedProject}
        />
        
        <View style={styles.emptyDashboard}>
          <Building color="#9CA3AF" size={64} />
          <Text style={styles.emptyText}>No Project Selected</Text>
          <Text style={styles.emptySubtext}>
            Create or select a project to start monitoring risks
          </Text>
          
          <View style={styles.quickActions}>
            <Text style={styles.quickActionsTitle}>Quick Actions</Text>
            <View style={styles.actionButtons}>
              <View style={styles.actionButton}>
                <Target color="#3B82F6" size={24} />
                <Text style={styles.actionButtonText}>Make Prediction</Text>
              </View>
              <View style={styles.actionButton}>
                <BarChart3 color="#10B981" size={24} />
                <Text style={styles.actionButtonText}>View History</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const stats = getProjectStats();

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <LinearGradient
        colors={['#1E40AF', '#3B82F6']}
        style={styles.header}
      >
        <Text style={styles.title}>Live Risk Dashboard</Text>
        <Text style={styles.subtitle}>Real-time project risk monitoring</Text>
        
        {/* Project Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.totalPredictions}</Text>
            <Text style={styles.statLabel}>Predictions</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.highRiskCount}</Text>
            <Text style={styles.statLabel}>High Risk</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.avgConfidence}%</Text>
            <Text style={styles.statLabel}>Avg Confidence</Text>
          </View>
        </View>
      </LinearGradient>

      <ProjectSelector
        selectedProject={selectedProject}
        onProjectSelect={setSelectedProject}
      />

      <View style={styles.content}>
        {/* Project Overview */}
        <View style={styles.overviewContainer}>
          <View style={styles.projectInfoCard}>
            <View style={styles.projectHeader}>
              <Building color="#3B82F6" size={24} />
              <View style={styles.projectInfo}>
                <Text style={styles.projectName}>{selectedProject.name}</Text>
                <Text style={styles.projectDetails}>
                  {selectedProject.city} • {selectedProject.structural_system}
                </Text>
                <Text style={styles.projectProgress}>
                  Progress: {selectedProject.progress_percent || 0}%
                </Text>
              </View>
            </View>
            
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${selectedProject.progress_percent || 0}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.riskGaugeCard}>
            <Text style={styles.cardTitle}>Current Risk Level</Text>
            <RiskGauge
              riskLevel={dashboardData.currentRisk}
              confidence={dashboardData.confidence}
            />
          </View>
        </View>

        {/* Risk Drivers */}
        <RiskDriversPanel drivers={dashboardData.riskDrivers} />

        {/* IoT Sensors */}
        {dashboardData.sensorData && (
          <IoTSensorPanel sensorData={dashboardData.sensorData} />
        )}

        {/* Project KPIs */}
        {dashboardData.kpiData && (
          <ProjectKPIPanel kpiData={dashboardData.kpiData} />
        )}

        {/* Risk Timeline */}
        <RiskTimelinePanel timelineData={dashboardData.timelineData} />

        {/* Action Recommendations */}
        <ActionRecommendationPanel 
          recommendations={dashboardData.recommendations}
          loading={loadingRecommendations}
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
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#E5E7EB',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#E5E7EB',
    fontWeight: '500',
  },
  content: {
    padding: 24,
  },
  overviewContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  projectInfoCard: {
    flex: 2,
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
  riskGaugeCard: {
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  projectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  projectInfo: {
    marginLeft: 12,
    flex: 1,
  },
  projectName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  projectDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  projectProgress: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  emptyDashboard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 24,
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 24,
    marginBottom: 40,
  },
  quickActions: {
    alignItems: 'center',
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 8,
  },
});