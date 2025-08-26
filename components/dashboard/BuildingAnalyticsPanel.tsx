import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Svg, Line, Circle, Rect, Text as SvgText } from 'react-native-svg';
import { Filter, ChartBar as BarChart3, ChartPie as PieChart, TrendingUp, Building } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';

interface BuildingData {
  id: string;
  building_id: string;
  city: string | null;
  comparable_project: string | null;
  floors: number | null;
  height_m: number | null;
  total_area_m2: number | null;
  material: string | null;
  structural_system: string | null;
  structural_risk_index: number | null;
  facade_complexity_index: number | null;
  project_duration_days: number | null;
  delay_index: number | null;
  cost_overrun_percent: number | null;
  safety_incident_count: number | null;
  resource_allocation_efficiency: number | null;
  max_vibration_mm_s: number | null;
  avg_tilt_deg: number | null;
  avg_temperature_c: number | null;
  humidity_percent: number | null;
  equipment_usage_rate_percent: number | null;
  crane_alerts_count: number | null;
  cobie_assets: number | null;
  cobie_systems: number | null;
  risk_level: string | null;
  created_at: string;
  project_id: string | null;
}

interface Filters {
  city: string;
  material: string;
  structural_system: string;
  risk_level: string;
  floors_min: string;
  floors_max: string;
}

interface BuildingAnalyticsPanelProps {
  selectedProjectId?: string | null;
}

export function BuildingAnalyticsPanel({ selectedProjectId }: BuildingAnalyticsPanelProps) {
  const { user } = useAuth();
  const [buildingData, setBuildingData] = useState<BuildingData[]>([]);
  const [filteredData, setFilteredData] = useState<BuildingData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    city: '',
    material: '',
    structural_system: '',
    risk_level: '',
    floors_min: '',
    floors_max: '',
  });

  useEffect(() => {
    loadBuildingData();
  }, [user, selectedProjectId]);

  useEffect(() => {
    applyFilters();
  }, [buildingData, filters]);

  const loadBuildingData = async () => {
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

      const { data, error } = await query;

      if (error) throw error;

      setBuildingData(data || []);
    } catch (error) {
      console.error('Error loading building data:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...buildingData];

    if (filters.city) {
      filtered = filtered.filter(item => 
        item.city?.toLowerCase().includes(filters.city.toLowerCase())
      );
    }

    if (filters.material) {
      filtered = filtered.filter(item => item.material === filters.material);
    }

    if (filters.structural_system) {
      filtered = filtered.filter(item => item.structural_system === filters.structural_system);
    }

    if (filters.risk_level) {
      filtered = filtered.filter(item => item.risk_level === filters.risk_level);
    }

    if (filters.floors_min) {
      const min = parseInt(filters.floors_min);
      filtered = filtered.filter(item => (item.floors || 0) >= min);
    }

    if (filters.floors_max) {
      const max = parseInt(filters.floors_max);
      filtered = filtered.filter(item => (item.floors || 0) <= max);
    }

    setFilteredData(filtered);
  };

  const clearFilters = () => {
    setFilters({
      city: '',
      material: '',
      structural_system: '',
      risk_level: '',
      floors_min: '',
      floors_max: '',
    });
  };

  const getUniqueValues = (field: keyof BuildingData) => {
    return [...new Set(buildingData.map(item => item[field]).filter(Boolean))];
  };

  const getRiskColor = (risk: string | null) => {
    switch (risk) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  // Analytics calculations
  const riskDistribution = {
    High: filteredData.filter(item => item.risk_level === 'High').length,
    Medium: filteredData.filter(item => item.risk_level === 'Medium').length,
    Low: filteredData.filter(item => item.risk_level === 'Low').length,
  };

  const materialDistribution = getUniqueValues('material').map(material => ({
    name: material as string,
    count: filteredData.filter(item => item.material === material).length,
  }));

  const avgMetrics = {
    floors: filteredData.reduce((sum, item) => sum + (item.floors || 0), 0) / filteredData.length || 0,
    height: filteredData.reduce((sum, item) => sum + (item.height_m || 0), 0) / filteredData.length || 0,
    area: filteredData.reduce((sum, item) => sum + (item.total_area_m2 || 0), 0) / filteredData.length || 0,
    delayIndex: filteredData.reduce((sum, item) => sum + (item.delay_index || 0), 0) / filteredData.length || 0,
    costOverrun: filteredData.reduce((sum, item) => sum + (item.cost_overrun_percent || 0), 0) / filteredData.length || 0,
  };

  const renderPieChart = (data: { [key: string]: number }, size: number) => {
    const total = Object.values(data).reduce((sum, val) => sum + val, 0);
    if (total === 0) return null;

    let currentAngle = 0;
    const radius = size / 2 - 10;
    const centerX = size / 2;
    const centerY = size / 2;

    return (
      <Svg width={size} height={size}>
        {Object.entries(data).map(([key, value], index) => {
          const percentage = value / total;
          const angle = percentage * 360;
          const startAngle = currentAngle;
          const endAngle = currentAngle + angle;
          
          const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
          const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
          const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
          const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
          
          const largeArcFlag = angle > 180 ? 1 : 0;
          const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
          
          currentAngle += angle;
          
          return (
            <path
              key={key}
              d={pathData}
              fill={getRiskColor(key)}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          );
        })}
      </Svg>
    );
  };

  const renderBarChart = (data: { name: string; count: number }[], width: number, height: number) => {
    if (data.length === 0) return null;
    
    const maxCount = Math.max(...data.map(d => d.count));
    const barWidth = (width - 40) / data.length - 8;
    
    return (
      <Svg width={width} height={height + 30}>
        {data.map((item, index) => {
          const barHeight = maxCount > 0 ? (item.count / maxCount) * height : 0;
          const x = 20 + index * (barWidth + 8);
          const y = height - barHeight;
          
          return (
            <g key={item.name}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#3B82F6"
                rx="4"
              />
              <SvgText
                x={x + barWidth / 2}
                y={height + 15}
                fontSize="10"
                fill="#6B7280"
                textAnchor="middle"
              >
                {item.name.substring(0, 8)}
              </SvgText>
              <SvgText
                x={x + barWidth / 2}
                y={y - 5}
                fontSize="10"
                fill="#374151"
                textAnchor="middle"
              >
                {item.count}
              </SvgText>
            </g>
          );
        })}
      </Svg>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Building Data Analytics</Text>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <BarChart3 color="#3B82F6" size={24} />
          <View style={styles.headerText}>
            <Text style={styles.title}>Building Data Analytics</Text>
            <Text style={styles.subtitle}>
              {filteredData.length} of {buildingData.length} buildings
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(true)}
        >
          <Filter color="#3B82F6" size={20} />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.analyticsContainer}>
          {/* Risk Distribution */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Risk Distribution</Text>
            <View style={styles.pieChartContainer}>
              {renderPieChart(riskDistribution, 120)}
              <View style={styles.pieChartLegend}>
                {Object.entries(riskDistribution).map(([risk, count]) => (
                  <View key={risk} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: getRiskColor(risk) }]} />
                    <Text style={styles.legendText}>{risk}: {count}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Material Distribution */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Material Distribution</Text>
            <View style={styles.barChartContainer}>
              {renderBarChart(materialDistribution, 200, 100)}
            </View>
          </View>

          {/* Key Metrics */}
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Average Metrics</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{avgMetrics.floors.toFixed(1)}</Text>
                <Text style={styles.metricLabel}>Avg Floors</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{avgMetrics.height.toFixed(1)}m</Text>
                <Text style={styles.metricLabel}>Avg Height</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>{(avgMetrics.area / 1000).toFixed(1)}k</Text>
                <Text style={styles.metricLabel}>Avg Area (m²)</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[
                  styles.metricValue,
                  { color: avgMetrics.delayIndex > 0.3 ? '#EF4444' : '#10B981' }
                ]}>
                  {(avgMetrics.delayIndex * 100).toFixed(1)}%
                </Text>
                <Text style={styles.metricLabel}>Avg Delay</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={[
                  styles.metricValue,
                  { color: avgMetrics.costOverrun > 10 ? '#EF4444' : '#10B981' }
                ]}>
                  {avgMetrics.costOverrun.toFixed(1)}%
                </Text>
                <Text style={styles.metricLabel}>Avg Cost Overrun</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Filter Modal */}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Building Data</Text>
            <TouchableOpacity onPress={clearFilters}>
              <Text style={styles.clearFiltersText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.filtersContainer}>
            {/* City Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>City</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.city}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, city: value }))}
                >
                  <Picker.Item label="All Cities" value="" />
                  {getUniqueValues('city').map((city) => (
                    <Picker.Item key={city} label={city as string} value={city as string} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Material Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Material</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.material}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, material: value }))}
                >
                  <Picker.Item label="All Materials" value="" />
                  {getUniqueValues('material').map((material) => (
                    <Picker.Item key={material} label={material as string} value={material as string} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Structural System Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Structural System</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.structural_system}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, structural_system: value }))}
                >
                  <Picker.Item label="All Systems" value="" />
                  {getUniqueValues('structural_system').map((system) => (
                    <Picker.Item key={system} label={system as string} value={system as string} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Risk Level Filter */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Risk Level</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={filters.risk_level}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, risk_level: value }))}
                >
                  <Picker.Item label="All Risk Levels" value="" />
                  <Picker.Item label="High Risk" value="High" />
                  <Picker.Item label="Medium Risk" value="Medium" />
                  <Picker.Item label="Low Risk" value="Low" />
                </Picker>
              </View>
            </View>

            {/* Floors Range */}
            <View style={styles.filterGroup}>
              <Text style={styles.filterLabel}>Number of Floors</Text>
              <View style={styles.rangeContainer}>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangeLabel}>Min</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={filters.floors_min}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, floors_min: value }))}
                    >
                      <Picker.Item label="Any" value="" />
                      {[1, 5, 10, 15, 20, 25, 30].map((num) => (
                        <Picker.Item key={num} label={num.toString()} value={num.toString()} />
                      ))}
                    </Picker>
                  </View>
                </View>
                <View style={styles.rangeInput}>
                  <Text style={styles.rangeLabel}>Max</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={filters.floors_max}
                      onValueChange={(value) => setFilters(prev => ({ ...prev, floors_max: value }))}
                    >
                      <Picker.Item label="Any" value="" />
                      {[5, 10, 15, 20, 25, 30, 50].map((num) => (
                        <Picker.Item key={num} label={num.toString()} value={num.toString()} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Button
              title="Apply Filters"
              onPress={() => setShowFilters(false)}
              style={styles.applyButton}
            />
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF8FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
    marginLeft: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  analyticsContainer: {
    flexDirection: 'row',
    gap: 16,
  },
  chartCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minWidth: 200,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
    textAlign: 'center',
  },
  pieChartContainer: {
    alignItems: 'center',
  },
  pieChartLegend: {
    marginTop: 12,
    gap: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  barChartContainer: {
    alignItems: 'center',
  },
  metricsGrid: {
    gap: 12,
  },
  metricItem: {
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  filtersContainer: {
    flex: 1,
    padding: 24,
  },
  filterGroup: {
    marginBottom: 24,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  pickerContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    minHeight: 56,
  },
  rangeContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  rangeInput: {
    flex: 1,
  },
  rangeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  modalActions: {
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  applyButton: {
    backgroundColor: '#3B82F6',
  },
});