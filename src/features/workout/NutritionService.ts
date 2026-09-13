import { type Meal, type LoggedFood, useNutritionStore } from '../../store/useNutritionStore';
import { HapticService } from './HapticService';
import { SystemVoiceService } from './SystemVoiceService';

export interface AIAnalysisResult {
  success: boolean;
  meal?: Omit<Meal, 'id'>;
  reason?: string;
  diagnostics: {
    scanId: string;
    cameraCapture: string;
    imageCreated: string;
    imageSize: string;
    imageType: string;
    imageSent: string;
    apiRequest: string;
    apiStatus: string | number;
    visionResponseReceived: string;
    rawResponseAvailable: string;
    responseParsing: string;
    foodDetectionResult: string;
    finalResult: string;
    error: string;
    rawResponse?: any;
  };
}

const SYSTEM_PROMPT = `
You are analyzing the actual image supplied with this request.

Identify only what is visibly present in the image.
First determine whether visible food is present.

If food is clearly visible, identify the food as accurately as possible.
If multiple foods are visible, identify the visible food items separately when appropriate.
If no food is visible, return status="NO_FOOD".
If food is visible but cannot be confidently identified, return status="UNCERTAIN".

Never invent a food that is not supported by the image.
Never use information from previous scans.
Never generate a recipe.
Do not assume that the user is showing food.
The image itself is the source of truth.

You MUST respond in strict JSON matching this structure:
{
  "status": "FOOD" | "NO_FOOD" | "UNCERTAIN",
  "reason": "Explanation of what is seen",
  "items": [
    {
      "name": "string (e.g. Rice, Toffee)",
      "estimatedPortion": "string",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number,
      "confidence": "HIGH" | "MEDIUM" | "LOW"
    }
  ]
}
`;

export class NutritionService {
  /**
   * Sends image to real Gemini Vision API
   */
  public static async analyzeFoodImage(base64DataUrl: string, scanId: string): Promise<AIAnalysisResult> {
    const diagnostics: AIAnalysisResult['diagnostics'] = {
      scanId,
      cameraCapture: 'PASS',
      imageCreated: 'PASS',
      imageSize: Math.round(base64DataUrl.length / 1024) + ' KB',
      imageType: 'image/jpeg',
      imageSent: 'FAIL',
      apiRequest: 'FAIL',
      apiStatus: 'PENDING',
      visionResponseReceived: 'FAIL',
      rawResponseAvailable: 'NO',
      responseParsing: 'FAIL',
      foodDetectionResult: 'PENDING',
      finalResult: 'PENDING',
      error: ''
    };

    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      diagnostics.error = 'API_KEY_MISSING';
      diagnostics.finalResult = 'SCAN FAILED';
      return { success: false, reason: 'SCAN FAILED — API KEY MISSING', diagnostics };
    }

    try {
      // Extract base64 without prefix
      const base64Img = base64DataUrl.split(',')[1];
      diagnostics.imageSent = 'PASS';
      diagnostics.apiRequest = 'PASS';

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: { text: SYSTEM_PROMPT } },
          contents: [{
            parts: [
              { text: "Analyze this image according to your system instructions and return the JSON." },
              { inline_data: { mime_type: "image/jpeg", data: base64Img } }
            ]
          }],
          generationConfig: {
            response_mime_type: "application/json"
          }
        })
      });

      diagnostics.apiStatus = response.status;

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      diagnostics.visionResponseReceived = 'PASS';
      const data = await response.json();
      diagnostics.rawResponse = data;
      diagnostics.rawResponseAvailable = 'YES';

      let jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonStr) throw new Error("No text response from API");

      // Robust JSON extraction (strip markdown blocks if Gemini ignores response_mime_type)
      jsonStr = jsonStr.replace(/```json/g, '').replace(/```/g, '').trim();

      let parsed;
      try {
        parsed = JSON.parse(jsonStr);
        diagnostics.responseParsing = 'PASS';
      } catch (parseErr: any) {
        diagnostics.responseParsing = 'FAIL';
        throw new Error("RESPONSE PARSING FAILED: " + parseErr.message);
      }

      diagnostics.foodDetectionResult = parsed.status;

      if (parsed.status === 'NO_FOOD') {
        diagnostics.finalResult = 'NO FOOD DETECTED';
        return { 
          success: false, 
          reason: parsed.reason || 'NO FOOD DETECTED', 
          diagnostics 
        };
      }

      if (parsed.status === 'UNCERTAIN') {
        diagnostics.finalResult = 'FOOD NOT CONFIDENTLY IDENTIFIED';
        return { 
          success: false, 
          reason: parsed.reason || 'FOOD NOT CONFIDENTLY IDENTIFIED', 
          diagnostics 
        };
      }

      if (!parsed.items || parsed.items.length === 0) {
        diagnostics.finalResult = 'FOOD NOT CONFIDENTLY IDENTIFIED';
        return { 
          success: false, 
          reason: 'FOOD NOT CONFIDENTLY IDENTIFIED', 
          diagnostics 
        };
      }

      // We have food. Map to Meal object.
      const detectedItems: LoggedFood[] = parsed.items.map((item: any) => ({
        id: crypto.randomUUID(),
        name: item.name || 'Unknown Food',
        estimatedPortion: item.estimatedPortion || '1 serving',
        calories: Number(item.calories) || 0,
        protein: Number(item.protein) || 0,
        carbs: Number(item.carbs) || 0,
        fat: Number(item.fat) || 0,
        confidence: item.confidence || 'LOW'
      }));

      const totalCalories = detectedItems.reduce((sum, item) => sum + item.calories, 0);
      const totalProtein = detectedItems.reduce((sum, item) => sum + item.protein, 0);
      const totalCarbs = detectedItems.reduce((sum, item) => sum + item.carbs, 0);
      const totalFat = detectedItems.reduce((sum, item) => sum + item.fat, 0);

      const mealType = this.determineMealType();

      diagnostics.finalResult = 'FOOD LOGGED';

      return {
        success: true,
        meal: {
          type: mealType,
          timestamp: Date.now(),
          items: detectedItems,
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat
        },
        diagnostics
      };

    } catch (e: any) {
      console.error("Vision API Error:", e);
      diagnostics.error = e.message;
      diagnostics.finalResult = 'SCAN FAILED';
      return { success: false, reason: 'SCAN FAILED — PLEASE TRY AGAIN', diagnostics };
    }
  }

  public static logMeal(mealData: Omit<Meal, 'id'>) {
    useNutritionStore.getState().addMeal(mealData);
    HapticService.confirm();
    
    SystemVoiceService.init();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance("Nutrition log updated.");
      utterance.pitch = 0.85; 
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }, 300);
  }

  private static determineMealType(): 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'BREAKFAST';
    if (hour >= 11 && hour < 16) return 'LUNCH';
    if (hour >= 16 && hour < 22) return 'DINNER';
    return 'SNACK';
  }
}
