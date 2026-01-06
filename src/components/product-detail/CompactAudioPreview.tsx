import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface CompactAudioPreviewProps {
  previewUrl: string;
  artist?: string;
  title?: string;
  className?: string;
}

export function CompactAudioPreview({
  previewUrl,
  artist,
  title,
  className = "",
}: CompactAudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <audio ref={audioRef} src={previewUrl} preload="metadata" />

      <Button
        variant="ghost"
        size="sm"
        onClick={togglePlay}
        className="h-8 w-8 p-0 rounded-full hover:bg-primary/20"
        title={isPlaying ? "Pause preview" : "Play preview"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </Button>

      <div className="flex flex-col text-xs">
        {(artist || title) && (
          <span className="font-medium line-clamp-1 text-foreground">
            {title || artist}
          </span>
        )}
        <span className="text-muted-foreground">{formatTime(duration)}</span>
      </div>
    </div>
  );
}
