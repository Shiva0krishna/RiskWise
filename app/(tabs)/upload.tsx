import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
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
        const apiResponse = await ApiService.predictFromCsv(fileObject);
        const predictions = Array.isArray(apiResponse?.predictions)
          ? apiResponse.predictions
          : [];

        // Save to database
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
          Alert.alert(
            'Upload Failed',
            'Please try again or check your file format.'
          );
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

  /** -----------------------------
   * ✅ Table renderer
   * ------------------------------ */
  const renderTable = (rows: any[]) => {
    if (!rows || rows.length === 0) {
      // render just headers for empty state
      const headers = [
        'Predicted_Risk',
        'proba_High',
        'proba_Low',
        'proba_Medium',
      ];
      return (
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            {headers.map((h, i) => (
              <Text key={i} style={[styles.tableCell, styles.tableHeaderCell]}>
                {h}
              </Text>
            ))}
          </View>
          <View style={styles.tableRow}>
            {headers.map((h, i) => (
              <Text key={i} style={styles.tableCell}>
                -
              </Text>
            ))}
          </View>
        </View>
      );
    }

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

  /** -----------------------------
   * ✅ CSV Download
   * ------------------------------ */
  const downloadCSV = async (rows: any[], fileName: string) => {
    if (!rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => r[h]).join(',')),
    ].join('\n');

    const fileUri =
      FileSystem.documentDirectory +
      fileName.replace('.csv', '_results.csv');

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri);
  };

  return (
    <ScrollView style={styles.container}>
      {/* header & upload section remain same */}

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
              title={uploading ? 'Processing...' : 'Choose File'}
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
                        : result.error || 'Upload failed'}
                    </Text>
                  </View>
                </View>

                {result.status === 'success' && (
                  <>
                    {/* ✅ Risk Summary */}
                    <View style={styles.resultSummary}>
                      <Text style={styles.summaryTitle}>Risk Summary:</Text>
                      <View style={styles.riskCounts}>
                        {['High', 'Medium', 'Low'].map(risk => {
                          const count = result.results.filter(
                            r => r.Predicted_Risk === risk
                          ).length;
                          return (
                            <View key={risk} style={styles.riskCount}>
                              <View
                                style={[
                                  styles.riskDot,
                                  { backgroundColor: getRiskColor(risk) },
                                ]}
                              />
                              <Text style={styles.riskCountText}>
                                {risk}: {count}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>

                    {/* ✅ Table view */}
                    <Text style={[styles.summaryTitle, { marginTop: 12 }]}>
                      Prediction Results (Table):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator>
                      {renderTable(result.results)}
                    </ScrollView>

                    {/* ✅ Download CSV */}
                    {result.results.length > 0 && (
                      <Button
                        title="Download Results CSV"
                        onPress={() =>
                          downloadCSV(result.results, result.fileName)
                        }
                        style={{ marginTop: 12 }}
                      />
                    )}
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
  /* keep your existing styles, table styles unchanged */
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
