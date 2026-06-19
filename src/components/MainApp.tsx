'use client';

import { useState, useMemo, useEffect } from 'react';
import gamesData from '../data/games.json';
import manualGamesData from '../data/manual_games.json';

import FilterBar from './FilterBar';
import GameCard from './GameCard';
import AdContainer from './AdContainer';

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
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedStore, setSelectedStore] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const [wishlist, setWishlist] = useState<string[]>([]);
  const [showWishlistOnly, setShowWishlistOnly] = useState(false);

  // マウント時に閲覧設定とウィッシュリストをロード
  useEffect(() => {
    try {
      const stored = localStorage.getItem('game-wishlist');
      if (stored) {
        setWishlist(JSON.parse(stored));
      }
      
      const savedPlatform = localStorage.getItem('game_filter_platform');
      const savedStore = localStorage.getItem('game_filter_store');
      const savedSort = localStorage.getItem('game_sort_by');
      const savedWishlistOnly = localStorage.getItem('game_filter_wishlist_only');
      
      if (savedPlatform) setSelectedPlatform(savedPlatform);
      if (savedStore) setSelectedStore(savedStore);
      if (savedSort) setSortBy(savedSort);
      if (savedWishlistOnly) setShowWishlistOnly(savedWishlistOnly === 'true');
    } catch (e) {
      console.error('Failed to load game preferences:', e);
    }
  }, []);

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
  const handlePlatformChange = (platform: string) => {
    setSelectedPlatform(platform);
    try {
      localStorage.setItem('game_filter_platform', platform);
    } catch (e) { console.error(e); }
  };

  const handleStoreChange = (store: string) => {
    setSelectedStore(store);
    try {
      localStorage.setItem('game_filter_store', store);
    } catch (e) { console.error(e); }
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

  // 1. 自動データと手動データをマージ（ID衝突時は手動側を優先）
  const allGames = useMemo(() => {
    const manualIds = new Set(manualGamesData.map(g => g.id));
    const filteredAutoGames = (gamesData as Game[]).filter(g => !manualIds.has(g.id));
    return [...(manualGamesData as Game[]), ...filteredAutoGames];
  }, []);

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

      const matchesPlatform = selectedPlatform === 'all' || game.platform === selectedPlatform;
      const matchesStore = selectedStore === 'all' || game.storeName === selectedStore;
      const matchesWishlist = !showWishlistOnly || wishlist.includes(game.id);

      return matchesSearch && matchesPlatform && matchesStore && matchesWishlist;
    });
  }, [allGames, searchTerm, selectedPlatform, selectedStore, showWishlistOnly, wishlist]);

  // 4. マージソート（手動登録された注目セールを最上部に強制ピン留め）
  const sortedGames = useMemo(() => {
    return [...filteredGames].sort((a, b) => {
      // 注目セール (isManual) を優先して最上部に
      if (a.isManual && !b.isManual) return -1;
      if (!a.isManual && b.isManual) return 1;

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
          ゲーム無料化・割引 <span>最新まとめ</span>
        </h1>
        <p className="hero-subtitle">
          Epic Games Storeの毎週無料配布ゲームや、Steam、Nintendo eShop、PlayStation Store等のお得な値引き・セール対象のゲーム情報を自動集約。
        </p>
      </section>

      {/* 広告枠（上部） */}
      <AdContainer slot="top-banner-ad" format="horizontal" />

      {/* 検索・絞り込みツールバー */}
      <FilterBar
        platforms={platforms}
        selectedPlatform={selectedPlatform}
        onSelectPlatform={handlePlatformChange}
        stores={stores}
        selectedStore={selectedStore}
        onSelectStore={handleStoreChange}
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
              <GameCard 
                key={game.id} 
                game={game} 
                isWishlisted={wishlist.includes(game.id)}
                onToggleWishlist={() => toggleWishlist(game.id)}
              />
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
