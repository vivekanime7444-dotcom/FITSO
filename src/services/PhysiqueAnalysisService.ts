export interface PhysiqueAnalysisResult {
  referenceValid: boolean;
  humanDetected: boolean;
  imageQuality: 'good' | 'acceptable' | 'poor' | 'unknown';
  reason: string;
  trainingAnalysis?: {
    trainingEmphasis: string[];
    muscleGroups: string[];
    conditioningNeeds: string[];
    recommendedExerciseCategories: string[];
  };
}

export class PhysiqueAnalysisService {
  private static API_KEY = import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('GEMINI_API_KEY') || import.meta.env.VITE_OPENROUTER_API_KEY || localStorage.getItem('OPENROUTER_API_KEY') || '';
  private static MODEL = 'gemini-flash-latest';

  public static async analyzeImage(base64Image: string): Promise<{ id: string; result: PhysiqueAnalysisResult }> {
    const referenceId = `ref_${crypto.randomUUID()}`;
    
    // Ensure API key exists
    if (!this.API_KEY) {
      console.warn("No API key found. Falling back to local mock for development.");
      return this.mockAnalysis(referenceId);
    }

    // Extract mime type and base64 data
    const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let mimeType = 'image/jpeg';
    let base64Data = base64Image;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      // If no prefix, assume it's just the base64 string
      base64Data = base64Image.replace(/^data:image\/\w+;base64,/, "");
    }

const systemPrompt = `
You are a highly strict computer vision AI used for a fitness app. Your ONLY task is to validate if an image is a legitimate human physique reference.

You MUST return a raw JSON object (NO markdown, NO formatting) matching this schema:
{
  "referenceValid": boolean,
  "humanDetected": boolean,
  "imageQuality": "good" | "acceptable" | "poor",
  "reason": "Explain exactly what you see and why it is accepted or rejected.",
  "trainingAnalysis": {
    "trainingEmphasis": string[],
    "muscleGroups": string[],
    "conditioningNeeds": string[],
    "recommendedExerciseCategories": string[]
  }
}

CRITICAL RULES:
1. FIRST, check if there is a REAL HUMAN in the photo. If the image is a banana, food, an animal, a cartoon, an empty room, a random object, a landscape, a screen, or text: YOU MUST SET "humanDetected": false AND "referenceValid": false.
2. If it is NOT a human physique reference, DO NOT include the "trainingAnalysis" field at all. Just provide the reason.
3. If it IS a valid human, set "referenceValid": true and fill out "trainingAnalysis" based on the visible muscular development.
4. DO NOT guess. If you are unsure, reject it.
`;

    let attempt = 0;
    const maxAttempts = 3;
    let delayMs = 2000;

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.MODEL}:generateContent?key=${this.API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: systemPrompt },
                { text: "Analyze this image according to your strict validation rules." },
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                  }
                }
              ]
            }],
            generationConfig: {
              responseMimeType: "application/json"
            }
          })
        });

        if (!response.ok) {
          // If the error is a 503 (Unavailable) or 429 (Too Many Requests), we retry automatically
          if ((response.status === 503 || response.status === 429) && attempt < maxAttempts - 1) {
            attempt++;
            console.warn(`Gemini API busy (Status ${response.status}). Retrying in ${delayMs}ms... (Attempt ${attempt + 1}/${maxAttempts})`);
            await new Promise(r => setTimeout(r, delayMs));
            delayMs *= 2; // Exponential backoff (2s, 4s, 8s, 16s)
            continue;
          }
          
          const errorText = await response.text();
          throw new Error(`Gemini API error [${response.status}]: ${errorText || response.statusText}`);
        }

        const data = await response.json();
        const content = data.candidates[0].content.parts[0].text;
        
        // Clean potential markdown blocks
        const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const result = JSON.parse(cleanContent) as PhysiqueAnalysisResult;
        
        return { id: referenceId, result };
      } catch (error: any) {
        // If it's a structural error (not 503/429), or we exhausted all retries, fail here
        if (attempt >= maxAttempts - 1 || !(error.message && (error.message.includes('[503]') || error.message.includes('[429]')))) {
          console.error("Vision API Error:", error);
          return {
            id: referenceId,
            result: {
              referenceValid: false,
              humanDetected: false,
              imageQuality: 'unknown',
              reason: `Network/API Error: ${error instanceof Error ? error.message : String(error)}`
            }
          };
        }
        attempt++;
        await new Promise(r => setTimeout(r, delayMs));
        delayMs *= 2;
      }
    }

    // Should theoretically never reach here, but TypeScript requires a return
    return {
      id: referenceId,
      result: {
        referenceValid: false,
        humanDetected: false,
        imageQuality: 'unknown',
        reason: 'Max retries exceeded'
      }
    };
  }

  // Fallback mock for local testing without an API key
  private static async mockAnalysis(id: string): Promise<{ id: string; result: PhysiqueAnalysisResult }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id,
          result: {
            referenceValid: true,
            humanDetected: true,
            imageQuality: 'good',
            reason: '[MOCK MODE] No API key found. Defaulting to accepted.',
            trainingAnalysis: {
              trainingEmphasis: ['Hypertrophy', 'Strength'],
              muscleGroups: ['Chest', 'Shoulders', 'Back', 'Core'],
              conditioningNeeds: ['Moderate Cardio'],
              recommendedExerciseCategories: ['Compound', 'Push', 'Pull']
            }
          }
        });
      }, 2000);
    });
  }
}
