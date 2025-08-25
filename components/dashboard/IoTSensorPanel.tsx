import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Line, Circle, Rect } from 'react-native-svg';
import { Activity, Zap, Gauge } from 'lucide-react-native';

interface SensorData {
  vibration: {
    current: number;
    threshold: number;
    trend: number[];
  };
  craneAlerts: {
    count: number;
    weeklyTrend: number[];
  };
  tilt: {
    current: number;
    threshold: number;
  };
}

interface IoTSensorPanelProps {
  sensorData: SensorData;
}

export function IoTSensorPanel({ sensorData }: IoTSensorPanelProps) {
  const renderLineChart = (data: number[], width: number, height: number) => {
    if (data.length < 2) return null;
    
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    
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
          stroke="#3B82F6"
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
              r="3"
              fill="#3B82F6"
            />
          );
        })}
      </Svg>
    );
  };

  const renderBarChart = (data: number[], width: number, height: number) => {
    if (data.length === 0) return null;
    
    const max = Math.max(...data) || 1;
    const barWidth = width / data.length - 2;
    
    return (
      <Svg width={width} height={height}>
        {data.map((value, index) => {
          const barHeight = (value / max) * height;
          const x = index * (barWidth + 2);
          const y = height - barHeight;
          
          return (
            <Rect
              key={index}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              fill="#10B981"
              rx="2"
            />
          );
        })}
      </Svg>
    );
  };

  const renderTiltGauge = (current: number, threshold: number) => {
    const percentage = Math.min((current / threshold) * 100, 100);
    const color = percentage > 80 ? '#EF4444' : percentage > 60 ? '#F59E0B' : '#10B981';
    
    return (
      <View style={styles.gaugeContainer}>
        <Svg width="80" height="80" viewBox="0 0 100 100">
          <Circle
            cx="50"
            cy="50"
            r="40"
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          <Circle
            cx="50"
            cy="50"
            r="40"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${percentage * 2.51} 251`}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </Svg>
        <View style={styles.gaugeCenter}>
          <Text style={[styles.gaugeValue, { color }]}>
            {current.toFixed(1)}°
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>IoT Sensor Monitoring</Text>
      <Text style={styles.subtitle}>Real-time site conditions</Text>
      
      <View style={styles.sensorsGrid}>
        {/* Vibration Chart */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Activity color="#3B82F6" size={20} />
            <Text style={styles.sensorTitle}>Vibration</Text>
          </View>
          <View style={styles.chartContainer}>
            {renderLineChart(sensorData.vibration.trend, 120, 60)}
          </View>
          <View style={styles.sensorFooter}>
            <Text style={styles.currentValue}>
              {sensorData.vibration.current} mm/s
            </Text>
            <Text style={[
              styles.thresholdText,
              sensorData.vibration.current > sensorData.vibration.threshold && styles.thresholdExceeded
            ]}>
              Limit: {sensorData.vibration.threshold}
            </Text>
          </View>
        </View>

        {/* Crane Alerts */}
        <View style={styles.sensorCard}>
          <View style={styles.sensorHeader}>
            <Zap color="#10B981" size={20} />
            <Text style={styles.sensorTitle}>Crane Alerts</Text>
          </View>
          <View style={styles.chartContainer}>
            {renderBarChart(sensorData.craneAlerts.weeklyTrend, 120, 60)}
          </View>
          <View style={styles.sensorFooter}>
            <Text style={styles.currentValue}>
              {sensorData.craneAlerts.count} alerts
            </Text>
            <Text style={styles.thresholdText}>This week</Text>
          </View>
        </View>

        {/* Tilt Gauge */}
        <View style={[styles.sensorCard, styles.tiltCard]}>
          <View style={styles.sensorHeader}>
            <Gauge color="#F59E0B" size={20} />
            <Text style={styles.sensorTitle}>Structural Tilt</Text>
          </View>
          <View style={styles.tiltGaugeContainer}>
            {renderTiltGauge(sensorData.tilt.current, sensorData.tilt.threshold)}
          </View>
          <View style={styles.sensorFooter}>
            <Text style={styles.thresholdText}>
              Limit: {sensorData.tilt.threshold}°
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
  sensorsGrid: {
    gap: 16,
  },
  sensorCard: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tiltCard: {
    alignItems: 'center',
  },
  sensorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sensorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 8,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  tiltGaugeContainer: {
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
    top: 25,
  },
  gaugeValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  sensorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  currentValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  thresholdText: {
    fontSize: 12,
    color: '#6B7280',
  },
  thresholdExceeded: {
    color: '#EF4444',
    fontWeight: '600',
  },
});