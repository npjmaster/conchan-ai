export type MealType = "breakfast" | "lunch" | "dinner";

export type DishName = {
  name: string;
  ingredients?: ShoppingItem[];
};

export type MealPlanJson = {
  meal_plan: {
    date: string;
    meals: {
      type: MealType;
      main: DishName[];
      sides: DishName[];
    }[];
  }[];
};

export type ShoppingItem = {
  name: string;
  amount?: string;
  unit?: string;
  category: string;
  memo?: string;
};

export type ShoppingListJson = {
  shopping_list: ShoppingItem[];
};

export type GenerateInput = {
  startDate: string;
  days: number;
  familySize: number;
  mainDishCount: number;
  sideDishCount: number;
  mealDishCounts?: Partial<Record<MealType, { main: number; sides: number }>>;
  includeBreakfast: boolean;
  includeLunch: boolean;
  includeDinner: boolean;
  allergies?: string;
  lowSalt: boolean;
  lowSugar: boolean;
  lowFat: boolean;
};
