import React from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function IndexScreen() {
  const { user, loading } = useAuth();

  React.useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/(tabs)/');
      } else {
        router.replace('/welcome');
      }
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return <LoadingSpinner />;
}