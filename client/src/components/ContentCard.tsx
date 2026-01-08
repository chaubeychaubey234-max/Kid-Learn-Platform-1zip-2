import { Play, Heart } from "lucide-react";
import { type Content } from "@shared/schema";
import { clsx } from "clsx";

interface ContentCardProps {
  content: Content;
  onClick: () => void;
}

export function ContentCard({ content, onClick }: ContentCardProps) {
  const typeColors = {
    story: "bg-purple-100 text-purple-600",
    learning: "bg-blue-100 text-blue-600",
    creativity: "bg-orange-100 text-orange-600",
  };

  const typeLabels = {
    story: "Story Time",
    learning: "Learn",
    creativity: "Create",
  };

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white rounded-3xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-slate-100"
    >
      {/* Thumbnail Area */}
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        <img 
          src={content.thumbnailUrl} 
          alt={content.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform duration-300">
            <Play fill="currentColor" className="w-6 h-6 text-primary ml-1" />
          </div>
        </div>

        {/* Type Badge */}
        <div className={clsx(
          "absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm bg-white/90",
          content.type === 'story' && "text-purple-600",
          content.type === 'learning' && "text-blue-600",
          content.type === 'creativity' && "text-orange-600",
        )}>
          {typeLabels[content.type as keyof typeof typeLabels]}
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4">
        <h3 className="font-display font-bold text-lg text-slate-800 leading-tight mb-2 line-clamp-2">
          {content.title}
        </h3>
        <div className="flex items-center justify-between text-slate-400 text-sm">
          <span className="font-medium">5 min</span>
          <div className="flex items-center gap-1 text-pink-400">
            <Heart size={14} fill="currentColor" />
            <span className="font-bold">{content.likes || 12}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
