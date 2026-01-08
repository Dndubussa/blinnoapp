import { Badge } from "@/components/ui/badge";

interface StockBadgeProps {
  stockQuantity: number | null;
  variant?: "compact" | "standard";
}

export function StockBadge({ stockQuantity, variant = "standard" }: StockBadgeProps) {
  // Digital products have null stock_quantity
  if (stockQuantity === null) {
    return (
      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400">
        Digital
      </Badge>
    );
  }

  // Out of stock
  if (stockQuantity === 0) {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20 dark:text-red-400">
        {variant === "compact" ? "Out of Stock" : "Out of Stock"}
      </Badge>
    );
  }

  // Low stock (1-5 items)
  if (stockQuantity <= 5) {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400">
        {variant === "compact" ? `Only ${stockQuantity} left` : `Only ${stockQuantity} left`}
      </Badge>
    );
  }

  // In stock
  return (
    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400">
      In Stock
    </Badge>
  );
}
