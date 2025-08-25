import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TriangleAlert as AlertTriangle, TrendingUp, CircleCheck as CheckCircle } from 'lucide-react-native';

interface RiskDriver {
  factor: string;
  value: number;
  threshold: number;
  importance: number; // 0-1
  status: 'critical' | 'warning' | 'normal';
}

interface RiskDriversPanelProps {
  drivers: RiskDriver[];
}

export function RiskDriversPanel({ drivers }: RiskDriversPanelProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'normal': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'warning': return TrendingUp;
      case 'normal': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const sortedDrivers = drivers.sort((a, b) => b.importance - a.importance);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Key Risk Drivers</Text>
      <Text style={styles.subtitle}>Top contributing factors ranked by importance</Text>
      
      <View style={styles.driversContainer}>
        {sortedDrivers.slice(0, 6).map((driver, index) => {
          const StatusIcon = getStatusIcon(driver.status);
          const statusColor = getStatusColor(driver.status);
          const barWidth = Math.max(driver.importance * 100, 10);
          
          return (
            <View key={index} style={styles.driverItem}>
              <View style={styles.driverHeader}>
                <View style={styles.driverInfo}>
                  <View style={styles.driverTitleRow}>
                    <StatusIcon color={statusColor} size={16} />
                    <Text style={styles.driverName}>{driver.factor}</Text>
                  </View>
                  <Text style={styles.driverValue}>
                    Current: {driver.value} | Threshold: {driver.threshold}
                  </Text>
                </View>
                <Text style={[styles.importanceScore, { color: statusColor }]}>
                  {Math.round(driver.importance * 100)}%
                </Text>
              </View>
              
              <View style={styles.importanceBarContainer}>
                <View
                  style={[
                    styles.importanceBar,
                    {
                      width: `${barWidth}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
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
  driversContainer: {
    gap: 16,
  },
  driverItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  driverInfo: {
    flex: 1,
  },
  driverTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  driverValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  importanceScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  importanceBarContainer: {
    height: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 2,
    overflow: 'hidden',
  },
  importanceBar: {
    height: '100%',
    borderRadius: 2,
  },
});