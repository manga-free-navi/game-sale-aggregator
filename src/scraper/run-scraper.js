const fs = require('fs');
const path = require('path');
const axios = require('axios');
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
        isManual: false
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
    const now = new Date();
    // Steam APIの仕様上、終了期限が秒単位で取れないため、仮で7日間をセールの期間とする
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    for (const item of items) {
      if (!item.discounted) continue;

      // セント/100倍表記の価格を元の日本円に変換
      const originalVal = Math.round(item.original_price / 100);
      const saleVal = Math.round(item.final_price / 100);

      const originalPrice = `¥${originalVal.toLocaleString()}`;
      const salePrice = `¥${saleVal.toLocaleString()}`;
      const discountRate = item.discount_percent;

      // 代表的な画像URLの決定
      const imageUrl = item.header_image || item.large_capsule_image || item.small_capsule_image || '';

      games.push({
        id: `steam-${item.id}`,
        title: item.name,
        description: `【期間限定 ${discountRate}% OFF！】通常価格 ${originalPrice} が、Steamセールにて ${salePrice} の特別価格で販売中！詳細はSteamストアページをご確認ください。`,
        imageUrl,
        storeUrl: `https://store.steampowered.com/app/${item.id}/`,
        platform: 'PC',
        originalPrice,
        salePrice,
        startDate: now.toISOString(),
        endDate: oneWeekLater.toISOString(),
        publishedAt: now.toISOString(),
        storeName: 'Steam',
        isManual: false
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
  const epicGames = await fetchEpicFreeGames();
  const steamGames = await fetchSteamSales();
  
  // 双方のデータを結合
  let allGames = [...epicGames, ...steamGames];
  
  // 日付順（新着順）にソート
  allGames.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  
  // JSON書き出し
  fs.writeFileSync(outputPath, JSON.stringify(allGames, null, 2), 'utf8');
  console.log(`Scraper execution complete. Saved ${allGames.length} games to ${outputPath}.`);
}

main();
