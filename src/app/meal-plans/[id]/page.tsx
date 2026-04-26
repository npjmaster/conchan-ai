import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { MealPlanView } from "@/components/MealPlanView";
import { ShoppingListView } from "@/components/ShoppingListView";
import { authOptions } from "@/lib/auth";
import { formatDateOnly } from "@/lib/date";
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
  const shoppingList = mealPlan.shoppingLists[0];

  return (
    <main className="container">
      <h1 className="page-title">献立生成結果</h1>
      <p className="lead">
        {formatDateOnly(mealPlan.startDate)} から {mealPlan.days}日分
      </p>
      <section style={{ marginTop: 20 }}>
        <h2>献立</h2>
        <MealPlanView mealPlan={mealPlan} />
      </section>
      {shoppingList && (
        <section style={{ marginTop: 24 }}>
          <h2>買い物リスト</h2>
          <ShoppingListView items={shoppingList.items} />
        </section>
      )}
    </main>
  );
}
