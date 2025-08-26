// components/IoTSensorPanel.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  LayoutAnimation,
  UIManager,
  Platform,
  Pressable,
} from 'react-native';
import { Svg, Line, Circle, Path } from 'react-native-svg';
import { Activity, AlertTriangle, Gauge, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type FilterFields = 'city' | 'material' | 'structural_system' | 'risk_level';

interface SensorData {
  vibration: { current: number; threshold: number; trend: number[]; status: 'normal' | 'warning' | 'critical' };
  craneAlerts: { count: number; weeklyTrend: number[]; status: 'normal' | 'warning' | 'critical' };
  tilt: { current: number; threshold: number; status: 'normal' | 'warning' | 'critical' };
  temperature: { current: number; humidity: number };
}

interface IoTSensorPanelProps {
  selectedProjectId?: string | null;
  // optional: streamIntervalMs?: number;
}

export function IoTSensorPanel({ selectedProjectId }: IoTSensorPanelProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Rows and streaming
  const rowsRef = useRef<any[]>([]);
  const cursorRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const STREAM_INTERVAL_MS = 3000; // simulated live tick

  // UI & data state
  const [currentRow, setCurrentRow] = useState<any | null>(null);
  const [sensorData, setSensorData] = useState<SensorData>({
    vibration: { current: 0, threshold: 5, trend: [], status: 'normal' },
    craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
    tilt: { current: 0, threshold: 0.5, status: 'normal' },
    temperature: { current: 0, humidity: 0 },
  });

  // Filters (nice UI: chips + dropdown panel)
  const [availableFilterValues, setAvailableFilterValues] = useState<Record<FilterFields, string[]>>({
    city: [],
    material: [],
    structural_system: [],
    risk_level: [],
  });
  const [selectedFilters, setSelectedFilters] = useState<Partial<Record<FilterFields, string>>>({});
  const [openDropdown, setOpenDropdown] = useState<FilterFields | null>(null);
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);

  const BUILDING_RISK_TABLE = 'building_risk';
  const BUILDING_DATA_TABLE = 'building_data';

  /* ----------------------- Helper: status color ----------------------- */
  const getStatusColor = (status: string) =>
    status === 'critical' ? '#EF4444' : status === 'warning' ? '#F59E0B' : '#10B981';

  /* ----------------------- fetch filter options ----------------------- */
  useEffect(() => {
    // load once
    fetchFilterOptions().catch(console.error);
  }, []);

  const fetchFilterOptions = async () => {
    try {
      const { data, error } = await supabase
        .from(BUILDING_RISK_TABLE)
        .select('city, material, structural_system, risk_level');

      if (error) {
        console.error('fetchFilterOptions error', error);
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

  /* ----------------------- fetch building_ids matching filters ----------------------- */
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
    } catch (err) {
      console.error('fetchBuildingIdsMatchingFilters err', err);
      return [];
    }
  };

  /* ----------------------- load rows (and start stream) ----------------------- */
  useEffect(() => {
    // whenever filters / project / user change, reload rows
    if (!user) return;
    loadRowsAndStartStream();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFilters, selectedProjectId, user]);

  const stopStream = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const loadRowsAndStartStream = async () => {
    setLoading(true);
    stopStream();

    try {
      // if filters applied, get building_ids from building_risk
      const hasFilters = Object.keys(selectedFilters).length > 0;
      let buildingIds: string[] | null = null;
      if (hasFilters) {
        buildingIds = await fetchBuildingIdsMatchingFilters(selectedFilters);
        // if none match, clear display and exit
        if (!buildingIds || buildingIds.length === 0) {
          rowsRef.current = [];
          cursorRef.current = 0;
          setCurrentRow(null);
          setSensorData({
            vibration: { current: 0, threshold: 5, trend: [], status: 'normal' },
            craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
            tilt: { current: 0, threshold: 0.5, status: 'normal' },
            temperature: { current: 0, humidity: 0 },
          });
          setLoading(false);
          return;
        }
      }

      // build query for building_data
      let query = supabase.from(BUILDING_DATA_TABLE).select('*').order('created_at', { ascending: true }).limit(1000);
      // prefer filtering by user (keep user's rows)
      if (user?.id) query = query.eq('user_id', user.id);
      if (selectedProjectId) query = query.eq('project_id', selectedProjectId);
      if (hasFilters && buildingIds) query = query.in('building_id', buildingIds);

      const { data, error } = await query;
      if (error) {
        console.error('loadRows query error', error);
        setLoading(false);
        return;
      }
      const rows = data || [];
      rowsRef.current = rows;
      cursorRef.current = 0;

      if (!rows.length) {
        setCurrentRow(null);
        setSensorData({
          vibration: { current: 0, threshold: 5, trend: [], status: 'normal' },
          craneAlerts: { count: 0, weeklyTrend: [], status: 'normal' },
          tilt: { current: 0, threshold: 0.5, status: 'normal' },
          temperature: { current: 0, humidity: 0 },
        });
        setLoading(false);
        return;
      }

      // set initial immediately
      const firstRow = rowsRef.current[0];
      setCurrentRow(firstRow);
      setSensorData(buildSensorDataFromRow(firstRow, null));

      // start interval to iterate rows to simulate live data
      intervalRef.current = setInterval(() => {
        const idx = cursorRef.current;
        const row = rowsRef.current[idx];
        if (row) {
          // update currentRow and sensorData (append to trends)
          setCurrentRow(row);
          setSensorData(prev => buildSensorDataFromRow(row, prev));
        }
        cursorRef.current = (idx + 1) % rowsRef.current.length;
      }, STREAM_INTERVAL_MS);
    } catch (err) {
      console.error('loadRowsAndStartStream err', err);
    } finally {
      setLoading(false);
      setIsApplyingFilters(false);
    }
  };

  /* ----------------------- build sensor data from a row (keep trends) ----------------------- */
  const MAX_TREND = 12;
  const buildSensorDataFromRow = (row: any, prev: SensorData | null): SensorData => {
    const vib = Number(row.max_vibration_mm_s ?? 0);
    const crane = Number(row.crane_alerts_count ?? 0);
    const tiltVal = Number(row.avg_tilt_deg ?? 0);
    const temp = Number(row.avg_temperature_c ?? 20);
    const humidity = Number(row.humidity_percent ?? 50);

    const prevVibTrend = prev?.vibration.trend ?? [];
    const prevCraneTrend = prev?.craneAlerts.weeklyTrend ?? [];
    const newVibTrend = [...prevVibTrend, vib].slice(-MAX_TREND);
    const newCraneTrend = [...prevCraneTrend, crane].slice(-MAX_TREND);

    return {
      vibration: {
        current: vib,
        threshold: 5,
        trend: newVibTrend,
        status: vib > 5 ? 'critical' : vib > 3 ? 'warning' : 'normal',
      },
      craneAlerts: {
        count: crane,
        weeklyTrend: newCraneTrend,
        status: crane > 5 ? 'critical' : crane > 2 ? 'warning' : 'normal',
      },
      tilt: {
        current: tiltVal,
        threshold: 0.5,
        status: tiltVal > 0.5 ? 'critical' : tiltVal > 0.3 ? 'warning' : 'normal',
      },
      temperature: {
        current: temp,
        humidity: humidity,
      },
    };
  };

  /* ----------------------- UI actions: filters ----------------------- */
  const toggleDropdown = (field: FilterFields) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenDropdown(prev => (prev === field ? null : field));
  };

  const selectFilterValue = (field: FilterFields, value: string) => {
    setSelectedFilters(prev => {
      const copy = { ...prev };
      if (!value) delete copy[field];
      else copy[field] = value;
      return copy;
    });
  };

  const applyFilters = async () => {
    setIsApplyingFilters(true);
    // loadRowsAndStartStream effect is already dependent on selectedFilters; but call explicitly to be responsive
    await loadRowsAndStartStream();
  };

  const clearFilters = async () => {
    setSelectedFilters({});
    setIsApplyingFilters(true);
    await loadRowsAndStartStream();
  };

  /* ----------------------- Small svg line chart helper ----------------------- */
  const renderLineChart = (data: number[], width: number, height: number, color: string, threshold?: number) => {
    if (!data || data.length < 2) return null;
    const max = Math.max(...data, threshold ?? 0);
    const min = Math.min(...data, 0);
    const range = max - min || 0.1;

    // build lines points
    const points: { x: number; y: number }[] = data.map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((v - min) / range) * height;
      return { x, y };
    });

    return (
      <Svg width={width} height={height}>
        {typeof threshold === 'number' && (
          <Line
            x1={0}
            y1={height - ((threshold - min) / range) * height}
            x2={width}
            y2={height - ((threshold - min) / range) * height}
            stroke="#EF4444"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}

        {points.map((p, i) => {
          if (i === 0) return null;
          const prev = points[i - 1];
          return <Line key={`l-${i}`} x1={prev.x} y1={prev.y} x2={p.x} y2={p.y} stroke={color} strokeWidth="2" />;
        })}

        {points.map((p, i) => (
          <Circle key={`c-${i}`} cx={p.x} cy={p.y} r="3" fill={color} />
        ))}
      </Svg>
    );
  };

  /* ----------------------- Render ----------------------- */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading sensor data...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={styles.header}>
        <Activity color="#3B82F6" size={22} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>IoT Sensor Monitoring</Text>
          <Text style={styles.subtitle}>Real-time site sensor feed (simulated)</Text>
        </View>
        <View style={styles.liveIndicator}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>LIVE</Text>
        </View>
      </View>

      {/* Current building details (from currentRow snapshot) */}
      <View style={styles.detailsCard}>
        <Text style={styles.detailsTitle}>Building Snapshot</Text>
        {currentRow ? (
          <View style={styles.detailsGrid}>
            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Building ID</Text>
              <Text style={styles.detailValue}>{currentRow.building_id}</Text>

              <Text style={styles.detailLabel}>City</Text>
              <Text style={styles.detailValue}>{currentRow.city ?? '—'}</Text>

              <Text style={styles.detailLabel}>Comparable Project</Text>
              <Text style={styles.detailValue}>{currentRow.comparable_project ?? '—'}</Text>

              <Text style={styles.detailLabel}>Floors</Text>
              <Text style={styles.detailValue}>{currentRow.floors ?? '—'}</Text>

              <Text style={styles.detailLabel}>Height (m)</Text>
              <Text style={styles.detailValue}>{currentRow.height_m ?? '—'}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>Total Area (m²)</Text>
              <Text style={styles.detailValue}>{currentRow.total_area_m2 ?? '—'}</Text>

              <Text style={styles.detailLabel}>Material</Text>
              <Text style={styles.detailValue}>{currentRow.material ?? '—'}</Text>

              <Text style={styles.detailLabel}>Structural System</Text>
              <Text style={styles.detailValue}>{currentRow.structural_system ?? '—'}</Text>

              <Text style={styles.detailLabel}>Risk Level</Text>
              <Text style={styles.detailValue}>{currentRow.risk_level ?? currentRow.risk_level?.toString() ?? '—'}</Text>

              <Text style={styles.detailLabel}>Safety Incidents</Text>
              <Text style={styles.detailValue}>{currentRow.safety_incident_count ?? 0}</Text>
            </View>
          </View>
        ) : (
          <Text style={{ color: '#6B7280' }}>No snapshot to display (no rows matched)</Text>
        )}
      </View>

      {/* Filters - chip style + dropdown panel */}
      <View style={styles.filtersWrap}>
        <Text style={styles.filterHeading}>Filters</Text>

        <View style={styles.chipsRow}>
          {(['city', 'material', 'structural_system', 'risk_level'] as FilterFields[]).map(field => {
            const label = selectedFilters[field] || field.replace('_', ' ');
            const isOpen = openDropdown === field;
            return (
              <View key={field} style={{ marginRight: 8 }}>
                <Pressable
                  onPress={() => toggleDropdown(field)}
                  style={({ pressed }) => [
                    styles.chip,
                    isOpen ? styles.chipActive : null,
                    pressed ? { opacity: 0.7 } : null,
                  ]}
                >
                  <Text style={styles.chipText}>{label || 'All'}</Text>
                  {isOpen ? <ChevronUp size={16} color="#334155" /> : <ChevronDown size={16} color="#334155" />}
                </Pressable>

                {/* dropdown panel */}
                {isOpen && (
                  <View style={styles.dropdownPanel}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      <TouchableOpacity onPress={() => selectFilterValue(field, '')} style={styles.dropdownItem}>
                        <Text style={[styles.dropdownItemText, !selectedFilters[field] && { fontWeight: '700' }]}>All</Text>
                      </TouchableOpacity>
                      {(availableFilterValues[field] || []).map(v => (
                        <TouchableOpacity
                          key={v}
                          onPress={() => {
                            selectFilterValue(field, v);
                            // close dropdown
                            setOpenDropdown(null);
                          }}
                          style={styles.dropdownItem}
                        >
                          <Text style={[styles.dropdownItemText, selectedFilters[field] === v && { fontWeight: '700' }]}>{v}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            );
          })}
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

      {/* Sensors Grid */}
      <View style={styles.sensorsGrid}>
        {/* Vibration */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Activity color={getStatusColor(sensorData.vibration.status)} size={18} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.sensorTitle}>Vibration</Text>
              <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.vibration.status) }]}>
                {sensorData.vibration.current.toFixed(2)} mm/s
              </Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            {renderLineChart(sensorData.vibration.trend, 220, 60, getStatusColor(sensorData.vibration.status), sensorData.vibration.threshold)}
          </View>
          <Text style={styles.thresholdText}>Threshold: {sensorData.vibration.threshold} mm/s</Text>
        </View>

        {/* Crane */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <AlertTriangle color={getStatusColor(sensorData.craneAlerts.status)} size={18} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.sensorTitle}>Crane Alerts</Text>
              <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.craneAlerts.status) }]}>
                {sensorData.craneAlerts.count}
              </Text>
            </View>
          </View>

          <View style={styles.chartWrap}>
            {renderLineChart(sensorData.craneAlerts.weeklyTrend, 220, 60, getStatusColor(sensorData.craneAlerts.status))}
          </View>
          <Text style={styles.thresholdText}>7-point trend</Text>
        </View>

        {/* Tilt */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Gauge color={getStatusColor(sensorData.tilt.status)} size={18} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.sensorTitle}>Structural Tilt</Text>
              <Text style={[styles.sensorValue, { color: getStatusColor(sensorData.tilt.status) }]}>
                {sensorData.tilt.current.toFixed(3)}°
              </Text>
            </View>
          </View>

          <View style={{ alignItems: 'center', marginTop: 8 }}>{/* gauge */}
            <Svg width={100} height={100} viewBox="0 0 100 100">{/* simple arc */ }
              <Path d="M 20 80 A 30 30 0 0 1 80 80" stroke="#E5E7EB" strokeWidth="6" fill="none" />
              <Path
                d={`M 20 80 A 30 30 0 0 ${sensorData.tilt.current > sensorData.tilt.threshold ? 1 : 0} ${20 + Math.min(60, (sensorData.tilt.current / (sensorData.tilt.threshold || 1)) * 60)} ${80 - Math.min(60, (sensorData.tilt.current / (sensorData.tilt.threshold || 1)) * 60) / 2}`}
                stroke={getStatusColor(sensorData.tilt.status)}
                strokeWidth="6"
                fill="none"
              />
            </Svg>
          </View>
          <Text style={styles.thresholdText}>Limit: {sensorData.tilt.threshold}°</Text>
        </View>

        {/* Environment */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <TrendingUp color="#3B82F6" size={18} />
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.sensorTitle}>Environment</Text>
              <Text style={styles.sensorValue}>{sensorData.temperature.current.toFixed(1)}°C</Text>
            </View>
          </View>

          <View style={styles.envList}>
            <View style={styles.envRow}>
              <Text style={styles.envLabel}>Temperature</Text>
              <Text style={styles.envValue}>{sensorData.temperature.current.toFixed(1)}°C</Text>
            </View>
            <View style={styles.envRow}>
              <Text style={styles.envLabel}>Humidity</Text>
              <Text style={styles.envValue}>{sensorData.temperature.humidity.toFixed(1)}%</Text>
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/* ----------------------- Styles ----------------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 12, color: '#475569' },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  subtitle: { fontSize: 12, color: '#6B7280' },

  liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  liveText: { fontSize: 10, color: '#065F46', fontWeight: '600' },

  detailsCard: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E6EEF6', marginBottom: 12 },
  detailsTitle: { fontWeight: '700', marginBottom: 8, color: '#0F172A' },
  detailsGrid: { flexDirection: 'row' },
  detailCol: { flex: 1, paddingRight: 10 },
  detailLabel: { fontSize: 12, color: '#64748B', marginTop: 6 },
  detailValue: { fontSize: 14, color: '#0F172A', fontWeight: '600' },

  filtersWrap: { marginBottom: 12 },
  filterHeading: { fontWeight: '700', marginBottom: 8 },
  chipsRow: { flexDirection: 'row', marginBottom: 8, flexWrap: 'wrap' },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  chipActive: { backgroundColor: '#E0F2FE' },
  chipText: { marginRight: 8, color: '#0F172A', fontWeight: '600', textTransform: 'capitalize' },

  dropdownPanel: {
    position: 'relative',
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 4,
    width: 220,
    maxHeight: 220,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  dropdownItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dropdownItemText: { color: '#0F172A' },

  filterButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 },
  applyButton: { backgroundColor: '#2563EB', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  applyButtonText: { color: '#fff', fontWeight: '700' },
  clearButton: { borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  clearButtonText: { color: '#0F172A', fontWeight: '700' },

  sensorsGrid: { marginTop: 12, gap: 12 },
  sensorCard: { backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  sensorHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  sensorTitle: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  sensorValue: { fontSize: 18, fontWeight: '800', color: '#0F172A' },

  chartWrap: { alignItems: 'center', marginBottom: 6 },

  thresholdText: { fontSize: 11, color: '#6B7280', textAlign: 'center' },

  envList: { marginTop: 8 },
  envRow: { flexDirection: 'row', justifyContent: 'space-between' },
  envLabel: { color: '#475569' },
  envValue: { color: '#0F172A', fontWeight: '700' },

  /* small utilities */
  loadingContainerOverlay: { padding: 20, alignItems: 'center' },
});
