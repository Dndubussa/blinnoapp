# 🎵 30-Second Preview Segment Implementation

## Overview

The audio/video preview system has been updated to:
1. **Limit previews to 30 seconds** - All previews are automatically limited to 30 seconds
2. **Allow sellers to choose preview segment** - Sellers can select which 30-second segment to use from their audio/video file
3. **Extract preview from source file** - Preview is generated from the original audio/video file, not a separate upload

---

## ✅ Implementation Status

### Completed

1. **PreviewSegmentSelector Component** ✅
   - Location: `src/components/seller/PreviewSegmentSelector.tsx`
   - Allows sellers to:
     - Select start time for 30-second preview
     - Preview the selected segment
     - Generate preview configuration

2. **AudioPreview Component Updates** ✅
   - Location: `src/components/product-detail/AudioPreview.tsx`
   - Now supports:
     - `previewStartTime` prop (default: 0)
     - `maxDuration` prop (default: 30 seconds)
     - Auto-pauses at 30 seconds
     - Constrains seeking to preview segment

3. **CategoryFields Integration** ✅
   - Location: `src/components/seller/CategoryFields.tsx`
   - Replaced separate preview file upload with PreviewSegmentSelector
   - Shows preview selector after audio/video upload

4. **ProductDetail Integration** ✅
   - Location: `src/pages/ProductDetail.tsx`
   - Passes `previewStartTime` to AudioPreview component

---

## 🎯 How It Works

### For Sellers (Upload Flow)

1. **Upload Audio/Video File**
   - Seller uploads full audio or video file
   - File is stored in Supabase Storage (`product-files` bucket)

2. **Configure Preview Segment**
   - After upload, PreviewSegmentSelector appears
   - Seller can:
     - Play the full file
     - Select start time for 30-second preview (0 to `duration - 30`)
     - Preview the selected segment
     - Generate preview configuration

3. **Preview Configuration Stored**
   - `previewStartTime`: Start time in seconds (stored in `attributes.previewStartTime`)
   - `previewFile`: URL to source file (same as `audioFile` or `videoFile`)
   - Preview is generated client-side by limiting playback

### For Buyers (Preview Experience)

1. **Product Detail Page**
   - AudioPreview component receives:
     - `previewUrl`: Source file URL
     - `previewStartTime`: Start time from attributes
     - `maxDuration`: 30 seconds

2. **Playback Behavior**
   - Audio starts at `previewStartTime`
   - Automatically pauses at `previewStartTime + 30 seconds`
   - Seeking is constrained to the 30-second segment
   - Progress bar shows time within preview segment (0:00 to 0:30)

---

## 📋 Data Structure

### Product Attributes

```typescript
{
  // Source files
  audioFile?: string;        // Full audio file URL
  videoFile?: string;        // Full video file URL
  
  // Preview configuration
  previewStartTime?: number; // Start time in seconds (0 to duration - 30)
  previewFile?: string;      // Preview file URL (currently same as source file)
}
```

### Example

```json
{
  "audioFile": "https://supabase.co/storage/v1/object/public/product-files/user123/song.mp3",
  "previewStartTime": 45.5,
  "previewFile": "https://supabase.co/storage/v1/object/public/product-files/user123/song.mp3"
}
```

---

## 🔧 Component API

### PreviewSegmentSelector

```typescript
interface PreviewSegmentSelectorProps {
  sourceFileUrl: string | null;      // URL to original audio/video
  sourceType: "audio" | "video";      // Type of source file
  previewStartTime: number;            // Current start time (0-30)
  onPreviewStartTimeChange: (time: number) => void;
  onPreviewGenerated?: (previewUrl: string) => void;
  disabled?: boolean;
}
```

### AudioPreview

```typescript
interface AudioPreviewProps {
  previewUrl: string;
  artist?: string;
  title?: string;
  previewStartTime?: number;  // NEW: Start time (default: 0)
  maxDuration?: number;       // NEW: Max duration (default: 30)
}
```

---

## 🚀 Future Enhancement: Server-Side Preview Extraction

### Current Implementation (Client-Side)

Currently, the preview is handled client-side:
- Source file is played
- Playback is limited to 30 seconds
- No actual file extraction

### Future Implementation (Server-Side)

An edge function can be created to extract the actual 30-second segment:

**Edge Function:** `supabase/functions/generate-preview/index.ts`

```typescript
// Pseudo-code for future implementation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const { sourceFileUrl, sourceType, startTime, duration } = await req.json();
  
  // Download source file
  // Extract segment using ffmpeg (requires Deno FFmpeg or external service)
  // Upload extracted preview to storage
  // Return preview URL
  
  return new Response(JSON.stringify({ previewUrl }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Benefits:**
- Smaller preview files (faster loading)
- Better user experience
- Reduced bandwidth

**Requirements:**
- FFmpeg available in edge function environment
- Or use external service (e.g., Cloudinary, AWS MediaConvert)

---

## 📝 Migration Notes

### Existing Products

Products with existing `previewFile` will continue to work:
- If `previewFile` exists and is different from `audioFile`, use `previewFile`
- If only `audioFile` exists, use it with `previewStartTime = 0`
- If `previewStartTime` is set, use it to limit playback

### Backward Compatibility

The system is backward compatible:
- Old products without `previewStartTime` default to start at 0:00
- Old products with separate `previewFile` still work
- New products use the segment selector

---

## 🐛 Known Limitations

1. **Client-Side Limitation**
   - Full file is downloaded (not just 30 seconds)
   - Bandwidth usage is not optimized
   - Solution: Implement server-side extraction

2. **Video Previews**
   - VideoPreview component needs similar updates
   - Currently only AudioPreview is updated

3. **Multiple Audio Sources**
   - If both `audioFile` and `videoFile` exist, preview uses audio
   - Consider adding option to choose which source to preview

---

## ✅ Testing Checklist

- [x] PreviewSegmentSelector displays after audio upload
- [x] PreviewSegmentSelector displays after video upload
- [x] Start time can be adjusted via slider
- [x] Preview playback is limited to 30 seconds
- [x] Seeking is constrained to preview segment
- [x] Auto-pause works at 30 seconds
- [x] ProductDetail passes previewStartTime correctly
- [ ] Edge function for actual file extraction (future)

---

## 📚 Related Files

- `src/components/seller/PreviewSegmentSelector.tsx` - Preview configuration UI
- `src/components/product-detail/AudioPreview.tsx` - Audio player with 30s limit
- `src/components/seller/CategoryFields.tsx` - Product upload form
- `src/pages/ProductDetail.tsx` - Product display page
- `src/pages/seller/Products.tsx` - Seller product management

---

**Last Updated:** January 2026  
**Status:** ✅ Client-Side Implementation Complete  
**Next Step:** Implement server-side preview extraction (optional)

