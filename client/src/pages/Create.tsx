import { Palette, Camera, Mic, Music } from "lucide-react";
import { clsx } from "clsx";

export default function Create() {
  const activities = [
    { icon: Palette, label: "Draw", color: "bg-purple-100 text-purple-600", desc: "Start a new drawing" },
    { icon: Camera, label: "Photo", color: "bg-blue-100 text-blue-600", desc: "Take a picture" },
    { icon: Mic, label: "Record", color: "bg-red-100 text-red-600", desc: "Tell a story" },
    { icon: Music, label: "Music", color: "bg-yellow-100 text-yellow-600", desc: "Make a song" },
  ];

  return (
    <div className="pb-32 px-4 md:px-8 max-w-5xl mx-auto pt-8">
      <header className="mb-12 text-center">
        <h1 className="font-display font-black text-4xl md:text-5xl text-slate-800 mb-4">
          Time to Create! 🎨
        </h1>
        <p className="text-xl text-slate-500 font-medium">
          What masterpiece will you make today?
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activities.map((act) => (
          <button 
            key={act.label}
            className="group relative bg-white rounded-[2rem] p-8 border-2 border-slate-100 shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-left overflow-hidden"
          >
            <div className={clsx(
              "w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-transform group-hover:rotate-12",
              act.color
            )}>
              <act.icon size={40} strokeWidth={2.5} />
            </div>
            
            <h3 className="font-display font-bold text-3xl text-slate-800 mb-2">
              {act.label}
            </h3>
            <p className="text-slate-400 font-bold text-lg">
              {act.desc}
            </p>
            
            {/* Decorative background blob */}
            <div className={clsx(
              "absolute -bottom-12 -right-12 w-48 h-48 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500",
              act.color.split(' ')[0]
            )} />
          </button>
        ))}
      </div>
    </div>
  );
}
