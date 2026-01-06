import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import { getPreviewUrl } from "@/lib/previewUtils";

interface AudioPreviewProps {
  previewUrl: string;
  artist?: string;
  title?: string;
  previewStartTime?: number; // Start time in seconds (default: 0)
  maxDuration?: number; // Maximum preview duration in seconds (default: 30)
}

export function AudioPreview({ 
  previewUrl, 
  artist, 
  title,
  previewStartTime = 0,
  maxDuration = 30
}: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [accessiblePreviewUrl, setAccessiblePreviewUrl] = useState<string | null>(null);

  // Get accessible preview URL (handles private bucket signed URLs)
  useEffect(() => {
    getPreviewUrl(previewUrl).then((url) => {
      setAccessiblePreviewUrl(url);
    });
  }, [previewUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const time = audio.currentTime;
      setCurrentTime(time);
      
      // Auto-pause at max duration from preview start
      if (time >= previewStartTime + maxDuration) {
        audio.pause();
        setIsPlaying(false);
        audio.currentTime = previewStartTime; // Reset to preview start
      }
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      // Set initial position to preview start
      audio.currentTime = previewStartTime;
      setCurrentTime(previewStartTime);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = previewStartTime; // Reset to preview start
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [previewStartTime, maxDuration]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Ensure we start from preview start time
      if (audio.currentTime < previewStartTime || audio.currentTime > previewStartTime + maxDuration) {
        audio.currentTime = previewStartTime;
      }
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newTime = value[0];
    // Constrain seeking to preview segment
    const constrainedTime = Math.max(
      previewStartTime,
      Math.min(previewStartTime + maxDuration, newTime)
    );
    audio.currentTime = constrainedTime;
    setCurrentTime(constrainedTime);
  };

  const handleVolumeChange = (value: number[]) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = value[0];
    audio.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted) {
      audio.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!accessiblePreviewUrl) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
        <div className="text-center text-muted-foreground">Loading preview...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 border-purple-200 dark:border-purple-800">
      <audio ref={audioRef} src={accessiblePreviewUrl} preload="metadata" />
      
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <h3 className="font-semibold text-lg">Audio Preview</h3>
          {(artist || title) && (
            <p className="text-sm text-muted-foreground">
              {artist && <span className="font-medium">{artist}</span>}
              {artist && title && <span> - </span>}
              {title && <span>{title}</span>}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Slider
            value={[currentTime]}
            min={previewStartTime}
            max={Math.min(previewStartTime + maxDuration, duration || 100)}
            step={0.1}
            onValueChange={handleSeek}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(Math.max(0, currentTime - previewStartTime))}</span>
            <span>{formatTime(maxDuration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          {/* Play/Pause Button */}
          <Button
            variant="default"
            size="lg"
            onClick={togglePlay}
            className="flex-1 h-12"
          >
            {isPlaying ? (
              <>
                <Pause className="h-5 w-5 mr-2" />
                Pause Preview
              </>
            ) : (
              <>
                <Play className="h-5 w-5 mr-2" />
                Play Preview
              </>
            )}
          </Button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 w-32">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              className="shrink-0"
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="cursor-pointer"
            />
          </div>
        </div>

        {/* Info */}
        <p className="text-xs text-center text-muted-foreground">
          🎵 This is a preview. Purchase to get the full track.
        </p>
      </div>
    </Card>
  );
}
