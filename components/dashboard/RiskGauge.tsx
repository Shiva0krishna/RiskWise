import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Svg, Circle, Path } from 'react-native-svg';

interface RiskGaugeProps {
  riskLevel: 'Low' | 'Medium' | 'High';
  confidence: number; // 0-1
}

export function RiskGauge({ riskLevel, confidence }: RiskGaugeProps) {
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  const getRiskAngle = () => {
    switch (riskLevel) {
      case 'Low': return 30;
      case 'Medium': return 90;
      case 'High': return 150;
      default: return 90;
    }
  };

  const angle = getRiskAngle();
  const radian = (angle - 90) * (Math.PI / 180);
  const x = 50 + 35 * Math.cos(radian);
  const y = 50 + 35 * Math.sin(radian);

  return (
    <View style={styles.container}>
      <View style={styles.gaugeContainer}>
        <Svg width="120" height="80" viewBox="0 0 100 60">
          {/* Background arc */}
          <Path
            d="M 15 50 A 35 35 0 0 1 85 50"
            stroke="#E5E7EB"
            strokeWidth="8"
            fill="none"
          />
          
          {/* Low risk section */}
          <Path
            d="M 15 50 A 35 35 0 0 0 35 25"
            stroke="#10B981"
            strokeWidth="8"
            fill="none"
            opacity={0.3}
          />
          
          {/* Medium risk section */}
          <Path
            d="M 35 25 A 35 35 0 0 0 65 25"
            stroke="#F59E0B"
            strokeWidth="8"
            fill="none"
            opacity={0.3}
          />
          
          {/* High risk section */}
          <Path
            d="M 65 25 A 35 35 0 0 0 85 50"
            stroke="#EF4444"
            strokeWidth="8"
            fill="none"
            opacity={0.3}
          />
          
          {/* Active section */}
          <Path
            d={`M 15 50 A 35 35 0 0 ${angle > 90 ? 1 : 0} ${x} ${y}`}
            stroke={getRiskColor()}
            strokeWidth="8"
            fill="none"
          />
          
          {/* Needle */}
          <Circle cx={x} cy={y} r="4" fill={getRiskColor()} />
          <Circle cx="50" cy="50" r="3" fill="#374151" />
        </Svg>
        
        <View style={styles.gaugeLabels}>
          <Text style={[styles.gaugeLabel, { color: '#10B981' }]}>LOW</Text>
          <Text style={[styles.gaugeLabel, { color: '#F59E0B' }]}>MEDIUM</Text>
          <Text style={[styles.gaugeLabel, { color: '#EF4444' }]}>HIGH</Text>
        </View>
      </View>
      
      <View style={styles.riskInfo}>
        <Text style={[styles.riskLevel, { color: getRiskColor() }]}>
          {riskLevel.toUpperCase()}
        </Text>
        <Text style={styles.confidence}>
          {Math.round(confidence * 100)}% Confidence
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  gaugeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 120,
    marginTop: -10,
  },
  gaugeLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  riskInfo: {
    alignItems: 'center',
    marginTop: 12,
  },
  riskLevel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  confidence: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});