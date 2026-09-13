export interface FoodItem {
  id: string;
  name: string;
  aliases: string[];
  cuisine: string;
  defaultUnit: string;
  defaultWeightGrams: number;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  preparationVariants?: string[];
}

export const FoodDatabase: FoodItem[] = [
  // --- INDIAN CUISINE ---
  {
    id: 'ind_001',
    name: 'Steamed Rice',
    aliases: ['White Rice', 'Chawal', 'Annam', 'Boiled Rice'],
    cuisine: 'Indian',
    defaultUnit: '1 cup',
    defaultWeightGrams: 158,
    macros: { calories: 205, protein: 4.3, carbs: 44.5, fat: 0.4 }
  },
  {
    id: 'ind_002',
    name: 'Dal Tadka',
    aliases: ['Yellow Dal', 'Toor Dal', 'Pappu', 'Lentil Curry'],
    cuisine: 'Indian',
    defaultUnit: '1 bowl',
    defaultWeightGrams: 240,
    macros: { calories: 280, protein: 14, carbs: 40, fat: 8 }
  },
  {
    id: 'ind_003',
    name: 'Chicken Biryani',
    aliases: ['Dum Biryani', 'Hyderabadi Biryani'],
    cuisine: 'Indian',
    defaultUnit: '1 plate',
    defaultWeightGrams: 350,
    macros: { calories: 550, protein: 25, carbs: 70, fat: 18 }
  },
  {
    id: 'ind_004',
    name: 'Chapati',
    aliases: ['Roti', 'Phulka', 'Flatbread'],
    cuisine: 'Indian',
    defaultUnit: '1 piece',
    defaultWeightGrams: 40,
    macros: { calories: 120, protein: 3.5, carbs: 22, fat: 1.5 },
    preparationVariants: ['Butter Roti', 'Tandoori Roti']
  },
  {
    id: 'ind_005',
    name: 'Masala Dosa',
    aliases: ['Dosa', 'Dosai'],
    cuisine: 'Indian',
    defaultUnit: '1 piece',
    defaultWeightGrams: 150,
    macros: { calories: 350, protein: 6, carbs: 55, fat: 12 },
    preparationVariants: ['Plain Dosa', 'Rava Dosa']
  },
  {
    id: 'ind_006',
    name: 'Paneer Butter Masala',
    aliases: ['Paneer Makhani', 'Butter Paneer'],
    cuisine: 'Indian',
    defaultUnit: '1 bowl',
    defaultWeightGrams: 200,
    macros: { calories: 420, protein: 12, carbs: 18, fat: 34 }
  },
  {
    id: 'ind_007',
    name: 'Chicken Curry',
    aliases: ['Murgh Kari', 'Kodi Kura'],
    cuisine: 'Indian',
    defaultUnit: '1 bowl',
    defaultWeightGrams: 220,
    macros: { calories: 320, protein: 28, carbs: 12, fat: 18 },
    preparationVariants: ['Dry Chicken', 'Fried Chicken']
  },
  {
    id: 'ind_008',
    name: 'Curd',
    aliases: ['Dahi', 'Yogurt', 'Perugu'],
    cuisine: 'Indian',
    defaultUnit: '1 small bowl',
    defaultWeightGrams: 100,
    macros: { calories: 98, protein: 3.5, carbs: 3.4, fat: 4.3 }
  },

  // --- GLOBAL CUISINE ---
  {
    id: 'glb_001',
    name: 'Grilled Chicken Breast',
    aliases: ['Chicken Breast'],
    cuisine: 'American',
    defaultUnit: '1 piece',
    defaultWeightGrams: 150,
    macros: { calories: 248, protein: 46, carbs: 0, fat: 5 }
  },
  {
    id: 'glb_002',
    name: 'Salmon Sushi',
    aliases: ['Nigiri', 'Sushi'],
    cuisine: 'Japanese',
    defaultUnit: '2 pieces',
    defaultWeightGrams: 70,
    macros: { calories: 96, protein: 6, carbs: 15, fat: 1 }
  },
  {
    id: 'glb_003',
    name: 'Avocado Toast',
    aliases: [],
    cuisine: 'American',
    defaultUnit: '1 slice',
    defaultWeightGrams: 120,
    macros: { calories: 250, protein: 6, carbs: 24, fat: 15 }
  },
  {
    id: 'glb_004',
    name: 'Spaghetti Bolognese',
    aliases: ['Pasta with meat sauce'],
    cuisine: 'Italian',
    defaultUnit: '1 plate',
    defaultWeightGrams: 300,
    macros: { calories: 480, protein: 22, carbs: 65, fat: 15 }
  }
];

export const searchFood = (query: string): FoodItem | undefined => {
  const q = query.toLowerCase();
  return FoodDatabase.find(f => 
    f.name.toLowerCase().includes(q) || 
    f.aliases.some(alias => alias.toLowerCase().includes(q))
  );
};
