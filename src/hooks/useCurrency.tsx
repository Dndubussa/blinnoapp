import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { Currency, formatPriceWithConversion } from '@/lib/currency';

interface UseCurrencyReturn {
  userCurrency: Currency;
  setUserCurrency: (currency: Currency) => Promise<void>;
  formatPrice: (price: number, productCurrency?: Currency) => string;
  isLoading: boolean;
}

/**
 * Hook for managing user currency preference
 */
export function useCurrency(): UseCurrencyReturn {
  const { user } = useAuth(); // We don't need profile for this simplified version
  const [userCurrency, setUserCurrencyState] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(false); // No loading needed since we're defaulting to USD

  // Initialize currency on hook mount
  useEffect(() => {
    // For now, we're standardizing to USD only
    // In the future, we can implement user currency preferences
    setUserCurrencyState('USD');
    setIsLoading(false);
  }, []); // Only run once on mount

  // Update user's currency preference
  const setUserCurrency = useCallback(async (currency: Currency) => {
    // For now, we're standardizing to USD only
    // In the future, we can re-enable currency switching
    console.log('Currency change attempted but disabled in current implementation');
    // setUserCurrencyState(currency);
  }, []); // userCurrency is always USD in this implementation

  // Format price with automatic conversion
  const formatPrice = useCallback((price: number, productCurrency: Currency = 'USD'): string => {
    // Always format as USD since we've standardized to USD only
    return formatPriceWithConversion(price, 'USD', 'USD');
  }, []); // No dependencies needed since we always use USD

  return {
    userCurrency,
    setUserCurrency,
    formatPrice,
    isLoading,
  };
}

