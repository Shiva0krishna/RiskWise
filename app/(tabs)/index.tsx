import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building, TrendingUp, Shield } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
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
  recommendations: any[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    currentRisk: 'Low',
    confidence: 0.75,
    riskDrivers: [],
    sensorData: {
      vibration: {
        current: 2.3,
        threshold: 5.0,
        trend: [1.8, 2.1, 2.3, 2.7, 2.3, 2.1, 2.3],
      },
      craneAlerts: {
        count: 3,
        weeklyTrend: [1, 2, 0, 3, 1, 2, 3],
      },
      tilt: {
        current: 0.8,
        threshold: 2.0,
      },
    },
    kpiData: {
      schedule: {
        delayIndex: [0.1, 0.15, 0.2, 0.25, 0.35, 0.4, 0.35],
        currentDelay: 0.35,
      },
      cost: {
        overrunPercent: 15.2,
        baseline: 10.0,
        trend: [5, 8, 12, 15, 18, 15, 15.2],
      },
      efficiency: {
        current: 78,
        target: 85,
      },
    },
    timelineData: [],
    recommendations: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      const processedData = processDashboardData(predictions || [], buildingData || []);
      setDashboardData(processedData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const processDashboardData = (predictions: any[], buildingData: any[]): DashboardData => {
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

    // Generate recommendations based on risk drivers
    const recommendations = generateRecommendations(riskDrivers, currentRisk);

    return {
      currentRisk,
      confidence,
      riskDrivers,
      sensorData: dashboardData.sensorData, // Keep mock sensor data
      kpiData: dashboardData.kpiData, // Keep mock KPI data
      timelineData,
      recommendations,
    };
  };

  const generateRiskDrivers = (building: any) => {
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

  const generateRecommendations = (drivers: any[], riskLevel: string) => {
    const recommendations = [];
    
    drivers.forEach((driver, index) => {
      if (driver.status === 'critical') {
        let recommendation = {
          id: `rec-${index}`,
          title: '',
          description: '',
          priority: 'high' as const,
          category: 'schedule' as const,
          action: '',
        };

        switch (driver.factor) {
          case 'Delay Index':
            recommendation = {
              ...recommendation,
              title: 'High Delay Index Detected',
              description: `Current delay index (${driver.value.toFixed(2)}) exceeds threshold (${driver.threshold})`,
              action: 'Recommend reallocating resources to critical path activities and facade works',
              category: 'schedule',
            };
            break;
          case 'Cost Overrun %':
            recommendation = {
              ...recommendation,
              title: 'Cost Overrun Alert',
              description: `Cost overrun (${driver.value.toFixed(1)}%) significantly above baseline`,
              action: 'Review budget allocation and implement cost control measures',
              category: 'cost',
            };
            break;
          case 'Safety Incidents':
            recommendation = {
              ...recommendation,
              title: 'Safety Incident Spike',
              description: `${driver.value} safety incidents reported, above acceptable threshold`,
              action: 'Conduct immediate safety audit and reinforce safety protocols',
              category: 'safety',
            };
            break;
          case 'Structural Risk Index':
            recommendation = {
              ...recommendation,
              title: 'Structural Risk Concern',
              description: `High structural risk index (${driver.value.toFixed(2)}) requires attention`,
              action: 'Schedule structural engineering review and inspection',
              category: 'quality',
            };
            break;
        }
        
        recommendations.push(recommendation);
      }
    });

    // Add general recommendations based on risk level
    if (riskLevel === 'High' && recommendations.length === 0) {
      recommendations.push({
        id: 'general-high',
        title: 'High Risk Level Detected',
        description: 'Multiple factors contributing to elevated risk assessment',
        priority: 'high' as const,
        category: 'schedule' as const,
        action: 'Implement comprehensive risk mitigation strategy and increase monitoring frequency',
      });
    }

    return recommendations;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  if (!selectedProject) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Risk Dashboard</Text>
          <Text style={styles.subtitle}>Select a project to view risk analytics</Text>
        </View>
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
        </View>
      </View>
    );
  }

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
        <IoTSensorPanel sensorData={dashboardData.sensorData} />

        {/* Project KPIs */}
        <ProjectKPIPanel kpiData={dashboardData.kpiData} />

        {/* Risk Timeline */}
        <RiskTimelinePanel timelineData={dashboardData.timelineData} />

        {/* Action Recommendations */}
        <ActionRecommendationPanel recommendations={dashboardData.recommendations} />
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
  },
});