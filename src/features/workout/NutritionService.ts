import { type Meal, type LoggedFood, useNutritionStore } from '../../store/useNutritionStore';
import { HapticService } from './HapticService';
import { SystemVoiceService } from './SystemVoiceService';

// Mock simulation of an AI Vision API response
const SIMULATED_SCANS: LoggedFood[][] = [
  // Scenario 1: Mixed Indian Plate (South/North)
  [
    {
      id: crypto.randomUUID(),
      name: 'Steamed Rice',
      estimatedPortion: '1.5 cups',
      calories: 307,
      protein: 6.4,
      carbs: 66.7,
      fat: 0.6,
      confidence: 'HIGH'
    },
    {
      id: crypto.randomUUID(),
      name: 'Dal Tadka',
      estimatedPortion: '1 bowl',
      calories: 280,
      protein: 14,
      carbs: 40,
      fat: 8,
      confidence: 'HIGH'
    },
    {
      id: crypto.randomUUID(),
      name: 'Chicken Curry',
      estimatedPortion: '0.75 bowl',
      calories: 240,
      protein: 21,
      carbs: 9,
      fat: 13.5,
      confidence: 'MEDIUM'
    }
  ],
  // Scenario 2: Global/Western Breakfast
  [
    {
      id: crypto.randomUUID(),
      name: 'Avocado Toast',
      estimatedPortion: '2 slices',
      calories: 500,
      protein: 12,
      carbs: 48,
      fat: 30,
      confidence: 'HIGH'
    }
  ],
  // Scenario 3: Mixed Indian Breakfast
  [
    {
      id: crypto.randomUUID(),
      name: 'Masala Dosa',
      estimatedPortion: '1 piece',
      calories: 350,
      protein: 6,
      carbs: 55,
      fat: 12,
      confidence: 'HIGH'
    },
    {
      id: crypto.randomUUID(),
      name: 'Coconut Chutney',
      estimatedPortion: '2 tbsp',
      calories: 100,
      protein: 2,
      carbs: 4,
      fat: 8,
      confidence: 'MEDIUM'
    }
  ]
];

export class NutritionService {
  private static scanIndex = 0;

  /**
   * Simulates sending an image to an external Vision API.
   * Compresses base64 (mock) and returns a parsed meal report.
   */
  public static async analyzeFoodImage(imageBase64: string): Promise<Omit<Meal, 'id'>> {
    console.log('Sending compressed image to Universal AI Food Vision Engine...', imageBase64.substring(0, 50) + '...');
    
    // Simulate network delay for AI processing
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Rotate through our realistic mixed-meal mock scenarios
    const detectedItems = SIMULATED_SCANS[this.scanIndex % SIMULATED_SCANS.length];
    this.scanIndex++;

    const totalCalories = detectedItems.reduce((sum, item) => sum + item.calories, 0);
    const totalProtein = detectedItems.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = detectedItems.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = detectedItems.reduce((sum, item) => sum + item.fat, 0);

    const mealType = this.determineMealType();

    return {
      type: mealType,
      timestamp: Date.now(),
      items: detectedItems,
      totalCalories,
      totalProtein,
      totalCarbs,
      totalFat
    };
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
