import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Currency, detectUserCurrency, SUPPORTED_CURRENCIES } from '@/lib/currency';

interface CurrencyContextType {
  userCurrency: Currency;
  setUserCurrency: (currency: Currency) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

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
        setUserCurrencyState('USD');
      } finally {
        setIsLoading(false);
      }
    };

    loadCurrency();
  }, []);

  const setUserCurrency = (currency: Currency) => {
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      console.error('Unsupported currency:', currency);
      return;
    }
    setUserCurrencyState(currency);
    try {
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    } catch (error) {
      console.error('Error saving currency:', error);
    }
  };

  return (
    <CurrencyContext.Provider value={{ userCurrency, setUserCurrency, isLoading }}>
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
