import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Shield, Clock, BookOpen, PenTool, MessageCircle, Save, UserPlus, Users, Check, X, Compass, Film, Bot, Trophy, Star, Video } from "lucide-react";
import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { KidsCard } from "@/components/kids-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";

interface Child {
  id: number;
  username: string;
  avatar?: string;
}

interface FriendRequest {
  id: number;
  fromUserId: number;
  toUserId: number;
  status: string;
  fromUsername?: string;
  toUsername?: string;
  sameParent?: boolean;
}

export default function ParentDashboard() {
  const { user, getAuthHeader } = useAuth();
  const { toast } = useToast();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [newChildUsername, setNewChildUsername] = useState("");
  const [newChildPassword, setNewChildPassword] = useState("");
  const [addingChild, setAddingChild] = useState(false);
  
  // Gamification state
  const [gamificationData, setGamificationData] = useState<any>(null);
  const [gamificationSettings, setGamificationSettings] = useState({
    pointsPerVideo: 5,
    pointsPerDailyLimit: 10,
    pointsPerChatbotQuestion: 2,
    pointsPerScreenTimeLimit: 10,
    dailyVideoLimit: 5,
    enableVideoPoints: true,
    enableChatbotPoints: true,
    enableScreenTimePoints: true,
    enableBadges: true,
  });
  const [savingGamification, setSavingGamification] = useState(false);
  
  const { data: settings, isLoading: settingsLoading } = useSettings(selectedChildId || 0);
  const updateSettings = useUpdateSettings();
  
  const [formData, setFormData] = useState({
    dailyTimeLimitMinutes: 60,
    allowStories: true,
    allowLearning: true,
    allowCreativity: true,
    allowMessaging: true,
    allowExplore: true,
    allowShorts: true,
    allowChatbot: true,
  });

  useEffect(() => {
    if (user) {
      fetchChildren();
      fetchPendingRequests();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChildId) {
      fetchGamificationData();
    }
  }, [selectedChildId]);

  useEffect(() => {
    if (settings) {
      setFormData({
        dailyTimeLimitMinutes: settings.dailyTimeLimitMinutes ?? 60,
        allowStories: settings.allowStories ?? true,
        allowLearning: settings.allowLearning ?? true,
        allowCreativity: settings.allowCreativity ?? true,
        allowMessaging: settings.allowMessaging ?? true,
        allowExplore: settings.allowExplore ?? true,
        allowShorts: settings.allowShorts ?? true,
        allowChatbot: settings.allowChatbot ?? true,
      });
    }
  }, [settings]);

  const fetchChildren = async () => {
    try {
      const response = await fetch(`/api/children/${user?.id}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      setChildren(data);
      if (data.length > 0 && !selectedChildId) {
        setSelectedChildId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch children:", err);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`/api/friends/pending-approval/${user?.id}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      setPendingRequests(data);
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
    }
  };

  const fetchGamificationData = async () => {
    if (!selectedChildId) return;
    try {
      const [dashboardRes, settingsRes] = await Promise.all([
        fetch(`/api/gamification/dashboard/${selectedChildId}`, { headers: getAuthHeader() }),
        fetch(`/api/gamification/settings/${selectedChildId}`, { headers: getAuthHeader() })
      ]);
      const dashboard = await dashboardRes.json();
      const settings = await settingsRes.json();
      setGamificationData(dashboard);
      setGamificationSettings({
        pointsPerVideo: settings.pointsPerVideo ?? 5,
        pointsPerDailyLimit: settings.pointsPerDailyLimit ?? 10,
        pointsPerChatbotQuestion: settings.pointsPerChatbotQuestion ?? 2,
        pointsPerScreenTimeLimit: settings.pointsPerScreenTimeLimit ?? 10,
        dailyVideoLimit: settings.dailyVideoLimit ?? 5,
        enableVideoPoints: settings.enableVideoPoints ?? true,
        enableChatbotPoints: settings.enableChatbotPoints ?? true,
        enableScreenTimePoints: settings.enableScreenTimePoints ?? true,
        enableBadges: settings.enableBadges ?? true,
      });
    } catch (err) {
      console.error("Failed to fetch gamification data:", err);
    }
  };

  const saveGamificationSettings = async () => {
    if (!selectedChildId) return;
    setSavingGamification(true);
    try {
      await fetch(`/api/gamification/settings/${selectedChildId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(gamificationSettings),
      });
      toast({
        title: "Settings Saved!",
        description: "Reward settings have been updated.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not save settings.",
      });
    }
    setSavingGamification(false);
  };

  const addChild = async () => {
    if (!newChildUsername || !newChildPassword) return;
    setAddingChild(true);
    
    try {
      const response = await fetch("/api/children/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          parentId: user?.id,
          username: newChildUsername,
          password: newChildPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: "Child Added!",
          description: `${newChildUsername} has been added successfully.`,
        });
        setNewChildUsername("");
        setNewChildPassword("");
        fetchChildren();
      } else {
        const error = await response.json();
        throw new Error(error.message);
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Failed to add child",
        description: err.message,
      });
    }
    setAddingChild(false);
  };

  const approveFriendRequest = async (requestId: number) => {
    try {
      const response = await fetch(`/api/friends/approve/${requestId}`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      const data = await response.json();
      toast({ 
        title: data.status === "approved" ? "Friendship approved!" : "Approval recorded!",
        description: data.message 
      });
      fetchPendingRequests();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to approve request" });
    }
  };

  const rejectFriendRequest = async (requestId: number) => {
    try {
      await fetch(`/api/friends/reject/${requestId}`, {
        method: "POST",
        headers: getAuthHeader(),
      });
      toast({ title: "Friend request rejected" });
      fetchPendingRequests();
    } catch (err) {
      toast({ variant: "destructive", title: "Failed to reject request" });
    }
  };

  const handleSave = () => {
    if (!selectedChildId) return;
    
    updateSettings.mutate(
      { kidId: selectedChildId, updates: formData },
      {
        onSuccess: () => {
          toast({
            title: "Settings Saved!",
            description: "Parental controls have been updated.",
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
      "p-4 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group",
      checked ? "bg-white border-slate-100 shadow-lg" : "bg-slate-50 border-transparent opacity-75"
    )}>
      <div className="flex items-center gap-3">
        <div className={clsx(
          "w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-md transition-transform",
          checked ? colorClass : "bg-slate-300"
        )}>
          <Icon size={20} strokeWidth={2.5} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">{label}</h3>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
      </div>
      
      <button 
        onClick={() => onChange(!checked)}
        className={clsx(
          "w-12 h-7 rounded-full p-1 transition-colors duration-300 relative",
          checked ? "bg-green-500" : "bg-slate-300"
        )}
      >
        <div className={clsx(
          "w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300",
          checked ? "translate-x-5" : "translate-x-0"
        )} />
      </button>
    </div>
  );

  return (
    <div className="pb-32 px-4 md:px-8 max-w-4xl mx-auto pt-8">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 text-orange-600 rounded-3xl mb-4">
          <Shield size={32} strokeWidth={2.5} />
        </div>
        <h1 className="font-black text-3xl md:text-4xl text-slate-800 mb-2">
          Parent Dashboard
        </h1>
        <p className="text-slate-500 font-medium">
          Manage your children's accounts and permissions
        </p>
      </header>

      <Tabs defaultValue="children" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-lg mx-auto">
          <TabsTrigger value="children">Children</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="rewards">Rewards</TabsTrigger>
          <TabsTrigger value="friends">Friends</TabsTrigger>
        </TabsList>

        <TabsContent value="children" className="space-y-6">
          <KidsCard className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add New Child
            </h2>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label>Username</Label>
                <Input
                  value={newChildUsername}
                  onChange={(e) => setNewChildUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newChildPassword}
                  onChange={(e) => setNewChildPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addChild} disabled={addingChild} className="w-full">
                  {addingChild ? "Adding..." : "Add Child"}
                </Button>
              </div>
            </div>
          </KidsCard>

          <KidsCard className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Your Children ({children.length})
            </h2>
            {children.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No children added yet. Add your first child above!
              </p>
            ) : (
              <div className="grid gap-3">
                {children.map((child) => (
                  <div
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={clsx(
                      "p-4 rounded-xl flex items-center gap-4 cursor-pointer transition-all",
                      selectedChildId === child.id
                        ? "bg-primary/10 border-2 border-primary"
                        : "bg-gray-50 hover:bg-gray-100"
                    )}
                  >
                    <img
                      src={child.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${child.username}`}
                      alt={child.username}
                      className="w-12 h-12 rounded-full"
                    />
                    <div>
                      <p className="font-bold">{child.username}</p>
                      <p className="text-sm text-muted-foreground">Click to manage settings</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </KidsCard>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {!selectedChildId ? (
            <KidsCard className="p-8 text-center">
              <p className="text-muted-foreground">
                Please add a child first to manage their settings.
              </p>
            </KidsCard>
          ) : settingsLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <KidsCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Clock className="text-blue-500" size={24} />
                  <h2 className="font-bold text-xl">Daily Time Limit</h2>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[30, 60, 90, 120].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => setFormData({ ...formData, dailyTimeLimitMinutes: mins })}
                      className={clsx(
                        "py-3 rounded-xl font-bold border-2 transition-all",
                        formData.dailyTimeLimitMinutes === mins 
                          ? "border-blue-500 bg-blue-50 text-blue-700" 
                          : "border-slate-100 bg-white text-slate-500 hover:border-blue-200"
                      )}
                    >
                      {mins >= 60 ? `${mins / 60} hr` : `${mins} min`}
                    </button>
                  ))}
                </div>
              </KidsCard>

              <div className="grid gap-3">
                <ToggleCard icon={BookOpen} label="Story Time" description="Allow story videos" checked={formData.allowStories} onChange={(val) => setFormData({...formData, allowStories: val})} colorClass="bg-purple-500" />
                <ToggleCard icon={FlaskConical} label="Learning" description="Allow educational content" checked={formData.allowLearning} onChange={(val) => setFormData({...formData, allowLearning: val})} colorClass="bg-blue-500" />
                <ToggleCard icon={PenTool} label="Creativity" description="Allow drawing & craft videos" checked={formData.allowCreativity} onChange={(val) => setFormData({...formData, allowCreativity: val})} colorClass="bg-orange-500" />
                <ToggleCard icon={MessageCircle} label="Messaging" description="Allow chat with friends" checked={formData.allowMessaging} onChange={(val) => setFormData({...formData, allowMessaging: val})} colorClass="bg-pink-500" />
                <ToggleCard icon={Compass} label="Explore" description="Allow YouTube explore" checked={formData.allowExplore} onChange={(val) => setFormData({...formData, allowExplore: val})} colorClass="bg-green-500" />
                <ToggleCard icon={Film} label="Shorts" description="Allow short videos" checked={formData.allowShorts} onChange={(val) => setFormData({...formData, allowShorts: val})} colorClass="bg-red-500" />
                <ToggleCard icon={Bot} label="AI Buddy" description="Allow chatbot access" checked={formData.allowChatbot} onChange={(val) => setFormData({...formData, allowChatbot: val})} colorClass="bg-indigo-500" />
              </div>

              <Button onClick={handleSave} className="w-full py-6 text-lg" disabled={updateSettings.isPending}>
                <Save className="w-5 h-5 mr-2" />
                {updateSettings.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="rewards" className="space-y-6">
          {!selectedChildId ? (
            <KidsCard className="p-8 text-center">
              <Trophy className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-muted-foreground">
                Please select a child from the "Children" tab to manage their rewards.
              </p>
            </KidsCard>
          ) : (
            <>
              {/* Child Progress Overview */}
              {gamificationData && (
                <KidsCard className="p-6 bg-gradient-to-r from-yellow-50 to-orange-50">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-yellow-500 rounded-full flex items-center justify-center text-white">
                      <Star className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{children.find(c => c.id === selectedChildId)?.username}'s Progress</h2>
                      <p className="text-4xl font-black text-yellow-600">{gamificationData.points?.totalPoints || 0} points</p>
                    </div>
                  </div>
                  
                  {gamificationData.nextBadge && (
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Next badge: {gamificationData.nextBadge.name}</span>
                        <span>{gamificationData.progressToNext}%</span>
                      </div>
                      <Progress value={gamificationData.progressToNext} className="h-3" />
                    </div>
                  )}
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-xl">
                      <p className="text-2xl font-bold text-blue-500">{gamificationData.points?.dailyVideosWatched || 0}</p>
                      <p className="text-xs text-muted-foreground">Videos Today</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-xl">
                      <p className="text-2xl font-bold text-purple-500">{gamificationData.earnedBadges?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">Badges Earned</p>
                    </div>
                  </div>
                </KidsCard>
              )}

              {/* Point Settings */}
              <KidsCard className="p-6">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  Point Settings
                </h2>
                
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Points per Video</Label>
                      <Input
                        type="number"
                        min="0"
                        value={gamificationSettings.pointsPerVideo}
                        onChange={(e) => setGamificationSettings({...gamificationSettings, pointsPerVideo: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label>Daily Video Limit</Label>
                      <Input
                        type="number"
                        min="1"
                        value={gamificationSettings.dailyVideoLimit}
                        onChange={(e) => setGamificationSettings({...gamificationSettings, dailyVideoLimit: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Bonus for Daily Goal</Label>
                      <Input
                        type="number"
                        min="0"
                        value={gamificationSettings.pointsPerDailyLimit}
                        onChange={(e) => setGamificationSettings({...gamificationSettings, pointsPerDailyLimit: parseInt(e.target.value) || 0})}
                      />
                    </div>
                    <div>
                      <Label>Points per Chatbot Question</Label>
                      <Input
                        type="number"
                        min="0"
                        value={gamificationSettings.pointsPerChatbotQuestion}
                        onChange={(e) => setGamificationSettings({...gamificationSettings, pointsPerChatbotQuestion: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
              </KidsCard>

              {/* Enable/Disable Features */}
              <KidsCard className="p-6">
                <h2 className="text-xl font-bold mb-4">Enable/Disable Rewards</h2>
                <div className="grid gap-3">
                  <ToggleCard 
                    icon={Video} 
                    label="Video Points" 
                    description="Earn points for watching videos" 
                    checked={gamificationSettings.enableVideoPoints} 
                    onChange={(val) => setGamificationSettings({...gamificationSettings, enableVideoPoints: val})} 
                    colorClass="bg-blue-500" 
                  />
                  <ToggleCard 
                    icon={Bot} 
                    label="Chatbot Points" 
                    description="Earn points for asking questions" 
                    checked={gamificationSettings.enableChatbotPoints} 
                    onChange={(val) => setGamificationSettings({...gamificationSettings, enableChatbotPoints: val})} 
                    colorClass="bg-purple-500" 
                  />
                  <ToggleCard 
                    icon={Trophy} 
                    label="Badges" 
                    description="Enable badge unlocking system" 
                    checked={gamificationSettings.enableBadges} 
                    onChange={(val) => setGamificationSettings({...gamificationSettings, enableBadges: val})} 
                    colorClass="bg-yellow-500" 
                  />
                </div>
              </KidsCard>

              <Button onClick={saveGamificationSettings} className="w-full py-6 text-lg" disabled={savingGamification}>
                <Save className="w-5 h-5 mr-2" />
                {savingGamification ? "Saving..." : "Save Reward Settings"}
              </Button>
            </>
          )}
        </TabsContent>

        <TabsContent value="friends" className="space-y-6">
          <KidsCard className="p-6">
            <h2 className="text-xl font-bold mb-4">Friend Requests Needing Approval</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Children from the same family need one parent approval. Children from different families need approval from both parents.
            </p>
            {pendingRequests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No pending friend requests to approve.
              </p>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div key={request.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {request.fromUsername || `User ${request.fromUserId}`} 
                          <span className="text-muted-foreground mx-2">→</span> 
                          {request.toUsername || `User ${request.toUserId}`}
                        </p>
                        {request.sameParent && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Same Family</span>
                        )}
                        {!request.sameParent && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Different Families</span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {request.status === "pending" && !request.sameParent 
                          ? "Needs approval from both parents" 
                          : request.status === "pending_second_approval"
                          ? "Waiting for the other parent to approve"
                          : "Approve to allow these children to chat"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => approveFriendRequest(request.id)} className="bg-green-500 hover:bg-green-600">
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => rejectFriendRequest(request.id)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </KidsCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FlaskConical(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2" />
      <path d="M8.5 2h7" />
      <path d="M7 16h10" />
    </svg>
  );
}
