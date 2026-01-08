import { Link, useLocation } from "wouter";
import { Home, PenTool, Shield, Settings, User } from "lucide-react";
import { clsx } from "clsx";

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Home, label: "Home", color: "text-blue-500" },
    { href: "/create", icon: PenTool, label: "Create", color: "text-purple-500" },
    { href: "/parent", icon: Shield, label: "Parents", color: "text-orange-500" },
    { href: "/profile", icon: User, label: "Profile", color: "text-green-500" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 py-4 px-6 z-50 rounded-t-3xl shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {navItems.map((item) => {
          const isActive = location === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} className="flex flex-col items-center gap-1 group w-16">
              <div className={clsx(
                "p-3 rounded-2xl transition-all duration-300 btn-bounce",
                isActive 
                  ? "bg-slate-100 scale-110 shadow-sm" 
                  : "bg-transparent hover:bg-slate-50"
              )}>
                <Icon 
                  size={28} 
                  strokeWidth={2.5}
                  className={clsx(
                    "transition-colors duration-300",
                    isActive ? item.color : "text-slate-400 group-hover:text-slate-600"
                  )} 
                />
              </div>
              <span className={clsx(
                "text-xs font-bold font-display transition-colors",
                isActive ? "text-slate-800" : "text-slate-400"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-slate-100 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-400 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:rotate-12 transition-transform duration-300">
            <span className="font-display font-black text-xl">K</span>
          </div>
          <span className="font-display font-bold text-2xl text-slate-800 tracking-tight">
            Kid<span className="text-primary">Space</span>
          </span>
        </Link>
        
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center hover:bg-yellow-200 transition-colors">
            <span className="font-bold text-lg">Points</span>
          </button>
        </div>
      </div>
    </header>
  );
}
