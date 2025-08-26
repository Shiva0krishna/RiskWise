// components/IoTSensorPanel.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Svg, Line, Circle, Path } from 'react-native-svg';
import { Activity, AlertTriangle, Gauge, TrendingUp } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Picker } from '@react-native-picker/picker';

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

type FilterFields = 'city' | 'material' | 'structural_system' | 'risk_level';

export function IoTSensorPanel({ selectedProjectId }: IoTSensorPanelProps) {
  const { user } = useAuth();
  const [sensorData, setSensorData] = useState<SensorData>({
    vibration: { current: 0, threshold: 5.0, trend: [], status: 'normal' },
    craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
    tilt: { current: 0, threshold: 0.5, status: 'normal' },
    temperature: { current: 0, humidity: 0 },
  });
  const [loading, setLoading] = useState(true);

  // minimal filters
  const [availableFilterValues, setAvailableFilterValues] = useState<Record<FilterFields, string[]>>({
    city: [],
    material: [],
    structural_system: [],
    risk_level: [],
  });
  const [selectedFilters, setSelectedFilters] = useState<Partial<Record<FilterFields, string>>>({});
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  const BUILDING_RISK_TABLE = 'building_risk';
  const BUILDING_DATA_TABLE = 'building_data';

  /* -------------------------
     Initial load + filters
     ------------------------- */
  useEffect(() => {
    fetchFilterOptions();
    loadSensorData();

    // Subscribe for live updates
    const channel = supabase
      .channel('building_data_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: BUILDING_DATA_TABLE }, (payload) => {
        if (payload.new) {
          handleNewSensorRow(payload.new);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProjectId, user]);

  const fetchFilterOptions = async () => {
    try {
      const { data, error } = await supabase
        .from(BUILDING_RISK_TABLE)
        .select('city, material, structural_system, risk_level');

      if (error) return;
      if (!data) return;

      const unique = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));

      setAvailableFilterValues({
        city: unique(data.map((r: any) => r.city)),
        material: unique(data.map((r: any) => r.material)),
        structural_system: unique(data.map((r: any) => r.structural_system)),
        risk_level: unique(data.map((r: any) => r.risk_level)),
      });
    } catch (err) {
      console.error('fetchFilterOptions err', err);
    }
  };

  const fetchBuildingIdsMatchingFilters = async (filters: Partial<Record<FilterFields, string>>) => {
    try {
      let query = supabase.from(BUILDING_RISK_TABLE).select('building_id');

      if (filters.city) query = query.eq('city', filters.city);
      if (filters.material) query = query.eq('material', filters.material);
      if (filters.structural_system) query = query.eq('structural_system', filters.structural_system);
      if (filters.risk_level) query = query.eq('risk_level', filters.risk_level);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r: any) => r.building_id).filter(Boolean);
    } catch {
      return [];
    }
  };

  const loadSensorData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const hasAnyFilter = Object.keys(selectedFilters).length > 0;
      let buildingIds: string[] | null = null;

      if (hasAnyFilter) {
        buildingIds = await fetchBuildingIdsMatchingFilters(selectedFilters as any);
      }

      let query = supabase
        .from(BUILDING_DATA_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedProjectId) query = query.eq('project_id', selectedProjectId);

      if (hasAnyFilter && buildingIds && buildingIds.length > 0) {
        query = supabase
          .from(BUILDING_DATA_TABLE)
          .select('*')
          .in('building_id', buildingIds)
          .order('created_at', { ascending: false })
          .limit(50);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setSensorData(processSensorData(data));
      }
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setLoading(false);
      setIsApplyingFilters(false);
    }
  };

  const handleNewSensorRow = (row: any) => {
    // merge with current trends
    setSensorData((prev) => {
      const newTrend = [...prev.vibration.trend.slice(-6), row.max_vibration_mm_s || 0];
      const newCraneTrend = [...prev.craneAlerts.weeklyTrend.slice(-6), row.crane_alerts_count || 0];
      return {
        vibration: {
          current: row.max_vibration_mm_s || 0,
          threshold: 5.0,
          trend: newTrend,
          status: row.max_vibration_mm_s > 5 ? 'critical' : row.max_vibration_mm_s > 3 ? 'warning' : 'normal',
        },
        craneAlerts: {
          count: row.crane_alerts_count || 0,
          weeklyTrend: newCraneTrend,
          status: row.crane_alerts_count > 5 ? 'critical' : row.crane_alerts_count > 2 ? 'warning' : 'normal',
        },
        tilt: {
          current: row.avg_tilt_deg || 0,
          threshold: 0.5,
          status: row.avg_tilt_deg > 0.5 ? 'critical' : row.avg_tilt_deg > 0.3 ? 'warning' : 'normal',
        },
        temperature: {
          current: row.avg_temperature_c || 20,
          humidity: row.humidity_percent || 50,
        },
      };
    });
  };

  const processSensorData = (buildingData: any[]): SensorData => {
    const latest = buildingData[0];
    const vibrationTrend = buildingData.slice(0, 7).map(d => d.max_vibration_mm_s || 0).reverse();
    const craneAlertsTrend = buildingData.slice(0, 7).map(d => d.crane_alerts_count || 0).reverse();

    return {
      vibration: {
        current: latest.max_vibration_mm_s || 0,
        threshold: 5.0,
        trend: vibrationTrend,
        status: latest.max_vibration_mm_s > 5.0 ? 'critical' : latest.max_vibration_mm_s > 3.0 ? 'warning' : 'normal',
      },
      craneAlerts: {
        count: latest.crane_alerts_count || 0,
        weeklyTrend: craneAlertsTrend,
        status: latest.crane_alerts_count > 5 ? 'critical' : latest.crane_alerts_count > 2 ? 'warning' : 'normal',
      },
      tilt: {
        current: latest.avg_tilt_deg || 0,
        threshold: 0.5,
        status: latest.avg_tilt_deg > 0.5 ? 'critical' : latest.avg_tilt_deg > 0.3 ? 'warning' : 'normal',
      },
      temperature: {
        current: latest.avg_temperature_c || 20,
        humidity: latest.humidity_percent || 50,
      },
    };
  };

  /* -------------------------
     Rendering helpers
     ------------------------- */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'normal': return '#10B981';
      default: return '#6B7280';
    }
  };

  const renderLineChart = (data: number[], width: number, height: number, color: string, threshold?: number) => {
    if (!data || data.length < 2) return null;

    const max = Math.max(...data, threshold || 0);
    const min = Math.min(...data, 0);
    const range = max - min || 0.1;

    return (
      <Svg width={width} height={height}>
        {threshold !== undefined && (
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
        {data.map((value, index) => {
          if (index === 0) return null;
          const prevValue = data[index - 1];
          const x1 = ((index - 1) / (data.length - 1)) * width;
          const y1 = height - ((prevValue - min) / range) * height;
          const x2 = (index / (data.length - 1)) * width;
          const y2 = height - ((value - min) / range) * height;
          return <Line key={index} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" />;
        })}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return <Circle key={index} cx={x} cy={y} r="3" fill={color} />;
        })}
      </Svg>
    );
  };

  const renderTiltGauge = (current: number, threshold: number) => {
    const percentage = Math.min((current / threshold) * 50, 100);
    const color = getStatusColor(sensorData.tilt.status);
    return (
      <Svg width="80" height="80" viewBox="0 0 80 80">
        <Path d="M 15 65 A 25 25 0 0 1 65 65" stroke="#E5E7EB" strokeWidth="6" fill="none" />
        <Path
          d={`M 15 65 A 25 25 0 0 ${percentage > 50 ? 1 : 0} ${15 + (percentage / 100) * 50} ${65 - (percentage / 100) * 25}`}
          stroke={color}
          strokeWidth="6"
          fill="none"
        />
        <Circle cx="40" cy="65" r="3" fill="#374151" />
      </Svg>
    );
  };

  /* -------------------------
     Filters UI
     ------------------------- */
  const onSelectFilterValue = (field: FilterFields, value: string) => {
    setSelectedFilters(prev => {
      const copy = { ...prev };
      if (!value) delete copy[field]; else copy[field] = value;
      return copy;
    });
  };

  const applyFilters = async () => {
    setIsApplyingFilters(true);
    await loadSensorData();
  };

  const clearFilters = async () => {
    setSelectedFilters({});
    setIsApplyingFilters(true);
    await loadSensorData();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>IoT Sensor Monitoring</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading sensor data...</Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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

      {/* Filters */}
      <View style={styles.filterBar}>
        {(['city', 'material', 'structural_system', 'risk_level'] as FilterFields[]).map((field) => (
          <View key={field} style={styles.pickerWrapper}>
            <Text style={styles.pickerLabel}>{field}</Text>
            <View style={styles.picker}>
              <Picker
                selectedValue={selectedFilters[field] ?? ''}
                onValueChange={(v) => onSelectFilterValue(field, v)}
              >
                <Picker.Item label="All" value="" />
                {availableFilterValues[field].map((val) => (
                  <Picker.Item key={val} label={String(val)} value={String(val)} />
                ))}
              </Picker>
            </View>
          </View>
        ))}
        <View style={styles.filterButtonsRow}>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters} disabled={isApplyingFilters}>
            <Text style={styles.applyButtonText}>{isApplyingFilters ? 'Applying...' : 'Apply'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sensors */}
      <View style={styles.sensorsGrid}>
        {/* Vibration */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Vibration</Text>
          <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.vibration.status) }]}>
            {sensorData.vibration.current.toFixed(1)} mm/s
          </Text>
          {renderLineChart(sensorData.vibration.trend, 140, 50, getStatusColor(sensorData.vibration.status), sensorData.vibration.threshold)}
        </View>

        {/* Crane Alerts */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Crane Alerts</Text>
          <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.craneAlerts.status) }]}>
            {sensorData.craneAlerts.count}
          </Text>
          {renderLineChart(sensorData.craneAlerts.weeklyTrend, 140, 50, getStatusColor(sensorData.craneAlerts.status))}
        </View>

        {/* Tilt */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Tilt</Text>
          <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.tilt.status) }]}>
            {sensorData.tilt.current.toFixed(2)}°
          </Text>
          {renderTiltGauge(sensorData.tilt.current, sensorData.tilt.threshold)}
        </View>

        {/* Environment */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Environment</Text>
          <Text style={styles.environmentValue}>{sensorData.temperature.current.toFixed(1)}°C / {sensorData.temperature.humidity.toFixed(1)}%</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  headerText: { flex: 1, marginLeft: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: '600', color: '#10B981' },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 16, color: '#6B7280', marginTop: 8 },
