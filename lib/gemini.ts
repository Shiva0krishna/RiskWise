import Constants from 'expo-constants';

interface GeminiRequest {
  contents: {
    parts: {
      text: string;
    }[];
  }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: {
        text: string;
      }[];
    };
  }[];
}

export class GeminiService {
  private static apiKey = Constants.expoConfig?.extra?.geminiApiKey || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '';
  private static baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

  static async generateRecommendations(
    riskLevel: string,
    riskDrivers: any[],
    projectData: any,
    sensorData?: any
  ): Promise<string[]> {
    try {
      const context = this.buildContext(riskLevel, riskDrivers, projectData, sensorData);
      
      const request: GeminiRequest = {
        contents: [{
          parts: [{
            text: `You are an AI construction risk management expert. Based on the following project data and risk analysis, provide 3-5 specific, actionable recommendations to mitigate risks.

Context:
${context}

Please provide recommendations in the following format:
- Each recommendation should be a single sentence
- Focus on specific actions that can be taken immediately
- Prioritize the most critical issues first
- Be concise and actionable

Return only the recommendations as a numbered list, nothing else.`
          }]
        }]
      };

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse the numbered list into array
      const recommendations = text
        .split('\n')
        .filter(line => line.trim().match(/^\d+\./))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(rec => rec.length > 0);

      return recommendations.slice(0, 5); // Limit to 5 recommendations
    } catch (error) {
      console.error('Error generating recommendations:', error);
      return this.getFallbackRecommendations(riskLevel, riskDrivers);
    }
  }

  private static buildContext(
    riskLevel: string,
    riskDrivers: any[],
    projectData: any,
    sensorData?: any
  ): string {
    let context = `Project: ${projectData.name}\n`;
    context += `Location: ${projectData.city}\n`;
    context += `Structural System: ${projectData.structural_system}\n`;
    context += `Progress: ${projectData.progress_percent}%\n`;
    context += `Current Risk Level: ${riskLevel}\n\n`;

    if (riskDrivers.length > 0) {
      context += 'Key Risk Drivers:\n';
      riskDrivers.forEach(driver => {
        context += `- ${driver.factor}: ${driver.value} (threshold: ${driver.threshold}, status: ${driver.status})\n`;
      });
      context += '\n';
    }

    if (sensorData) {
      context += 'IoT Sensor Data:\n';
      context += `- Vibration: ${sensorData.vibration?.current} mm/s (limit: ${sensorData.vibration?.threshold})\n`;
      context += `- Crane Alerts: ${sensorData.craneAlerts?.count} this week\n`;
      context += `- Structural Tilt: ${sensorData.tilt?.current}° (limit: ${sensorData.tilt?.threshold}°)\n`;
    }

    return context;
  }

  private static getFallbackRecommendations(riskLevel: string, riskDrivers: any[]): string[] {
    const recommendations = [];

    if (riskLevel === 'High') {
      recommendations.push('Implement immediate risk mitigation measures and increase monitoring frequency');
      recommendations.push('Conduct emergency project review with all stakeholders');
    }

    riskDrivers.forEach(driver => {
      if (driver.status === 'critical') {
        switch (driver.factor) {
          case 'Delay Index':
            recommendations.push('Reallocate resources to critical path activities to reduce project delays');
            break;
          case 'Cost Overrun %':
            recommendations.push('Review budget allocation and implement strict cost control measures');
            break;
          case 'Safety Incident Count':
            recommendations.push('Conduct immediate safety audit and reinforce safety protocols');
            break;
          case 'Structural Risk Index':
            recommendations.push('Schedule structural engineering review and inspection');
            break;
        }
      }
    });

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring current project parameters');
      recommendations.push('Maintain regular safety inspections and quality checks');
    }

    return recommendations.slice(0, 5);
  }
}