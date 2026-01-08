import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Play, Pause, Scissors } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFileUrl } from "@/lib/uploadUtils";

interface PreviewSegmentSelectorProps {
  sourceFileUrl: string | null; // URL to the original audio/video file
  sourceType: "audio" | "video";
  previewStartTime: number; // Start time in seconds (0-30)
  onPreviewStartTimeChange: (time: number) => void;
  onPreviewGenerated?: (previewUrl: string) => void;
  productId?: string; // Optional product ID for saving preview config
  disabled?: boolean;
}

const PREVIEW_DURATION = 30; // 30 seconds preview

export function PreviewSegmentSelector({
  sourceFileUrl,
  sourceType,
  previewStartTime,
  onPreviewStartTimeChange,
  onPreviewGenerated,
  productId,
  disabled = false,
}: PreviewSegmentSelectorProps) {
  const mediaRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Convert sourceFileUrl to a playable URL (product-files is now public)
  useEffect(() => {
    if (!sourceFileUrl) {
      setPlayableUrl(null);
      return;
    }

    const loadPlayableUrl = async () => {
      setIsLoadingUrl(true);
      try {
        // Check if URL is already a full URL (http/https)
        if (sourceFileUrl.startsWith('http://') || sourceFileUrl.startsWith('https://')) {
          // Already a full URL, use as-is (product-files is now public)
          setPlayableUrl(sourceFileUrl);
          setIsLoadingUrl(false);
          return;
        }

        // Path format (e.g., "user123/file.mp3" or "/user123/file.mp3")
        // Convert to public URL since product-files bucket is now public
        const path = sourceFileUrl.startsWith('/') ? sourceFileUrl.slice(1) : sourceFileUrl;
        const publicUrl = await getFileUrl('product-files', path);
        setPlayableUrl(publicUrl);
      } catch (error) {
        console.error('Error loading playable URL:', error);
        toast.error('Failed to load media file. Please try uploading again.');
        setPlayableUrl(null);
      } finally {
        setIsLoadingUrl(false);
      }
    };

    loadPlayableUrl();
  }, [sourceFileUrl]);

  useEffect(() => {
    const media = mediaRef.current;
    if (!media || !playableUrl) return;

    const handleTimeUpdate = () => {
      const time = media.currentTime;
      setCurrentTime(time);
      
      // Auto-pause at 30 seconds from preview start
      if (time >= previewStartTime + PREVIEW_DURATION) {
        media.pause();
        setIsPlaying(false);
        media.currentTime = previewStartTime; // Reset to start
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(media.duration);
      // Ensure preview start time is within bounds
      const maxStartTime = Math.max(0, media.duration - PREVIEW_DURATION);
      if (previewStartTime > maxStartTime) {
        onPreviewStartTimeChange(maxStartTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      media.currentTime = previewStartTime; // Reset to preview start
    };

    const handleError = (e: Event) => {
      console.error('Media playback error:', e);
      toast.error('Failed to play media. Please check the file format and try again.');
      setIsPlaying(false);
    };

    media.addEventListener("timeupdate", handleTimeUpdate);
    media.addEventListener("loadedmetadata", handleLoadedMetadata);
    media.addEventListener("ended", handleEnded);
    media.addEventListener("error", handleError);

    return () => {
      media.removeEventListener("timeupdate", handleTimeUpdate);
      media.removeEventListener("loadedmetadata", handleLoadedMetadata);
      media.removeEventListener("ended", handleEnded);
      media.removeEventListener("error", handleError);
    };
  }, [playableUrl, previewStartTime, onPreviewStartTimeChange]);

  const togglePlay = () => {
    const media = mediaRef.current;
    if (!media) return;

    if (isPlaying) {
      media.pause();
      setIsPlaying(false);
    } else {
      // Ensure we start from preview start time
      if (media.currentTime < previewStartTime || media.currentTime > previewStartTime + PREVIEW_DURATION) {
        media.currentTime = previewStartTime;
      }
      media.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const media = mediaRef.current;
    if (!media) return;
    
    const newTime = value[0];
    // Constrain seeking to preview segment
    const constrainedTime = Math.max(
      previewStartTime,
      Math.min(previewStartTime + PREVIEW_DURATION, newTime)
    );
    media.currentTime = constrainedTime;
    setCurrentTime(constrainedTime);
  };

  const handlePreviewStartChange = (value: number[]) => {
    const newStartTime = value[0];
    const maxStartTime = Math.max(0, duration - PREVIEW_DURATION);
    const constrainedStart = Math.min(newStartTime, maxStartTime);
    onPreviewStartTimeChange(constrainedStart);
    
    // Update media position if playing
    const media = mediaRef.current;
    if (media) {
      media.currentTime = constrainedStart;
      setCurrentTime(constrainedStart);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const generatePreview = async () => {
    if (!sourceFileUrl) {
      toast.error("No source file available");
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("You must be logged in to generate preview");
        return;
      }

      // Call edge function to generate preview configuration
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          sourceFileUrl,
          sourceType,
          startTime: previewStartTime,
          duration: PREVIEW_DURATION,
          productId: productId || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate preview");
      }

      const result = await response.json();
      onPreviewGenerated?.(result.previewUrl || sourceFileUrl);
      toast.success("Preview configured! The 30-second segment will be used when customers preview your product.");
    } catch (error) {
      console.error("Error generating preview:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate preview. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!sourceFileUrl) {
    return (
      <Card className="p-4 border-dashed">
        <p className="text-sm text-muted-foreground text-center">
          Upload an audio or video file first to configure preview
        </p>
      </Card>
    );
  }

  const previewEndTime = Math.min(previewStartTime + PREVIEW_DURATION, duration);
  const maxStartTime = Math.max(0, duration - PREVIEW_DURATION);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">Preview Segment (30 seconds)</Label>
        <Button
          type="button"
          size="sm"
          onClick={generatePreview}
          disabled={disabled || isGenerating || !sourceFileUrl}
          className="gap-2"
        >
          <Scissors className="h-4 w-4" />
          {isGenerating ? "Generating..." : "Generate Preview"}
        </Button>
      </div>

      {/* Media Element (hidden) */}
      {isLoadingUrl ? (
        <div className="text-center py-4 text-sm text-muted-foreground">
          Loading media file...
        </div>
      ) : playableUrl ? (
        sourceType === "audio" ? (
          <audio
            ref={mediaRef as React.RefObject<HTMLAudioElement>}
            src={playableUrl}
            preload="metadata"
            crossOrigin="anonymous"
          />
        ) : (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={playableUrl}
            preload="metadata"
            className="hidden"
            crossOrigin="anonymous"
          />
        )
      ) : (
        <div className="text-center py-4 text-sm text-destructive">
          Failed to load media file. Please try uploading again.
        </div>
      )}

      {/* Preview Start Time Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Preview Start Time</span>
          <span className="font-medium">{formatTime(previewStartTime)}</span>
        </div>
        <Slider
          value={[previewStartTime]}
          min={0}
          max={maxStartTime}
          step={0.5}
          onValueChange={handlePreviewStartChange}
          disabled={disabled || duration === 0 || !playableUrl || isLoadingUrl}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0:00</span>
          <span>{formatTime(maxStartTime)} (max)</span>
        </div>
      </div>

      {/* Preview Player */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Preview Segment</span>
          <span className="font-medium">
            {formatTime(Math.max(0, currentTime - previewStartTime))} / {formatTime(PREVIEW_DURATION)}
          </span>
        </div>
        <Slider
          value={[currentTime]}
          min={previewStartTime}
          max={previewEndTime}
          step={0.1}
          onValueChange={handleSeek}
          disabled={disabled || duration === 0 || !playableUrl || isLoadingUrl}
          className="cursor-pointer"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{formatTime(previewStartTime)}</span>
          <span>{formatTime(previewEndTime)}</span>
        </div>
      </div>

      {/* Play/Pause Control */}
      <div className="flex items-center justify-center">
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={togglePlay}
          disabled={disabled || duration === 0 || !playableUrl || isLoadingUrl}
          className="gap-2"
        >
          {isPlaying ? (
            <>
              <Pause className="h-5 w-5" />
              Pause Preview
            </>
          ) : (
            <>
              <Play className="h-5 w-5" />
              Play Preview
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Select a 30-second segment from your {sourceType} file. This will be used as the preview.
      </p>
    </Card>
  );
}

