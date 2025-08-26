import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Svg, Line, Circle, Path } from 'react-native-svg';
import { Activity, AlertTriangle, Gauge, TrendingUp } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SensorData {
  vibration: {
    current: number;
    threshold: number;
    trend: number[];
    status: 'normal' | 'warning' | 'critical';
  };
  craneAlerts: {
    count: number;
    weeklyTrend: number[];
    status: 'normal' | 'warning' | 'critical';
  };
  tilt: {
    current: number;
    threshold: number;
    status: 'normal' | 'warning' | 'critical';
  };
  temperature: {
    current: number;
    humidity: number;
  };
}

interface IoTSensorPanelProps {
  selectedProjectId?: string | null;
}

export function IoTSensorPanel({ selectedProjectId }: IoTSensorPanelProps) {
  const { user } = useAuth();
  const [sensorData, setSensorData] = useState<SensorData>({
    vibration: {
      current: 0,
      threshold: 5.0,
      trend: [],
      status: 'normal',
    },
    craneAlerts: {
      count: 0,
      weeklyTrend: [],
      status: 'normal',
    },
    tilt: {
      current: 0,
      threshold: 0.5,
      status: 'normal',
    },
    temperature: {
      current: 0,
      humidity: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSensorData();
    
    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadSensorData, 30000);
    return () => clearInterval(interval);
  }, [selectedProjectId, user]);

  const loadSensorData = async () => {
    if (!user) return;

    try {
      let query = supabase
        .from('building_data')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      const { data, error } = await query.limit(10);

      if (error) throw error;

      if (data && data.length > 0) {
        const processedData = processSensorData(data);
        setSensorData(processedData);
      }
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const processSensorData = (buildingData: any[]): SensorData => {
    const latest = buildingData[0];
    
    // Calculate vibration trend from recent data
    const vibrationTrend = buildingData
      .slice(0, 7)
      .map(d => d.max_vibration_mm_s || 0)
      .reverse();

    // Calculate crane alerts trend
    const craneAlertsTrend = buildingData
      .slice(0, 7)
      .map(d => d.crane_alerts_count || 0)
      .reverse();

    const currentVibration = latest.max_vibration_mm_s || 0;
    const currentTilt = latest.avg_tilt_deg || 0;
    const currentCraneAlerts = latest.crane_alerts_count || 0;

    return {
      vibration: {
        current: currentVibration,
        threshold: 5.0,
        trend: vibrationTrend,
        status: currentVibration > 5.0 ? 'critical' : currentVibration > 3.0 ? 'warning' : 'normal',
      },
      craneAlerts: {
        count: currentCraneAlerts,
        weeklyTrend: craneAlertsTrend,
        status: currentCraneAlerts > 5 ? 'critical' : currentCraneAlerts > 2 ? 'warning' : 'normal',
      },
      tilt: {
        current: currentTilt,
        threshold: 0.5,
        status: currentTilt > 0.5 ? 'critical' : currentTilt > 0.3 ? 'warning' : 'normal',
      },
      temperature: {
        current: latest.avg_temperature_c || 20,
        humidity: latest.humidity_percent || 50,
      },
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'normal': return '#10B981';
      default: return '#6B7280';
    }
  };

  const renderLineChart = (data: number[], width: number, height: number, color: string, threshold?: number) => {
    if (data.length < 2) return null;
    
    const max = Math.max(...data, threshold || 0);
    const min = Math.min(...data, 0);
    const range = max - min || 0.1;
    
    return (
      <Svg width={width} height={height}>
        {/* Threshold line */}
        {threshold && (
          <Line
            x1="0"
            y1={height - ((threshold - min) / range) * height}
            x2={width}
            y2={height - ((threshold - min) / range) * height}
            stroke="#EF4444"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}
        
        {/* Data line */}
        {data.map((value, index) => {
          if (index === 0) return null;
          
          const prevValue = data[index - 1];
          const x1 = ((index - 1) / (data.length - 1)) * width;
          const y1 = height - ((prevValue - min) / range) * height;
          const x2 = (index / (data.length - 1)) * width;
          const y2 = height - ((value - min) / range) * height;
          
          return (
            <Line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={color}
              strokeWidth="2"
            />
          );
        })}
        
        {/* Data points */}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r="3"
              fill={color}
            />
          );
        })}
      </Svg>
    );
  };

  const renderTiltGauge = (current: number, threshold: number) => {
    const percentage = Math.min((current / threshold) * 50, 100); // 50% of gauge for threshold
    const color = getStatusColor(sensorData.tilt.status);
    
    return (
      <Svg width="80" height="80" viewBox="0 0 80 80">
        {/* Background arc */}
        <Path
          d="M 15 65 A 25 25 0 0 1 65 65"
          stroke="#E5E7EB"
          strokeWidth="6"
          fill="none"
        />
        
        {/* Active arc */}
        <Path
          d={`M 15 65 A 25 25 0 0 ${percentage > 50 ? 1 : 0} ${15 + (percentage / 100) * 50} ${65 - (percentage / 100) * 25}`}
          stroke={color}
          strokeWidth="6"
          fill="none"
        />
        
        {/* Center dot */}
        <Circle cx="40" cy="65" r="3" fill="#374151" />
      </Svg>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>IoT Sensor Monitoring</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading sensor data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Activity color="#3B82F6" size={24} />
        <View style={styles.headerText}>
          <Text style={styles.title}>IoT Sensor Monitoring</Text>
          <Text style={styles.subtitle}>Real-time site sensor data</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>
      
      <View style={styles.sensorsGrid}>
        {/* Vibration Monitoring */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={styles.sensorIcon}>
              <Activity color={getStatusColor(sensorData.vibration.status)} size={20} />
            </View>
            <View style={styles.sensorInfo}>
              <Text style={styles.sensorTitle}>Vibration</Text>
              <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.vibration.status) }]}>
                {sensorData.vibration.current.toFixed(1)} mm/s
              </Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            {renderLineChart(
              sensorData.vibration.trend,
              120,
              40,
              getStatusColor(sensorData.vibration.status),
              sensorData.vibration.threshold
            )}
          </View>
          <Text style={styles.thresholdText}>
            Threshold: {sensorData.vibration.threshold} mm/s
          </Text>
        </View>

        {/* Crane Alerts */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={styles.sensorIcon}>
              <AlertTriangle color={getStatusColor(sensorData.craneAlerts.status)} size={20} />
            </View>
            <View style={styles.sensorInfo}>
              <Text style={styles.sensorTitle}>Crane Alerts</Text>
              <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.craneAlerts.status) }]}>
                {sensorData.craneAlerts.count}
              </Text>
            </View>
          </View>
          <View style={styles.chartContainer}>
            {renderLineChart(
              sensorData.craneAlerts.weeklyTrend,
              120,
              40,
              getStatusColor(sensorData.craneAlerts.status)
            )}
          </View>
          <Text style={styles.thresholdText}>7-day trend</Text>
        </View>

        {/* Structural Tilt */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={styles.sensorIcon}>
              <Gauge color={getStatusColor(sensorData.tilt.status)} size={20} />
            </View>
            <View style={styles.sensorInfo}>
              <Text style={styles.sensorTitle}>Structural Tilt</Text>
              <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.tilt.status) }]}>
                {sensorData.tilt.current.toFixed(2)}°
              </Text>
            </View>
          </View>
          <View style={styles.gaugeContainer}>
            {renderTiltGauge(sensorData.tilt.current, sensorData.tilt.threshold)}
          </View>
          <Text style={styles.thresholdText}>
            Limit: {sensorData.tilt.threshold}°
          </Text>
        </View>

        {/* Environmental Conditions */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={styles.sensorIcon}>
              <TrendingUp color="#3B82F6" size={20} />
            </View>
            <View style={styles.sensorInfo}>
              <Text style={styles.sensorTitle}>Environment</Text>
              <Text style={styles.sensorValue}>
                {sensorData.temperature.current.toFixed(1)}°C
              </Text>
            </View>
          </View>
          <View style={styles.environmentData}>
            <View style={styles.environmentItem}>
              <Text style={styles.environmentLabel}>Temperature</Text>
              <Text style={styles.environmentValue}>
                {sensorData.temperature.current.toFixed(1)}°C
              </Text>
            </View>
            <View style={styles.environmentItem}>
              <Text style={styles.environmentLabel}>Humidity</Text>
              <Text style={styles.environmentValue}>
                {sensorData.temperature.humidity.toFixed(1)}%
              </Text>
            </View>
          </View>
        </View>
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
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerText: {
    flex: 1,
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
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  sensorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sensorCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  sensorInfo: {
    flex: 1,
  },
  sensorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  sensorValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  thresholdText: {
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
  environmentData: {
    gap: 8,
  },
  environmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  environmentLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  environmentValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
});