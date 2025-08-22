import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChartBar as BarChart3, Users, Shield, Zap } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function HomeScreen() {
  const { user } = useAuth();

  const stats = [
    { icon: Users, label: 'Active Users', value: '1,234', color: '#3B82F6' },
    { icon: Shield, label: 'Security Score', value: '98%', color: '#10B981' },
    { icon: BarChart3, label: 'Performance', value: '99.9%', color: '#8B5CF6' },
    { icon: Zap, label: 'Uptime', value: '100%', color: '#F59E0B' },
  ];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#3B82F6', '#6366F1']}
        style={styles.header}
      >
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.user_metadata?.full_name || 'User'}!</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <TouchableOpacity key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}15` }]}>
                <stat.icon color={stat.color} size={24} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🎉 Authentication Complete</Text>
          <Text style={styles.cardDescription}>
            Your authentication system is now fully operational and ready for production use.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>✨ System Features</Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>✓ Secure email/password authentication</Text>
            <Text style={styles.featureItem}>✓ User session management</Text>
            <Text style={styles.featureItem}>✓ Protected routes</Text>
            <Text style={styles.featureItem}>✓ Password reset functionality</Text>
            <Text style={styles.featureItem}>✓ Professional UI/UX design</Text>
            <Text style={styles.featureItem}>✓ Cross-platform compatibility</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>🚀 Next Steps</Text>
          <Text style={styles.cardDescription}>
            Your authentication foundation is ready. You can now build additional features like user profiles, 
            data management, or integrate with your Python backend model.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 32,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  userEmail: {
    fontSize: 16,
    color: '#E5E7EB',
  },
  content: {
    padding: 24,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});