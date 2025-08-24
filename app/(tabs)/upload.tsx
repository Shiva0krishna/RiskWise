import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { Upload, FileText, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { ApiService } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import * as DocumentPicker from 'expo-document-picker';

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
        // Create a File object for the API
        const fileBlob = await fetch(file.uri).then(r => r.blob());
        const fileObject = new File([fileBlob], file.name, { type: 'text/csv' });

        // Call the prediction API
        const predictions = await ApiService.predictFromCsv(fileObject);

        // Save to database
        if (user) {
          const { error } = await supabase
            .from('predictions')
            .insert({
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

        if (Platform.OS === 'web') {
          // Show success message on web
        } else {
          Alert.alert(
            'Upload Successful',
            `Processed ${predictions.length} predictions from ${file.name}`,
            [{ text: 'OK' }]
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

        if (Platform.OS === 'web') {
          // Show error message on web
        } else {
          Alert.alert('Upload Failed', 'Please try again or check your file format.');
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
      case 'High': return '#EF4444';
      case 'Medium': return '#F59E0B';
      case 'Low': return '#10B981';
      default: return '#6B7280';
    }
  };

  /** -----------------------------
   * ✅ NEW: Table renderer
   * Renders an array of objects as a simple table
   * ------------------------------ */
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
          <View key={rIdx} style={styles.tableRow}>
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

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Upload CSV File</Text>
        <Text style={styles.subtitle}>
          Upload your building data CSV file for batch risk prediction
        </Text>
      </View>

      <View style={styles.content}>
        {/* Upload Section */}
        <View style={styles.uploadSection}>
          <View style={styles.uploadCard}>
            <Upload color="#3B82F6" size={48} />
            <Text style={styles.uploadTitle}>Select CSV File</Text>
            <Text style={styles.uploadDescription}>
              Choose a CSV file containing building data for risk analysis
            </Text>
            
            <Button
              title={uploading ? "Processing..." : "Choose File"}
              onPress={handleFileUpload}
              loading={uploading}
              style={styles.uploadButton}
            />
          </View>

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
        </View>

        {/* Results Section */}
        {uploadResults.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>Upload Results</Text>
            
            {uploadResults.map((result, index) => (
              <View key={index} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultIcon}>
                    {result.status === 'success' ? (
                      <CheckCircle color="#10B981" size={24} />
                    ) : (
                      <AlertCircle color="#EF4444" size={24} />
                    )}
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultFileName}>{result.fileName}</Text>
                    <Text style={styles.resultStatus}>
                      {result.status === 'success' 
                        ? `${result.results.length} predictions generated`
                        : result.error || 'Upload failed'
                      }
                    </Text>
                  </View>
                </View>

                {result.status === 'success' && result.results.length > 0 && (
                  <>
                    {/* Existing summary stays the same */}
                    <View style={styles.resultSummary}>
                      <Text style={styles.summaryTitle}>Risk Summary:</Text>
                      <View style={styles.riskCounts}>
                        {['High', 'Medium', 'Low'].map(risk => {
                          const count = result.results.filter(r => r.Predicted_Risk === risk).length;
                          return (
                            <View key={risk} style={styles.riskCount}>
                              <View style={[
                                styles.riskDot,
                                { backgroundColor: getRiskColor(risk) }
                              ]} />
                              <Text style={styles.riskCountText}>
                                {risk}: {count}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* ✅ NEW: Table view of the raw predictions */}
                    <Text style={[styles.summaryTitle, { marginTop: 12 }]}>
                      Prediction Results (Table):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      {renderTable(result.results)}
                    </ScrollView>
                  </>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructionsSection}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <View style={styles.instructionsList}>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>1</Text>
              <Text style={styles.instructionText}>
                Prepare your CSV file with all required building data columns
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>2</Text>
              <Text style={styles.instructionText}>
                Ensure data is properly formatted (numbers for numeric fields, text for categorical)
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>3</Text>
              <Text style={styles.instructionText}>
                Click "Choose File" and select your CSV file
              </Text>
            </View>
            <View style={styles.instructionItem}>
              <Text style={styles.instructionNumber}>4</Text>
              <Text style={styles.instructionText}>
                Review the prediction results and risk analysis
              </Text>
            </View>
          </View>
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
    lineHeight: 24,
  },
  content: {
    padding: 24,
  },
  uploadSection: {
    marginBottom: 32,
  },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  uploadButton: {
    minWidth: 200,
  },
  formatInfo: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  formatTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  formatText: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  resultsSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultInfo: {
    flex: 1,
  },
  resultFileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  resultStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
  resultSummary: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  riskCounts: {
    flexDirection: 'row',
    gap: 16,
  },
  riskCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  riskCountText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  instructionsSection: {
    marginBottom: 32,
  },
  instructionsList: {
    gap: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginRight: 12,
  },
  instructionText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },

  /* ✅ NEW: simple table styles */
  table: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
    minWidth: 600, // helps on small screens; horizontal scroll is enabled
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
