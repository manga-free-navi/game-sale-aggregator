const axios = require('axios');
const cheerio = require('cheerio');

// 主要なゲーム配信ストアやプラットフォームのドメイン
const GAME_DOMAINS = [
  'store-jp.nintendo.com',
  'store.playstation.com',
  'store.steampowered.com',
  'store.epicgames.com',
  'my.nintendo.com'
];

/**
 * ユーティリティ: 指定ミリ秒待機する
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 相対時間や日時文字列から「年」を判定する
 */
function parseYear(timeText) {
  const match = timeText.match(/(\d{4})年/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return new Date().getFullYear();
}

/**
 * プレスリリース本文からキャンペーン終了日(endDate)を抽出する
 */
function extractEndDate(text, defaultYear = new Date().getFullYear()) {
  const pattern1 = /(?:(\d{4})年)?(\d{1,2})月(\d{1,2})日(?:(?!月).)*?まで/g;
  const pattern2 = /(\d{1,2})\/(\d{1,2})(?:(?!\/).)*?まで/g;

  let matches = [];
  let match;

  while ((match = pattern1.exec(text)) !== null) {
    const year = match[1] ? parseInt(match[1], 10) : defaultYear;
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    matches.push({ year, month, day });
  }

  if (matches.length === 0) {
    while ((match = pattern2.exec(text)) !== null) {
      const month = parseInt(match[1], 10);
      const day = parseInt(match[2], 10);
      matches.push({ year: defaultYear, month, day });
    }
  }

  if (matches.length === 0) return null;

  const dates = matches.map(m => {
    const d = new Date(m.year, m.month - 1, m.day);
    return {
      formatted: `${m.year}-${String(m.month).padStart(2, '0')}-${String(m.day).padStart(2, '0')}`,
      time: d.getTime()
    };
  }).filter(d => !isNaN(d.time));

  if (dates.length === 0) return null;

  dates.sort((a, b) => b.time - a.time);
  return dates[0].formatted;
}

/**
 * 本文から割引率（最大XX% OFF等）を自動抽出する
 */
function extractDiscountRate(text) {
  const match = text.match(/最大\s*(\d{1,2})\s*%\s*OFF/i) || text.match(/(\d{1,2})\s*%\s*OFF/i);
  if (match) {
    return parseInt(match[1], 10);
  }
  return 50; // デフォルト50% OFF
}

/**
 * タイトルと本文からプラットフォームと配信ストア名を自動判定する
 */
function detectPlatformAndStore(title, bodyText, storeUrl) {
  let platform = 'マルチ';
  let storeName = 'PR TIMES';

  const combinedText = (title + ' ' + bodyText).toLowerCase();

  if (combinedText.includes('nintendo switch') || combinedText.includes('switch') || combinedText.includes('ニンテンドースイッチ') || storeUrl.includes('nintendo.com')) {
    platform = 'Nintendo Switch';
    storeName = 'Nintendo eShop';
  } else if (combinedText.includes('playstation') || combinedText.includes('ps5') || combinedText.includes('ps4') || storeUrl.includes('playstation.com')) {
    platform = 'PS5/PS4';
    storeName = 'PlayStation Store';
  } else if (combinedText.includes('steam') || storeUrl.includes('steampowered.com')) {
    platform = 'PC';
    storeName = 'Steam';
  } else if (combinedText.includes('epic') || storeUrl.includes('epicgames.com')) {
    platform = 'PC';
    storeName = 'Epic Games Store';
  }

  return { platform, storeName };
}

/**
 * 抽出されたリンクから主要ゲームストアのURLを特定する
 */
function extractStoreUrl(links, fallbackUrl) {
  for (const domain of GAME_DOMAINS) {
    const found = links.find(l => l.href.includes(domain));
    if (found) {
      return found.href;
    }
  }
  return fallbackUrl;
}

/**
 * PR TIMESからゲームのセールリリース情報を自動収集する
 */
async function parsePrtimes() {
  const games = [];
  // 検索キーワード: 「ゲーム セール」
  const searchUrl = 'https://prtimes.jp/main/action.php?run=html&page=searchkey&search_word=%E3%82%B2%E3%83%BC%E3%83%A0%20%E3%82%BB%E3%83%BC%E3%83%AB';
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8'
  };

  try {
    console.log(`[PR TIMES GAME] リクエスト開始: ${searchUrl}`);
    const response = await axios.get(searchUrl, { headers, timeout: 15000 });
    
    if (!response.data) {
      console.log('[PR TIMES GAME] 検索結果が空です。');
      return [];
    }

    const $ = cheerio.load(response.data);
    const releaseCards = $('article[class*="release-card_article"]');
    
    console.log(`[PR TIMES GAME] 検索一覧から ${releaseCards.length} 件のリリースを発見しました。`);

    // 上位10件をクロール対象にする
    const targetCards = releaseCards.slice(0, 10);
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    for (let i = 0; i < targetCards.length; i++) {
      const card = $(targetCards[i]);
      const linkEl = card.find('a[href*="/main/html/rd/p/"]').first();
      if (linkEl.length === 0) continue;

      const relativeHref = linkEl.attr('href');
      const detailUrl = `https://prtimes.jp${relativeHref}`;
      const title = card.find('h3[class*="release-card_title"]').first().text().trim();
      const imageUrl = card.find('img[class*="release-card_thumbnail"]').first().attr('src') || '';
      const companyName = card.find('a[class*="release-card_companyLink"]').first().text().trim() || '不明';
      const timeText = card.find('time').first().text().trim() || '';

      const releaseYear = parseYear(timeText);
      const idMatch = relativeHref.match(/rd\/p\/([^\/]+)\.html/);
      const prId = idMatch ? idMatch[1].replace('.', '-') : Math.random().toString(36).substring(2, 9);

      console.log(`[PR TIMES GAME] 詳細クロール中 (${i + 1}/${targetCards.length}): ${detailUrl}`);

      try {
        await sleep(1000); // 1秒ウェイト

        const detailRes = await axios.get(detailUrl, { headers, timeout: 10000 });
        const $detail = cheerio.load(detailRes.data);
        
        const bodyText = $detail('article').text().trim();
        const description = bodyText.substring(0, 200).replace(/\s+/g, ' ') + '...';

        // 外部リンクの抽出
        const links = [];
        $detail('article a').each((_, el) => {
          const href = $detail(el).attr('href') || '';
          const text = $detail(el).text().trim();
          if (href && !href.startsWith('#') && !href.startsWith('/') && !href.includes('javascript:')) {
            links.push({ text, href });
          }
        });

        // 終了日、ストア直行URL、割引率、プラットフォームとストア名の判定
        const endDate = extractEndDate(bodyText, releaseYear);
        const storeUrl = extractStoreUrl(links, detailUrl);
        const discountRate = extractDiscountRate(bodyText);
        const { platform, storeName } = detectPlatformAndStore(title, bodyText, storeUrl);

        games.push({
          id: `prtimes-${prId}`,
          title: title,
          description: description,
          imageUrl: imageUrl,
          storeUrl: storeUrl,
          platform: platform,
          originalPrice: 'セール開催中',
          salePrice: '特別価格',
          startDate: now.toISOString(),
          endDate: endDate || oneWeekLater.toISOString(),
          publishedAt: now.toISOString(),
          storeName: storeName,
          isManual: false,
          discountRate: discountRate,
          isFree: false
        });

      } catch (detailError) {
        console.error(`[PR TIMES GAME] 詳細ページの取得に失敗しました: ${detailUrl}`, detailError.message);
        
        const { platform, storeName } = detectPlatformAndStore(title, '', detailUrl);
        games.push({
          id: `prtimes-${prId}`,
          title: title,
          description: 'プレスリリースの詳細内容はPR TIMESの公式サイトをご確認ください。',
          imageUrl: imageUrl,
          storeUrl: detailUrl,
          platform: platform,
          originalPrice: 'セール開催中',
          salePrice: '特別価格',
          startDate: now.toISOString(),
          endDate: oneWeekLater.toISOString(),
          publishedAt: now.toISOString(),
          storeName: storeName,
          isManual: false,
          discountRate: 50,
          isFree: false
        });
      }
    }

    return games;

  } catch (error) {
    console.error('[PR TIMES GAME] クロール中にエラーが発生しました:', error.message);
    return [];
  }
}

module.exports = { parsePrtimes };
