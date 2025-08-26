import Constants from 'expo-constants';

const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface PredictionResult {
  Predicted_Risk: string;
  proba_High: number;
  proba_Medium: number;
  proba_Low: number;
  description: string;
}

export class ApiService {
  private static baseUrl = API_BASE_URL;

  static async predictFromText(interactiveText: string): Promise<PredictionResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ interactive_text: interactiveText }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('Error predicting from text:', error);
      // Return mock data for development
      return this.getMockPrediction(interactiveText);
    }
  }

  static async predictFromJson(jsonValues: any): Promise<PredictionResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/predict/json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ json_values: jsonValues }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [data];
    } catch (error) {
      console.error('Error predicting from JSON:', error);
      // Return mock data for development
      return this.getMockPredictionFromData(jsonValues);
    }
  }

  static async predictFromCsv(file: File | any): Promise<{ predictions: PredictionResult[] }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/predict/csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { predictions: Array.isArray(data) ? data : [data] };
    } catch (error) {
      console.error('Error predicting from CSV:', error);
      // Return mock data for development
      return { predictions: this.getMockCSVPredictions() };
    }
  }

  private static getMockPrediction(text: string): PredictionResult[] {
    // Simple heuristic based on text content
    const riskKeywords = {
      high: ['delay', 'overrun', 'incident', 'problem', 'issue', 'critical'],
      medium: ['concern', 'moderate', 'warning', 'attention'],
      low: ['good', 'normal', 'stable', 'safe', 'on track']
    };

    const textLower = text.toLowerCase();
    let riskLevel = 'Low';
    
    if (riskKeywords.high.some(keyword => textLower.includes(keyword))) {
      riskLevel = 'High';
    } else if (riskKeywords.medium.some(keyword => textLower.includes(keyword))) {
      riskLevel = 'Medium';
    }

    return [{
      Predicted_Risk: riskLevel,
      proba_High: riskLevel === 'High' ? 0.8 : riskLevel === 'Medium' ? 0.3 : 0.1,
      proba_Medium: riskLevel === 'Medium' ? 0.6 : 0.3,
      proba_Low: riskLevel === 'Low' ? 0.8 : riskLevel === 'Medium' ? 0.1 : 0.1,
      description: `Risk assessment based on text analysis: ${text.substring(0, 100)}...`,
    }];
  }

  private static getMockPredictionFromData(data: any): PredictionResult[] {
    const delayIndex = data.Delay_Index || 0;
    const costOverrun = data['Cost_Overrun_%'] || 0;
    const safetyIncidents = data.Safety_Incident_Count || 0;

    let riskLevel = 'Low';
    let highProb = 0.1;
    let mediumProb = 0.2;
    let lowProb = 0.7;

    if (delayIndex > 0.3 || costOverrun > 15 || safetyIncidents > 3) {
      riskLevel = 'High';
      highProb = 0.75;
      mediumProb = 0.2;
      lowProb = 0.05;
    } else if (delayIndex > 0.15 || costOverrun > 8 || safetyIncidents > 1) {
      riskLevel = 'Medium';
      highProb = 0.25;
      mediumProb = 0.6;
      lowProb = 0.15;
    }

    return [{
      Predicted_Risk: riskLevel,
      proba_High: highProb,
      proba_Medium: mediumProb,
      proba_Low: lowProb,
      description: `Risk assessment based on building parameters: ${data.Building_ID || 'Building'}`,
    }];
  }

  private static getMockCSVPredictions(): PredictionResult[] {
    return [
      {
        Predicted_Risk: 'Medium',
        proba_High: 0.3,
        proba_Medium: 0.6,
        proba_Low: 0.1,
        description: 'Building A - Moderate risk due to schedule delays',
      },
      {
        Predicted_Risk: 'Low',
        proba_High: 0.1,
        proba_Medium: 0.2,
        proba_Low: 0.7,
        description: 'Building B - Low risk, project on track',
      },
      {
        Predicted_Risk: 'High',
        proba_High: 0.8,
        proba_Medium: 0.15,
        proba_Low: 0.05,
        description: 'Building C - High risk due to cost overruns and safety incidents',
      },
    ];
  }
}