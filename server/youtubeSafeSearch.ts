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

  return data.items
    .filter((item: any) => {
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
      thumbnailUrl: item.snippet.thumbnails.medium.url,
      channelTitle: item.snippet.channelTitle,
    }));
}
