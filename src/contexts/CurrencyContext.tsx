<<<<<<< HEAD
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Currency, formatPriceWithConversion, detectUserCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';

interface CurrencyContextType {
  userCurrency: Currency;
  setUserCurrency: (currency: Currency) => Promise<void>;
=======
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Currency, detectUserCurrency, SUPPORTED_CURRENCIES, formatPriceWithConversion } from '@/lib/currency';

interface CurrencyContextType {
  userCurrency: Currency;
  setUserCurrency: (currency: Currency) => void;
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
  formatPrice: (price: number, productCurrency?: Currency) => string;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

<<<<<<< HEAD
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
=======
const CURRENCY_STORAGE_KEY = 'blinno-currency';

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [userCurrency, setUserCurrencyState] = useState<Currency>('USD');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCurrency = () => {
      try {
        const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
        if (saved && SUPPORTED_CURRENCIES.includes(saved as Currency)) {
          setUserCurrencyState(saved as Currency);
        } else {
          const detected = detectUserCurrency();
          setUserCurrencyState(detected);
          localStorage.setItem(CURRENCY_STORAGE_KEY, detected);
        }
      } catch (error) {
        console.error('Error loading currency:', error);
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
        setUserCurrencyState('USD');
      } finally {
        setIsLoading(false);
      }
    };

<<<<<<< HEAD
    loadCurrencyPreference();
  }, [user, profile]);

  const setUserCurrency = useCallback(async (currency: Currency) => {
=======
    loadCurrency();
  }, []);

  const setUserCurrency = (currency: Currency) => {
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      console.error('Unsupported currency:', currency);
      return;
    }
<<<<<<< HEAD

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
=======
    setUserCurrencyState(currency);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  const formatPrice = (price: number, productCurrency: Currency = 'USD'): string => {
    return formatPriceWithConversion(price, productCurrency, userCurrency);
  };
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6

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
