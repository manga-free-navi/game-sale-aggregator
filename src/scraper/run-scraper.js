const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { parsePrtimes } = require('./parsers/prtimes');
require('dotenv').config();

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const outputPath = path.join(dataDir, 'games.json');

/**
 * Epic Games Storeの無料配布プロモーション情報を取得する
 */
async function fetchEpicFreeGames() {
  const url = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=ja&country=JP&allowCountries=JP';
  console.log('Fetching Epic Games Store Free Promotions...');
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const elements = response.data?.data?.Catalog?.searchStore?.elements || [];
    const games = [];
    const now = new Date();

    for (const element of elements) {
      const promotionalOffers = element.promotions?.promotionalOffers || [];
      if (promotionalOffers.length === 0) continue;

      let activeOffer = null;
      for (const offerGroup of promotionalOffers) {
        for (const offer of offerGroup.promotionalOffers || []) {
          const startDate = new Date(offer.startDate);
          const endDate = new Date(offer.endDate);
          const isDiscountZero = offer.discountSetting?.discountType === 'PERCENTAGE' && 
            (offer.discountSetting?.discountValue === 0 || offer.discountSetting?.discountPercentage === 0);

          if (isDiscountZero && now >= startDate && now <= endDate) {
            activeOffer = offer;
            break;
          }
        }
        if (activeOffer) break;
      }

      if (!activeOffer) continue;

      let imageUrl = '';
      if (element.keyImages && element.keyImages.length > 0) {
        const wideImage = element.keyImages.find(img => img.type === 'OfferImageWide' || img.type === 'featuredMedia' || img.type === 'Landscape');
        const thumbnail = element.keyImages.find(img => img.type === 'Thumbnail');
        imageUrl = (wideImage || thumbnail || element.keyImages[0]).url;
      }

      const originalPrice = element.price?.totalPrice?.fmtPrice?.originalPrice || '無料';
      const pageSlug = element.catalogNs?.mappings?.[0]?.pageSlug || element.productSlug || '';
      
      games.push({
        id: element.id || element.title,
        title: element.title,
        description: element.description || '現在無料配布中のPCゲームです。詳細はストアページをご確認ください。',
        imageUrl,
        storeUrl: `https://store.epicgames.com/ja/p/${pageSlug}`,
        platform: 'PC',
        originalPrice,
        salePrice: '無料',
        startDate: activeOffer.startDate,
        endDate: activeOffer.endDate,
        publishedAt: activeOffer.startDate,
        storeName: 'Epic Games Store',
        isManual: false,
        discountRate: 100,
        isFree: true
      });
    }

    console.log(`Successfully fetched ${games.length} free games from Epic Games Store.`);
    return games;
  } catch (error) {
    console.error('Error fetching Epic Games Store Free Promotions:', error.message);
    return [];
  }
}

/**
 * Steam Web APIから現在開催中の特売情報を取得する
 */
async function fetchSteamSales() {
  const url = 'https://store.steampowered.com/api/featuredcategories?l=japanese&cc=jp';
  console.log('Fetching Steam Store Specials...');
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const items = response.data?.specials?.items || [];
    const games = [];
    const seenAppIds = new Set();
    const now = new Date();
    // Steam APIの仕様上、終了期限が秒単位で取れないため、仮で7日間をセールの期間とする
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const item of items) {
      if (!item.discounted) continue;
      if (seenAppIds.has(item.id)) continue;
      seenAppIds.add(item.id);

      // セント/100倍表記の価格を元の日本円に変換
      const originalVal = Math.round(item.original_price / 100);
      const saleVal = Math.round(item.final_price / 100);

      const originalPrice = `¥${originalVal.toLocaleString()}`;
      const salePrice = `¥${saleVal.toLocaleString()}`;
      const discountRate = item.discount_percent;

      // 代表的な画像URLの決定
      const imageUrl = item.header_image || item.large_capsule_image || item.small_capsule_image || '';

      // 正確な割引終了の Unix timestamp の取得
      let discountExpiration = item.discount_expiration || null;
      let reviewScoreDesc = '';
      let reviewPercent = null;
      let videoUrl = '';

      // API詳細から日本語説明文を取得
      let description = `【期間限定 ${discountRate}% OFF！】通常価格 ${originalPrice} が、Steamセールにて ${salePrice} の特別価格で販売中！詳細はSteamストアページをご確認ください。`;
      
      // 連続リクエストを避けるためスリープ (1000ms)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        console.log(`Fetching details for Steam App: ${item.name} (${item.id})...`);
        const detailsRes = await axios.get(`https://store.steampowered.com/api/appdetails?appids=${item.id}&cc=jp&l=japanese`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 5000
        });
        const appData = detailsRes.data?.[item.id.toString()]?.data;
        if (appData) {
          if (appData.short_description) {
            description = appData.short_description;
          }
          if (appData.price_overview && appData.price_overview.discount_to) {
            // appdetails から得られる discount_to (Unix timestamp) を優先
            discountExpiration = appData.price_overview.discount_to;
          }
          if (appData.movies && appData.movies.length > 0) {
            const movie = appData.movies[0];
            videoUrl = movie.webm?.['480'] || movie.mp4?.['480'] || movie.webm?.max || movie.mp4?.max || '';
          }
        }

        // 追加: Steamレビュー情報の取得
        const reviewsRes = await axios.get(`https://store.steampowered.com/appreviews/${item.id}?json=1&l=japanese`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          },
          timeout: 5000
        });
        const querySummary = reviewsRes.data?.query_summary;
        if (querySummary) {
          reviewScoreDesc = querySummary.review_score_desc || '';
          if (querySummary.total_reviews > 0) {
            reviewPercent = Math.round((querySummary.total_positive / querySummary.total_reviews) * 100);
          }
        }
      } catch (err) {
        console.warn(`Failed to fetch details for Steam App ${item.id}:`, err.message);
      }

      // 終了期限を算出
      let endDate = oneWeekLater.toISOString();
      if (discountExpiration) {
        endDate = new Date(discountExpiration * 1000).toISOString();
      }

      games.push({
        id: `steam-${item.id}`,
        title: item.name,
        description,
        imageUrl,
        storeUrl: `https://store.steampowered.com/app/${item.id}/`,
        platform: 'PC',
        originalPrice,
        salePrice,
        startDate: now.toISOString(),
        endDate: endDate,
        publishedAt: now.toISOString(),
        storeName: 'Steam',
        isManual: false,
        discountRate,
        isFree: false,
        reviewScoreDesc,
        reviewPercent,
        videoUrl
      });
    }

    console.log(`Successfully fetched ${games.length} specials from Steam.`);
    return games;
  } catch (error) {
    console.error('Error fetching Steam Specials:', error.message);
    return [];
  }
}

async function main() {
  const jstNow = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
  const todayStr = jstNow.toISOString().split('T')[0];

  // 1. キャッシュのロード
  let cachedGames = [];
  try {
    if (fs.existsSync(outputPath)) {
      cachedGames = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
      console.log(`[キャッシュ] games.json から ${cachedGames.length} 件のデータをロードしました。`);
    }
  } catch (e) {
    console.warn('[キャッシュ] 読み込みに失敗しました:', e.message);
  }

  // 2. 各ストアのフェッチ処理（エラー時はキャッシュからレスキュー）
  let epicGames = [];
  try {
    epicGames = await fetchEpicFreeGames();
    if (!epicGames || epicGames.length === 0) {
      throw new Error('Epic取得結果が空です');
    }
  } catch (err) {
    console.error('[Epic] 取得失敗のため、キャッシュからデータを復元します:', err.message);
    epicGames = cachedGames.filter(g => g.storeName === 'Epic Games Store');
    console.log(`[Epic] キャッシュから ${epicGames.length} 件を復元しました。`);
  }

  let steamGames = [];
  try {
    steamGames = await fetchSteamSales();
    if (!steamGames || steamGames.length === 0) {
      throw new Error('Steam取得結果が空です');
    }
  } catch (err) {
    console.error('[Steam] 取得失敗のため、キャッシュからデータを復元します:', err.message);
    steamGames = cachedGames.filter(g => g.storeName === 'Steam');
    console.log(`[Steam] キャッシュから ${steamGames.length} 件を復元しました。`);
  }

  let prtimesGames = [];
  try {
    prtimesGames = await parsePrtimes();
    if (!prtimesGames || prtimesGames.length === 0) {
      throw new Error('PR TIMES取得結果が空です');
    }
  } catch (err) {
    console.error('[PR TIMES] 取得失敗のため、キャッシュからデータを復元します:', err.message);
    prtimesGames = cachedGames.filter(g => g.id.startsWith('prtimes') || g.storeName === 'PR TIMES' || g.storeName === 'Nintendo eShop' || g.storeName === 'PlayStation Store');
    console.log(`[PR TIMES] キャッシュから ${prtimesGames.length} 件を復元しました。`);
  }
  
  // すべてのデータを結合
  let allGames = [...epicGames, ...steamGames, ...prtimesGames];

  // 3. 重複排除 (IDでキー化)
  const uniqueMap = new Map();
  allGames.forEach(game => {
    uniqueMap.set(game.id, game);
  });
  const mergedGames = Array.from(uniqueMap.values());
  console.log(`[マージ] 総ゲーム数: ${allGames.length}件 -> ユニーク数: ${mergedGames.length}件`);

  // 4. 期限切れのゲームセールを自動除外 (endDate が今日より前のものを除外)
  const activeGames = mergedGames.filter(game => {
    if (!game.endDate) return true;
    const gameEndDate = game.endDate.split('T')[0];
    return gameEndDate >= todayStr;
  });
  console.log(`[フィルタ] 期限切れデータを自動除外: ${mergedGames.length}件 -> ${activeGames.length}件`);
  
  // 日付順（新着順）にソート
  activeGames.sort((a, b) => new Date(b.publishedAt || b.startDate) - new Date(a.publishedAt || a.startDate));
  
  // JSON書き出し
  if (activeGames.length > 0) {
    fs.writeFileSync(outputPath, JSON.stringify(activeGames, null, 2), 'utf8');
    console.log(`Scraper execution complete. Saved ${activeGames.length} games to ${outputPath}.`);
  } else {
    console.log('警告: 有効なゲームデータが0件のため、ファイル書き込みをスキップしました。');
  }
}

main();
