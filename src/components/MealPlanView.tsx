import { compareMealTypes, formatDateOnly } from "@/lib/date";

type RecipeLink = {
  id?: string;
  serviceName: string;
  searchUrl: string;
};

type Dish = {
  id?: string;
  dishType?: string;
  name: string;
  recipeLinks?: RecipeLink[];
};

type Meal = {
  id?: string;
  mealDate?: string | Date;
  mealType?: string;
  type?: string;
  dishes?: Dish[];
  main?: Dish[];
  sides?: Dish[];
};

type Day = {
  date: string;
  meals: Meal[];
};

const mealLabels: Record<string, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
};

function normalizeFromApi(mealPlan: {
  meals?: Meal[];
  meal_plan?: Day[];
}): Day[] {
  if (mealPlan.meal_plan) return mealPlan.meal_plan;
  const days = new Map<string, Meal[]>();
  for (const meal of mealPlan.meals ?? []) {
    const date = formatDateOnly(meal.mealDate ?? "");
    const dishes = meal.dishes ?? [];
    const normalized: Meal = {
      type: meal.mealType,
      main: dishes.filter((dish) => dish.dishType === "main"),
      sides: dishes.filter((dish) => dish.dishType === "side"),
    };
    days.set(date, [...(days.get(date) ?? []), normalized]);
  }
  return Array.from(days.entries()).map(([date, meals]) => ({
    date,
    meals: meals.sort((a, b) => compareMealTypes(a.type ?? a.mealType, b.type ?? b.mealType)),
  }));
}

function linksFor(dish: Dish): RecipeLink[] {
  if (dish.recipeLinks?.length) return dish.recipeLinks;
  return [
    {
      serviceName: "クックパッド",
      searchUrl: `https://cookpad.com/search/${encodeURIComponent(dish.name)}`,
    },
    {
      serviceName: "クラシル",
      searchUrl: `https://www.kurashiru.com/search?query=${encodeURIComponent(dish.name)}`,
    },
  ];
}

export function MealPlanView({ mealPlan }: { mealPlan: { meals?: Meal[]; meal_plan?: Day[] } }) {
  const days = normalizeFromApi(mealPlan);

  return (
    <div className="grid">
      {days.map((day) => (
        <section className="meal-card" key={day.date}>
          <h3>{day.date}</h3>
          <div className="meal-day">
            {day.meals.map((meal, index) => (
              <div key={`${day.date}-${meal.type ?? meal.mealType}-${index}`}>
                <span className="badge">{mealLabels[meal.type ?? meal.mealType ?? ""] ?? meal.type}</span>
                <p className="label">主菜</p>
                <ul className="dish-list">
                  {(meal.main ?? []).map((dish) => (
                    <li key={dish.name}>
                      {dish.name}
                      <div className="recipe-links">
                        {linksFor(dish).map((link) => (
                          <a href={link.searchUrl} key={link.serviceName} rel="noreferrer" target="_blank">
                            {link.serviceName}で検索
                          </a>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="label">副菜</p>
                <ul className="dish-list">
                  {(meal.sides ?? []).map((dish) => (
                    <li key={dish.name}>
                      {dish.name}
                      <div className="recipe-links">
                        {linksFor(dish).map((link) => (
                          <a href={link.searchUrl} key={link.serviceName} rel="noreferrer" target="_blank">
                            {link.serviceName}で検索
                          </a>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
