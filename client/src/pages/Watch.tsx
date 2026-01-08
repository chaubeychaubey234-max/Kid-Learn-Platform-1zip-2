import { useRoute } from "wouter";
import { Play, SkipBack, SkipForward, Volume2, Maximize } from "lucide-react";

export default function Watch() {
  const [, params] = useRoute("/watch/:id");
  const id = params?.id;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-5xl bg-black rounded-3xl overflow-hidden shadow-2xl relative aspect-video group">
        
        {/* Placeholder Video Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
          <span className="text-slate-600 font-display text-2xl font-bold">Video Player Placeholder ID: {id}</span>
        </div>

        {/* Video Controls Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-8">
          
          {/* Top Bar */}
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-white font-display font-bold text-2xl">Drawing Cute Animals</h2>
              <p className="text-slate-300 text-sm font-medium">Episode 1 • Creativity</p>
            </div>
            <button className="bg-white/10 hover:bg-white/20 p-2 rounded-full text-white backdrop-blur-md transition">
              <Maximize size={24} />
            </button>
          </div>

          {/* Center Play Button */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <button className="w-20 h-20 bg-primary hover:bg-primary/90 text-white rounded-full flex items-center justify-center shadow-lg shadow-primary/30 transform transition hover:scale-110 pointer-events-auto btn-bounce">
              <Play fill="currentColor" size={32} className="ml-1" />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="w-full h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden group/progress">
              <div className="h-full w-1/3 bg-primary rounded-full relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg scale-0 group-hover/progress:scale-100 transition-transform" />
              </div>
            </div>

            <div className="flex items-center justify-between text-white">
              <div className="flex items-center gap-6">
                <button className="hover:text-primary transition"><SkipBack size={28} fill="currentColor" /></button>
                <button className="hover:text-primary transition"><Play size={28} fill="currentColor" /></button>
                <button className="hover:text-primary transition"><SkipForward size={28} fill="currentColor" /></button>
                <div className="flex items-center gap-2 ml-4">
                  <Volume2 size={20} />
                  <div className="w-20 h-1 bg-white/30 rounded-full">
                    <div className="w-2/3 h-full bg-white rounded-full" />
                  </div>
                </div>
              </div>
              <span className="font-mono font-bold text-sm">04:20 / 12:45</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-white/50 text-sm font-bold tracking-wider uppercase">
        Press ESC to exit
      </div>
    </div>
  );
}
