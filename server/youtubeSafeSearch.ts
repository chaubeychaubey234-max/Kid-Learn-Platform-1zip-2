// server/youtubeSafeSearch.ts
import fetch from "node-fetch";

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!;

const ALLOWED_KEYWORDS = [
  "kids", "children", "learning", "education", "cartoon",
  "math for kids", "science for kids", "drawing for kids",
  "story for kids", "alphabet", "numbers", "nursery",
];

const BLOCKED_KEYWORDS = [
  "prank", "horror", "scary", "fight", "gun", "kill",
  "blood", "kiss", "dating", "boyfriend", "girlfriend",
  "challenge", "adult", "18+", "violence",
];

function containsBlockedWords(text: string) {
  const lower = text.toLowerCase();
  return BLOCKED_KEYWORDS.some(w => lower.includes(w));
}

function containsAllowedWords(text: string) {
  const lower = text.toLowerCase();
  return ALLOWED_KEYWORDS.some(w => lower.includes(w));
}

export async function searchYouTubeForKids(query: string, allowShorts: boolean) {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "20",
    safeSearch: "strict",
    videoEmbeddable: "true",
    // Request only videos that can be played outside YouTube (reduces embed errors like 153)
    videoSyndicated: "true",
    // category 27 (Education) helps focus results, but can be removed if too restrictive
    videoCategoryId: "27",
    relevanceLanguage: "en",
    key: YOUTUBE_API_KEY,
  });

  if (!allowShorts) {
    params.append("videoDuration", "medium");
  }

  const url = `https://www.googleapis.com/youtube/v3/search?${params.toString()}`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.items) return [];

  // Filter and normalize, ensuring embed-safe videos only.
  const items = data.items
    .filter((item: any) => {
      // Ensure we have a videoId and snippet
      if (!item.id || !item.id.videoId || !item.snippet) return false;

      const title = item.snippet.title || "";
      const desc = item.snippet.description || "";

      if (containsBlockedWords(title) || containsBlockedWords(desc)) {
        return false;
      }

      if (!containsAllowedWords(title) && !containsAllowedWords(desc)) {
        return false;
      }

      return true;
    })
    .map((item: any) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || "",
      channelTitle: item.snippet.channelTitle,
    }));

  // As a defensive measure, remove items with empty thumbnails or ids
  let filtered = items.filter((i: any) => i.id && i.thumbnailUrl);

  try {
    // Validate embeddability and duration via a single videos.list call to avoid
    // embed errors (e.g., YouTube Error 153 when a video disallows embedding).
    const ids = filtered.map((i: any) => i.id).join(',');
    if (ids) {
      const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=status,contentDetails&id=${ids}&key=${YOUTUBE_API_KEY}`;
      const detailsResp = await fetch(detailsUrl);
      const detailsJson = await detailsResp.json();
      const detailsMap = new Map<string, any>();
      (detailsJson.items || []).forEach((d: any) => detailsMap.set(d.id, d));

      const parseDuration = (iso: string) => {
        const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return 0;
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const seconds = parseInt(match[3] || '0', 10);
        return hours * 3600 + minutes * 60 + seconds;
      };

      filtered = filtered.filter((it: any) => {
        const det = detailsMap.get(it.id);
        if (!det) {
          console.warn(`YouTube details missing for video ${it.id}, excluding`);
          return false;
        }

        // Ensure embeddable and public
        if (det.status && det.status.embeddable === false) {
          console.warn(`Video ${it.id} not embeddable, excluding to avoid Error 153`);
          return false;
        }
        if (det.status && det.status.privacyStatus && det.status.privacyStatus !== 'public') {
          console.warn(`Video ${it.id} not public (privacyStatus=${det.status.privacyStatus}), excluding`);
          return false;
        }

        // Filter out shorts when allowShorts is false
        if (!allowShorts && det.contentDetails && det.contentDetails.duration) {
          const dur = parseDuration(det.contentDetails.duration);
          if (dur > 0 && dur < 60) {
            console.warn(`Video ${it.id} is short (${dur}s) and shorts are disabled; excluding`);
            return false;
          }
        }

        // Region restriction check — conservatively exclude if blocked in any region
        if (det.contentDetails && det.contentDetails.regionRestriction && det.contentDetails.regionRestriction.blocked) {
          console.warn(`Video ${it.id} has region restrictions, excluding`);
          return false;
        }

        return true;
      });
    }
  } catch (err) {
    console.error('Failed to validate YouTube videos:', err);
    // If validation fails, fall back to the earlier filtered list (best-effort)
  }

  return filtered;

}
