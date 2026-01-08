import { KidsCard } from "@/components/kids-card";
import { Palette, BookOpen, FlaskConical, Calculator, Music, Gamepad2 } from "lucide-react";

const categories = [
  { title: "Drawing", icon: Palette, color: "text-pink-500", bg: "bg-pink-100" },
  { title: "Stories", icon: BookOpen, color: "text-blue-500", bg: "bg-blue-100" },
  { title: "Science", icon: FlaskConical, color: "text-green-500", bg: "bg-green-100" },
  { title: "Math", icon: Calculator, color: "text-orange-500", bg: "bg-orange-100" },
  { title: "Music", icon: Music, color: "text-purple-500", bg: "bg-purple-100" },
  { title: "Games", icon: Gamepad2, color: "text-yellow-500", bg: "bg-yellow-100" },
];

export default function Categories() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-12">
      <header className="space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight text-primary">
          All Categories
        </h1>
        <p className="text-lg text-muted-foreground">
          Explore all the wonderful things you can learn!
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map((cat) => (
          <KidsCard 
            key={cat.title}
            title={cat.title}
            className="group cursor-pointer p-6 flex flex-col items-center text-center space-y-4"
          >
            <div className={`w-20 h-20 rounded-full ${cat.bg} flex items-center justify-center transition-transform duration-300 group-hover:rotate-12`}>
              <cat.icon className={`w-10 h-10 ${cat.color}`} />
            </div>
          </KidsCard>
        ))}
      </section>
    </div>
  );
}
