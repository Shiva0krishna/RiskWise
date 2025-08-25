import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Line, Circle, Rect } from 'react-native-svg';
import { TrendingUp } from 'lucide-react-native';

interface RiskTimelineData {
  date: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  confidence: number;
}

interface RiskTimelinePanelProps {
  timelineData: RiskTimelineData[];
}

export function RiskTimelinePanel({ timelineData }: RiskTimelinePanelProps) {
  const getRiskValue = (risk: string) => {
    switch (risk) {
      case 'Low': return 1;
      case 'Medium': return 2;
      case 'High': return 3;
      default: return 1;
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'Low': return '#10B981';
      case 'Medium': return '#F59E0B';
      case 'High': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const renderTimeline = (data: RiskTimelineData[], width: number, height: number) => {
    if (data.length < 2) return null;
    
    const riskValues = data.map(d => getRiskValue(d.riskLevel));
    const max = 3;
    const min = 1;
    const range = max - min;
    
    return (
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {[1, 2, 3].map(level => {
          const y = height - ((level - min) / range) * height;
          return (
            <Line
              key={level}
              x1="0"
              y1={y}
              x2={width}
              y2={y}
              stroke="#F3F4F6"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
          );
        })}
        
        {/* Risk level areas */}
        <Rect x="0" y="0" width={width} height={height / 3} fill="#FEF2F2" opacity="0.3" />
        <Rect x="0" y={height / 3} width={width} height={height / 3} fill="#FFFBEB" opacity="0.3" />
        <Rect x="0" y={(2 * height) / 3} width={width} height={height / 3} fill="#F0FDF4" opacity="0.3" />
        
        {/* Timeline line */}
        {data.map((point, index) => {
          if (index === 0) return null;
          
          const prevPoint = data[index - 1];
          const x1 = ((index - 1) / (data.length - 1)) * width;
          const y1 = height - ((getRiskValue(prevPoint.riskLevel) - min) / range) * height;
          const x2 = (index / (data.length - 1)) * width;
          const y2 = height - ((getRiskValue(point.riskLevel) - min) / range) * height;
          
          return (
            <Line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#374151"
              strokeWidth="3"
            />
          );
        })}
        
        {/* Data points */}
        {data.map((point, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((getRiskValue(point.riskLevel) - min) / range) * height;
          const color = getRiskColor(point.riskLevel);
          
          return (
            <Circle
              key={index}
              cx={x}
              cy={y}
              r="6"
              fill={color}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          );
        })}
      </Svg>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TrendingUp color="#3B82F6" size={24} />
        <View style={styles.headerText}>
          <Text style={styles.title}>Risk Timeline</Text>
          <Text style={styles.subtitle}>Prediction history over time</Text>
        </View>
      </View>
      
      <View style={styles.chartContainer}>
        {timelineData.length > 0 ? (
          <>
            {renderTimeline(timelineData, 280, 120)}
            <View style={styles.timelineLabels}>
              <View style={styles.dateLabels}>
                {timelineData.length > 1 && (
                  <>
                    <Text style={styles.dateLabel}>
                      {formatDate(timelineData[0].date)}
                    </Text>
                    <Text style={styles.dateLabel}>
                      {formatDate(timelineData[timelineData.length - 1].date)}
                    </Text>
                  </>
                )}
              </View>
            </View>
            
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.legendText}>High Risk</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                <Text style={styles.legendText}>Medium Risk</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Low Risk</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No timeline data available</Text>
            <Text style={styles.emptyStateSubtext}>
              Risk predictions will appear here over time
            </Text>
          </View>
        )}
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
    marginBottom: 20,
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
  chartContainer: {
    alignItems: 'center',
  },
  timelineLabels: {
    width: 280,
    marginTop: 8,
  },
  dateLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: 16,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});