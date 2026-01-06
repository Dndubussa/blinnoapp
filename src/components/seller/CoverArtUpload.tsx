import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { uploadFileWithProgress, getPublicUrl } from "@/lib/uploadUtils";
import { normalizeImageUrlSync } from "@/lib/imageUtils";

interface CoverArtUploadProps {
  coverUrl: string | null;
  onChange: (url: string | null) => void;
  userId: string;
  label: string;
  aspectRatio?: "square" | "portrait" | "landscape";
  minWidth?: number;
  minHeight?: number;
  recommendedDimensions?: string;
  helpText?: string;
}

export default function CoverArtUpload({
  coverUrl,
  onChange,
  userId,
  label,
  aspectRatio = "square",
  minWidth = 400,
  minHeight = 400,
  recommendedDimensions,
  helpText,
}: CoverArtUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const getAspectRatioClass = () => {
    switch (aspectRatio) {
      case "square":
        return "aspect-square";
      case "portrait":
        return "aspect-[2/3]";
      case "landscape":
        return "aspect-video";
      default:
        return "aspect-square";
    }
  };

  const getAspectRatioValue = (): number => {
    switch (aspectRatio) {
      case "square":
        return 1;
      case "portrait":
        return 2 / 3;
      case "landscape":
        return 16 / 9;
      default:
        return 1;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPG, PNG, or WebP).",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Cover images must be less than 10MB. Please compress your image.",
        variant: "destructive",
      });
      return;
    }

    // Validate image dimensions
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);

      const width = img.width;
      const height = img.height;
      const currentRatio = width / height;
      const expectedRatio = getAspectRatioValue();

      // Check minimum dimensions
      if (width < minWidth || height < minHeight) {
        toast({
          title: "Image too small",
          description: `Image must be at least ${minWidth}x${minHeight}px. Your image is ${width}x${height}px.`,
          variant: "destructive",
        });
        return;
      }

      // Check aspect ratio (with 5% tolerance)
      const tolerance = 0.05;
      const ratioDiff = Math.abs(currentRatio - expectedRatio);

      if (ratioDiff > tolerance) {
        toast({
          title: "Incorrect aspect ratio",
          description: recommendedDimensions
            ? `Please use ${recommendedDimensions}`
            : `Image aspect ratio doesn't match the required ${aspectRatio} format.`,
          variant: "destructive",
        });
        return;
      }

      // All validations passed, proceed with upload
      await performUpload(file);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast({
        title: "Invalid image",
        description: "The selected file is not a valid image. Please try another file.",
        variant: "destructive",
      });
    };

    img.src = objectUrl;
  };

  const performUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      const { data, error: uploadError } = await uploadFileWithProgress({
        bucket: "product-images",
        path: fileName,
        file: file,
        cacheControl: "3600",
        upsert: false,
        onProgress: (progress) => {
          setUploadProgress(progress.progress);
        },
      });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message || "Failed to upload file. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        const publicUrl = getPublicUrl("product-images", fileName);
        onChange(publicUrl);
        toast({
          title: "Cover uploaded",
          description: "Your cover image has been uploaded successfully.",
        });
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (!coverUrl) return;

    // Remove from state immediately
    onChange(null);

    // Try to delete from storage
    try {
      const productImagesMatch = coverUrl.split("/product-images/")[1];
      if (productImagesMatch) {
        await supabase.storage.from("product-images").remove([productImagesMatch]);
      }
    } catch (error) {
      console.error("Error deleting cover image:", error);
    }
  };

  return (
    <div className="space-y-3">
      <Label>{label}</Label>

      <AnimatePresence mode="wait">
        {coverUrl ? (
          <motion.div
            key="cover-preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`relative ${getAspectRatioClass()} w-full max-w-sm rounded-lg border-2 border-border overflow-hidden group bg-muted`}
          >
            <img
              src={normalizeImageUrlSync(coverUrl)}
              alt="Cover"
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("Failed to load cover image:", coverUrl);
                e.currentTarget.style.display = "none";
                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
            <div className="hidden absolute inset-0 items-center justify-center bg-muted flex-col gap-2">
              <ImageIcon className="h-12 w-12 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Image failed to load</span>
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="h-10 w-10"
                onClick={handleRemove}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="cover-upload"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`${getAspectRatioClass()} w-full max-w-sm rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors flex flex-col items-center justify-center cursor-pointer relative bg-muted/30`}
            onClick={() => !uploading && fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center justify-center gap-3 p-6 w-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground font-medium">Uploading...</span>
                <div className="w-full px-6">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center mt-2">{uploadProgress}%</p>
                </div>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                <span className="text-sm font-medium text-muted-foreground">Click to upload</span>
                <span className="text-xs text-muted-foreground mt-1">or drag and drop</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {helpText && (
        <p className="text-xs text-muted-foreground">{helpText}</p>
      )}
    </div>
  );
}
