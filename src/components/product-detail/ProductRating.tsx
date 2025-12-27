import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProductRatingProps {
  productId: string;
  showCount?: boolean;
  size?: "sm" | "md" | "lg";
}

export function ProductRating({ productId, showCount = true, size = "sm" }: ProductRatingProps) {
  const { data: reviews } = useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("product_id", productId);
      
      if (error) {
        console.warn("Error fetching reviews:", error);
        return [];
      }
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!reviews || reviews.length === 0) {
    return null;
  }

  const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const reviewCount = reviews.length;

  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex items-center gap-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= Math.round(averageRating)
                ? "fill-yellow-400 text-yellow-400"
                : "fill-muted text-muted"
            }`}
          />
        ))}
      </div>
      {showCount && (
        <span className={`${textSizeClasses[size]} text-muted-foreground ml-1`}>
          ({averageRating.toFixed(1)}) · {reviewCount}
        </span>
      )}
    </div>
  );
}
