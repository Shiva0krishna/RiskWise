// components/BuildingDataForm.tsx
import React, { useState } from "react";
import { ScrollView, View, Text, TextInput, TouchableOpacity } from "react-native";
import { supabase } from "@/lib/supabase";
import { Picker } from "@react-native-picker/picker";
import { GeminiService } from "@/lib/GeminiService";

type Section = "general" | "dimensions" | "risks" | "environment" | "operations";

export default function BuildingDataForm() {
  const [activeSection, setActiveSection] = useState<Section>("general");
  const [form, setForm] = useState<any>({
    building_id: "",
    city: "",
    comparable_project: "",
    floors: "",
    height_m: "",
    total_area_m2: "",
    material: "",
    structural_system: "",
    structural_risk_index: "",
    facade_complexity_index: "",
    project_duration_days: "",
    delay_index: "",
    cost_overrun_percent: "",
    safety_incident_count: "",
    resource_allocation_efficiency: "",
    max_vibration_mm_s: "",
    avg_tilt_deg: "",
    avg_temperature_c: "",
    humidity_percent: "",
    equipment_usage_rate_percent: "",
    crane_alerts_count: "",
    cobie_assets: "",
    cobie_systems: "",
    risk_level: "",
  });

  const [saving, setSaving] = useState(false);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const handleChange = (field: string, value: any) => {
    setForm({ ...form, [field]: value });
  };

  const handleSave = async () => {
    setSaving(true);

    // Insert into Supabase
    const { error } = await supabase.from("general_dataset").insert([form]);

    if (error) {
      console.error("Error saving data:", error);
      alert("Error saving data");
    } else {
      alert("Building data saved!");
    }
    setSaving(false);
  };

  const handleRecommendations = async () => {
    const recs = await GeminiService.generateRecommendations(
      form.risk_level || "Medium",
      [
        { factor: "Delay Index", value: form.delay_index, threshold: 0.25, status: "normal" },
        { factor: "Cost Overrun %", value: form.cost_overrun_percent, threshold: 10, status: "normal" },
      ],
      { name: form.building_id, city: form.city, structural_system: form.structural_system, progress_percent: 50 }
    );
    setRecommendations(recs);
  };

  const renderInput = (label: string, field: string, type: "text" | "number" = "text") => (
    <View className="mb-4">
      <Text className="text-base font-medium mb-1">{label}</Text>
      <TextInput
        value={form[field]}
        onChangeText={(text) => handleChange(field, type === "number" ? Number(text) : text)}
        keyboardType={type === "number" ? "numeric" : "default"}
        placeholder={label}
        className="border border-gray-300 rounded-xl p-3"
      />
    </View>
  );

  const renderDropdown = (label: string, field: string, options: string[]) => (
    <View className="mb-4">
      <Text className="text-base font-medium mb-1">{label}</Text>
      <View className="border border-gray-300 rounded-xl">
        <Picker selectedValue={form[field]} onValueChange={(value) => handleChange(field, value)}>
          <Picker.Item label={`Select ${label}`} value="" />
          {options.map((opt) => (
            <Picker.Item key={opt} label={opt} value={opt} />
          ))}
        </Picker>
      </View>
    </View>
  );

  const SectionToggle = ({ section, title }: { section: Section; title: string }) => (
    <TouchableOpacity
      className={`p-3 rounded-xl mb-2 ${activeSection === section ? "bg-blue-500" : "bg-gray-200"}`}
      onPress={() => setActiveSection(section)}
    >
      <Text className={`text-lg font-semibold ${activeSection === section ? "text-white" : "text-black"}`}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView className="flex-1 p-4">
      {/* Section Toggles */}
      <View className="flex-row flex-wrap gap-2 mb-4">
        <SectionToggle section="general" title="General Info" />
        <SectionToggle section="dimensions" title="Dimensions" />
        <SectionToggle section="risks" title="Risk Factors" />
        <SectionToggle section="environment" title="Environment" />
        <SectionToggle section="operations" title="Operations" />
      </View>

      {/* General Info */}
      {activeSection === "general" && (
        <View>
          {renderInput("Building ID", "building_id")}
          {renderInput("City", "city")}
          {renderInput("Comparable Project", "comparable_project")}
          {renderDropdown("Material", "material", ["Concrete", "Steel", "Composite", "Timber"])}
          {renderDropdown("Structural System", "structural_system", ["Core & Outrigger", "Shear Wall", "Frame", "Mixed"])}
          {renderDropdown("Risk Level", "risk_level", ["Low", "Medium", "High"])}
        </View>
      )}

      {/* Dimensions */}
      {activeSection === "dimensions" && (
        <View>
          {renderInput("Floors", "floors", "number")}
          {renderInput("Height (m)", "height_m", "number")}
          {renderInput("Total Area (m²)", "total_area_m2", "number")}
        </View>
      )}

      {/* Risk Factors */}
      {activeSection === "risks" && (
        <View>
          {renderInput("Structural Risk Index", "structural_risk_index", "number")}
          {renderInput("Facade Complexity Index", "facade_complexity_index", "number")}
          {renderInput("Project Duration (days)", "project_duration_days", "number")}
          {renderInput("Delay Index", "delay_index", "number")}
          {renderInput("Cost Overrun %", "cost_overrun_percent", "number")}
          {renderInput("Safety Incident Count", "safety_incident_count", "number")}
          {renderInput("Resource Allocation Efficiency", "resource_allocation_efficiency", "number")}
        </View>
      )}

      {/* Environment */}
      {activeSection === "environment" && (
        <View>
          {renderInput("Max Vibration (mm/s)", "max_vibration_mm_s", "number")}
          {renderInput("Avg Tilt (°)", "avg_tilt_deg", "number")}
          {renderInput("Avg Temperature (°C)", "avg_temperature_c", "number")}
          {renderInput("Humidity %", "humidity_percent", "number")}
        </View>
      )}

      {/* Operations */}
      {activeSection === "operations" && (
        <View>
          {renderInput("Equipment Usage Rate %", "equipment_usage_rate_percent", "number")}
          {renderInput("Crane Alerts Count", "crane_alerts_count", "number")}
          {renderInput("COBie Assets", "cobie_assets", "number")}
          {renderInput("COBie Systems", "cobie_systems", "number")}
        </View>
      )}

      {/* Save + Recommendations */}
      <TouchableOpacity
        className="bg-green-600 rounded-xl p-4 mt-6"
        onPress={handleSave}
        disabled={saving}
      >
        <Text className="text-white text-center text-lg font-semibold">
          {saving ? "Saving..." : "Save Building Data"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-purple-600 rounded-xl p-4 mt-4"
        onPress={handleRecommendations}
      >
        <Text className="text-white text-center text-lg font-semibold">Get AI Recommendations</Text>
      </TouchableOpacity>

      {recommendations.length > 0 && (
        <View className="mt-6">
          <Text className="text-lg font-bold mb-2">AI Recommendations:</Text>
          {recommendations.map((rec, i) => (
            <Text key={i} className="mb-1">• {rec}</Text>
          ))}
        </View>
      )}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', padding: 16, borderRadius: 12 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  loadingContainer: { alignItems: 'center', paddingVertical: 40 },
  loadingText: { fontSize: 16, color: '#6B7280', marginTop: 8 },
  filterBar: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 10, marginBottom: 12 },
  pickerWrapper: { marginBottom: 8 },
  pickerLabel: { fontSize: 12, color: '#374151', marginBottom: 4 },
  picker: { backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' },
  filterButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 8 },
  applyButton: { backgroundColor: '#2563EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginRight: 8 },
  applyButtonText: { color: '#fff', fontWeight: '700' },
  clearButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  clearButtonText: { color: '#374151', fontWeight: '700' },
  sensorsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sensorCard: { flex: 1, minWidth: 160, backgroundColor: '#F8FAFC', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 12 },
  sensorTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  sensorValue: { fontSize: 16, fontWeight: '700' },
  thresholdText: { fontSize: 12, color: '#6B7280' },
});
