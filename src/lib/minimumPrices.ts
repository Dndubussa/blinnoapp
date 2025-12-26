/**
 * Minimum price configuration for product categories
 * Prices are in USD and will be converted to seller's currency for display
 */

export const MINIMUM_PRICES: Record<string, number> = {
  // Digital Products (lower minimums, no shipping costs)
  'Books': 2.00,           // eBooks, audiobooks
  'Music': 0.99,           // Singles, albums, beats
  'Courses': 9.99,         // Online courses, tutorials
  
  // Physical Products (higher minimums, shipping + material costs)
  'Clothes': 5.00,         // Apparel, accessories
  'Electronics': 10.00,    // Phones, laptops, gadgets
  'Home Appliances': 3.00, // Kitchen, home items
  'Kitchenware': 3.00,     // Utensils, cookware
  'Perfumes': 5.00,        // Fragrances, cosmetics
  'Art & Crafts': 2.00,    // Handmade items
  
  // Catch-all
  'Other': 1.00,
};

/**
 * Get minimum price for a category in USD
 */
export function getMinimumPrice(category: string): number {
  return MINIMUM_PRICES[category] || MINIMUM_PRICES['Other'];
}

/**
 * Get helpful message explaining why minimum exists
 */
export function getMinimumPriceMessage(category: string): string {
  const messages: Record<string, string> = {
    'Books': 'This ensures fair compensation for authors and covers platform processing fees.',
    'Music': 'This protects artists\' work and maintains music industry standards.',
    'Courses': 'This reflects the significant effort required to create quality educational content.',
    'Electronics': 'This ensures quality products and covers warranty expectations.',
    'Clothes': 'This accounts for material costs, quality, and shipping.',
    'Art & Crafts': 'This values handmade work and artisan time investment.',
  };
  
  return messages[category] || 'This helps maintain marketplace quality and covers platform costs.';
}

/**
 * Check if price meets minimum requirement
 */
export function validateMinimumPrice(
  price: number,
  productCurrency: string,
  category: string,
  exchangeRates: Record<string, number>
): { isValid: boolean; minimumInUSD: number; minimumInProductCurrency: number } {
  const minimumUSD = getMinimumPrice(category);
  
  // Convert price to USD for comparison
  const priceInUSD = productCurrency === 'USD' 
    ? price 
    : price / exchangeRates[productCurrency];
  
  // Convert minimum back to product currency for display
  const minimumInProductCurrency = productCurrency === 'USD'
    ? minimumUSD
    : minimumUSD * exchangeRates[productCurrency];
  
  return {
    isValid: priceInUSD >= minimumUSD,
    minimumInUSD,
    minimumInProductCurrency,
  };
}
