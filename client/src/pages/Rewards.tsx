import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KidsCard } from "@/components/kids-card";
import { Progress } from "@/components/ui/progress";
import { Star, Trophy, Palette, Brain, Compass, Gift, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Badge {
  id: number;
  name: string;
  description: string;
  iconName: string;
  pointsRequired: number;
  color: string;
  unlocksFeature?: string;
}

interface DashboardData {
  points: {
    totalPoints: number;
    dailyVideosWatched: number;
    dailyChatbotQuestions: number;
  };
  earnedBadges: Badge[];
  allBadges: Badge[];
  nextBadge: Badge | null;
  progressToNext: number;
  recentHistory: { id: number; points: number; reason: string; createdAt: string }[];
}

const iconMap: { [key: string]: any } = {
  Star,
  Trophy,
  Palette,
  Brain,
  Compass,
};

export default function Rewards() {
  const { user, getAuthHeader } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationBadge, setCelebrationBadge] = useState<Badge | null>(null);
  const previousBadgeIds = useRef<number[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboard();
    }
  }, [user]);

  useEffect(() => {
    if (data?.earnedBadges && data.earnedBadges.length > 0) {
      const currentBadgeIds = data.earnedBadges.map(b => b.id);
      const newBadges = data.earnedBadges.filter(b => !previousBadgeIds.current.includes(b.id));
      
      if (previousBadgeIds.current.length > 0 && newBadges.length > 0) {
        triggerCelebration(newBadges[newBadges.length - 1]);
      }
      
      previousBadgeIds.current = currentBadgeIds;
    }
  }, [data?.earnedBadges]);

  const fetchDashboard = async () => {
    try {
      const response = await fetch(`/api/gamification/dashboard/${user?.id}`, {
        headers: getAuthHeader(),
      });
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (err) {
      console.error("Failed to fetch rewards:", err);
    }
    setLoading(false);
  };

  const triggerCelebration = (badge: Badge) => {
    setCelebrationBadge(badge);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 4000);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <p className="text-xl text-muted-foreground">Could not load your rewards. Please try again!</p>
      </div>
    );
  }

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Star;
    return IconComponent;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-yellow-50 via-orange-50 to-pink-50 p-6">
      {/* Celebration Popup */}
      <AnimatePresence>
        {showCelebration && celebrationBadge && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-md mx-4"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="text-6xl mb-4"
              >
                🎉
              </motion.div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500 mb-2">
                New Badge Unlocked!
              </h2>
              <div
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white mb-4"
                style={{ backgroundColor: celebrationBadge.color }}
              >
                {(() => {
                  const Icon = getIcon(celebrationBadge.iconName);
                  return <Icon className="w-12 h-12" />;
                })()}
              </div>
              <h3 className="text-2xl font-bold mb-2">{celebrationBadge.name}</h3>
              <p className="text-muted-foreground">{celebrationBadge.description}</p>
              <div className="flex justify-center gap-2 mt-4">
                <Sparkles className="w-6 h-6 text-yellow-500" />
                <Sparkles className="w-6 h-6 text-orange-500" />
                <Sparkles className="w-6 h-6 text-pink-500" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mb-4 shadow-lg"
        >
          <Trophy className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-orange-500 to-pink-500">
          My Rewards
        </h1>
        <p className="text-muted-foreground mt-2">Keep learning and earning!</p>
      </div>

      {/* Points Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <KidsCard className="p-6 mb-6 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-200">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
              <span className="text-5xl font-black text-yellow-600">{data.points.totalPoints}</span>
              <Star className="w-8 h-8 text-yellow-500 fill-yellow-500" />
            </div>
            <p className="text-lg font-medium text-yellow-700">Total Points</p>
          </div>

          {data.nextBadge && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Next badge: {data.nextBadge.name}</span>
                <span className="font-bold">{data.points.totalPoints}/{data.nextBadge.pointsRequired}</span>
              </div>
              <Progress value={data.progressToNext} className="h-4" />
              <p className="text-center text-sm mt-2 text-muted-foreground">
                Only {data.nextBadge.pointsRequired - data.points.totalPoints} points to go!
              </p>
            </div>
          )}
        </KidsCard>
      </motion.div>

      {/* Daily Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4 mb-6"
      >
        <KidsCard className="p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">{data.points.dailyVideosWatched || 0}</div>
          <p className="text-sm text-muted-foreground">Videos Today</p>
        </KidsCard>
        <KidsCard className="p-4 text-center">
          <div className="text-3xl font-bold text-purple-500">{data.points.dailyChatbotQuestions || 0}</div>
          <p className="text-sm text-muted-foreground">Questions Asked</p>
        </KidsCard>
      </motion.div>

      {/* Earned Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Gift className="w-6 h-6 text-pink-500" />
          My Badges
        </h2>
        
        {data.earnedBadges.length === 0 ? (
          <KidsCard className="p-8 text-center">
            <Star className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl font-medium text-muted-foreground">No badges yet!</p>
            <p className="text-sm text-muted-foreground mt-2">Watch videos and ask questions to earn points!</p>
          </KidsCard>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            {data.earnedBadges.map((badge, index) => {
              const Icon = getIcon(badge.iconName);
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <KidsCard className="p-4 text-center">
                    <div
                      className="w-16 h-16 mx-auto rounded-full flex items-center justify-center text-white mb-3 shadow-lg"
                      style={{ backgroundColor: badge.color }}
                    >
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-sm">{badge.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                  </KidsCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Locked Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-6 h-6 text-gray-400" />
          Badges to Unlock
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
          {data.allBadges
            .filter(b => !data.earnedBadges.find(e => e.id === b.id))
            .map((badge, index) => {
              const Icon = getIcon(badge.iconName);
              return (
                <motion.div
                  key={badge.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <KidsCard className="p-4 text-center opacity-60">
                    <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-gray-200 text-gray-400 mb-3">
                      <Icon className="w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-sm">{badge.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{badge.pointsRequired} points needed</p>
                  </KidsCard>
                </motion.div>
              );
            })}
        </div>
      </motion.div>

      {/* Recent Activity */}
      {data.recentHistory.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
          <KidsCard className="p-4">
            <div className="space-y-3">
              {data.recentHistory.map((item) => (
                <div key={item.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-sm">{item.reason}</span>
                  <span className="font-bold text-green-500">+{item.points}</span>
                </div>
              ))}
            </div>
          </KidsCard>
        </motion.div>
      )}
    </div>
  );
}
