import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "無料 ゲーム・セール情報ナビ | 期間限定無料配布・お得なゲームセール情報を自動集約",
  description: "【毎日自動更新】「無料 ゲーム」や「ゲームセール」情報をまとめてお届け！Epic Games Storeの毎週無料配布ゲームや、Steam、Nintendo eShop、PlayStation Storeのお得な値引き・セール対象のゲーム情報を自動集約。",
  keywords: "無料 ゲーム, 無料ゲーム配布, PCゲーム 無料, Steam セール, Switch セール, ゲーム セール, ゲームナビ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteUrl = process.env.NEXT_PUBLIC_GAME_SITE_URL || 'https://manga-free-navi.github.io/game-sale-aggregator/';

  return (
    <html lang="ja" suppressHydrationWarning={true}>
      <head>
        <link rel="manifest" href="manifest.json" />
        <link rel="apple-touch-icon" href="icon.svg" />
        <meta name="theme-color" content="#39ff14" />
        
        {/* Google Analytics (GA4) */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`} />
            <script dangerouslySetInnerHTML={{__html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
            `}} />
          </>
        )}

        {/* SEO用構造化データ (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "無料 ゲーム・セール情報ナビ",
              "url": siteUrl,
              "description": "Epic Gamesの毎週無料配布ゲームや各ストアのお得なゲームセール情報を自動集約。",
              "inLanguage": "ja",
              "publisher": {
                "@type": "Organization",
                "name": "ゲームナビ 運営チーム"
              }
            })
          }}
        />
      </head>


      <body suppressHydrationWarning={true}>
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('sw.js').then(function(reg) {
                console.log('SW registered:', reg.scope);
              }).catch(function(err) {
                console.error('SW registration failed:', err);
              });
            });
          }
        `}} />
        <div className="page-container">
          <div className="background-glow" />
          
          <header className="site-header">
            <div className="header-content">
              <a href={siteUrl} className="logo-container">
                <div className="logo-icon">G</div>
                <span className="logo-text">ゲームナビ</span>
                <span className="logo-badge">Sale & Free</span>
              </a>

              {/* サイト切り替えタブ (3タブ) */}
              <div className="header-tabs">
                <a 
                  href={process.env.NEXT_PUBLIC_ANIME_SITE_URL || "https://manga-free-navi.github.io/youtube-free-anime-aggregator/"} 
                  className="header-tab"
                  id="tab-to-anime"
                >
                  <span>📺 無料アニメ</span>
                </a>
                <a 
                  href={process.env.NEXT_PUBLIC_MANGA_SITE_URL || "https://manga-free-navi.github.io/manga-sale-aggregator/"} 
                  className="header-tab"
                  id="tab-to-manga"
                >
                  <span>📚 漫画セール</span>
                </a>
                <a href={siteUrl} className="header-tab active">
                  <span>🎮 ゲームセール</span>
                </a>
              </div>

              <nav className="nav-links">
                <a href={siteUrl} className="nav-link">ホーム</a>
                <a href="#privacy" className="nav-link">プライバシー</a>
              </nav>
            </div>
          </header>

          <main className="main-content">
            {children}
          </main>

          <footer className="site-footer">
            <div className="footer-content">
              <div className="footer-logo">無料＆割引ゲームセールナビ</div>
              <div className="footer-links">
                <a href={siteUrl} className="footer-link">ホーム</a>
                <a href="#privacy" className="footer-link">プライバシーポリシー・免責事項</a>
              </div>
              <p className="copyright">
                © {new Date().getFullYear()} ゲームナビ. All Rights Reserved. 本サイトは各ゲームストア公式の公開情報およびAPIを利用したまとめサイトであり、各著作物の権利は権利元および開発元・パブリッシャーに帰属します。
              </p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
