import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function IndexScreen() {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect based on authentication status
  return user ? <Redirect href="/(tabs)" /> : <Redirect href="/welcome" />;
}