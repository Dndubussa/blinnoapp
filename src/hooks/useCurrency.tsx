import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
<<<<<<< HEAD
import { supabase } from '@/integrations/supabase/client';
import { Currency, formatPriceWithConversion, detectUserCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';
=======
import { Currency, formatPriceWithConversion } from '@/lib/currency';
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6

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
<<<<<<< HEAD
  const { user, profile } = useAuth();
  const [userCurrency, setUserCurrencyState] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(true);

  // Load user's currency preference
  useEffect(() => {
    const loadCurrencyPreference = async () => {
      if (!user) {
        // If not logged in, try to detect from browser or use default
        const detected = detectUserCurrency();
        setUserCurrencyState(detected);
        setIsLoading(false);
        return;
      }

      try {
        // Check if profile has currency preference
        if (profile?.currency_preference) {
          const currency = profile.currency_preference as Currency;
          if (SUPPORTED_CURRENCIES.includes(currency)) {
            setUserCurrencyState(currency);
            setIsLoading(false);
            return;
          }
        }

        // If no preference, try to detect or use default
        const detected = detectUserCurrency();
        setUserCurrencyState(detected);
        
        // Save detected currency as preference
        if (user && !profile?.currency_preference) {
          await supabase
            .from('profiles')
            .update({ currency_preference: detected })
            .eq('id', user.id);
        }
      } catch (error) {
        console.error('Error loading currency preference:', error);
        setUserCurrencyState('USD');
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrencyPreference();
  }, [user, profile]);

  // Update user's currency preference
  const setUserCurrency = useCallback(async (currency: Currency) => {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      console.error('Unsupported currency:', currency);
      return;
    }

    console.log('Currency changed from', userCurrency, 'to', currency);
    setUserCurrencyState(currency);

    if (user) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ currency_preference: currency })
          .eq('id', user.id);

        if (error) {
          console.error('Error updating currency preference:', error);
          // Revert on error
          if (profile?.currency_preference) {
            setUserCurrencyState(profile.currency_preference as Currency);
          }
        } else {
          console.log('Currency preference saved to profile');
        }
      } catch (error) {
        console.error('Error updating currency preference:', error);
      }
    } else {
      console.log('Currency changed for anonymous user (not saved)');
    }
  }, [user, profile, userCurrency]);

  // Format price with automatic conversion
  const formatPrice = useCallback((price: number, productCurrency: Currency = 'USD'): string => {
    return formatPriceWithConversion(price, productCurrency, userCurrency);
  }, [userCurrency]);
=======
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
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6

  return {
    userCurrency,
    setUserCurrency,
    formatPrice,
    isLoading,
  };
}

