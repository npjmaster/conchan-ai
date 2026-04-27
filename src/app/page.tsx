import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="container">
      <section className="hero">
        <Image alt="献ちゃんAI" className="hero-logo" height={120} priority src="/logo_conchan3.png" width={420} />
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
        <Link className="panel panel-button panel-button-primary" href="/trial">
          <span>未登録でも試せます</span>
          <small>お試し生成は1食分のみ、最大3回まで利用できます。</small>
        </Link>
        <Link className="panel soft panel-button" href="/register">
          <span>登録後は最大7日分</span>
          <small>朝食・昼食・夕食や健康オプションを選択して生成できます。</small>
        </Link>
      </section>
    </main>
  );
}
