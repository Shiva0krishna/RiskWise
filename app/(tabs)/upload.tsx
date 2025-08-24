import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { Upload, CircleCheck as CheckCircle, CircleAlert as AlertCircle } from 'lucide-react-native';
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
        const fileBlob = await fetch(file.uri).then(r => r.blob());
        const fileObject = new File([fileBlob], file.name, { type: 'text/csv' });

        const predictions = await ApiService.predictFromCsv(fileObject);

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

        if (Platform.OS !== 'web') {
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

        if (Platform.OS !== 'web') {
          Alert.alert('Upload Failed', 'Please try again or check your file format.');
        }
      }
    } catch (error) {
      console.error('File picker error:', error);
    } finally {
      setUploading(false);
    }
  };

  const renderTable = (rows: any[]) => {
    if (!rows || rows.length === 0) return null;

    const headers = Object.keys(rows[0]);

    return (
      <View style={styles.table}>
        {/* Table Header */}
        <View style={[styles.tableRow, styles.tableHeader]}>
          {headers.map((header, idx) => (
            <Text key={idx} style={[styles.tableCell, styles.tableHeaderCell]}>
              {header}
            </Text>
          ))}
        </View>
        {/* Table Rows */}
        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.tableRow}>
            {headers.map((header, cellIndex) => (
              <Text key={cellIndex} style={styles.tableCell}>
                {String(row[header])}
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

                {/* ✅ Render Table for JSON results */}
                {result.status === 'success' && result.results.length > 0 && (
                  <>
                    <Text style={styles.summaryTitle}>Prediction Results:</Text>
                    {renderTable(result.results)}
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 24 },
  title: { fontSize: 32, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6B7280', lineHeight: 24 },
  content: { padding: 24 },
  uploadSection: { marginBottom: 32 },
  uploadCard: {
    backgroundColor: '#FFFFFF',
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginTop: 16, marginBottom: 8 },
  uploadDescription: { fontSize: 16, color: '#6B7280', textAlign: 'center', marginBottom: 24 },
  uploadButton: { minWidth: 200 },
  resultsSection: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 16 },
  resultCard: { backgroundColor: '#FFFFFF', padding: 20, borderRadius: 12, marginBottom: 12 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  resultIcon: { marginRight: 12 },
  resultInfo: { flex: 1 },
  resultFileName: { fontSize: 16, fontWeight: '600', color: '#111827', marginBottom: 2 },
  resultStatus: { fontSize: 14, color: '#6B7280' },
  summaryTitle: { fontSize: 14, fontWeight: '600', marginVertical: 8 },
  
  /* ✅ Table styles */
  table: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 6, marginTop: 8 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  tableHeader: { backgroundColor: '#F3F4F6' },
  tableCell: { flex: 1, padding: 8, fontSize: 12, color: '#374151' },
  tableHeaderCell: { fontWeight: '700', color: '#111827' },
});
