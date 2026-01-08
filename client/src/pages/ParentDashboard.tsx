import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { Shield, Clock, BookOpen, PenTool, MessageCircle, Lock, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { clsx } from "clsx";

export default function ParentDashboard() {
  const kidId = 1; // In real app, this would come from auth context
  const { data: settings, isLoading } = useSettings(kidId);
  const updateSettings = useUpdateSettings();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    dailyTimeLimitMinutes: 60,
    allowStories: true,
    allowLearning: true,
    allowCreativity: true,
    allowMessaging: true,
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        dailyTimeLimitMinutes: settings.dailyTimeLimitMinutes ?? 60,
        allowStories: settings.allowStories ?? true,
        allowLearning: settings.allowLearning ?? true,
        allowCreativity: settings.allowCreativity ?? true,
        allowMessaging: settings.allowMessaging ?? true,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      { kidId, updates: formData },
      {
        onSuccess: () => {
          toast({
            title: "Settings Saved!",
            description: "Your parental controls have been updated.",
            className: "bg-green-50 border-green-200 text-green-800",
          });
        },
        onError: () => {
          toast({
            variant: "destructive",
            title: "Oops!",
            description: "Could not save settings. Please try again.",
          });
        },
      }
    );
  };

  const ToggleCard = ({ 
    icon: Icon, 
    label, 
    description, 
    checked, 
    onChange, 
    colorClass 
  }: { 
    icon: any, 
    label: string, 
    description: string, 
    checked: boolean, 
    onChange: (val: boolean) => void,
    colorClass: string
  }) => (
    <div className={clsx(
      "p-6 rounded-3xl border-2 transition-all duration-300 flex items-center justify-between group",
      checked ? "bg-white border-slate-100 shadow-lg" : "bg-slate-50 border-transparent opacity-75 grayscale-[0.5]"
    )}>
      <div className="flex items-center gap-4">
        <div className={clsx(
          "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110",
          checked ? colorClass : "bg-slate-300"
        )}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="font-display font-bold text-lg text-slate-800">{label}</h3>
          <p className="text-sm text-slate-400 font-medium">{description}</p>
        </div>
      </div>
      
      <button 
        onClick={() => onChange(!checked)}
        className={clsx(
          "w-14 h-8 rounded-full p-1 transition-colors duration-300 relative",
          checked ? "bg-green-500" : "bg-slate-300"
        )}
      >
        <div className={clsx(
          "w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300",
          checked ? "translate-x-6" : "translate-x-0"
        )} />
      </button>
    </div>
  );

  if (isLoading) return <div className="p-8 flex justify-center"><div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="pb-32 px-4 md:px-8 max-w-3xl mx-auto pt-8">
      
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl mb-4 shadow-sm">
          <Shield size={32} strokeWidth={2.5} />
        </div>
        <h1 className="font-display font-black text-3xl md:text-4xl text-slate-800 mb-2">
          Parent Dashboard
        </h1>
        <p className="text-slate-500 font-medium text-lg">
          Manage screen time and content access
        </p>
      </header>

      <div className="space-y-6">
        {/* Time Limits Section */}
        <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="text-blue-500" size={24} strokeWidth={2.5} />
            <h2 className="font-display font-bold text-xl text-slate-800">Daily Time Limit</h2>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[30, 60, 90, 120].map((mins) => {
              const isSelected = formData.dailyTimeLimitMinutes === mins;
              return (
                <button
                  key={mins}
                  onClick={() => setFormData({ ...formData, dailyTimeLimitMinutes: mins })}
                  className={clsx(
                    "py-3 px-4 rounded-xl font-bold border-2 transition-all btn-bounce",
                    isSelected 
                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-md" 
                      : "border-slate-100 bg-white text-slate-500 hover:border-blue-200"
                  )}
                >
                  {mins / 60 >= 1 ? `${mins / 60} hr` : `${mins} min`}
                </button>
              );
            })}
          </div>
        </section>

        {/* Content Toggles */}
        <div className="grid gap-4">
          <ToggleCard
            icon={BookOpen}
            label="Story Time"
            description="Allow story videos"
            checked={formData.allowStories}
            onChange={(val) => setFormData({...formData, allowStories: val})}
            colorClass="bg-purple-500"
          />
          <ToggleCard
            icon={FlaskConical}
            label="Learning"
            description="Allow educational content"
            checked={formData.allowLearning}
            onChange={(val) => setFormData({...formData, allowLearning: val})}
            colorClass="bg-blue-500"
          />
          <ToggleCard
            icon={PenTool}
            label="Creativity"
            description="Allow drawing & craft videos"
            checked={formData.allowCreativity}
            onChange={(val) => setFormData({...formData, allowCreativity: val})}
            colorClass="bg-orange-500"
          />
          <ToggleCard
            icon={MessageCircle}
            label="Messaging"
            description="Allow chat with friends"
            checked={formData.allowMessaging}
            onChange={(val) => setFormData({...formData, allowMessaging: val})}
            colorClass="bg-pink-500"
          />
        </div>

        {/* Save Button */}
        <div className="sticky bottom-24 z-10">
          <button 
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="w-full py-4 bg-slate-800 hover:bg-slate-900 text-white rounded-2xl font-display font-bold text-xl shadow-lg shadow-slate-400/30 flex items-center justify-center gap-2 btn-bounce disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateSettings.isPending ? (
              <>Saving...</>
            ) : (
              <>
                <Save size={20} />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Helper icon component
function FlaskConical(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16h10" />
    </svg>
  )
}
