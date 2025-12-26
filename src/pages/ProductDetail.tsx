import { useParams, Link } from "react-router-dom";
<<<<<<< HEAD
=======
import { useState, useEffect } from "react";
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { ImageGallery } from "@/components/product-detail/ImageGallery";
import { ProductInfo } from "@/components/product-detail/ProductInfo";
import { ReviewsSection } from "@/components/product-detail/ReviewsSection";
import { RelatedProducts } from "@/components/product-detail/RelatedProducts";
import { AudioPreview } from "@/components/product-detail/AudioPreview";
import { VideoPreview } from "@/components/product-detail/VideoPreview";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Package } from "lucide-react";
<<<<<<< HEAD
import { getAllProductImages } from "@/lib/imageUtils";
=======
import { getAllProductImages, getAllProductImagesSync } from "@/lib/imageUtils";
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();

<<<<<<< HEAD
=======
  const [processedImages, setProcessedImages] = useState<string[]>([]);
  
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.category, id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .ilike("category", product!.category) // Case-insensitive match
        .eq("is_active", true)
        .neq("id", id)
        .limit(4);

      if (error) throw error;
      return data;
    },
    enabled: !!product?.category,
  });

  if (productLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="pt-20">
          <div className="container mx-auto px-4 py-8 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-2">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-6 w-1/4" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="flex min-h-[60vh] items-center justify-center pt-20">
          <div className="text-center">
            <Package className="mx-auto h-16 w-16 text-muted-foreground/50" />
            <h1 className="mt-4 text-2xl font-bold">Product Not Found</h1>
            <p className="mt-2 text-muted-foreground">
              The product you're looking for doesn't exist.
            </p>
            <Button asChild className="mt-6">
              <Link to="/products">Back to Products</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

<<<<<<< HEAD
=======
  // Process images when product changes
  useEffect(() => {
    if (product) {
      const processImages = async () => {
        const processed = await getAllProductImages({
          images: product.images,
          category: product.category,
          attributes: product.attributes as Record<string, any> || null,
        });
        setProcessedImages(processed);
      };
      processImages();
    } else {
      setProcessedImages([]);
    }
  }, [product]);
  
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-20">
        <div className="container mx-auto px-4 py-8 lg:px-8">
          {/* Breadcrumb */}
          <Link
            to="/products"
            className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Products
          </Link>

          {/* Product Section */}
          <div className="grid gap-8 lg:grid-cols-2">
            <ImageGallery 
<<<<<<< HEAD
              images={getAllProductImages(product)}
=======
              images={processedImages.length > 0 ? processedImages : getAllProductImagesSync({
                images: product.images,
                category: product.category,
                attributes: product.attributes as Record<string, any> || null,
              })}
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
              title={product.title} 
            />
            <ProductInfo product={product} />
          </div>

          {/* Preview Section for Music and Videos */}
<<<<<<< HEAD
          {product.attributes?.previewFile && product.category === "Music" && (
            <div className="mt-8">
              <AudioPreview
                previewUrl={product.attributes.previewFile}
                artist={product.attributes.artist}
=======
          {(product.attributes as Record<string, any>)?.previewFile && product.category === "Music" && (
            <div className="mt-8">
              <AudioPreview
                previewUrl={(product.attributes as Record<string, any>).previewFile}
                artist={(product.attributes as Record<string, any>).artist}
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
                title={product.title}
              />
            </div>
          )}

<<<<<<< HEAD
          {product.attributes?.previewVideo && product.category === "Courses" && (
            <div className="mt-8">
              <VideoPreview
                previewUrl={product.attributes.previewVideo}
                title={product.attributes.courseTitle || product.title}
                thumbnail={product.attributes.thumbnail}
=======
          {(product.attributes as Record<string, any>)?.previewVideo && product.category === "Courses" && (
            <div className="mt-8">
              <VideoPreview
                previewUrl={(product.attributes as Record<string, any>).previewVideo}
                title={(product.attributes as Record<string, any>).courseTitle || product.title}
                thumbnail={(product.attributes as Record<string, any>).thumbnail}
>>>>>>> f3f544e74e17c1fe64355e187595c7dc171392d6
              />
            </div>
          )}

          {/* Reviews Section */}
          <ReviewsSection productId={product.id} />

          {/* Related Products */}
          {relatedProducts && relatedProducts.length > 0 && (
            <RelatedProducts products={relatedProducts} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
