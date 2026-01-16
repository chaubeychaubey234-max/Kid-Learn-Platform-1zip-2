import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KidsCard } from "@/components/kids-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Phone, Video, ArrowLeft, UserPlus, PhoneOff, VideoOff } from "lucide-react";

interface Friend {
  id: number;
  userId: number;
  friendId: number;
  friendUsername?: string;
  friendAvatar?: string;
}

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  createdAt: string;
}

interface CallState {
  active: boolean;
  type: "voice" | "video" | null;
  isOutgoing: boolean;
  remoteUserId: number | null;
  status: "idle" | "calling" | "ringing" | "connected";
}

export default function Chat() {
  const { user, getAuthHeader } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [callState, setCallState] = useState<CallState>({ active: false, type: null, isOutgoing: false, remoteUserId: null, status: "idle" });
  const [incomingCall, setIncomingCall] = useState<{ fromUserId: number; callType: "voice" | "video"; sdp: RTCSessionDescriptionInit } | null>(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState("");
  const [addingFriend, setAddingFriend] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteUserIdRef = useRef<number | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const ICE_SERVERS = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Free TURN servers from Open Relay Project
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
    {
      urls: "turn:openrelay.metered.ca:443?transport=tcp",
      username: "openrelayproject",
      credential: "openrelayproject",
    },
  ];

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingRequests();
      setupWebSocket();
    }
    return () => {
      ws?.close();
      cleanupCall();
    };
  }, [user]);

  const fetchPendingRequests = async () => {
    try {
      const response = await fetch(`/api/friends/requests/${user?.id}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      setPendingRequests(data);
    } catch (err) {
      console.error("Failed to fetch pending requests:", err);
    }
  };

  const sendFriendRequest = async () => {
    if (!friendUsername.trim() || !user) return;
    setAddingFriend(true);
    
    try {
      const userResponse = await fetch(`/api/users/search?username=${encodeURIComponent(friendUsername)}`, {
        headers: getAuthHeader(),
      });
      
      if (!userResponse.ok) {
        alert("User not found!");
        setAddingFriend(false);
        return;
      }
      
      const foundUser = await userResponse.json();
      
      if (foundUser.id === user.id) {
        alert("You can't add yourself as a friend!");
        setAddingFriend(false);
        return;
      }
      
      const response = await fetch("/api/friends/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          fromUserId: user.id,
          toUserId: foundUser.id,
        }),
      });

      if (response.ok) {
        alert("Friend request sent! Your parent needs to approve it.");
        setFriendUsername("");
        setShowAddFriend(false);
        fetchPendingRequests();
      } else {
        const error = await response.json();
        alert(error.message || "Failed to send request");
      }
    } catch (err) {
      console.error("Failed to send friend request:", err);
      alert("Failed to send friend request");
    }
    setAddingFriend(false);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const setupWebSocket = () => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "auth", userId: user?.id }));
    };

    socket.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "chat-message") {
        setMessages((prev) => [...prev, {
          id: Date.now(),
          senderId: data.senderId,
          receiverId: user!.id,
          content: data.content,
          createdAt: new Date().toISOString(),
        }]);
      }
      
      if (data.type === "call-offer") {
        setIncomingCall({ fromUserId: data.fromUserId, callType: data.callType, sdp: data.sdp });
      }
      
      if (data.type === "call-answer" && peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(data.sdp));
        setCallState(prev => ({ ...prev, status: "connected" }));
      }
      
      if (data.type === "ice-candidate" && peerConnectionRef.current) {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
      
      if (data.type === "call-end" || data.type === "call-reject") {
        cleanupCall();
        setIncomingCall(null);
      }
    };

    setWs(socket);
  };

  const fetchFriends = async () => {
    try {
      const response = await fetch(`/api/friends/${user?.id}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      setFriends(data);
    } catch (err) {
      console.error("Failed to fetch friends:", err);
    }
    setLoading(false);
  };

  const fetchMessages = async (friendId: number) => {
    try {
      const response = await fetch(`/api/messages/${user?.id}/${friendId}`, {
        headers: getAuthHeader(),
      });
      const data = await response.json();
      setMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages:", err);
    }
  };

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    const friendUserId = friend.userId === user?.id ? friend.friendId : friend.userId;
    fetchMessages(friendUserId);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend || !user) return;

    const friendUserId = selectedFriend.userId === user.id ? selectedFriend.friendId : selectedFriend.userId;

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: friendUserId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages((prev) => [...prev, message]);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "chat-message",
            receiverId: friendUserId,
            content: newMessage,
          }));
        }
        
        setNewMessage("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  const initializePeerConnection = (targetUserId: number) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    
    // Store target user ID in ref for immediate access in ICE candidate handler
    remoteUserIdRef.current = targetUserId;
    
    pc.onicecandidate = (event) => {
      if (event.candidate && ws && remoteUserIdRef.current) {
        console.log("Sending ICE candidate to:", remoteUserIdRef.current);
        ws.send(JSON.stringify({
          type: "ice-candidate",
          targetUserId: remoteUserIdRef.current,
          candidate: event.candidate,
        }));
      }
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed" || pc.iceConnectionState === "disconnected") {
        console.error("ICE connection failed or disconnected");
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log("Connection state:", pc.connectionState);
    };
    
    pc.ontrack = (event) => {
      console.log("Received remote track:", event.track.kind);
      
      // Create or get the remote stream
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream();
      }
      
      // Add the track to our remote stream
      remoteStreamRef.current.addTrack(event.track);
      
      // Attach to video element (handles both audio and video)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStreamRef.current;
        // Ensure video plays
        remoteVideoRef.current.play().catch(e => console.log("Video play error:", e));
      }
      
      // Also attach to audio element for voice calls
      if (remoteAudioRef.current && event.track.kind === "audio") {
        remoteAudioRef.current.srcObject = remoteStreamRef.current;
        remoteAudioRef.current.play().catch(e => console.log("Audio play error:", e));
      }
    };
    
    peerConnectionRef.current = pc;
    return pc;
  };

  const startCall = async (type: "voice" | "video") => {
    if (!selectedFriend || !user || !ws) return;
    
    const friendUserId = selectedFriend.userId === user.id ? selectedFriend.friendId : selectedFriend.userId;
    
    try {
      console.log("Starting", type, "call to user:", friendUserId);
      
      // Reset remote stream for new call
      remoteStreamRef.current = null;
      
      const constraints = {
        audio: true,
        video: type === "video",
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Got local stream with tracks:", stream.getTracks().map(t => t.kind));
      localStreamRef.current = stream;
      
      if (localVideoRef.current && type === "video") {
        localVideoRef.current.srcObject = stream;
      }
      
      const pc = initializePeerConnection(friendUserId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      setCallState({ active: true, type, isOutgoing: true, remoteUserId: friendUserId, status: "calling" });
      
      ws.send(JSON.stringify({
        type: "call-offer",
        targetUserId: friendUserId,
        callType: type,
        sdp: offer,
      }));
    } catch (err) {
      console.error("Failed to start call:", err);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  const acceptCall = async () => {
    if (!incomingCall || !ws) return;
    
    try {
      console.log("Accepting", incomingCall.callType, "call from user:", incomingCall.fromUserId);
      
      // Reset remote stream for new call
      remoteStreamRef.current = null;
      
      const constraints = {
        audio: true,
        video: incomingCall.callType === "video",
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Got local stream with tracks:", stream.getTracks().map(t => t.kind));
      localStreamRef.current = stream;
      
      if (localVideoRef.current && incomingCall.callType === "video") {
        localVideoRef.current.srcObject = stream;
      }
      
      const pc = initializePeerConnection(incomingCall.fromUserId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      
      // Must set remote description (the offer) before creating answer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      setCallState({ active: true, type: incomingCall.callType, isOutgoing: false, remoteUserId: incomingCall.fromUserId, status: "connected" });
      setIncomingCall(null);
      
      ws.send(JSON.stringify({
        type: "call-answer",
        targetUserId: incomingCall.fromUserId,
        sdp: answer,
      }));
    } catch (err) {
      console.error("Failed to accept call:", err);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  };

  const rejectCall = () => {
    if (!incomingCall || !ws) return;
    
    ws.send(JSON.stringify({
      type: "call-reject",
      targetUserId: incomingCall.fromUserId,
    }));
    
    setIncomingCall(null);
  };

  const endCall = () => {
    if (ws && callState.remoteUserId) {
      ws.send(JSON.stringify({
        type: "call-end",
        targetUserId: callState.remoteUserId,
      }));
    }
    cleanupCall();
  };

  const cleanupCall = () => {
    console.log("Cleaning up call...");
    
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach(track => track.stop());
      remoteStreamRef.current = null;
    }
    
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    
    remoteUserIdRef.current = null;
    setCallState({ active: false, type: null, isOutgoing: false, remoteUserId: null, status: "idle" });
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="h-screen flex relative">
      {incomingCall && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <KidsCard className="p-8 text-center space-y-6">
            <div className="animate-pulse">
              {incomingCall.callType === "video" ? (
                <Video className="w-16 h-16 mx-auto text-blue-500" />
              ) : (
                <Phone className="w-16 h-16 mx-auto text-green-500" />
              )}
            </div>
            <h2 className="text-2xl font-bold">Incoming {incomingCall.callType} call</h2>
            <p className="text-muted-foreground">From User #{incomingCall.fromUserId}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={acceptCall} className="bg-green-500 hover:bg-green-600">
                <Phone className="w-5 h-5 mr-2" /> Accept
              </Button>
              <Button onClick={rejectCall} variant="destructive">
                <PhoneOff className="w-5 h-5 mr-2" /> Reject
              </Button>
            </div>
          </KidsCard>
        </div>
      )}

      {callState.active && (
        <div className="fixed inset-0 bg-black z-40 flex flex-col">
          {/* Hidden audio element for voice calls */}
          <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
          
          {/* Hidden video elements - always present for stream attachment */}
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            style={{ display: callState.status === "connected" && callState.type === "video" ? 'block' : 'none' }}
            className="max-h-[70vh] max-w-full rounded-lg bg-gray-800 mx-auto"
          />
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ display: callState.status === "connected" && callState.type === "video" ? 'block' : 'none' }}
            className="absolute bottom-24 right-4 w-32 h-24 rounded-lg border-2 border-white"
          />
          
          <div className="flex-1 flex items-center justify-center gap-4 p-4">
            {callState.status === "calling" && (
              <div className="text-center text-white">
                {callState.type === "video" ? (
                  <Video className="w-24 h-24 mx-auto mb-4 animate-pulse text-blue-400" />
                ) : (
                  <Phone className="w-24 h-24 mx-auto mb-4 animate-pulse text-green-400" />
                )}
                <p className="text-2xl font-bold mb-2">Calling...</p>
                <p className="text-muted-foreground">Waiting for answer</p>
              </div>
            )}
            {callState.status === "connected" && callState.type === "voice" && (
              <div className="text-center text-white">
                <Phone className="w-24 h-24 mx-auto mb-4 text-green-400" />
                <p className="text-xl">Voice call connected</p>
              </div>
            )}
          </div>
          <div className="p-6 flex justify-center">
            <Button onClick={endCall} size="lg" className="bg-red-500 hover:bg-red-600 rounded-full w-16 h-16">
              <PhoneOff className="w-8 h-8" />
            </Button>
          </div>
        </div>
      )}

      {showAddFriend && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <KidsCard className="w-full max-w-md p-6 space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Add a Friend
            </h2>
            <p className="text-sm text-muted-foreground">
              Enter your friend's username. Your parent will need to approve the request.
            </p>
            <Input
              placeholder="Friend's username"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendFriendRequest()}
            />
            <div className="flex gap-2">
              <Button onClick={sendFriendRequest} disabled={addingFriend} className="flex-1">
                {addingFriend ? "Sending..." : "Send Request"}
              </Button>
              <Button variant="outline" onClick={() => setShowAddFriend(false)}>
                Cancel
              </Button>
            </div>
          </KidsCard>
        </div>
      )}

      <div className={`w-full md:w-80 border-r bg-white ${selectedFriend ? "hidden md:block" : ""}`}>
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-xl font-bold">Friends</h2>
          <Button size="sm" onClick={() => setShowAddFriend(true)}>
            <UserPlus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        
        {pendingRequests.length > 0 && (
          <div className="p-3 bg-yellow-50 border-b">
            <p className="text-sm text-yellow-700">
              {pendingRequests.length} pending request(s) - waiting for parent approval
            </p>
          </div>
        )}
        
        {friends.length === 0 ? (
          <div className="p-6 text-center">
            <UserPlus className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-muted-foreground">No friends yet!</p>
            <p className="text-sm text-muted-foreground mt-2">
              Tap "Add" to send a friend request.
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {friends.map((friend) => (
              <div
                key={friend.id}
                onClick={() => handleSelectFriend(friend)}
                className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-3"
              >
                <Avatar>
                  <AvatarImage src={friend.friendAvatar} />
                  <AvatarFallback>F</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">Friend #{friend.friendId}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFriend ? (
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b flex items-center gap-4 bg-white">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setSelectedFriend(null)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Avatar>
              <AvatarImage src={selectedFriend.friendAvatar} />
              <AvatarFallback>F</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">Friend #{selectedFriend.friendId}</p>
            </div>
            <Button variant="outline" size="icon" onClick={() => startCall("voice")}>
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => startCall("video")}>
              <Video className="w-5 h-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                    message.senderId === user?.id
                      ? "bg-blue-500 text-white"
                      : "bg-white border"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t bg-white flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
            <Button onClick={sendMessage}>
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircleIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-xl text-muted-foreground">Select a friend to start chatting</p>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageCircleIcon(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
  );
}
