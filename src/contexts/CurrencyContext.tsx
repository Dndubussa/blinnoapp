import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Currency, formatPriceWithConversion } from '@/lib/currency';

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
  const [isLoading, setIsLoading] = useState(false); // No loading needed since we're defaulting to USD

  // Initialize currency on component mount
  useEffect(() => {
    // For now, we're standardizing to USD only
    // In the future, we can implement user currency preferences
    setUserCurrencyState('USD');
    setIsLoading(false);
  }, []); // Only run once on mount

  const setUserCurrency = useCallback(async (currency: Currency) => {
    // For now, we're standardizing to USD only
    // In the future, we can re-enable currency switching
    console.log('Currency change attempted but disabled in current implementation');
    // setUserCurrencyState(currency);
  }, []); // userCurrency is always USD in this implementation

  const formatPrice = useCallback((price: number, productCurrency: Currency = 'USD'): string => {
    // Always format as USD since we've standardized to USD only
    return formatPriceWithConversion(price, 'USD', 'USD');
  }, []); // No dependencies needed since we always use USD

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
