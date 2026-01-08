import { useContent } from "@/hooks/use-content";
import { ContentCard } from "@/components/ContentCard";
import { useLocation } from "wouter";
import { Search, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const { data: content, isLoading } = useContent();
  const [, setLocation] = useLocation();

  // Mock data for initial render if no content
  const mockContent = content?.length ? content : [
    { id: 1, title: "Drawing Cute Animals", type: "creativity", thumbnailUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800&q=80", likes: 24, description: "Learn to draw!", videoUrl: "" },
    { id: 2, title: "Space Adventure Story", type: "story", thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80", likes: 156, description: "A story about space.", videoUrl: "" },
    { id: 3, title: "Volcano Experiment", type: "learning", thumbnailUrl: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800&q=80", likes: 89, description: "Boom!", videoUrl: "" },
    { id: 4, title: "Paper Crafts", type: "creativity", thumbnailUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800&q=80", likes: 45, description: "Make paper art.", videoUrl: "" },
  ];

  return (
    <div className="pb-32 px-4 md:px-8 max-w-7xl mx-auto space-y-8 pt-6">
      
      {/* Search Hero */}
      <section className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-primary to-blue-400 p-8 md:p-12 text-white shadow-xl shadow-blue-200">
        <div className="relative z-10 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-full px-4 py-1.5 mb-6 text-sm font-bold tracking-wide border border-white/30">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>New Adventures Daily!</span>
            </div>
            <h1 className="font-display font-black text-4xl md:text-5xl lg:text-6xl mb-6 leading-tight">
              What do you want to <br/>
              <span className="text-yellow-300 underline decoration-wavy decoration-4 underline-offset-4">explore</span> today?
            </h1>
          </motion.div>
          
          <div className="relative max-w-md group">
            <input 
              type="text" 
              placeholder="Search for dinosaurs, space, drawing..."
              className="w-full bg-white text-slate-800 placeholder:text-slate-400 font-bold rounded-2xl py-4 pl-12 pr-4 shadow-lg focus:outline-none focus:ring-4 focus:ring-white/30 transition-all text-lg"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6 group-focus-within:text-primary transition-colors" strokeWidth={3} />
          </div>
        </div>
        
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-yellow-300/20 rounded-full blur-2xl" />
      </section>

      {/* Categories */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span className="w-2 h-8 bg-secondary rounded-full block" />
            Trending Categories
          </h2>
        </div>
        
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
          {[
            { label: "Animals", color: "bg-green-100 text-green-700 border-green-200" },
            { label: "Space", color: "bg-purple-100 text-purple-700 border-purple-200" },
            { label: "Science", color: "bg-blue-100 text-blue-700 border-blue-200" },
            { label: "Drawing", color: "bg-pink-100 text-pink-700 border-pink-200" },
            { label: "Music", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
          ].map((cat) => (
            <button 
              key={cat.label}
              className={`flex-none px-6 py-3 rounded-2xl font-display font-bold text-lg border-2 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all btn-bounce snap-start ${cat.color}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* Content Grid */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <span className="w-2 h-8 bg-accent rounded-full block" />
            Made for You
          </h2>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="aspect-[4/3] bg-slate-100 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {mockContent.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
              >
                <ContentCard 
                  // @ts-ignore - types mismatch between schema and mock
                  content={item} 
                  onClick={() => setLocation(`/watch/${item.id}`)} 
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
