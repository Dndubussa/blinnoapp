# 🎵 Audio Preview System - Technical Guide

## Overview

The Blinno marketplace includes a comprehensive audio preview system that allows users to preview music products before purchasing. The system uses the HTML5 `<audio>` element with React state management to provide a full-featured audio player.

---

## 🏗️ Architecture

### Components

The audio preview system consists of **two main components**:

1. **`AudioPreview`** - Full-featured audio player (used on product detail pages)
2. **`CompactAudioPreview`** - Minimal audio player (used in product cards/lists)

### File Structure

```
src/components/product-detail/
├── AudioPreview.tsx          # Full audio player component
└── CompactAudioPreview.tsx   # Compact audio player component
```

---

## 📋 Component Details

### 1. AudioPreview Component

**Location:** `src/components/product-detail/AudioPreview.tsx`

**Purpose:** Full-featured audio player with all controls

**Features:**
- ✅ Play/Pause functionality
- ✅ Progress bar with seeking
- ✅ Volume control with mute
- ✅ Time display (current/total)
- ✅ Artist and title display
- ✅ Auto-pause when track ends

**Props:**
```typescript
interface AudioPreviewProps {
  previewUrl: string;    // URL to the audio file
  artist?: string;       // Optional artist name
  title?: string;        // Optional track title
}
```

**State Management:**
```typescript
const [isPlaying, setIsPlaying] = useState(false);    // Playback state
const [currentTime, setCurrentTime] = useState(0);   // Current position
const [duration, setDuration] = useState(0);          // Total duration
const [volume, setVolume] = useState(1);             // Volume (0-1)
const [isMuted, setIsMuted] = useState(false);       // Mute state
```

**Key Functionality:**

#### Audio Element Setup
```typescript
const audioRef = useRef<HTMLAudioElement>(null);

// Audio element with metadata preloading
<audio ref={audioRef} src={previewUrl} preload="metadata" />
```

#### Event Listeners
```typescript
useEffect(() => {
  const audio = audioRef.current;
  if (!audio) return;

  // Update current time as audio plays
  const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
  
  // Get duration when metadata loads
  const handleLoadedMetadata = () => setDuration(audio.duration);
  
  // Reset play state when track ends
  const handleEnded = () => setIsPlaying(false);

  audio.addEventListener("timeupdate", handleTimeUpdate);
  audio.addEventListener("loadedmetadata", handleLoadedMetadata);
  audio.addEventListener("ended", handleEnded);

  // Cleanup
  return () => {
    audio.removeEventListener("timeupdate", handleTimeUpdate);
    audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    audio.removeEventListener("ended", handleEnded);
  };
}, []);
```

#### Play/Pause Control
```typescript
const togglePlay = () => {
  const audio = audioRef.current;
  if (!audio) return;

  if (isPlaying) {
    audio.pause();
  } else {
    audio.play();
  }
  setIsPlaying(!isPlaying);
};
```

#### Seeking (Scrubbing)
```typescript
const handleSeek = (value: number[]) => {
  const audio = audioRef.current;
  if (!audio) return;
  
  const newTime = value[0];
  audio.currentTime = newTime;  // Jump to new position
  setCurrentTime(newTime);
};
```

#### Volume Control
```typescript
const handleVolumeChange = (value: number[]) => {
  const audio = audioRef.current;
  if (!audio) return;
  
  const newVolume = value[0];
  audio.volume = newVolume;  // Set volume (0-1)
  setVolume(newVolume);
  setIsMuted(newVolume === 0);
};
```

#### Time Formatting
```typescript
const formatTime = (seconds: number) => {
  if (!seconds || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
// Example: 125.5 seconds → "2:05"
```

---

### 2. CompactAudioPreview Component

**Location:** `src/components/product-detail/CompactAudioPreview.tsx`

**Purpose:** Minimal audio player for compact spaces

**Features:**
- ✅ Play/Pause button only
- ✅ Duration display
- ✅ Artist/title display
- ✅ Auto-pause when track ends

**Props:**
```typescript
interface CompactAudioPreviewProps {
  previewUrl: string;
  artist?: string;
  title?: string;
  className?: string;  // Additional CSS classes
}
```

**Key Differences from AudioPreview:**
- No progress bar
- No volume control
- Smaller UI footprint
- Prevents event propagation (for use in clickable cards)

```typescript
const togglePlay = (e: React.MouseEvent) => {
  e.preventDefault();      // Prevent navigation
  e.stopPropagation();     // Stop event bubbling
  
  // ... play/pause logic
};
```

---

## 🔄 Integration with Product Detail Page

**Location:** `src/pages/ProductDetail.tsx`

### When Audio Preview is Shown

The audio preview appears when:
1. Product category is `"Music"`
2. Product has either `previewFile` or `audioFile` in attributes

```typescript
{(product.attributes?.previewFile || product.attributes?.audioFile) && 
 product.category === "Music" && (
  <div className="mt-8">
    <AudioPreview
      previewUrl={product.attributes.previewFile || product.attributes.audioFile}
      artist={product.attributes.artist}
      title={product.attributes.musicTitle || product.title}
    />
  </div>
)}
```

### Data Flow

```
Product Database
    ↓
Product Attributes
    ├─ previewFile (preview audio URL)
    ├─ audioFile (full audio URL - fallback)
    ├─ artist (artist name)
    └─ musicTitle (track title)
    ↓
AudioPreview Component
    ├─ HTML5 Audio Element
    ├─ React State Management
    └─ UI Controls
```

---

## 🎨 UI/UX Features

### AudioPreview UI Structure

```
┌─────────────────────────────────────┐
│      Audio Preview                  │
│   Artist - Title                    │
├─────────────────────────────────────┤
│  [━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━]  │
│  0:45                     3:22      │
├─────────────────────────────────────┤
│  [▶ Play Preview]  [🔊] [━━━━━━]  │
├─────────────────────────────────────┤
│  🎵 This is a preview. Purchase     │
│     to get the full track.          │
└─────────────────────────────────────┘
```

### Styling

- **Gradient Background:** Purple to blue gradient (light/dark mode support)
- **Card Layout:** Uses shadcn/ui Card component
- **Responsive:** Works on mobile and desktop
- **Accessible:** Proper button labels and ARIA attributes

---

## 🔧 Technical Implementation Details

### HTML5 Audio Element

```html
<audio 
  ref={audioRef} 
  src={previewUrl} 
  preload="metadata"
/>
```

**Attributes:**
- `ref`: React ref to access audio element programmatically
- `src`: URL to the audio file (from Supabase Storage)
- `preload="metadata"`: Load only metadata (duration, not full file)

### Event Handling

| Event | Purpose | Handler |
|-------|---------|---------|
| `timeupdate` | Fires during playback | Updates `currentTime` state |
| `loadedmetadata` | Fires when metadata loads | Sets `duration` state |
| `ended` | Fires when track finishes | Resets `isPlaying` to false |

### State Synchronization

The component maintains React state that syncs with the audio element:

```typescript
// State → Audio Element
audio.currentTime = newTime;    // Seeking
audio.volume = newVolume;        // Volume control
audio.play() / audio.pause();    // Playback control

// Audio Element → State
audio.addEventListener("timeupdate", () => {
  setCurrentTime(audio.currentTime);
});
```

---

## 📦 Data Requirements

### Product Attributes Schema

For audio preview to work, products need these attributes:

```typescript
{
  category: "Music",
  attributes: {
    previewFile?: string;      // URL to preview audio (Supabase Storage)
    audioFile?: string;        // Fallback: full audio file
    artist?: string;           // Artist name
    musicTitle?: string;       // Track title (falls back to product.title)
  }
}
```

### File Storage

Audio files are stored in **Supabase Storage**:
- Bucket: `product-files` (or similar)
- Access: Public URLs for preview files
- Format: MP3, WAV, OGG (browser-supported formats)

---

## 🚀 Usage Examples

### Full Audio Preview

```tsx
import { AudioPreview } from "@/components/product-detail/AudioPreview";

<AudioPreview
  previewUrl="https://supabase.co/storage/v1/object/public/product-files/preview.mp3"
  artist="Artist Name"
  title="Track Title"
/>
```

### Compact Audio Preview

```tsx
import { CompactAudioPreview } from "@/components/product-detail/CompactAudioPreview";

<CompactAudioPreview
  previewUrl="https://supabase.co/storage/v1/object/public/product-files/preview.mp3"
  artist="Artist Name"
  title="Track Title"
  className="my-custom-class"
/>
```

---

## ⚠️ Important Considerations

### Browser Compatibility

- **Modern browsers:** Full support (Chrome, Firefox, Safari, Edge)
- **Mobile browsers:** Works on iOS Safari and Android Chrome
- **Audio formats:** MP3 has widest support

### Performance

- **Preload strategy:** `preload="metadata"` loads only metadata, not full file
- **Memory management:** Event listeners are cleaned up on unmount
- **State updates:** `timeupdate` fires frequently; React handles efficiently

### User Experience

- **Preview limitation:** Shows message "This is a preview. Purchase to get the full track."
- **Auto-pause:** Track automatically pauses when it ends
- **Seeking:** Users can jump to any position in the track

---

## 🔍 Code Flow Diagram

```
User clicks Play
    ↓
togglePlay() called
    ↓
audio.play() executed
    ↓
HTML5 Audio starts playing
    ↓
timeupdate events fire
    ↓
currentTime state updates
    ↓
Progress bar updates
    ↓
User can seek/control volume
    ↓
Track ends → handleEnded() → isPlaying = false
```

---

## 🐛 Common Issues & Solutions

### Issue: Audio doesn't play
**Solution:** Check that `previewUrl` is a valid, accessible URL

### Issue: Duration shows as 0:00
**Solution:** Ensure audio file metadata is valid; check `loadedmetadata` event

### Issue: Seeking doesn't work
**Solution:** Verify `duration` is set before allowing seeking

### Issue: Multiple audio players playing simultaneously
**Solution:** Consider implementing a global audio manager to pause other players

---

## 📚 Related Components

- **VideoPreview:** Similar implementation for video files
- **ProductCard:** May use CompactAudioPreview
- **ProductDetail:** Main page that uses AudioPreview

---

## 🎯 Future Enhancements

Potential improvements:
- [ ] Waveform visualization
- [ ] Playback speed control
- [ ] Keyboard shortcuts (spacebar to play/pause)
- [ ] Global audio manager (pause others when one plays)
- [ ] Audio quality selector
- [ ] Download preview option

---

**Last Updated:** January 2026  
**Component Version:** 1.0  
**Status:** ✅ Production Ready

