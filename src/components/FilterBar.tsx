'use client';

interface FilterBarProps {
  platforms: string[];
  selectedPlatform: string;
  onSelectPlatform: (platform: string) => void;
  stores: string[];
  selectedStore: string;
  onSelectStore: (store: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  showWishlistOnly: boolean;
  onToggleWishlistOnly: () => void;
}

export default function FilterBar({
  platforms,
  selectedPlatform,
  onSelectPlatform,
  stores,
  selectedStore,
  onSelectStore,
  searchTerm,
  onSearchChange,
  sortBy,
  onSortChange,
  showWishlistOnly,
  onToggleWishlistOnly,
}: FilterBarProps) {
  return (
    <div className="filter-bar" id="filter-bar-container">
      {/* 検索・ソート */}
      <div className="filter-row">
        <div className="search-input-wrapper">
          <svg
            className="search-icon"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="ゲームタイトル、ストア、説明文で検索..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            id="input-search-query"
          />
        </div>
        
        <div>
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            id="select-sort-order"
          >
            <option value="newest">セール開始が新しい順</option>
            <option value="oldest">セール開始が古い順</option>
            <option value="store">ストア別</option>
          </select>
        </div>
      </div>

      {/* プラットフォーム絞り込み */}
      <div className="filter-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '80px' }}>対象ハード:</span>
        <div className="filter-group">
          <button
            className={`filter-btn ${selectedPlatform === 'all' ? 'active' : ''}`}
            onClick={() => onSelectPlatform('all')}
            id="btn-platform-all"
          >
            すべて表示
          </button>
          {platforms.map((plat) => (
            <button
              key={plat}
              className={`filter-btn ${selectedPlatform === plat ? 'active' : ''}`}
              onClick={() => onSelectPlatform(plat)}
              id={`btn-platform-${plat}`}
            >
              {plat}
            </button>
          ))}
        </div>
      </div>

      {/* ストア絞り込み */}
      <div className="filter-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '80px' }}>ストア:</span>
        <div className="filter-group">
          <button
            className={`filter-btn ${selectedStore === 'all' ? 'active' : ''}`}
            onClick={() => onSelectStore('all')}
            id="btn-store-all"
          >
            すべて表示
          </button>
          {stores.map((store) => (
            <button
              key={store}
              className={`filter-btn ${selectedStore === store ? 'active' : ''}`}
              onClick={() => onSelectStore(store)}
              id={`btn-store-${store}`}
            >
              {store}
            </button>
          ))}
        </div>
      </div>

      {/* その他フィルター */}
      <div className="filter-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.75rem' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, minWidth: '80px' }}>その他:</span>
        <div className="filter-group">
          <button
            className={`filter-btn ${showWishlistOnly ? 'active' : ''}`}
            onClick={onToggleWishlistOnly}
            id="btn-filter-wishlist"
            style={showWishlistOnly ? { background: '#ff3e6c', borderColor: '#ff3e6c', color: '#fff', boxShadow: '0 0 10px rgba(255, 62, 108, 0.4)' } : {}}
          >
            ♥ ウィッシュリストのみ
          </button>
        </div>
      </div>
    </div>
  );
}
