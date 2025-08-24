import React, { useState } from "react";
import { View, Text, Button, StyleSheet, ScrollView } from "react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../lib/supabase";
import ApiService from "../services/ApiService";

interface UploadResult {
  fileName: string;
  results: any[];
  status: "success" | "error";
}

const CsvUploadScreen = ({ user }: { user: any }) => {
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);

  // 📌 File Upload Handler
  const handleFileUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "text/csv" });

    if (result.canceled) return;
    const file = result.assets[0];

    try {
      const fileContent = await FileSystem.readAsStringAsync(file.uri);
      const fileObject = new File([fileContent], file.name, { type: "text/csv" });

      const apiResponse = await ApiService.predictFromCsv(fileObject);

      // ✅ fix: extract predictions array
      const predictions = apiResponse.predictions || [];

      // Save to Supabase
      if (user) {
        const { error } = await supabase.from("predictions").insert({
          user_id: user.id,
          prediction_type: "csv",
          input_data: { file_name: file.name },
          results: predictions,
          file_name: file.name,
        });
        if (error) throw error;
      }

      const uploadResult: UploadResult = {
        fileName: file.name,
        results: predictions,
        status: "success",
      };

      setUploadResults((prev) => [uploadResult, ...prev]);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadResults((prev) => [
        { fileName: file.name, results: [], status: "error" },
        ...prev,
      ]);
    }
  };

  // 📌 Table Renderer
  const renderTable = (rows: any[]) => {
    const headers =
      rows.length > 0
        ? Object.keys(rows[0])
        : ["Predicted_Risk", "proba_High", "proba_Low", "proba_Medium"];

    const data = rows.length > 0 ? rows : [{}];

    return (
      <View style={styles.table}>
        <View style={[styles.tableRow, styles.tableHeader]}>
          {headers.map((h, i) => (
            <Text key={i} style={[styles.tableCell, styles.tableHeaderCell]}>
              {h}
            </Text>
          ))}
        </View>
        {data.map((row, rIdx) => (
          <View key={rIdx} style={styles.tableRow}>
            {headers.map((h, cIdx) => (
              <Text key={cIdx} style={styles.tableCell}>
                {row[h] !== undefined ? String(row[h]) : "-"}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  // 📌 CSV Download
  const downloadCSV = async (rows: any[], fileName: string) => {
    if (!rows || rows.length === 0) return;

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => r[h]).join(",")),
    ].join("\n");

    const fileUri =
      FileSystem.documentDirectory +
      fileName.replace(".csv", "_results.csv");

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    await Sharing.shareAsync(fileUri);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>CSV Upload & Prediction</Text>
      <Button title="Choose CSV File" onPress={handleFileUpload} />

      {uploadResults.map((result, idx) => (
        <View key={idx} style={styles.resultCard}>
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
          <Text style={styles.resultTitle}>{result.fileName}</Text>
          {renderTable(result.results)}
          {result.results.length > 0 && (
            <Button
              title="Download Results CSV"
              onPress={() => downloadCSV(result.results, result.fileName)}
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  resultCard: {
    marginTop: 20,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f8f9fa",
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  table: {
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeader: {
    backgroundColor: "#eee",
  },
  tableCell: {
    flex: 1,
    padding: 6,
    borderWidth: 1,
    borderColor: "#ddd",
    fontSize: 12,
  },
  tableHeaderCell: {
    fontWeight: "bold",
    fontSize: 13,
  },
});

export default CsvUploadScreen;
