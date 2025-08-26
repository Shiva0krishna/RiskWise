// components/IoTSensorPanel.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
  UIManager,
  LayoutAnimation,
} from 'react-native';
import { Svg, Line, Circle, Path } from 'react-native-svg';
import { Activity, AlertTriangle, Gauge, TrendingUp, ChevronDown } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import DropDownPicker from 'react-native-dropdown-picker';

interface SensorData {
  vibration: { current: number; threshold: number; trend: number[]; status: 'normal' | 'warning' | 'critical' };
  craneAlerts: { count: number; weeklyTrend: number[]; status: 'normal' | 'warning' | 'critical' };
  tilt: { current: number; threshold: number; status: 'normal' | 'warning' | 'critical' };
  temperature: { current: number; humidity: number };
}

type FilterFields = 'city' | 'material' | 'structural_system' | 'risk_level';

interface IoTSensorPanelProps {
  selectedProjectId?: string | null;
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export function IoTSensorPanel({ selectedProjectId }: IoTSensorPanelProps) {
  const { user } = useAuth();
  const [sensorData, setSensorData] = useState<SensorData>({
    vibration: { current: 0, threshold: 5.0, trend: [], status: 'normal' },
    craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
    tilt: { current: 0, threshold: 0.5, status: 'normal' },
    temperature: { current: 0, humidity: 0 },
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [availableFilterValues, setAvailableFilterValues] = useState<Record<FilterFields, string[]>>({
    city: [],
    material: [],
    structural_system: [],
    risk_level: [],
  });
  const [selectedFilters, setSelectedFilters] = useState<Partial<Record<FilterFields, string>>>({});
  const [filterOpen, setFilterOpen] = useState<Record<FilterFields, boolean>>({
    city: false,
    material: false,
    structural_system: false,
    risk_level: false,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cursorRef = useRef(0);
  const rowsRef = useRef<any[]>([]);

  const BUILDING_RISK_TABLE = 'building_risk';
  const BUILDING_DATA_TABLE = 'building_data';

  /* ---------------- Load filter options ---------------- */
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  const fetchFilterOptions = async () => {
    const { data, error } = await supabase.from(BUILDING_RISK_TABLE).select('city, material, structural_system, risk_level');
    if (error || !data) return;
    const unique = (arr: any[]) => Array.from(new Set(arr.filter(Boolean)));
    setAvailableFilterValues({
      city: unique(data.map(r => r.city)),
      material: unique(data.map(r => r.material)),
      structural_system: unique(data.map(r => r.structural_system)),
      risk_level: unique(data.map(r => r.risk_level)),
    });
  };

  /* ---------------- Realtime simulation ---------------- */
  useEffect(() => {
    if (!user) return;
    loadRows();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [selectedProjectId, selectedFilters, user]);

  const loadRows = async () => {
    setLoading(true);
    let query = supabase.from(BUILDING_DATA_TABLE).select('*').eq('user_id', user.id).order('created_at');
    if (selectedProjectId) query = query.eq('project_id', selectedProjectId);

    const { data, error } = await query;
    if (error || !data) {
      setLoading(false);
      return;
    }
    rowsRef.current = data;
    cursorRef.current = 0;
    setLoading(false);

    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (!rowsRef.current.length) return;
      const row = rowsRef.current[cursorRef.current];
      setSensorData(processSensorData(row));
      cursorRef.current = (cursorRef.current + 1) % rowsRef.current.length;
    }, 4000); // new reading every 4s
  };

  const processSensorData = (row: any): SensorData => ({
    vibration: {
      current: row.max_vibration_mm_s || 0,
      threshold: 5.0,
      trend: [row.max_vibration_mm_s || 0],
      status: row.max_vibration_mm_s > 5 ? 'critical' : row.max_vibration_mm_s > 3 ? 'warning' : 'normal',
    },
    craneAlerts: {
      count: row.crane_alerts_count || 0,
      weeklyTrend: [row.crane_alerts_count || 0],
      status: row.crane_alerts_count > 5 ? 'critical' : row.crane_alerts_count > 2 ? 'warning' : 'normal',
    },
    tilt: {
      current: row.avg_tilt_deg || 0,
      threshold: 0.5,
      status: row.avg_tilt_deg > 0.5 ? 'critical' : row.avg_tilt_deg > 0.3 ? 'warning' : 'normal',
    },
    temperature: { current: row.avg_temperature_c || 20, humidity: row.humidity_percent || 50 },
  });

  /* ---------------- UI helpers ---------------- */
  const getStatusColor = (status: string) =>
    status === 'critical' ? '#EF4444' : status === 'warning' ? '#F59E0B' : '#10B981';

  const renderTiltGauge = () => {
    const pct = Math.min((sensorData.tilt.current / sensorData.tilt.threshold) * 50, 100);
    const color = getStatusColor(sensorData.tilt.status);
    return (
      <Svg width="80" height="80" viewBox="0 0 80 80">
        <Path d="M 15 65 A 25 25 0 0 1 65 65" stroke="#E5E7EB" strokeWidth="6" fill="none" />
        <Path d={`M 15 65 A 25 25 0 0 ${pct > 50 ? 1 : 0} ${15 + (pct / 100) * 50} ${65 - (pct / 100) * 25}`} stroke={color} strokeWidth="6" fill="none" />
      </Svg>
    );
  };

  /* ---------------- Render ---------------- */
  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={{ textAlign: 'center', marginTop: 8 }}>Loading sensor data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Activity color="#3B82F6" size={24} />
        <Text style={styles.title}>IoT Sensor Monitoring</Text>
        <View style={styles.live}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Smart Filters */}
      <Text style={styles.filterHeading}>Filters</Text>
      {(Object.keys(availableFilterValues) as FilterFields[]).map((field) => (
        <View key={field} style={{ marginBottom: 10 }}>
          <DropDownPicker
            open={filterOpen[field]}
            value={selectedFilters[field] || null}
            items={[{ label: 'All', value: '' }, ...availableFilterValues[field].map(v => ({ label: v, value: v }))]}
            setOpen={(o) => setFilterOpen(prev => ({ ...prev, [field]: o }))}
            setValue={(cb) => setSelectedFilters(prev => ({ ...prev, [field]: cb(prev[field]) || '' }))}
            placeholder={field}
            style={{ borderColor: '#E5E7EB', borderRadius: 8 }}
            dropDownContainerStyle={{ borderColor: '#E5E7EB' }}
          />
        </View>
      ))}

      {/* Sensor Grid */}
      <Text style={styles.section}>Structural</Text>
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text>Vibration</Text>
          <Text style={{ color: getStatusColor(sensorData.vibration.status), fontWeight: '700' }}>
            {sensorData.vibration.current.toFixed(2)} mm/s
          </Text>
        </View>
        <View style={styles.card}>
          <Text>Tilt</Text>
          {renderTiltGauge()}
          <Text style={{ color: getStatusColor(sensorData.tilt.status) }}>{sensorData.tilt.current.toFixed(2)}°</Text>
        </View>
      </View>

      <Text style={styles.section}>Crane</Text>
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text>Alerts</Text>
          <Text style={{ color: getStatusColor(sensorData.craneAlerts.status), fontWeight: '700' }}>
            {sensorData.craneAlerts.count}
          </Text>
        </View>
      </View>

      <Text style={styles.section}>Environment</Text>
      <View style={styles.cardRow}>
        <View style={styles.card}>
          <Text>Temperature</Text>
          <Text>{sensorData.temperature.current.toFixed(1)} °C</Text>
        </View>
        <View style={styles.card}>
          <Text>Humidity</Text>
          <Text>{sensorData.temperature.humidity.toFixed(1)} %</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700' },
  live: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 6, borderRadius: 8 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 4 },
  liveText: { fontSize: 10, fontWeight: '600', color: '#10B981' },
  section: { fontSize: 16, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  cardRow: { flexDirection: 'row', gap: 12 },
  card: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 8, alignItems: 'center' },
  filterHeading: { fontWeight: '600', marginBottom: 6 },
});
