import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import {
  Upload,
  CircleCheck as CheckCircle,
  CircleAlert as AlertCircle,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ApiService } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { PredictionResults } from '@/components/prediction/PredictionResults';
import { ProjectSelector } from '@/components/dashboard/ProjectSelector';

interface Project {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  structural_system: string | null;
  progress_percent: number | null;
  created_at: string;
  updated_at: string;
}

interface UploadResult {
  fileName: string;
  results: any[];
  status: 'success' | 'error';
  error?: string;
}

export default function UploadScreen() {
  const { user } = useAuth();
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [saveToProject, setSaveToProject] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [latestPredictions, setLatestPredictions] = useState<any[]>([]);

  const handleFileUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/csv',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setUploading(true);

      try {
        const fileBlob = await fetch(file.uri).then(r => r.blob());
        const fileObject = new File([fileBlob], file.name, { type: 'text/csv' });

        const apiResponse = await ApiService.predictFromCsv(fileObject);
        const predictions = Array.isArray(apiResponse?.predictions)
          ? apiResponse.predictions
          : [];

        // Show results immediately
        setLatestPredictions(predictions);

        if (user) {
          const { error } = await supabase
            .from('predictions')
            .insert({
              user_id: user.id,
              prediction_type: 'csv',
              input_data: { file_name: file.name },
              results: predictions,
              file_name: file.name,
              project_id: saveToProject ? selectedProject?.id || null : null,
              risk_level: predictions.length > 0 ? predictions[0].Predicted_Risk : null,
              confidence: predictions.length > 0 ? Math.max(
                predictions[0].proba_High || 0,
                predictions[0].proba_Medium || 0,
                predictions[0].proba_Low || 0
              ) : null,
            });

          if (error) throw error;
        }

        const uploadResult: UploadResult = {
          fileName: file.name,
          results: predictions,
          status: 'success',
        };
        setUploadResults(prev => [uploadResult, ...prev]);

        if (Platform.OS !== 'web') {
          Alert.alert(
            '✅ Upload Successful',
            `Processed ${predictions.length} predictions from ${file.name}`
          );
        }
      } catch (error) {
        console.error('Upload error:', error);
        const uploadResult: UploadResult = {
          fileName: file.name,
          results: [],
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed',
        };
        setUploadResults(prev => [uploadResult, ...prev]);

        if (Platform.OS !== 'web') {
          Alert.alert('❌ Upload Failed', 'Please check your file and try again.');
        }
      }
    } catch (error) {
      console.error('File picker error:', error);
    } finally {
      setUploading(false);
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'High':
        return '#EF4444';
      case 'Medium':
        return '#F59E0B';
      case 'Low':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const renderTable = (rows: any[]) => {
    if (!rows || rows.length === 0) return null;
    const headers = Object.keys(rows[0]);

    return (
      <View style={styles.table}>
        {/* Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          {headers.map((h, i) => (
            <Text key={i} style={[styles.tableCell, styles.tableHeaderCell]}>
              {h}
            </Text>
          ))}
        </View>

        {/* Body */}
        {rows.map((row, rIdx) => (
          <View
            key={rIdx}
            style={[
              styles.tableRow,
              rIdx % 2 === 0 && { backgroundColor: '#F9FAFB' }, // striped rows
            ]}
          >
            {headers.map((h, cIdx) => (
              <Text key={cIdx} style={styles.tableCell}>
                {String(row[h])}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const downloadCSV = async (rows: any[], fileName: string) => {
    if (!rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => r[h]).join(',')),
    ].join('\n');

    const finalFileName = fileName.replace('.csv', '_results.csv');

    if (Platform.OS === 'web') {
      // Web: create Blob and trigger download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = finalFileName;
      document.body.appendChild(a);
      a.click();

      // cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } else {
      // Native: use expo-file-system + sharing
      const fileUri = FileSystem.documentDirectory + finalFileName;

      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await Sharing.shareAsync(fileUri);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload & Analyze</Text>
        <Text style={styles.subtitle}>Upload CSV files for batch risk analysis</Text>
      </View>

      <ProjectSelector
        selectedProject={selectedProject}
        onProjectSelect={setSelectedProject}
      />

      {/* Save to Project Toggle */}
      <View style={styles.saveToggleContainer}>
        <View style={styles.saveToggleContent}>
          <Text style={styles.saveToggleLabel}>Save to Project</Text>
          <Text style={styles.saveToggleDescription}>
            {saveToProject 
              ? 'Results will be saved to the selected project' 
              : 'Results will be generated for analysis only'}
          </Text>
        </View>
        <Switch
          value={saveToProject}
          onValueChange={setSaveToProject}
          trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
          thumbColor={saveToProject ? '#3B82F6' : '#6B7280'}
        />
      </View>

      {/* Upload Section */}
      <View style={styles.card}>
        <Upload color="#3B82F6" size={48} />
        <Text style={styles.cardTitle}>Upload CSV File</Text>
        <Text style={styles.description}>
          Select a CSV file with building data to analyze potential risk.
        </Text>

        <View style={styles.formatInfo}>
          <Text style={styles.formatTitle}>Expected CSV Format:</Text>
          <Text style={styles.formatText}>
            Building_ID, City, Comparable_Project, Floors, Height_m, Total_Area_m2, 
            Material, Structural_System, Structural_Risk_Index, Facade_Complexity_Index, 
            Project_Duration_days, Delay_Index, Cost_Overrun_%, Safety_Incident_Count, 
            Resource_Allocation_Efficiency, Max_Vibration_mm_s, Avg_Tilt_deg, 
            Avg_Temperature_C, Humidity_%, Equipment_Usage_Rate_%, Crane_Alerts_Count, 
            COBie_Assets, COBie_Systems
          </Text>
        </View>

        <Button
          title={uploading ? 'Processing...' : 'Choose File'}
          onPress={handleFileUpload}
          loading={uploading}
          style={styles.uploadButton}
        />
      </View>

      {/* Show latest predictions immediately */}
      {latestPredictions.length > 0 && (
        <View style={styles.latestResults}>
          <PredictionResults results={latestPredictions} />
        </View>
      )}

      {/* Results Section */}
      {uploadResults.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Upload Results</Text>

          {uploadResults.map((result, index) => (
            <View key={index} style={styles.resultCard}>
              <View style={styles.resultHeader}>
                {result.status === 'success' ? (
                  <CheckCircle color="#10B981" size={22} />
                ) : (
                  <AlertCircle color="#EF4444" size={22} />
                )}
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.resultFileName}>{result.fileName}</Text>
                  <Text style={styles.resultStatus}>
                    {result.status === 'success'
                      ? `${result.results.length} predictions`
                      : result.error || 'Upload failed'}
                  </Text>
                </View>
              </View>

              {result.status === 'success' && (
                <>
                  {/* Risk Summary */}
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryTitle}>Risk Summary</Text>
                    <View style={styles.riskCounts}>
                      {['High', 'Medium', 'Low'].map(risk => {
                        const count = result.results.filter(
                          r => r.Predicted_Risk === risk
                        ).length;
                        return (
                          <View key={risk} style={styles.riskBadge}>
                            <View
                              style={[
                                styles.riskDot,
                                { backgroundColor: getRiskColor(risk) },
                              ]}
                            />
                            <Text style={styles.riskText}>
                              {risk}: {count}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  {/* Prediction Table */}
                  <Text style={styles.tableTitle}>Detailed Predictions</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {renderTable(result.results)}
                  </ScrollView>

                  {/* Download */}
                  <Button
                    title="⬇️ Download Results"
                    onPress={() => downloadCSV(result.results, result.fileName)}
                    style={{ marginTop: 12 }}
                  />
                </>
              )}
            </View>
          ))}
        </View>
      )}
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
    paddingBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  saveToggleContainer: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  saveToggleContent: {
    flex: 1,
    marginRight: 16,
  },
  saveToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  saveToggleDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 12,
    color: '#111827',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginVertical: 8,
    textAlign: 'center',
  },
  formatInfo: {
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    width: '100%',
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  formatText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  uploadButton: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  latestResults: {
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  section: {
    marginTop: 8,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  resultStatus: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  summaryBox: {
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#111827',
  },
  riskCounts: {
    flexDirection: 'row',
    gap: 12,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  riskText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#374151',
  },
  tableTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    color: '#111827',
  },
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 600,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableHeader: {
    backgroundColor: '#F3F4F6',
  },
  tableCell: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 12,
    color: '#374151',
  },
  tableHeaderCell: {
    fontWeight: '700',
    color: '#111827',
  },
});