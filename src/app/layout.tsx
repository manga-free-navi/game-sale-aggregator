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
        <script dangerouslySetInnerHTML={{__html: `
          // デバッグコンソールを表示するための共通関数
          function showDebugBanner(htmlContent) {
            var div = document.getElementById('debug-error-console');
            if (!div) {
              div = document.createElement('div');
              div.id = 'debug-error-console';
              div.style.position = 'fixed';
              div.style.bottom = '10px';
              div.style.left = '10px';
              div.style.right = '10px';
              div.style.background = 'rgba(17, 24, 39, 0.95)';
              div.style.color = '#fff';
              div.style.padding = '15px';
              div.style.borderRadius = '8px';
              div.style.zIndex = '999999';
              div.style.fontSize = '12px';
              div.style.fontFamily = 'monospace';
              div.style.maxHeight = '250px';
              div.style.overflowY = 'auto';
              div.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
              div.style.border = '1px solid #ef4444';
              document.body.appendChild(div);
            }
            div.innerHTML += htmlContent;
          }

          window.addEventListener('error', function(e) {
            // アセット（画像やスタイルシート）のロードエラーは message が存在しないため無視
            if (!e.message) return;

            showDebugBanner('<div style="margin-bottom: 5px; color: #fecaca;">⚠️ Runtime Error: ' + e.message + ' at ' + (e.filename || 'unknown') + ':' + (e.lineno || '0') + '</div>');

            if (e.message.indexOf('ChunkLoadError') !== -1 || e.message.indexOf('Loading chunk') !== -1) {
              var now = Date.now();
              var lastReload = sessionStorage.getItem('last_chunk_error_reload');
              if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem('last_chunk_error_reload', now.toString());
                console.warn('ChunkLoadErrorを検知しました。リロードします...');
                window.location.reload();
              }
            }
          }, true);

          window.addEventListener('unhandledrejection', function(e) {
            var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Promise Rejection';
            var stack = e.reason && e.reason.stack ? e.reason.stack : '';
            var html = '<div style="margin-bottom: 5px; color: #fde047;">⚠️ Promise Error: ' + msg + '</div>';
            if (stack) {
              html += '<pre style="margin: 5px 0 10px 10px; font-size: 10px; color: #d1d5db; white-space: pre-wrap; background: #1f2937; padding: 5px; border-radius: 4px;">' + stack.substring(0, 300) + '</pre>';
            }
            showDebugBanner(html);
          });
        `}} />
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
          // キャッシュ干渉によるエラーを防ぐため、古いService Workerを強制解除する
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for (var i = 0; i < registrations.length; i++) {
                registrations[i].unregister().then(function(success) {
                  if (success) {
                    console.log('古いService Workerの登録を解除しました。');
                  }
                });
              }
            }).catch(function(err) {
              console.error('Service Workerの登録解除に失敗しました:', err);
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
                <a 
                  href={process.env.NEXT_PUBLIC_POIKATSU_SITE_URL || "https://manga-free-navi.github.io/poikatsu-aggregator/"} 
                  className="header-tab"
                  id="tab-to-poikatsu"
                >
                  <span>💰 ポイ活情報</span>
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
