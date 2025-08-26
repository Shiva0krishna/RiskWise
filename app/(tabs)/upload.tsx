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
import { Switch } from 'react-native';

interface UploadResult {
  fileName: string;
  results: any[];
  status: 'success' | 'error';
  error?: string;
}

export default function UploadScreen() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);

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

        if (user) {
          const { error } = await supabase.from('predictions').insert({
            user_id: user.id,
            prediction_type: 'csv',
            input_data: { file_name: file.name },
            results: predictions,
            file_name: file.name,
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
    // ✅ Web: create Blob and trigger download
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
    // ✅ Native: use expo-file-system + sharing
    const fileUri = FileSystem.documentDirectory + finalFileName;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri);
  }
};


  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Upload Section */}
      <View style={styles.card}>
        <Upload color="#3B82F6" size={48} />
        <Text style={styles.title}>Upload CSV File</Text>
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
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: 20,
  },
  title: {
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
  uploadButton: {
    marginTop: 16,
    alignSelf: 'stretch',
  },
  section: {
    marginTop: 8,
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
