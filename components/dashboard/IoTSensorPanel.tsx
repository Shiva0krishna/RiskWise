import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Svg, Line, Circle, Path } from 'react-native-svg';
import { Activity, AlertTriangle, Gauge, TrendingUp } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Picker } from '@react-native-picker/picker';

interface SensorData {
  vibration: { current: number; threshold: number; trend: number[]; status: 'normal' | 'warning' | 'critical' };
  craneAlerts: { count: number; weeklyTrend: number[]; status: 'normal' | 'warning' | 'critical' };
  tilt: { current: number; threshold: number; status: 'normal' | 'warning' | 'critical' };
  temperature: { current: number; humidity: number };
}

interface IoTSensorPanelProps {
  selectedProjectId?: string | null;
}

/* ------------------------------------
   Define all filterable fields
------------------------------------ */
const FILTER_FIELDS = [
  'building_id',
  'city',
  'comparable_project',
  'floors',
  'height_m',
  'total_area_m2',
  'material',
  'structural_system',
  'structural_risk_index',
  'facade_complexity_index',
  'project_duration_days',
  'delay_index',
  'cost_overrun_percent',
  'safety_incident_count',
  'resource_allocation_efficiency',
  'max_vibration_mm_s',
  'avg_tilt_deg',
  'avg_temperature_c',
  'humidity_percent',
  'equipment_usage_rate_percent',
  'crane_alerts_count',
  'cobie_assets',
  'cobie_systems',
  'risk_level',
] as const;

type FilterField = typeof FILTER_FIELDS[number];

export function IoTSensorPanel({ selectedProjectId }: IoTSensorPanelProps) {
  const { user } = useAuth();
  const [sensorData, setSensorData] = useState<SensorData>({
    vibration: { current: 0, threshold: 5.0, trend: [], status: 'normal' },
    craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
    tilt: { current: 0, threshold: 0.5, status: 'normal' },
    temperature: { current: 0, humidity: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Dynamic filters
  const [availableFilterValues, setAvailableFilterValues] = useState<Record<FilterField, string[]>>(
    Object.fromEntries(FILTER_FIELDS.map(f => [f, []])) as any
  );
  const [selectedFilters, setSelectedFilters] = useState<Partial<Record<FilterField, string>>>({});
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  const BUILDING_RISK_TABLE = 'building_risk';
  const BUILDING_DATA_TABLE = 'building_data';

  /* ---------------- Load filter values ---------------- */
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    loadSensorData();
    const interval = setInterval(loadSensorData, 30000);
    return () => clearInterval(interval);
  }, [selectedProjectId, user]);

  const fetchFilterOptions = async () => {
    try {
      const { data, error } = await supabase.from(BUILDING_RISK_TABLE).select(FILTER_FIELDS.join(','));
      if (error) throw error;
      if (!data) return;

      const unique = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));

      const newValues: any = {};
      FILTER_FIELDS.forEach(f => {
        newValues[f] = unique(data.map((r: any) => r[f]));
      });

      setAvailableFilterValues(newValues);
    } catch (err) {
      console.error('fetchFilterOptions err', err);
    }
  };

  const fetchBuildingIdsMatchingFilters = async (filters: Partial<Record<FilterField, string>>) => {
    try {
      let query = supabase.from(BUILDING_RISK_TABLE).select('building_id');
      Object.entries(filters).forEach(([field, val]) => {
        if (val) query = query.eq(field, val);
      });
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map((r: any) => r.building_id).filter(Boolean);
    } catch (err) {
      console.error('fetchBuildingIdsMatchingFilters err', err);
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
        buildingIds = await fetchBuildingIdsMatchingFilters(selectedFilters);
      }

      let query = supabase.from(BUILDING_DATA_TABLE).select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (selectedProjectId) query = query.eq('project_id', selectedProjectId);

      if (hasAnyFilter && buildingIds && buildingIds.length > 0) {
        query = supabase.from(BUILDING_DATA_TABLE).select('*').in('building_id', buildingIds).order('created_at', { ascending: false }).limit(50);
        if (selectedProjectId) query = (query as any).eq('project_id', selectedProjectId);
      } else if (hasAnyFilter && (!buildingIds || buildingIds.length === 0)) {
        setSensorData({
          vibration: { current: 0, threshold: 5.0, trend: [], status: 'normal' },
          craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
          tilt: { current: 0, threshold: 0.5, status: 'normal' },
          temperature: { current: 0, humidity: 0 },
        });
        setLoading(false);
        return;
      }

      const { data, error } = await (query as any);
      if (error) throw error;

      if (data && data.length > 0) {
        setSensorData(processSensorData(data));
      }
    } catch (err) {
      console.error('loadSensorData err', err);
    } finally {
      setLoading(false);
      setIsApplyingFilters(false);
    }
  };

  const processSensorData = (rows: any[]): SensorData => {
    const latest = rows[0];
    const vibrationTrend = rows.slice(0, 7).map(d => d.max_vibration_mm_s || 0).reverse();
    const craneAlertsTrend = rows.slice(0, 7).map(d => d.crane_alerts_count || 0).reverse();
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

  const getStatusColor = (status: string) => (status === 'critical' ? '#EF4444' : status === 'warning' ? '#F59E0B' : '#10B981');

  const renderLineChart = (data: number[], width: number, height: number, color: string, threshold?: number) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data, threshold || 0);
    const min = Math.min(...data, 0);
    const range = max - min || 0.1;
    return (
      <Svg width={width} height={height}>
        {threshold !== undefined && (
          <Line x1="0" y1={height - ((threshold - min) / range) * height} x2={width} y2={height - ((threshold - min) / range) * height} stroke="#EF4444" strokeWidth="1" strokeDasharray="4,4" />
        )}
        {data.map((value, i) => {
          if (i === 0) return null;
          const prev = data[i - 1];
          const x1 = ((i - 1) / (data.length - 1)) * width;
          const y1 = height - ((prev - min) / range) * height;
          const x2 = (i / (data.length - 1)) * width;
          const y2 = height - ((value - min) / range) * height;
          return <Line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="2" />;
        })}
        {data.map((value, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return <Circle key={i} cx={x} cy={y} r="3" fill={color} />;
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
        <Path d={`M 15 65 A 25 25 0 0 ${percentage > 50 ? 1 : 0} ${15 + (percentage / 100) * 50} ${65 - (percentage / 100) * 25}`} stroke={color} strokeWidth="6" fill="none" />
        <Circle cx="40" cy="65" r="3" fill="#374151" />
      </Svg>
    );
  };

  /* ---------------- UI ---------------- */
  const onSelectFilterValue = (field: FilterField, value: string) => {
    setSelectedFilters(prev => {
      const copy = { ...prev };
      if (!value) delete copy[field];
      else copy[field] = value;
      return copy;
    });
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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 16 }}>
      <Text style={styles.title}>IoT Sensor Monitoring</Text>

      {/* FILTERS */}
      <View style={styles.filterBar}>
        {FILTER_FIELDS.map(field => (
          <View key={field} style={styles.pickerWrapper}>
            <Text style={styles.pickerLabel}>{field.replace(/_/g, ' ')}</Text>
            <View style={styles.picker}>
              <Picker selectedValue={selectedFilters[field] ?? ''} onValueChange={(v) => onSelectFilterValue(field, v)}>
                <Picker.Item label="All" value="" />
                {availableFilterValues[field].map(val => <Picker.Item key={val} label={String(val)} value={String(val)} />)}
              </Picker>
            </View>
          </View>
        ))}
        <View style={styles.filterButtonsRow}>
          <TouchableOpacity style={styles.applyButton} onPress={() => { setIsApplyingFilters(true); loadSensorData(); }} disabled={isApplyingFilters}>
            <Text style={styles.applyButtonText}>{isApplyingFilters ? 'Applying...' : 'Apply'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={() => { setSelectedFilters({}); setIsApplyingFilters(true); loadSensorData(); }}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SENSORS */}
      <View style={styles.sensorsGrid}>
        {/* Vibration */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Vibration</Text>
          <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.vibration.status) }]}>{sensorData.vibration.current.toFixed(1)} mm/s</Text>
          {renderLineChart(sensorData.vibration.trend, 120, 40, getStatusColor(sensorData.vibration.status), sensorData.vibration.threshold)}
        </View>

        {/* Crane Alerts */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Crane Alerts</Text>
          <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.craneAlerts.status) }]}>{sensorData.craneAlerts.count}</Text>
          {renderLineChart(sensorData.craneAlerts.weeklyTrend, 120, 40, getStatusColor(sensorData.craneAlerts.status))}
        </View>

        {/* Tilt */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Structural Tilt</Text>
          <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.tilt.status) }]}>{sensorData.tilt.current.toFixed(2)}°</Text>
          {renderTiltGauge(sensorData.tilt.current, sensorData.tilt.threshold)}
        </View>

        {/* Environment */}
        <View style={styles.sensorCard}>
          <Text style={styles.sensorTitle}>Environment</Text>
          <Text style={styles.sensorValue}>{sensorData.temperature.current.toFixed(1)}°C</Text>
          <Text style={styles.thresholdText}>Humidity {sensorData.temperature.humidity.toFixed(1)}%</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 16, color: '#6B7280', marginTop: 8 },
  filterBar: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 10, marginBottom: 12 },
  pickerWrapper: { marginBottom: 8 },
  pickerLabel: { fontSize: 12, color: '#374151', marginBottom: 4 },
  picker: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  filterButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  applyButton: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  applyButtonText: { color: '#fff', fontWeight: '700' },
  clearButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  clearButtonText: { color: '#374151', fontWeight: '700' },
  sensorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sensorCard: { flex: 1, minWidth: 160, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  sensorTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  sensorValue: { fontSize: 16, fontWeight: '700' },
  thresholdText: { fontSize: 12, color: '#6B7280' },
});
