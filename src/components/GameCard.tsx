'use client';

import { useRef, useState, useEffect, useMemo } from 'react';

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
  discountRate?: number | null;
  isFree?: boolean;
}

interface GameCardProps {
  game: Game;
  isWishlisted: boolean;
  onToggleWishlist: () => void;
}

export default function GameCard({ game, isWishlisted, onToggleWishlist }: GameCardProps) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [showReadMore, setShowReadMore] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // ゲーム説明文のはみ出し判定
  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const hasOverflow = textRef.current.scrollHeight > textRef.current.clientHeight;
        setShowReadMore(hasOverflow || isExpanded);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [game.description, isExpanded]);

  // 日付のフォーマット (YYYY/MM/DD)
  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
    } catch (e) {
      return dateStr;
    }
  };

  // 楽天ブックス関連商品（ゲームパッケージ、周辺機器）アフィリエイトURLの生成
  const getRakutenUrl = (title: string) => {
    const affiliateId = process.env.NEXT_PUBLIC_RAKUTEN_AFFILIATE_ID || '55071401.125a7966.55071402.d568cde0';
    let kw = title;
    
    // タイトルからセール用ノイズを除去してゲーム名だけを抽出
    kw = kw.replace(/【[^】]*】/g, ' ');
    kw = kw.replace(/\[[^\]]*\]/g, ' ');
    kw = kw.replace(/セール.*/g, ' ');
    kw = kw.replace(/\d+%\s*OFF.*/g, ' ');
    kw = kw.replace(/無料.*/g, ' ');
    kw = kw.replace(/\s+/g, ' ');
    kw = kw.trim();

    const searchKeyword = `${kw} ゲーム`;
    const pcUrl = `https://search.rakuten.co.jp/search/mall/${encodeURIComponent(searchKeyword)}/books/`;
    return `https://hb.afl.rakuten.co.jp/hgc/${affiliateId}/?pc=${encodeURIComponent(pcUrl)}&link_type=hybrid_html`;
  };

  // 終了期限までの残り日数 (数値)
  const diffDaysVal = useMemo(() => {
    if (!game.endDate) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const end = new Date(game.endDate); end.setHours(0,0,0,0);
    if (isNaN(end.getTime())) return null;
    return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  }, [game.endDate]);

  // コピー処理
  const handleCopyUrl = () => {
    if (game.storeUrl) {
      navigator.clipboard.writeText(game.storeUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
        console.error('Failed to copy URL:', err);
      });
    }
  };

  // Xシェア
  const handleShareX = () => {
    const text = `【ゲームセールナビ】『${game.title}』が ${game.salePrice === '無料' ? '無料配布中！' : `${game.salePrice}でセール中！`}\n期限：${formatDate(game.endDate)}まで\n詳細はこちら：`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(game.storeUrl)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <article className="video-card" id={`game-card-${game.id}`}>
      {/* ウィッシュリストボタン */}
      <button 
        className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleWishlist();
        }}
        title={isWishlisted ? 'ウィッシュリストから削除' : 'ウィッシュリストに追加'}
        aria-label={isWishlisted ? 'ウィッシュリストから削除' : 'ウィッシュリストに追加'}
      >
        <svg viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </button>

      {/* ゲームイメージ */}
      <div 
        className="thumbnail-container" 
        onClick={() => window.open(game.storeUrl, '_blank', 'noopener,noreferrer')}
      >
        <img 
          src={game.imageUrl || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='320' height='180' viewBox='0 0 320 180'><rect width='320' height='180' fill='%231f2937'/></svg>"} 
          alt={game.title} 
          className="thumbnail-img" 
          loading="lazy"
        />
        <div className="play-overlay">
          <div className="play-btn-circle" style={{ width: '4.5rem', borderRadius: '12px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>STORE</span>
          </div>
        </div>
        
        {/* バッジ表示 */}
        <div className="card-badges" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
          {game.isManual && <span className="badge-item badge-manual">注目セール</span>}
          <span className="badge-item badge-channel" style={{ background: game.id.startsWith('prtimes') ? '#2563eb' : undefined }}>
            {game.id.startsWith('prtimes') ? '告知記事 (PR TIMES)' : game.storeName}
          </span>
          {game.salePrice === '無料' || game.isFree ? (
            <span className="badge-item badge-manual" style={{ 
              background: 'linear-gradient(135deg, #ff007f 0%, #ff00ff 100%)', 
              color: '#fff',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              boxShadow: '0 0 8px rgba(255, 0, 127, 0.6)',
              border: 'none'
            }}>
              🎁 無料
            </span>
          ) : game.discountRate ? (
            <span className="badge-item" style={{ 
              background: '#39ff14', 
              color: '#0b0f19',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '0.2rem 0.5rem',
              borderRadius: '4px',
              boxShadow: '0 0 8px rgba(57, 255, 20, 0.5)',
              border: 'none'
            }}>
              🔥 {game.discountRate}% OFF
            </span>
          ) : null}
        </div>
        
        {/* ハードウェアタグ */}
        <span className="video-duration" style={{ background: '#10b981' }}>{game.platform}</span>
      </div>

      {/* カードコンテンツ */}
      <div className="card-body">
        <div className={`publish-date ${diffDaysVal !== null && diffDaysVal <= 3 && diffDaysVal >= 0 ? 'urgent' : ''}`}>
          ⏰ 期間: {formatDate(game.startDate)} 〜 {formatDate(game.endDate)}
          {diffDaysVal !== null && diffDaysVal <= 3 && diffDaysVal >= 0 && (
            <span className="urgent-badge" style={{ marginLeft: '0.5rem', fontWeight: 700, color: '#ff3e6c' }}>
              ⚠️ あと {diffDaysVal} 日！
            </span>
          )}
        </div>
        
        <h3 
          className="video-title" 
          onClick={() => window.open(game.storeUrl, '_blank', 'noopener,noreferrer')}
          title={game.title}
        >
          {game.title}
        </h3>

        {/* 価格表示 */}
        <div className="price-tags">
          {game.originalPrice && game.originalPrice !== '無料' && (
            <span className="price-original">{game.originalPrice}</span>
          )}
          <span className="price-sale">{game.salePrice}</span>
        </div>

        {/* ゲーム紹介 */}
        <div className="synopsis-container" style={{ marginTop: '0.75rem' }}>
          <p 
            ref={textRef} 
            className={`synopsis-text ${isExpanded ? 'expanded' : ''}`}
          >
            {game.description || 'ゲームの詳細情報は登録されていません。ストアページをご確認ください。'}
          </p>
          {showReadMore && (
            <button 
              className="read-more-btn" 
              onClick={() => setIsExpanded(!isExpanded)}
              id={`read-more-btn-${game.id}`}
            >
              {isExpanded ? '▲ 説明を閉じる' : '▼ 説明を読む'}
            </button>
          )}
        </div>

        {/* シェア＆コピーボタン */}
        <div className="share-actions-row" style={{ display: 'flex', gap: '0.4rem', marginTop: '0.2rem', marginBottom: '0.8rem' }}>
          <button 
            onClick={handleCopyUrl}
            className="action-btn copy-btn"
            style={{
              flex: 1,
              padding: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-sub)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s'
            }}
            id={`btn-copy-${game.id}`}
          >
            <span>🔗</span> {copied ? 'コピー完了！' : 'ストアURLコピー'}
          </button>
          <button 
            onClick={handleShareX}
            className="action-btn share-btn"
            style={{
              flex: 1,
              padding: '0.45rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: '#1d9bf0',
              border: 'none',
              color: '#ffffff',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.25rem',
              transition: 'all 0.2s'
            }}
            id={`btn-share-${game.id}`}
          >
            <span>𝕏</span> シェアする
          </button>
        </div>

        {/* ボタンアクション */}
        <div className="affiliate-section">
          <div className="affiliate-buttons">
            <a 
              href={game.storeUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="affiliate-btn btn-store"
              id={`btn-store-${game.id}`}
            >
              {game.id.startsWith('prtimes') ? '告知記事で詳細確認' : 'ストアで確認'}
            </a>
            <a 
              href={getRakutenUrl(game.title)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="affiliate-btn btn-rakuten"
              style={{ padding: '0.6rem 0.5rem' }}
              id={`btn-rakuten-${game.id}`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '2px' }}>
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
              </svg>
              グッズ検索
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}
