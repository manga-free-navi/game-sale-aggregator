const axios = require('axios');

async function test() {
  const url = 'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=ja&country=JP&allowCountries=JP';
  console.log('Fetching raw Epic Games API data for debug...');
  
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    });
    
    const elements = res.data?.data?.Catalog?.searchStore?.elements || [];
    console.log(`Total catalog elements: ${elements.length}`);
    
    let matchedCount = 0;
    for (const el of elements) {
      const promotionalOffers = el.promotions?.promotionalOffers || [];
      const upcomingPromotionalOffers = el.promotions?.upcomingPromotionalOffers || [];
      
      if (promotionalOffers.length > 0 || upcomingPromotionalOffers.length > 0) {
        matchedCount++;
        console.log(`\n=================== [${matchedCount}] ===================`);
        console.log(`Title: ${el.title}`);
        console.log(`ID: ${el.id}`);
        console.log(`Price Info:`, JSON.stringify(el.price, null, 2));
        console.log(`Promotional Offers (Active):`, JSON.stringify(promotionalOffers, null, 2));
        console.log(`Upcoming Offers:`, JSON.stringify(upcomingPromotionalOffers, null, 2));
      }
    }
  } catch (e) {
    console.error('Error in debug:', e.message);
  }
}

test();
