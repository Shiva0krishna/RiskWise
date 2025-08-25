import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://oefzpuklqyrkpygcnrsu.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lZnpwdWtscXlya3B5Z2NucnN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MjExNDYsImV4cCI6MjA3MTA5NzE0Nn0.5yGRoDTbMNuwGa9uxFi2Ew0UgjF_wOIV1eZDA7CX_YQ';

// Use AsyncStorage for React Native, localStorage for web
const storage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return AsyncStorage.getItem(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    return AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    return AsyncStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          city: string | null;
          structural_system: string | null;
          progress_percent: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          name: string;
          description?: string | null;
          city?: string | null;
          structural_system?: string | null;
          progress_percent?: number | null;
        };
        Update: {
          name?: string;
          description?: string | null;
          city?: string | null;
          structural_system?: string | null;
          progress_percent?: number | null;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          prediction_type: 'csv' | 'json' | 'text';
          input_data: any;
          results: any;
          file_name: string | null;
          created_at: string;
          project_id: string | null;
        };
        Insert: {
          user_id: string;
          prediction_type: 'csv' | 'json' | 'text';
          input_data: any;
          results: any;
          file_name?: string | null;
          project_id?: string | null;
        };
        Update: {
          prediction_type?: 'csv' | 'json' | 'text';
          input_data?: any;
          results?: any;
          file_name?: string | null;
          project_id?: string | null;
        };
      };
      building_data: {
        Row: {
          id: string;
          user_id: string;
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
          created_at: string;
          updated_at: string;
          project_id: string | null;
        };
        Insert: {
          user_id: string;
          building_id: string;
          city?: string | null;
          comparable_project?: string | null;
          floors?: number | null;
          height_m?: number | null;
          total_area_m2?: number | null;
          material?: string | null;
          structural_system?: string | null;
          structural_risk_index?: number | null;
          facade_complexity_index?: number | null;
          project_duration_days?: number | null;
          delay_index?: number | null;
          cost_overrun_percent?: number | null;
          safety_incident_count?: number | null;
          resource_allocation_efficiency?: number | null;
          max_vibration_mm_s?: number | null;
          avg_tilt_deg?: number | null;
          avg_temperature_c?: number | null;
          humidity_percent?: number | null;
          equipment_usage_rate_percent?: number | null;
          crane_alerts_count?: number | null;
          cobie_assets?: number | null;
          cobie_systems?: number | null;
          project_id?: string | null;
        };
        Update: {
          building_id?: string;
          city?: string | null;
          comparable_project?: string | null;
          floors?: number | null;
          height_m?: number | null;
          total_area_m2?: number | null;
          material?: string | null;
          structural_system?: string | null;
          structural_risk_index?: number | null;
          facade_complexity_index?: number | null;
          project_duration_days?: number | null;
          delay_index?: number | null;
          cost_overrun_percent?: number | null;
          safety_incident_count?: number | null;
          resource_allocation_efficiency?: number | null;
          max_vibration_mm_s?: number | null;
          avg_tilt_deg?: number | null;
          avg_temperature_c?: number | null;
          humidity_percent?: number | null;
          equipment_usage_rate_percent?: number | null;
          crane_alerts_count?: number | null;
          cobie_assets?: number | null;
          cobie_systems?: number | null;
          updated_at?: string;
          project_id?: string | null;
        };
      };
    };
  };
};