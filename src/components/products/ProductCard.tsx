import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingCart, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import type { ViewMode } from "@/pages/Products";
import { Currency } from "@/lib/currency";
import { getAllProductImagesSync, getPrimaryImageSync } from "@/lib/imageUtils";
import { CompactAudioPreview } from "@/components/product-detail/CompactAudioPreview";
import { ProductRating } from "@/components/product-detail/ProductRating";
import { StockBadge } from "@/components/product-detail/StockBadge";


interface Product {
  id: string;
  title: string;
  description: string | null;
  price: number;
  currency?: string;
  category: string;
  images: string[] | null;
  stock_quantity: number | null;
  seller_id: string;
  attributes?: {
    previewFile?: string;
    artist?: string;
  };
}

interface ProductCardProps {
  product: Product;
  viewMode: ViewMode;
}

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    products: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    books: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    creators: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    courses: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    services: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    events: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  };
  return colors[category] || "bg-muted text-muted-foreground";
};

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  // Use image utilities to get all product images including category-specific covers
  const images = getAllProductImagesSync(product);
  // Digital products don't have stock quantity (null)
  const hasStock = product.stock_quantity !== null;
  const isOutOfStock = hasStock && product.stock_quantity === 0;
  const { addToCart } = useCart();
  const { formatPrice } = useCurrencyContext();
  const hasMultipleImages = images.length > 1 && images[0] !== "/placeholder.svg";

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  };

  const getImageSrc = (index: number) => {
    if (imageErrors.has(index) || !images[index]) {
      return "/placeholder.svg";
    }
    return images[index];
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      title: product.title,
      price: typeof product.price === 'string' ? parseFloat(product.price) : (product.price || 0),
      currency: product.currency || 'USD',
      image: getPrimaryImageSync(images),
      stock_quantity: product.stock_quantity,
      seller_id: product.seller_id,
    });
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (viewMode === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group flex gap-4 rounded-xl border border-border bg-card p-4 transition-all hover:shadow-lg"
      >
        {/* Image with navigation */}
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-lg bg-muted">
          <Link to={`/product/${product.id}`}>
            <img
              src={getImageSrc(currentImageIndex)}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => handleImageError(currentImageIndex)}
              loading="lazy"
              width={128}
              height={128}
            />
          </Link>
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <span className="text-xs font-medium text-muted-foreground">Out of Stock</span>
            </div>
          )}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronLeft className="h-3 w-3" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-background/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ChevronRight className="h-3 w-3" />
              </button>
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1 w-1 rounded-full ${idx === currentImageIndex ? 'bg-primary' : 'bg-background/60'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between">
          <div>
            {/* Title and Badges */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <Link to={`/product/${product.id}`} className="font-bold text-sm line-clamp-2 hover:text-primary flex-1">
                {product.title}
              </Link>
              <Badge variant="outline" className={getCategoryColor(product.category)}>
                {product.category}
              </Badge>
            </div>

            {/* Stock Badge */}
            <div className="mb-2">
              <StockBadge stockQuantity={product.stock_quantity} variant="compact" />
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {product.description || "No description available"}
            </p>
            <Link
              to={`/seller/${product.seller_id}`}
              className="mt-1 inline-block text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Visit Store â†’
            </Link>
            
            {/* Product Rating */}
            <div className="mt-2">
              <ProductRating productId={product.id} showCount={true} size="sm" />
            </div>

            {/* Audio Preview for Music Products */}
            {product.category === "Music" && product.attributes?.previewFile && (
              <div className="mt-2">
                <CompactAudioPreview
                  previewUrl={product.attributes.previewFile}
                  artist={product.attributes.artist}
                  title={product.attributes.musicTitle || product.title}
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* Price and Actions */}
          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-2">
            <span className="text-xl font-bold text-primary">
              {formatPrice(product.price, (product.currency || 'USD') as Currency)}
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link to={`/product/${product.id}`}>
                  <Eye className="mr-1 h-4 w-4" />
                  View
                </Link>
              </Button>
              <Button size="sm" disabled={isOutOfStock} onClick={handleAddToCart}>
                <ShoppingCart className="mr-1 h-4 w-4" />
                Add to Cart
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <Link to={`/product/${product.id}`}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="group relative bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-primary/20"
      >
        {/* Image Container - Standard E-commerce Aspect Ratio */}
        <div className="relative aspect-[4/3] bg-gray-100 dark:bg-slate-800 overflow-hidden">
          <img
            src={getImageSrc(currentImageIndex)}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            onError={() => handleImageError(currentImageIndex)}
            loading="lazy"
          />
          
          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <span className="text-sm font-semibold text-white bg-red-500 px-3 py-1 rounded">Out of Stock</span>
            </div>
          )}
          
          {/* Category Badge - Top Left */}
          <Badge
            variant="secondary"
            className="absolute left-2 top-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm text-xs font-medium"
          >
            {product.category}
          </Badge>
          
          {/* Stock Badge - Top Right */}
          {!isOutOfStock && (
            <div className="absolute right-2 top-2">
              <StockBadge stockQuantity={product.stock_quantity} variant="compact" />
            </div>
          )}
          
          {/* Image Navigation - Only on Hover */}
          {hasMultipleImages && (
            <>
              <button
                onClick={handlePrevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white dark:hover:bg-slate-800"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-white dark:hover:bg-slate-800"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              {/* Dot indicators */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCurrentImageIndex(idx);
                    }}
                    className={`h-2 w-2 rounded-full transition-all ${
                      idx === currentImageIndex 
                        ? 'bg-primary w-6' 
                        : 'bg-white/60 hover:bg-white/80'
                    }`}
                  />
                ))}
              </div>
            </>
          )}

          {/* Quick Add to Cart - Appears on Hover */}
          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button 
              size="sm" 
              disabled={isOutOfStock} 
              onClick={handleAddToCart}
              className="h-9 w-9 p-0 rounded-full shadow-lg"
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Product Info */}
        <div className="p-4">
          {/* Title */}
          <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 mb-2 min-h-[2.5rem] group-hover:text-primary transition-colors">
            {product.title}
          </h3>

          {/* Rating */}
          <div className="mb-2">
            <ProductRating productId={product.id} showCount={true} size="sm" />
          </div>

          {/* Audio Preview for Music Products */}
          {product.category === "Music" && product.attributes?.previewFile && (
            <div className="mb-2">
              <CompactAudioPreview
                previewUrl={product.attributes.previewFile}
                artist={product.attributes.artist}
                title={product.title}
                className="text-xs"
              />
            </div>
          )}

          {/* Price and Add to Cart */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800">
            <div>
              <span className="text-xl font-bold text-primary">
                {formatPrice(product.price, (product.currency || 'USD') as Currency)}
              </span>
            </div>
            <Button 
              size="sm" 
              disabled={isOutOfStock} 
              onClick={handleAddToCart}
              className="h-8 px-3 text-xs"
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              Add
            </Button>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

