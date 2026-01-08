import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";
import { convertCurrency, Currency } from "@/lib/currency";

export interface CartItem {
  id: string;
  title: string;
  price: number;
  currency?: string; // Product currency
  quantity: number;
  image: string | null;
  stock_quantity: number | null;
  seller_id: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = "blinno-cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        setItems(JSON.parse(savedCart));
      } catch (error) {
        console.error("Failed to parse cart from localStorage:", error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addToCart = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id);
      
      if (existingItem) {
        const newQuantity = Math.min(
          existingItem.quantity + quantity,
          item.stock_quantity
        );
        
        if (newQuantity === existingItem.quantity) {
          toast.error("Maximum quantity reached");
          return prevItems;
        }
        
        toast.success(`Updated ${item.title} quantity to ${newQuantity}`);
        return prevItems.map((i) =>
          i.id === item.id ? { ...i, quantity: newQuantity } : i
        );
      }
      
      toast.success(`Added ${item.title} to cart`);
      return [...prevItems, { ...item, quantity }];
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setItems((prevItems) => {
      const item = prevItems.find((i) => i.id === id);
      if (item) {
        toast.success(`Removed ${item.title} from cart`);
      }
      return prevItems.filter((i) => i.id !== id);
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id);
      return;
    }

    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const newQuantity = Math.min(quantity, item.stock_quantity);
          return { ...item, quantity: newQuantity };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
    toast.success("Cart cleared");
  };

  const totalItems = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    return sum + (isNaN(qty) ? 0 : qty);
  }, 0);
  
  // Calculate total price with currency conversion to USD
  // Add validation to prevent NaN values
  const totalPrice = items.reduce((sum, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 0;
    
    // Skip invalid items (NaN or invalid values)
    if (isNaN(price) || isNaN(quantity) || price <= 0 || quantity <= 0) {
      console.warn(`Invalid cart item: ${item.id}`, { price, quantity });
      return sum;
    }
    
    const itemCurrency = (item.currency || 'USD') as Currency;
    const priceInUSD = itemCurrency === 'USD' 
      ? price 
      : convertCurrency(price, itemCurrency, 'USD');
    
    // Validate converted price
    if (isNaN(priceInUSD) || priceInUSD <= 0) {
      console.warn(`Invalid converted price for item: ${item.id}`, { priceInUSD });
      return sum;
    }
    
    return sum + priceInUSD * quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
