import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <Image alt="献ちゃんAI" className="hero-logo" height={120} priority src="/logo_conchan.png" width={420} />
        <p className="lead">
          家族の人数や食事スタイルに合わせて、献立と買い物リストを作ります。
          レシピ本文は保存せず、クックパッドとクラシルの検索リンクだけを案内します。
        </p>
        <div className="actions">
          <Link className="button" href="/register">
            無料登録する
          </Link>
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h2>未登録でも試せます</h2>
          <p className="lead">お試し生成は1食分のみ、ブラウザごとに最大3回まで利用できます。</p>
        </div>
        <div className="panel soft">
          <h2>登録後は最大7日分</h2>
          <p className="lead">朝食・昼食・夕食の対象や健康オプションを保存して生成できます。</p>
        </div>
      </section>
    </main>
  );
}
