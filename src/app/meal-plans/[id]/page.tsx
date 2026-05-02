import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { MealPlanEditor } from "@/components/MealPlanEditor";
import { authOptions } from "@/lib/auth";
import { compareMealTypes, formatDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export default async function MealPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;
  const mealPlan = await prisma.mealPlan.findFirst({
    where: { id, userId: session.user.id },
    include: {
      meals: {
        include: { dishes: { include: { recipeLinks: true } } },
        orderBy: [{ mealDate: "asc" }],
      },
      shoppingLists: { include: { items: { orderBy: [{ category: "asc" }, { name: "asc" }] } } },
    },
  });

  if (!mealPlan) redirect("/dashboard");
  mealPlan.meals.sort(
    (a, b) =>
      a.mealDate.getTime() - b.mealDate.getTime() ||
      compareMealTypes(a.mealType, b.mealType),
  );
  const shoppingList = mealPlan.shoppingLists[0];
  const setting = await prisma.userSetting.findUnique({ where: { userId: session.user.id } });

  return (
    <main className="container">
      <h1 className="page-title">おすすめ献立</h1>
      <p className="lead">
        {formatDateOnly(mealPlan.startDate)} から {mealPlan.days}日分
      </p>
      <MealPlanEditor
        familySize={setting?.familySize ?? 2}
        initialItems={shoppingList?.items ?? []}
        mealPlan={mealPlan}
        shoppingListId={shoppingList?.id}
      />
    </main>
  );
}
