import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Line, Circle, Rect } from 'react-native-svg';
import { Calendar, DollarSign, Users } from 'lucide-react-native';

interface KPIData {
  schedule: {
    delayIndex: number[];
    currentDelay: number;
  };
  cost: {
    overrunPercent: number;
    baseline: number;
    trend: number[];
  };
  efficiency: {
    current: number;
    target: number;
  };
}

interface ProjectKPIPanelProps {
  kpiData: KPIData;
}

export function ProjectKPIPanel({ kpiData }: ProjectKPIPanelProps) {
  const renderLineChart = (data: number[], width: number, height: number, color: string) => {
    if (data.length < 2) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 0.1;
    
    const points = data.map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    }).join(' ');

    return (
      <Svg width={width} height={height}>
        <Line
          x1="0"
          y1={height}
          x2={width}
          y2={height}
          stroke="#E5E7EB"
          strokeWidth="1"
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={color}
            />
          );
        })}
      </Svg>
    );
  };

  const renderBarChart = (data: number[], width: number, height: number) => {
    if (data.length === 0) return null;
    
    const max = Math.max(...data, kpiData.cost.baseline) || 1;
    const barWidth = width / data.length - 2;
    
    return (
      <Svg width={width} height={height}>
        {/* Baseline line */}
        <Line
          x1="0"
          y1={height - (kpiData.cost.baseline / max) * height}
          x2={width}
          y2={height - (kpiData.cost.baseline / max) * height}
          stroke="#6B7280"
          strokeWidth="1"
          strokeDasharray="4,4"
        />
        {data.map((value, index) => {
          const barHeight = (value / max) * height;
          const x = index * (barWidth + 2);
          const y = height - barHeight;
          const color = value > (kpiData.cost.baseline || 10) ? '#EF4444' : '#10B981';
          
          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill={color}
              rx="2"
            />
          );
        })}
      </Svg>
    );
  };

  const renderEfficiencyGauge = (current: number, target: number) => {
    const percentage = Math.min((current / target) * 100, 100);
    const color = percentage >= 90 ? '#10B981' : percentage >= 70 ? '#F59E0B' : '#EF4444';
    
    return (
      <View style={styles.gaugeContainer}>
        <Svg width="100" height="100" viewBox="0 0 100 100">
          <Circle
            cx="50"
            cy="50"
            r="35"
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          <Circle
            cx="50"
            cy="50"
            r="35"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${percentage * 2.2} 220`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </Svg>
        <View style={styles.gaugeCenter}>
          <Text style={[styles.gaugeValue, { color }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>BIM / Project KPIs</Text>
      <Text style={styles.subtitle}>Project health metrics</Text>
      
      <View style={styles.kpiGrid}>
        {/* Schedule Metrics */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <Calendar color="#3B82F6" size={20} />
            <Text style={styles.kpiTitle}>Schedule</Text>
          </View>
          <View style={styles.chartContainer}>
            {renderLineChart(kpiData.schedule.delayIndex, 120, 50, '#3B82F6')}
          </View>
          <View style={styles.kpiFooter}>
            <Text style={styles.kpiValue}>
              Delay: {(kpiData.schedule.currentDelay * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Cost Metrics */}
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <DollarSign color="#EF4444" size={20} />
            <Text style={styles.kpiTitle}>Cost Overrun</Text>
          </View>
          <View style={styles.chartContainer}>
            {renderBarChart(kpiData.cost.trend, 120, 50)}
          </View>
          <View style={styles.kpiFooter}>
            <Text style={[
              styles.kpiValue,
              { color: kpiData.cost.overrunPercent > kpiData.cost.baseline ? '#EF4444' : '#10B981' }
            ]}>
              {kpiData.cost.overrunPercent.toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Resource Efficiency */}
        <View style={[styles.kpiCard, styles.efficiencyCard]}>
          <View style={styles.kpiHeader}>
            <Users color="#10B981" size={20} />
            <Text style={styles.kpiTitle}>Resource Efficiency</Text>
          </View>
          <View style={styles.efficiencyGaugeContainer}>
            {renderEfficiencyGauge(kpiData.efficiency.current, kpiData.efficiency.target)}
          </View>
          <View style={styles.kpiFooter}>
            <Text style={styles.kpiValue}>
              Target: {kpiData.efficiency.target}%
            </Text>
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  kpiGrid: {
    gap: 16,
  },
  kpiCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  efficiencyCard: {
    alignItems: 'center',
  },
  kpiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kpiTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  efficiencyGaugeContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gaugeValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  kpiFooter: {
    alignItems: 'center',
  },
  kpiValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
});