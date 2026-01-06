import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Currency, formatPriceWithConversion, detectUserCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';

interface CurrencyContextType {
  userCurrency: Currency;
  setUserCurrency: (currency: Currency) => Promise<void>;
  formatPrice: (price: number, productCurrency?: Currency) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const [userCurrency, setUserCurrencyState] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(true);

  // Load user's currency preference
  useEffect(() => {
    const loadCurrencyPreference = async () => {
      if (!user) {
        const detected = detectUserCurrency();
        setUserCurrencyState(detected);
        setIsLoading(false);
        return;
      }

      try {
        if (profile?.currency_preference) {
          const currency = profile.currency_preference as Currency;
          if (SUPPORTED_CURRENCIES.includes(currency)) {
            setUserCurrencyState(currency);
            setIsLoading(false);
            return;
          }
        }

        const detected = detectUserCurrency();
        setUserCurrencyState(detected);
        
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

  const formatPrice = useCallback((price: number, productCurrency: Currency = 'USD'): string => {
    return formatPriceWithConversion(price, productCurrency, userCurrency);
  }, [userCurrency]);

  return (
    <CurrencyContext.Provider value={{ userCurrency, setUserCurrency, formatPrice, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrencyContext() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrencyContext must be used within a CurrencyProvider');
  }
  return context;
}

