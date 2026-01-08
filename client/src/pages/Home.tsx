import { KidsCard } from "@/components/kids-card";
import { Palette, BookOpen, FlaskConical, Calculator, Music, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";

const categories = [
  { title: "Drawing", icon: Palette, color: "text-pink-500", bg: "bg-pink-100" },
  { title: "Stories", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-100" },
  { title: "Science", icon: FlaskConical, color: "text-green-500", bg: "bg-green-100" },
  { title: "Math", icon: Calculator, color: "text-orange-500", bg: "bg-orange-100" },
  { title: "Music", icon: Music, color: "text-purple-500", bg: "bg-purple-100" },
  { title: "Games", icon: Gamepad2, color: "text-yellow-500", bg: "bg-yellow-100" },
];

export default function Home() {
  return (
    <div className="pb-32 px-4 md:px-8 max-w-7xl mx-auto space-y-12 pt-6">
      <header className="space-y-4 text-center md:text-left">
        <motion.h1 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-5xl md:text-6xl font-extrabold tracking-tight text-primary"
        >
          Hello, Little Explorer!
        </motion.h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto md:mx-0">
          What amazing adventure shall we go on today? Pick a world to start learning!
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map((cat, idx) => (
          <motion.div
            key={cat.title}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
          >
            <KidsCard 
              className="group cursor-pointer p-8 flex flex-col items-center text-center space-y-6"
            >
              <div className={`w-24 h-24 rounded-full ${cat.bg} flex items-center justify-center transition-all duration-500 group-hover:rotate-12 group-hover:scale-110`}>
                <cat.icon className={`w-12 h-12 ${cat.color}`} />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold">{cat.title}</h3>
                <p className="text-muted-foreground">Tap to enter the world of {cat.title.toLowerCase()}!</p>
              </div>
            </KidsCard>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
