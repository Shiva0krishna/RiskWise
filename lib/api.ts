const API_BASE_URL = 'http://localhost:8000';

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

      return await response.json();
    } catch (error) {
      console.error('Error predicting from text:', error);
      throw error;
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

      return await response.json();
    } catch (error) {
      console.error('Error predicting from JSON:', error);
      throw error;
    }
  }

  static async predictFromCsv(file: File | any): Promise<PredictionResult[]> {
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

      return await response.json();
    } catch (error) {
      console.error('Error predicting from CSV:', error);
      throw error;
    }
  }
}