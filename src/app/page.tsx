import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <Image alt="こんちゃんAI" className="hero-logo" height={120} priority src="/logo_conchan5.png" width={420} />
        <p className="lead">
          家族の人数や食事スタイルに合わせて、毎日の献立を考えます。
          気になる料理はレシピもすぐチェックでき、食材リストも作成できます。
        </p>
        <div className="actions">
          <Link className="button" href="/register">
            無料登録する
          </Link>
        </div>
      </section>

      <section className="grid two">
        <Link className="panel panel-button panel-button-primary" href="/trial">
          <span>未登録でも試せます</span>
          <small>1食分の献立を最大3回まで考えます。</small>
        </Link>
        <Link className="panel soft panel-button" href="/register">
          <span>登録後は最大7日分</span>
          <small>朝食・昼食・夕食や健康オプションを選んでカスタマイズできます。</small>
        </Link>
      </section>
    </main>
  );
}
