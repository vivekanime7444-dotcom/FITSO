import { type Meal, type LoggedFood, useNutritionStore } from '../../store/useNutritionStore';
import { HapticService } from './HapticService';
import { SystemVoiceService } from './SystemVoiceService';

export interface AIAnalysisResult {
  success: boolean;
  meal?: Omit<Meal, 'id'>;
  reason?: string;
  diagnostics: {
    scanId: string;
    imageSent: boolean;
    rawResponse?: any;
    foodDetected?: boolean;
    error?: string;
  };
}

const SYSTEM_PROMPT = `
You are a visual food recognition system. Analyze ONLY the actual image provided to you.

First determine whether visible food is present.
If no food is clearly visible, return foodDetected=false and do not identify or invent any food.
If a person, face, hand, room, wall, phone, furniture, or other non-food object is shown without visible food, return foodDetected=false and provide the reason (e.g. "Human face detected, no food present").
Never guess a food simply because a food category is required.

If food is visible but cannot be confidently identified, return foodDetected=true but set confidence to LOW and use an uncertain/unknown food classification rather than inventing a specific dish.
Only identify foods supported by visible evidence in the image.
Only estimate portions after food has been detected.
Never generate recipes.
Never use previous images or previous scan results.
Analyze the current image only.

You MUST respond in strict JSON matching this structure:
{
  "foodDetected": boolean,
  "reason": "Explanation of what is seen (especially if rejected)",
  "foodItems": [
    {
      "name": "string (e.g. Rice, Toffee, Chicken Curry)",
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
    const diagnostics = {
      scanId,
      imageSent: false,
      rawResponse: null as any,
      foodDetected: false,
      error: ''
    };

    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      diagnostics.error = 'API_KEY_MISSING';
      return { success: false, reason: 'SCAN FAILED — API KEY MISSING', diagnostics };
    }

    try {
      // Extract base64 without prefix
      const base64Img = base64DataUrl.split(',')[1];
      diagnostics.imageSent = true;

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

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      diagnostics.rawResponse = data;

      const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonStr) throw new Error("No text response from API");

      const parsed = JSON.parse(jsonStr);
      diagnostics.foodDetected = parsed.foodDetected;

      if (!parsed.foodDetected) {
        return { 
          success: false, 
          reason: parsed.reason || 'NO FOOD DETECTED', 
          diagnostics 
        };
      }

      if (!parsed.foodItems || parsed.foodItems.length === 0) {
        return { 
          success: false, 
          reason: 'FOOD NOT CONFIDENTLY IDENTIFIED', 
          diagnostics 
        };
      }

      // We have food. Map to Meal object.
      const detectedItems: LoggedFood[] = parsed.foodItems.map((item: any) => ({
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
