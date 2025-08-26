import React, { useEffect, useState, useCallback } from 'react';
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

  // Filter UI state
  const [availableFilterValues, setAvailableFilterValues] = useState<Record<FilterFields, string[]>>({
    city: [],
    material: [],
    structural_system: [],
    risk_level: [],
  });
  const [selectedFilters, setSelectedFilters] = useState<Partial<Record<FilterFields, string>>>({});
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  // We'll use building_risk as the global dataset (SQL-friendly table you created)
  const BUILDING_RISK_TABLE = 'building_risk'; // table containing csv import (columns: building_id, city, material, structural_system, risk_level, etc.)
  const BUILDING_DATA_TABLE = 'building_data'; // time-series / snapshots (project-specific rows)

  useEffect(() => {
    // load filter options once
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    // initial load and periodic refresh
    loadSensorData();
    const interval = setInterval(loadSensorData, 30000);
    return () => clearInterval(interval);
  }, [selectedProjectId, user]);

  // Re-run when filters change (user applies)
  useEffect(() => {
    // don't auto-trigger on selection — only when user applies (use Apply button)
  }, [selectedFilters]);

  /* -------------------------
     Fetch & filter helpers
     ------------------------- */

  // Fetch distinct values for filterable fields from building_risk
  const fetchFilterOptions = async () => {
    try {
      // Load all rows but only select relevant columns to compute unique values client-side
      const { data, error } = await supabase
        .from(BUILDING_RISK_TABLE)
        .select('city, material, structural_system, risk_level');

      if (error) {
        console.error('Error fetching filter options:', error);
        return;
      }
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

  // Build supabase filter query for building_risk to get matching building_id list
  const fetchBuildingIdsMatchingFilters = async (filters: Partial<Record<FilterFields, string>>) => {
    try {
      let query = supabase.from(BUILDING_RISK_TABLE).select('building_id');

      // Apply equality filters
      if (filters.city) query = query.eq('city', filters.city);
      if (filters.material) query = query.eq('material', filters.material);
      if (filters.structural_system) query = query.eq('structural_system', filters.structural_system);
      if (filters.risk_level) query = query.eq('risk_level', filters.risk_level);

      const { data, error } = await query;
      if (error) throw error;
      const ids = (data || []).map((r: any) => r.building_id).filter(Boolean);
      return ids;
    } catch (err) {
      console.error('fetchBuildingIdsMatchingFilters err', err);
      return [];
    }
  };

  // Main loader: if filters applied, use them; otherwise fetch last rows from building_data as before
  const loadSensorData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // If filters selected (any), find matching building_ids from building_risk
      const hasAnyFilter = Object.keys(selectedFilters).length > 0;
      let buildingIds: string[] | null = null;

      if (hasAnyFilter) {
        buildingIds = await fetchBuildingIdsMatchingFilters(selectedFilters as any);
      }

      // Query building_data: if buildingIds, filter by building_id IN (...), else use user & project as before
      let query = supabase
        .from(BUILDING_DATA_TABLE)
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50); // fetch up to 50 recent rows

      if (selectedProjectId) {
        query = query.eq('project_id', selectedProjectId);
      }

      if (hasAnyFilter && buildingIds && buildingIds.length > 0) {
        // supabase allows .in(field, array)
        query = supabase
          .from(BUILDING_DATA_TABLE)
          .select('*')
          .in('building_id', buildingIds)
          .order('created_at', { ascending: false })
          .limit(50);

        // if project selected, apply project filter as well
        if (selectedProjectId) {
          query = (query as any).eq('project_id', selectedProjectId);
        }
      } else if (hasAnyFilter && (!buildingIds || buildingIds.length === 0)) {
        // No matching buildings — clear sensor data
        setSensorData({
          vibration: { current: 0, threshold: 5.0, trend: [], status: 'normal' },
          craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
          tilt: { current: 0, threshold: 0.5, status: 'normal' },
          temperature: { current: 0, humidity: 0 },
        });
        setLoading(false);
        return;
      }

      // Execute query (if we swapped query earlier to supabase... ensure query variable is the correct query)
      // Note: in the branch above we replaced 'query' with a fresh supabase call; if not, use original.
      const { data, error } = await (query as any);
      if (error) throw error;

      if (data && data.length > 0) {
        const processedData = processSensorData(data);
        setSensorData(processedData);
      } else {
        // no data found — keep defaults
        setSensorData({
          vibration: { current: 0, threshold: 5.0, trend: [], status: 'normal' },
          craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
          tilt: { current: 0, threshold: 0.5, status: 'normal' },
          temperature: { current: 0, humidity: 0 },
        });
      }
    } catch (error) {
      console.error('Error loading sensor data:', error);
    } finally {
      setLoading(false);
      setIsApplyingFilters(false);
    }
  };

  // Process recent building_data rows to produce sensorData (same logic as you had)
  const processSensorData = (buildingData: any[]): SensorData => {
    const latest = buildingData[0];

    // Calculate vibration trend from recent data (most recent first => reverse for plotting older->newer)
    const vibrationTrend = buildingData.slice(0, 7).map(d => d.max_vibration_mm_s || 0).reverse();
    const craneAlertsTrend = buildingData.slice(0, 7).map(d => d.crane_alerts_count || 0).reverse();

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

  /* -------------------------
     Rendering helpers (unchanged)
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
     Filter UI actions
     ------------------------- */

  const onSelectFilterValue = (field: FilterFields, value: string) => {
    setSelectedFilters(prev => {
      const copy = { ...prev };
      if (!value) {
        delete copy[field];
      } else {
        copy[field] = value;
      }
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
    // reload without filters
    await loadSensorData();
  };

  /* -------------------------
     UI
     ------------------------- */

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

      {/* FILTER BAR */}
      <View style={styles.filterBar}>
        {/* City */}
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>City</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={selectedFilters.city ?? ''}
              onValueChange={(v) => onSelectFilterValue('city', v)}
            >
              <Picker.Item label="All" value="" />
              {availableFilterValues.city.map((c) => <Picker.Item key={c} label={String(c)} value={String(c)} />)}
            </Picker>
          </View>
        </View>

        {/* Material */}
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Material</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={selectedFilters.material ?? ''}
              onValueChange={(v) => onSelectFilterValue('material', v)}
            >
              <Picker.Item label="All" value="" />
              {availableFilterValues.material.map((c) => <Picker.Item key={c} label={String(c)} value={String(c)} />)}
            </Picker>
          </View>
        </View>

        {/* Structural System */}
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>System</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={selectedFilters.structural_system ?? ''}
              onValueChange={(v) => onSelectFilterValue('structural_system', v)}
            >
              <Picker.Item label="All" value="" />
              {availableFilterValues.structural_system.map((c) => <Picker.Item key={c} label={String(c)} value={String(c)} />)}
            </Picker>
          </View>
        </View>

        {/* Risk Level */}
        <View style={styles.pickerWrapper}>
          <Text style={styles.pickerLabel}>Risk</Text>
          <View style={styles.picker}>
            <Picker
              selectedValue={selectedFilters.risk_level ?? ''}
              onValueChange={(v) => onSelectFilterValue('risk_level', v)}
            >
              <Picker.Item label="All" value="" />
              {availableFilterValues.risk_level.map((c) => <Picker.Item key={c} label={String(c)} value={String(c)} />)}
            </Picker>
          </View>
        </View>

        <View style={styles.filterButtonsRow}>
          <TouchableOpacity style={styles.applyButton} onPress={applyFilters} disabled={isApplyingFilters}>
            <Text style={styles.applyButtonText}>{isApplyingFilters ? 'Applying...' : 'Apply'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SENSORS GRID */}
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
            {renderLineChart(sensorData.vibration.trend, 120, 40, getStatusColor(sensorData.vibration.status), sensorData.vibration.threshold)}
          </View>
          <Text style={styles.thresholdText}>Threshold: {sensorData.vibration.threshold} mm/s</Text>
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
            {renderLineChart(sensorData.craneAlerts.weeklyTrend, 120, 40, getStatusColor(sensorData.craneAlerts.status))}
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
          <View style={styles.gaugeContainer}>{renderTiltGauge(sensorData.tilt.current, sensorData.tilt.threshold)}</View>
          <Text style={styles.thresholdText}>Limit: {sensorData.tilt.threshold}°</Text>
        </View>

        {/* Environmental Conditions */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <View style={styles.sensorIcon}>
              <TrendingUp color="#3B82F6" size={20} />
            </View>
            <View style={styles.sensorInfo}>
              <Text style={styles.sensorTitle}>Environment</Text>
              <Text style={styles.sensorValue}>{sensorData.temperature.current.toFixed(1)}°C</Text>
            </View>
          </View>
          <View style={styles.environmentData}>
            <View style={styles.environmentItem}>
              <Text style={styles.environmentLabel}>Temperature</Text>
              <Text style={styles.environmentValue}>{sensorData.temperature.current.toFixed(1)}°C</Text>
            </View>
            <View style={styles.environmentItem}>
              <Text style={styles.environmentLabel}>Humidity</Text>
              <Text style={styles.environmentValue}>{sensorData.temperature.humidity.toFixed(1)}%</Text>
            </View>
          </View>
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
  sensorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 },
  sensorCard: { flex: 1, minWidth: 160, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  sensorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sensorIcon: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  sensorInfo: { flex: 1 },
  sensorTitle: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 2 },
  sensorValue: { fontSize: 16, fontWeight: '700' },
  chartContainer: { alignItems: 'center', marginBottom: 8 },
  gaugeContainer: { alignItems: 'center', marginBottom: 8 },
  thresholdText: { fontSize: 11, color: '#6B7280', textAlign: 'center' },
  environmentData: { gap: 8 },
  environmentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  environmentLabel: { fontSize: 12, color: '#6B7280' },
  environmentValue: { fontSize: 12, fontWeight: '600', color: '#111827' },

  /* filter UI */
  filterBar: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 10, marginBottom: 12 },
  pickerWrapper: { marginBottom: 8 },
  pickerLabel: { fontSize: 12, color: '#374151', marginBottom: 4 },
  picker: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden' },
  filterButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  applyButton: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  applyButtonText: { color: '#FFFFFF', fontWeight: '700' },
  clearButton: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  clearButtonText: { color: '#374151', fontWeight: '700' },
});
