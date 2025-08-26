import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Building, TrendingUp, Shield, Target, ChartBar as BarChart3 } from 'lucide-react-native';
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
import { BuildingAnalyticsPanel } from '@/components/dashboard/BuildingAnalyticsPanel';
import { DataCollectionWizard } from '@/components/onboarding/DataCollectionWizard';

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
  kpiData: any;
  timelineData: any[];
  recommendations: any[];
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    currentRisk: 'Low',
    confidence: 0.75,
    riskDrivers: [],
    kpiData: {
      schedule: {
        delayIndex: [],
        currentDelay: 0,
      },
      cost: {
        overrunPercent: 0,
        baseline: 10.0,
        trend: [],
      },
      efficiency: {
        current: 0,
        target: 85,
      },
    },
    timelineData: [],
    recommendations: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Check if user has projects on mount
  useEffect(() => {
    checkUserProjects();
  }, [user]);

  // Set up real-time subscription for dashboard updates
  useEffect(() => {
    if (!selectedProject || !user) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'building_data',
          filter: `project_id=eq.${selectedProject.id}`,
        },
        () => {
          loadDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'predictions',
          filter: `project_id=eq.${selectedProject.id}`,
        },
        () => {
          loadDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProject, user]);

  useEffect(() => {
    if (selectedProject) {
      loadDashboardData();
    }
  }, [selectedProject]);

  const checkUserProjects = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
      
      if (!data || data.length === 0) {
        setShowWizard(true);
      } else {
        setSelectedProject(data[0]);
      }
    } catch (error) {
      console.error('Error checking projects:', error);
    } finally {
      setLoading(false);
    }
  };

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
        .order('created_at', { ascending: false });

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

    if (latestPrediction && latestPrediction.results && Array.isArray(latestPrediction.results) && latestPrediction.results.length > 0) {
      const result = latestPrediction.results[0];
      currentRisk = result.Predicted_Risk || 'Low';
      confidence = Math.max(
        result.proba_High || 0,
        result.proba_Medium || 0,
        result.proba_Low || 0
      );
    }

    // Generate risk drivers from building data
    const riskDrivers = buildingData.length > 0 ? generateRiskDrivers(buildingData) : [];

    // Generate KPI data from building data
    const kpiData = generateKPIData(buildingData);

    // Generate timeline from predictions
    const timelineData = predictions.slice(0, 10).reverse().map(p => ({
      date: p.created_at,
      riskLevel: (Array.isArray(p.results) && p.results.length > 0) ? p.results[0]?.Predicted_Risk || 'Low' : 'Low',
      confidence: (Array.isArray(p.results) && p.results.length > 0) ? Math.max(
        p.results[0]?.proba_High || 0,
        p.results[0]?.proba_Medium || 0,
        p.results[0]?.proba_Low || 0
      ) : 0.5,
    }));

    // Generate AI recommendations using Gemini
    const recommendations = await generateAIRecommendations(
      currentRisk,
      riskDrivers,
      selectedProject,
      buildingData
    );

    return {
      currentRisk,
      confidence,
      riskDrivers,
      kpiData,
      timelineData,
      recommendations,
    };
  };

  const generateRiskDrivers = (buildingDataArray: any[]) => {
    if (buildingDataArray.length === 0) return [];
    
    // Calculate averages from all building data entries
    const avgData = buildingDataArray.reduce((acc, building) => {
      Object.keys(building).forEach(key => {
        if (typeof building[key] === 'number') {
          acc[key] = (acc[key] || 0) + building[key];
        }
      });
      return acc;
    }, {});
    
    // Calculate averages
    Object.keys(avgData).forEach(key => {
      avgData[key] = avgData[key] / buildingDataArray.length;
    });
    
    const drivers = [];
    
    if (avgData.delay_index !== undefined) {
      drivers.push({
        factor: 'Delay Index',
        value: avgData.delay_index,
        threshold: 0.3,
        importance: Math.min(avgData.delay_index / 0.3, 1),
        status: avgData.delay_index > 0.3 ? 'critical' : avgData.delay_index > 0.2 ? 'warning' : 'normal',
      });
    }

    if (avgData.cost_overrun_percent !== undefined) {
      drivers.push({
        factor: 'Cost Overrun %',
        value: avgData.cost_overrun_percent,
        threshold: 10,
        importance: Math.min(avgData.cost_overrun_percent / 20, 1),
        status: avgData.cost_overrun_percent > 15 ? 'critical' : avgData.cost_overrun_percent > 10 ? 'warning' : 'normal',
      });
    }

    if (avgData.safety_incident_count !== undefined) {
      drivers.push({
        factor: 'Safety Incidents',
        value: avgData.safety_incident_count,
        threshold: 2,
        importance: Math.min(avgData.safety_incident_count / 5, 1),
        status: avgData.safety_incident_count > 3 ? 'critical' : avgData.safety_incident_count > 1 ? 'warning' : 'normal',
      });
    }

    if (avgData.structural_risk_index !== undefined) {
      drivers.push({
        factor: 'Structural Risk Index',
        value: avgData.structural_risk_index,
        threshold: 0.7,
        importance: avgData.structural_risk_index,
        status: avgData.structural_risk_index > 0.8 ? 'critical' : avgData.structural_risk_index > 0.6 ? 'warning' : 'normal',
      });
    }

    if (avgData.facade_complexity_index !== undefined) {
      drivers.push({
        factor: 'Facade Complexity',
        value: avgData.facade_complexity_index,
        threshold: 0.6,
        importance: avgData.facade_complexity_index,
        status: avgData.facade_complexity_index > 0.7 ? 'critical' : avgData.facade_complexity_index > 0.5 ? 'warning' : 'normal',
      });
    }

    if (avgData.resource_allocation_efficiency !== undefined) {
      drivers.push({
        factor: 'Resource Efficiency',
        value: avgData.resource_allocation_efficiency,
        threshold: 0.8,
        importance: 1 - avgData.resource_allocation_efficiency,
        status: avgData.resource_allocation_efficiency < 0.6 ? 'critical' : avgData.resource_allocation_efficiency < 0.7 ? 'warning' : 'normal',
      });
    }

    return drivers.sort((a, b) => b.importance - a.importance);
  };

  const generateKPIData = (buildingDataArray: any[]) => {
    if (buildingDataArray.length === 0) {
      return {
        schedule: { delayIndex: [], currentDelay: 0 },
        cost: { overrunPercent: 0, baseline: 10.0, trend: [] },
        efficiency: { current: 0, target: 85 },
      };
    }

    // Calculate trends from building data over time
    const sortedData = buildingDataArray.sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const delayTrend = sortedData.map(d => d.delay_index || 0);
    const costTrend = sortedData.map(d => d.cost_overrun_percent || 0);
    const efficiencyTrend = sortedData.map(d => d.resource_allocation_efficiency || 0);

    const currentDelay = sortedData[sortedData.length - 1]?.delay_index || 0;
    const currentCostOverrun = sortedData[sortedData.length - 1]?.cost_overrun_percent || 0;
    const currentEfficiency = (sortedData[sortedData.length - 1]?.resource_allocation_efficiency || 0) * 100;

    return {
      schedule: {
        delayIndex: delayTrend,
        currentDelay,
      },
      cost: {
        overrunPercent: currentCostOverrun,
        baseline: 10.0,
        trend: costTrend,
      },
      efficiency: {
        current: currentEfficiency,
        target: 85,
      },
    };
  };

  const generateAIRecommendations = async (
    riskLevel: string,
    riskDrivers: any[],
    project: Project | null,
    buildingData: any[]
  ) => {
    try {
      const recommendations = await GeminiService.generateRecommendations(
        riskLevel,
        riskDrivers,
        project,
        buildingData
      );
      
      return recommendations.map((rec, index) => ({
        id: `ai-rec-${index}`,
        title: `AI Recommendation ${index + 1}`,
        description: rec,
        priority: riskLevel === 'High' ? 'high' : riskLevel === 'Medium' ? 'medium' : 'low',
        category: index % 4 === 0 ? 'schedule' : index % 4 === 1 ? 'cost' : index % 4 === 2 ? 'safety' : 'quality',
        action: rec,
      }));
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      return getFallbackRecommendations(riskLevel, riskDrivers);
    }
  };

  const getFallbackRecommendations = (riskLevel: string, riskDrivers: any[]) => {
    const recommendations = [];

    if (riskLevel === 'High') {
      recommendations.push({
        id: 'fallback-1',
        title: 'High Risk Level Detected',
        description: 'Multiple factors contributing to elevated risk assessment',
        priority: 'high' as const,
        category: 'schedule' as const,
        action: 'Implement comprehensive risk mitigation strategy and increase monitoring frequency',
      });
    }

    riskDrivers.forEach((driver, index) => {
      if (driver.status === 'critical') {
        let recommendation = {
          id: `fallback-${index + 2}`,
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
        }
        
        recommendations.push(recommendation);
      }
    });

    return recommendations;
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handleWizardComplete = () => {
    setShowWizard(false);
    checkUserProjects();
  };

  if (showWizard) {
    return <DataCollectionWizard onComplete={handleWizardComplete} />;
  }

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

        {/* Building Analytics */}
        <BuildingAnalyticsPanel selectedProjectId={selectedProject.id} />

        {/* IoT Sensor Monitoring */}
        <IoTSensorPanel selectedProjectId={selectedProject.id} />

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