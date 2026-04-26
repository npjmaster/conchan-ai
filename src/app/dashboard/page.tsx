import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { formatDateOnly } from "@/lib/date";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const plans = await prisma.mealPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <main className="container">
      <h1 className="page-title">マイページ</h1>
      <p className="lead">設定を整えて、最大7日分の献立と買い物リストを作れます。</p>
      <div className="actions" style={{ margin: "18px 0" }}>
        <Link className="button primary" href="/generate">
          献立を生成する
        </Link>
        <Link className="button" href="/settings">
          ユーザー設定
        </Link>
      </div>

      <section className="panel">
        <h2>最近の献立</h2>
        {plans.length === 0 ? (
          <p className="lead">まだ献立がありません。</p>
        ) : (
          <div className="grid">
            {plans.map((plan) => (
              <Link className="panel soft" href={`/meal-plans/${plan.id}`} key={plan.id}>
                {formatDateOnly(plan.startDate)} から {plan.days}日分
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
