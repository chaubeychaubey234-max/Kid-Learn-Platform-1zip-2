import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KidsCard } from "@/components/kids-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Play } from "lucide-react";

interface Video {
  id: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  description?: string;
}

const categories = [
  { name: "Drawing", query: "drawing for kids", emoji: "🎨" },
  { name: "Learning", query: "educational videos for kids", emoji: "📚" },
  { name: "Science", query: "science experiments for kids", emoji: "🔬" },
  { name: "Fun", query: "fun videos for kids", emoji: "🎉" },
  { name: "Music", query: "kids songs", emoji: "🎵" },
  { name: "Stories", query: "kids stories", emoji: "📖" },
];

export default function Explore() {
  const { getAuthHeader } = useAuth();
  const [videos, setVideos] = useState<Video[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);

  const fetchVideos = async (query: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/explore/search?q=${encodeURIComponent(query)}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      setVideos(data);
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideos("kids educational videos");
  }, []);

  const handleSearch = () => {
    if (searchQuery.trim()) {
      fetchVideos(searchQuery);
    }
  };

  const handleCategoryClick = (query: string, name: string) => {
    setSelectedCategory(name);
    fetchVideos(query);
  };

  const handleVideoWatch = async (video: Video) => {
    setSelectedVideo(video);
    // Award points for watching video
    try {
      await fetch("/api/gamification/video-watched", {
        method: "POST",
        headers: getAuthHeader(),
      });
    } catch (err) {
      console.log("Points not awarded:", err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">
          Explore Videos
        </h1>
        <p className="text-muted-foreground">Discover fun and educational videos!</p>
      </div>

      <div className="flex gap-2 max-w-xl mx-auto">
        <Input
          placeholder="Search for videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          className="text-lg"
        />
        <Button onClick={handleSearch} size="lg">
          <Search className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        {categories.map((cat) => (
          <Button
            key={cat.name}
            variant={selectedCategory === cat.name ? "default" : "outline"}
            onClick={() => handleCategoryClick(cat.query, cat.name)}
            className="text-lg"
          >
            {cat.emoji} {cat.name}
          </Button>
        ))}
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-4 max-w-4xl w-full">
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="mt-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">{selectedVideo.title}</h3>
                <p className="text-muted-foreground">{selectedVideo.channelTitle}</p>
              </div>
              <Button onClick={() => setSelectedVideo(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading videos...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <KidsCard
              key={video.id}
              className="cursor-pointer hover:scale-105 transition-transform overflow-hidden"
              onClick={() => handleVideoWatch(video)}
            >
              <div className="relative">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full aspect-video object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
                  <div className="bg-white/90 rounded-full p-4">
                    <Play className="w-8 h-8 text-blue-500" />
                  </div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold line-clamp-2">{video.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{video.channelTitle}</p>
              </div>
            </KidsCard>
          ))}
        </div>
      )}

      {!loading && videos.length === 0 && (
        <div className="text-center py-12">
          <p className="text-xl text-muted-foreground">No videos found. Try a different search!</p>
        </div>
      )}
    </div>
  );
}
