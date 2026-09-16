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
You are a strict fitness and computer vision AI. Your task is to validate and analyze training/physique reference images.
You must return a raw JSON object (without markdown formatting) conforming exactly to this schema:
{
  "referenceValid": boolean,
  "humanDetected": boolean,
  "imageQuality": "good" | "acceptable" | "poor",
  "reason": "Explain why the image was accepted or rejected.",
  "trainingAnalysis": {
    "trainingEmphasis": string[],
    "muscleGroups": string[],
    "conditioningNeeds": string[],
    "recommendedExerciseCategories": string[]
  }
}

VALIDATION RULES (STRICT):
1. The image MUST contain a human subject that is clearly visible.
2. REJECT (referenceValid: false) if the image is a banana, food, dog, pet, empty room, random object, extremely blurry, completely dark, heavily cropped, or meme.
3. If rejected, DO NOT provide "trainingAnalysis".
4. If accepted (referenceValid: true), analyze the human's physique/training type. Do NOT rate attractiveness or body shame. Provide broad training goals (e.g., ["Hypertrophy", "Upper Body Emphasis"]).

Do not guess. Prefer INVALID over incorrect analysis.
`;

    let attempt = 0;
    const maxAttempts = 5;
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
            reason: 'Mock validation successful.',
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
