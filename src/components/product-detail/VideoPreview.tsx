import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface VideoPreviewProps {
  previewUrl: string;
  title?: string;
  thumbnail?: string;
}

export function VideoPreview({ previewUrl, title, thumbnail }: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      video.requestFullscreen();
    }
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-800">
      <div className="relative aspect-video bg-black">
        <video
          ref={videoRef}
          src={previewUrl}
          poster={thumbnail}
          className="w-full h-full cursor-pointer"
          onClick={handleVideoClick}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls={false}
          playsInline
        />

        {/* Play Overlay */}
        {!isPlaying && (
          <div
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
            onClick={togglePlay}
          >
            <div className="rounded-full bg-white/90 p-6 hover:bg-white transition-colors">
              <Play className="h-12 w-12 text-primary fill-current" />
            </div>
          </div>
        )}

        {/* Control Bar */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-white hover:bg-white/20"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 text-center">
        <h3 className="font-semibold text-lg mb-1">Video Preview</h3>
        {title && (
          <p className="text-sm text-muted-foreground mb-2">{title}</p>
        )}
        <p className="text-xs text-muted-foreground">
          🎬 This is a preview. Purchase for full access to the course.
        </p>
      </div>
    </Card>
  );
}
