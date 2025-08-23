import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Shield, BarChart3, FileText, Users } from 'lucide-react-native';
import { Button } from '@/components/ui/Button';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const features = [
    {
      icon: Shield,
      title: 'Risk Assessment',
      description: 'Advanced ML algorithms to predict building construction risks',
      color: '#3B82F6',
    },
    {
      icon: BarChart3,
      title: 'Data Analytics',
      description: 'Comprehensive analysis of construction project parameters',
      color: '#10B981',
    },
    {
      icon: FileText,
      title: 'Multiple Inputs',
      description: 'Support for CSV files, JSON data, and interactive text input',
      color: '#8B5CF6',
    },
    {
      icon: Users,
      title: 'User Management',
      description: 'Secure user accounts with personalized prediction history',
      color: '#F59E0B',
    },
  ];

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={['#1E40AF', '#3B82F6', '#60A5FA']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>RiskWise</Text>
          <Text style={styles.subtitle}>
            AI-Powered Construction Risk Prediction
          </Text>
          <Text style={styles.description}>
            Leverage machine learning to predict and mitigate construction risks
            before they impact your projects.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Key Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: `${feature.color}15` }]}>
                  <feature.icon color={feature.color} size={32} />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDescription}>{feature.description}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Why Choose RiskWise?</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>95%</Text>
              <Text style={styles.statLabel}>Accuracy Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>50+</Text>
              <Text style={styles.statLabel}>Risk Factors</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>24/7</Text>
              <Text style={styles.statLabel}>Monitoring</Text>
            </View>
          </View>
        </View>

        <View style={styles.ctaSection}>
          <Text style={styles.ctaTitle}>Ready to Get Started?</Text>
          <Text style={styles.ctaDescription}>
            Join thousands of construction professionals who trust RiskWise
            for their risk assessment needs.
          </Text>
          
          <View style={styles.buttonContainer}>
            <Button
              title="Sign Up"
              onPress={() => router.push('/(auth)/register')}
              style={styles.primaryButton}
            />
            <Button
              title="Sign In"
              onPress={() => router.push('/(auth)/login')}
              variant="outline"
              style={styles.secondaryButton}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E5E7EB',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#D1D5DB',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  content: {
    padding: 24,
  },
  featuresSection: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 24,
    textAlign: 'center',
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  featureIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    textAlign: 'center',
  },
  featureDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  statsSection: {
    marginBottom: 40,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3B82F6',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
    textAlign: 'center',
  },
  ctaSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  ctaTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  ctaDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#3B82F6',
  },
  secondaryButton: {
    borderColor: '#3B82F6',
  },
});