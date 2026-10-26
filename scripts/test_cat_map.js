const fs = require('fs');

const categoryMap = {
  // Food
  'restaurant': 'food',
  'restaurant_cafe': 'food',
  'seafood': 'food',
  'fast_food': 'food',
  'pizza': 'food',
  'grills': 'food',
  'syrian_restaurant': 'food',
  'asian_restaurant': 'food',
  'burger': 'food',
  'pizza_fast_food': 'food',
  'foul_falafel': 'food',
  'italian_restaurant': 'food',
  'koshary_sweets': 'food',
  'sushi_restaurant': 'food',
  'restaurant_lounge': 'food',
  'restaurant_outing': 'food',
  'indian_restaurant': 'food',
  'dairy_pies': 'food',
  'restaurant_pies': 'food',
  'food_complex': 'food',
  'food_area': 'food',
  'restaurant_entertainment': 'food',

  // Cafe
  'cafe': 'cafe',
  'cafeteria': 'cafe',
  'cafe_bakery': 'cafe',
  'cafe_food': 'cafe',
  'cafe_restaurant': 'cafe',

  // Sweets
  'sweets': 'sweets',
  'ice_cream': 'sweets',
  'waffle_sweets': 'sweets',
  'crepe_waffle': 'sweets',
  'sweets_bakery': 'sweets',
  'sweets_icecream': 'sweets',
  'bakery': 'sweets',

  // Fun / Landmarks / Entertainment
  'landmark': 'fun',
  'square': 'fun',
  'museum': 'fun',
  'park': 'fun',
  'beach': 'fun',
  'corniche': 'fun',
  'promenade': 'fun',
  'outing': 'fun',
  'heritage_area': 'fun',
  'entertainment': 'fun',
  'culture_center': 'fun',
  'mosque': 'fun',
  'street': 'fun',

  // Shop / Markets / Supermarkets
  'supermarket': 'shop',
  'hypermarket': 'shop',
  'market': 'shop',
  'fish_market': 'shop',
  'mall': 'shop',
  'mall_entertainment': 'shop',
  'electronics': 'shop',

  // Sport
  'gym': 'sport',
  'gym_spa': 'sport',
  'sports': 'sport',
  'club': 'sport',
  'stadium': 'sport',
  'youth_center': 'sport',

  // Housing
  'hotel': 'housing',
  'hostel': 'housing',
  'resort': 'housing',

  // Bus / Education / Study
  'college': 'bus',
  'institute': 'bus',
  'library': 'bus',
  'public_library': 'bus',
  'bookstore': 'bus',
  'library_stationery': 'bus',
  'study_space': 'bus',
  'transport': 'bus',

  // Unknown
  'unknown': 'fun' // default fallback, or customized per item
};

console.log('Category mapping defined for', Object.keys(categoryMap).length, 'types.');
