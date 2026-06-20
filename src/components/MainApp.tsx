'use client';

import { useState, useMemo, useEffect } from 'react';
import gamesData from '../data/games.json';
import manualGamesData from '../data/manual_games.json';

import FilterBar from './FilterBar';
import GameCard from './GameCard';
import AdContainer from './AdContainer';
import LazyRender from './LazyRender';

interface Game {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  storeUrl: string;
  platform: string;
  originalPrice: string;
  salePrice: string;
  startDate: string;
  endDate: string;
  storeName: string;
  isManual?: boolean;
}

export default function MainApp() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('discount');

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  // 同期コード管理ステート
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');
  const [syncError, setSyncError] = useState('');
  const [syncSuccess, setSyncSuccess] = useState(false);

  // テーマ・通知・クロスフェッチステート
  const [theme, setTheme] = useState('dark');
  const [notificationPermission, setNotificationPermission] = useState<string>('default');
  const [animeVideos, setAnimeVideos] = useState<any[]>([]);
  const [mangaSales, setMangaSales] = useState<any[]>([]);

  // マウント時に閲覧設定とウィッシュリストをロード
  useEffect(() => {
    try {
      const stored = localStorage.getItem('game-wishlist');
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
      
      const savedPlatforms = localStorage.getItem('game_filter_platforms');
      const savedStores = localStorage.getItem('game_filter_stores');
      const savedSort = localStorage.getItem('game_sort_by');
      const savedWishlistOnly = localStorage.getItem('game_filter_wishlist_only');
      
      if (savedPlatforms) {
        try {
          setSelectedPlatforms(JSON.parse(savedPlatforms));
        } catch (e) {
          const oldPlatform = localStorage.getItem('game_filter_platform');
          if (oldPlatform) setSelectedPlatforms([oldPlatform]);
        }
      } else {
        const oldPlatform = localStorage.getItem('game_filter_platform');
        if (oldPlatform) setSelectedPlatforms([oldPlatform]);
      }
      
      if (savedStores) {
        try {
          setSelectedStores(JSON.parse(savedStores));
        } catch (e) {
          const oldStore = localStorage.getItem('game_filter_store');
          if (oldStore) setSelectedStores([oldStore]);
        }
      } else {
        const oldStore = localStorage.getItem('game_filter_store');
        if (oldStore) setSelectedStores([oldStore]);
      }
      
      if (savedSort) setSortBy(savedSort);
      if (savedWishlistOnly) setShowWishlistOnly(savedWishlistOnly === 'true');

      // テーマの復元
      const savedTheme = localStorage.getItem('game-theme') || 'dark';
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      // 通知権限の確認
      if ('Notification' in window) {
        setNotificationPermission(Notification.permission);
      }
    } catch (e) {
      console.error('Failed to load game preferences:', e);
    }
  }, []);

  // アニメ・漫画データのクロスフェッチ
  useEffect(() => {
    const fetchAnimeVideos = async () => {
      const urls = [
        '/youtube-free-anime-aggregator/videos.json',
        '/anime-free/videos.json',
        'https://masayuki-gemini.github.io/youtube-free-anime-aggregator/videos.json',
        '/videos.json'
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setAnimeVideos(data);
              break;
            }
          }
        } catch (e) {}
      }
    };
    fetchAnimeVideos();

    const fetchMangaSales = async () => {
      const urls = [
        '/manga-sale-aggregator/sales.json',
        '/manga-sale-aggregator/data/sales.json',
        'https://masayuki-gemini.github.io/manga-sale-aggregator/sales.json',
        '/sales.json'
      ];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data)) {
              setMangaSales(data);
              break;
            }
          }
        } catch (e) {}
      }
    };
    fetchMangaSales();
  }, []);

  // 1. 自動データと手動データをマージ（ID衝突時は手動側を優先）
  const allGames = useMemo(() => {
    const manualIds = new Set((manualGamesData as Game[]).map(g => g.id));
    const filteredAutoGames = (gamesData as Game[]).filter(g => !manualIds.has(g.id));
    return [...(manualGamesData as Game[]), ...filteredAutoGames];
  }, []);

  // お気に入りウィッシュリストの値下がり監視＆ブラウザプッシュ通知
  useEffect(() => {
    if (!('Notification' in window) || notificationPermission !== 'granted' || allGames.length === 0 || wishlist.length === 0) return;

    try {
      const prevPricesStr = localStorage.getItem('game-prev-prices') || '{}';
      const prevPrices = JSON.parse(prevPricesStr);
      const currentPrices: { [key: string]: string } = {};
      
      let notifyCount = 0;
      let lastGameTitle = '';
      
      allGames.forEach((game) => {
        currentPrices[game.id] = game.salePrice;
        
        if (wishlist.includes(game.id)) {
          const prevPrice = prevPrices[game.id];
          if (prevPrice && prevPrice !== game.salePrice) {
            // 無料になった、または数値が下がった場合
            const parseVal = (str: string) => {
              if (str === '無料') return 0;
              return parseInt(str.replace(/[^0-9]/g, '')) || 0;
            };
            const pVal = parseVal(prevPrice);
            const cVal = parseVal(game.salePrice);
            
            if (pVal > cVal) {
              notifyCount++;
              lastGameTitle = game.title;
            }
          }
        }
      });
      
      if (notifyCount > 0) {
        const body = notifyCount === 1 
          ? `お気に入り登録中の『${lastGameTitle}』が ¥${currentPrices[allGames.find(g=>g.title===lastGameTitle)?.id || ''] || ''} に値下がりしました！`
          : `お気に入り登録中のゲームが ${notifyCount}件 値下がりしました！`;
          
        new Notification('🎮 ゲーム値下がり通知', {
          body,
          icon: '/favicon.ico'
        });
      }
      
      localStorage.setItem('game-prev-prices', JSON.stringify(currentPrices));
    } catch (e) {
      console.error('Failed to process price drop notification:', e);
    }
  }, [allGames, wishlist, notificationPermission]);

  // お気に入りをBase64コード化して出力 (同期用)
  const wishlistCode = useMemo(() => {
    try {
      return btoa(JSON.stringify(wishlist));
    } catch (e) {
      return '';
    }
  }, [wishlist]);

  // 同期コードからお気に入りを復元 (インポート)
  const handleImportWishlist = () => {
    setSyncError('');
    setSyncSuccess(false);
    try {
      const trimmed = syncCodeInput.trim();
      if (!trimmed) {
        setSyncError('同期コードを入力してください。');
        return;
      }
      const parsed = JSON.parse(atob(trimmed));
      if (!Array.isArray(parsed)) {
        setSyncError('無効な同期コード形式です。');
        return;
      }
      // 重複を排除してマージ
      const merged = Array.from(new Set([...wishlist, ...parsed]));
      setWishlist(merged);
      localStorage.setItem('game-wishlist', JSON.stringify(merged));
      setSyncSuccess(true);
      setSyncCodeInput('');
      setTimeout(() => {
        setShowSyncModal(false);
        setSyncSuccess(false);
      }, 1500);
    } catch (e) {
      setSyncError('コードの解析に失敗しました。正しいコードを入力してください。');
    }
  };

  // ウィッシュリストの追加/削除トグル処理
  const toggleWishlist = (id: string) => {
    setWishlist(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      try {
        localStorage.setItem('game-wishlist', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save wishlist:', e);
      }
      return next;
    });
  };

  // 設定保存用ハンドラー
  const handleTogglePlatform = (platform: string) => {
    setSelectedPlatforms(prev => {
      let next: string[];
      if (platform === 'all') {
        next = [];
      } else {
        const temp = prev.filter(p => p !== 'all');
        if (temp.includes(platform)) {
          next = temp.filter(p => p !== platform);
        } else {
          next = [...temp, platform];
        }
      }
      try {
        localStorage.setItem('game_filter_platforms', JSON.stringify(next));
      } catch (e) { console.error(e); }
      return next;
    });
  };

  const handleToggleStore = (store: string) => {
    setSelectedStores(prev => {
      let next: string[];
      if (store === 'all') {
        next = [];
      } else {
        const temp = prev.filter(s => s !== 'all');
        if (temp.includes(store)) {
          next = temp.filter(s => s !== store);
        } else {
          next = [...temp, store];
        }
      }
      try {
        localStorage.setItem('game_filter_stores', JSON.stringify(next));
      } catch (e) { console.error(e); }
      return next;
    });
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    try {
      localStorage.setItem('game_sort_by', sort);
    } catch (e) { console.error(e); }
  };

  const handleToggleWishlistOnly = () => {
    setShowWishlistOnly(prev => {
      const next = !prev;
      try {
        localStorage.setItem('game_filter_wishlist_only', String(next));
      } catch (e) { console.error(e); }
      return next;
    });
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('game-theme', newTheme);
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotificationPermission(perm);
    }
  };

  // 2. フィルタ選択肢用のプラットフォーム＆ストア一覧を動的抽出
  const platforms = useMemo(() => {
    return Array.from(new Set(allGames.map((g) => g.platform)));
  }, [allGames]);

  const stores = useMemo(() => {
    return Array.from(new Set(allGames.map((g) => g.storeName)));
  }, [allGames]);

  // 3. 絞り込みロジック
  const filteredGames = useMemo(() => {
    return allGames.filter((game) => {
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = query === '' || 
        game.title.toLowerCase().includes(query) ||
        game.storeName.toLowerCase().includes(query) ||
        game.description.toLowerCase().includes(query) ||
        game.platform.toLowerCase().includes(query);

      const matchesPlatform = selectedPlatforms.length === 0 || 
                              selectedPlatforms.includes('all') || 
                              selectedPlatforms.includes(game.platform);
      const matchesStore = selectedStores.length === 0 || 
                           selectedStores.includes('all') || 
                           selectedStores.includes(game.storeName);
      const matchesWishlist = !showWishlistOnly || wishlist.includes(game.id);

      return matchesSearch && matchesPlatform && matchesStore && matchesWishlist;
    });
  }, [allGames, searchTerm, selectedPlatforms, selectedStores, showWishlistOnly, wishlist]);

  // 4. マージソート
  const sortedGames = useMemo(() => {
    return [...filteredGames].sort((a, b) => {
      // 注目セール (isManual) を優先して最上部に
      if (a.isManual && !b.isManual) return -1;
      if (!a.isManual && b.isManual) return 1;

      // 割引率順（デフォルト）
      if (sortBy === 'discount') {
        const getSortPriority = (g: Game) => {
          const isPrtimes = g.id.startsWith('prtimes');
          const isFree = g.salePrice === '無料' || (g as any).isFree;
          if (isFree && !isPrtimes) return 0; // 無料ゲーム
          if (!isPrtimes) return 1;          // セールゲーム
          return 2;                          // 告知記事（PR TIMES）
        };

        const priorityA = getSortPriority(a);
        const priorityB = getSortPriority(b);
        
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }

        // 同一グループ内：無料ゲーム
        if (priorityA === 0) {
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        }
        
        // 同一グループ内：セールゲームまたは告知記事
        const discountA = (a as any).discountRate || 0;
        const discountB = (b as any).discountRate || 0;
        if (discountA !== discountB) {
          return discountB - discountA; // 割引率降順
        }
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      }

      // どちらも同じグループ内の場合、選択されたソート順
      if (sortBy === 'newest') {
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      } else if (sortBy === 'store') {
        return a.storeName.localeCompare(b.storeName, 'ja');
      }
      return 0;
    });
  }, [filteredGames, sortBy]);

  return (
    <div id="main-app-root">
      {/* ヒーローセクション */}
      <section className="hero-section">
        <h1 className="hero-title">
          無料 ゲーム ＆ 割引セール情報 <span>最新まとめ</span>
        </h1>
        <p className="hero-subtitle">
          Epic Games Storeの毎週「無料 ゲーム」配布や、Steam、Nintendo eShop、PlayStation Store等のお得な値引き・セール対象のゲーム情報を自動集約。
        </p>
      </section>

      {/* 操作バー (通知許可・テーマ切り替え・同期) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '0 1rem', marginTop: '-0.5rem', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
        {notificationPermission !== 'granted' && (
          <button
            onClick={requestNotificationPermission}
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              fontSize: '0.8rem',
              fontWeight: 600,
              padding: '0.45rem 0.95rem',
              borderRadius: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              transition: 'all 0.2s',
              backdropFilter: 'blur(5px)'
            }}
          >
            <span>🔔</span> 値下がり通知をON
          </button>
        )}
        <button
          onClick={toggleTheme}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            color: 'var(--text-sub, #94a3b8)',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0.45rem 0.95rem',
            borderRadius: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            backdropFilter: 'blur(5px)'
          }}
        >
          {theme === 'dark' ? '💡 ライトネオン' : '🌙 ダークネオン'}
        </button>
        <button
          onClick={() => setShowSyncModal(true)}
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
            color: 'var(--text-sub, #94a3b8)',
            fontSize: '0.8rem',
            fontWeight: 600,
            padding: '0.45rem 0.95rem',
            borderRadius: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            transition: 'all 0.2s',
            backdropFilter: 'blur(5px)'
          }}
        >
          <span>🔄</span> 同期・バックアップ
        </button>
      </div>

      {/* 広告枠（上部） */}
      <AdContainer slot="top-banner-ad" format="horizontal" />

      {/* 検索・絞り込みツールバー */}
      <FilterBar
        platforms={platforms}
        selectedPlatforms={selectedPlatforms}
        onTogglePlatform={handleTogglePlatform}
        stores={stores}
        selectedStores={selectedStores}
        onToggleStore={handleToggleStore}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        sortBy={sortBy}
        onSortChange={handleSortChange}
        showWishlistOnly={showWishlistOnly}
        onToggleWishlistOnly={handleToggleWishlistOnly}
      />

      {/* 件数表示 */}
      <div style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: 'var(--text-sub)' }}>
        該当作品: <strong>{sortedGames.length}</strong> 件
      </div>

      {/* ゲームグリッド表示（途中に広告を美しくサンドイッチ） */}
      {sortedGames.length > 0 ? (
        <div className="video-grid" id="video-display-grid">
          {sortedGames.map((game, index) => {
            const cardElement = (
              <LazyRender key={game.id}>
                <GameCard 
                  game={game} 
                  isWishlisted={wishlist.includes(game.id)}
                  onToggleWishlist={() => toggleWishlist(game.id)}
                  animeVideos={animeVideos}
                  mangaSales={mangaSales}
                />
              </LazyRender>
            );

            // 8枚のカードごとにインライン広告を挟む（最初の広告は4枚目の後に配置して見えやすくする）
            if ((index + 1) % 8 === 4) {
              return (
                <div key={`wrapper-${game.id}`} style={{ display: 'contents' }}>
                  {cardElement}
                  <div key={`grid-ad-${index}`} style={{ gridColumn: '1 / -1' }}>
                    <AdContainer slot={`in-grid-ad-${index}`} format="fluid" />
                  </div>
                </div>
              );
            }

            return cardElement;
          })}
        </div>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          background: 'rgba(17, 24, 39, 0.4)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          color: 'var(--text-sub)',
          marginBottom: '3rem'
        }}>
          🔍 条件に一致する無料公開・セール中のゲームは見つかりませんでした。
        </div>
      )}

      {/* フッター前アドセンス広告 */}
      <AdContainer slot="bottom-footer-ad" />

      {/* 同期モーダル */}
      {showSyncModal && (
        <div className="modal-backdrop" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
          padding: '1rem',
          boxSizing: 'border-box'
        }} onClick={() => setShowSyncModal(false)}>
          <div className="modal-content" style={{
            background: 'rgba(30, 41, 59, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            color: '#e2e8f0',
            backdropFilter: 'blur(20px)',
            position: 'relative',
            boxSizing: 'border-box'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
              <span>🔄</span> ウィッシュリストデータの同期・移行
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-sub, #94a3b8)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              このコードをコピペすることで、他のブラウザやスマホとウィッシュリスト（お気に入り）を同期したり、バックアップを取ることができます。
            </p>

            {/* エクスポートコード */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub, #94a3b8)', display: 'block', marginBottom: '0.4rem' }}>
                あなたのウィッシュリスト同期コード (コピー用):
              </label>
              <textarea
                readOnly
                value={wishlistCode}
                onClick={(e) => {
                  const el = e.currentTarget;
                  el.select();
                  navigator.clipboard.writeText(wishlistCode);
                }}
                style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(15, 23, 42, 0.4)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#a7f3d0',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  boxSizing: 'border-box',
                  resize: 'none',
                  cursor: 'pointer'
                }}
                title="クリックで全選択コピー"
              />
              <span style={{ fontSize: '0.7rem', color: '#10b981', display: 'block', marginTop: '0.2rem' }}>
                ※クリックすると全選択され、クリップボードにコピーされます。
              </span>
            </div>

            {/* インポート入力 */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-sub, #94a3b8)', display: 'block', marginBottom: '0.4rem' }}>
                同期コードをインポート (貼り付け用):
              </label>
              <textarea
                placeholder="ここに同期コードを貼り付けてください..."
                value={syncCodeInput}
                onChange={(e) => setSyncCodeInput(e.target.value)}
                style={{
                  width: '100%',
                  height: '80px',
                  background: 'rgba(15, 23, 42, 0.2)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  padding: '0.5rem',
                  boxSizing: 'border-box',
                  resize: 'none'
                }}
              />
            </div>

            {/* エラー／成功メッセージ */}
            {syncError && (
              <div style={{ color: '#ef4444', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                ⚠️ {syncError}
              </div>
            )}
            {syncSuccess && (
              <div style={{ color: '#10b981', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                ✅ 同期に成功しました！
              </div>
            )}

            {/* アクションボタン */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowSyncModal(false);
                  setSyncError('');
                  setSyncCodeInput('');
                }}
                style={{
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'var(--text-sub, #94a3b8)',
                  padding: '0.5rem 1.25rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                キャンセル
              </button>
              <button
                onClick={handleImportWishlist}
                style={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  border: 'none',
                  color: '#fff',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 700
                }}
              >
                インポート実行
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 簡易プライバシーポリシーアンカー移動用の隠しセクション（AdSense審査対策） */}
      <section id="privacy" style={{ 
        marginTop: '5rem', 
        paddingTop: '2.5rem', 
        borderTop: '1px solid var(--border-color)',
        fontSize: '0.85rem',
        color: 'var(--text-muted)',
        lineHeight: '1.7'
      }}>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-sub)', marginBottom: '1rem', fontWeight: 700 }}>プライバシーポリシー・免責事項</h2>
        <p style={{ marginBottom: '0.75rem' }}>
          ゲームナビ（以下、当サイト）は、各ゲームストア公式が公開しているゲームセール情報や公式APIから取得できる情報を整理・紹介するアンテナ・まとめサイトです。
        </p>
        <p style={{ marginBottom: '0.75rem' }}>
          当サイトは著作権の侵害を目的としておりません。紹介しているゲーム名、画像等の著作権・肖像権等は各権利所有者・開発元・販売元に帰属します。セールおよび無料キャンペーンの終了や内容変更等について当サイトが保証するものではありません。
        </p>
        <p style={{ marginBottom: '0.75rem' }}>
          当サイトでは、第三者配信による広告サービス（Google AdSense）およびアフィリエイトプログラム（楽天アフィリエイト）を利用しています。広告配信事業者は、ユーザーの興味に応じた商品やサービスの広告を表示するため、当サイトや他サイトへのアクセスに関する情報「Cookie」（氏名、住所、メールアドレス、電話番号は含まれません）を使用することがあります。
        </p>
        <p>
          また、本アフィリエイトリンクを経由したお買い物に関するお問い合わせは、当サイトではお受けできかねます。移動先の販売店等にてご確認ください。
        </p>
      </section>
    </div>
  );
}
