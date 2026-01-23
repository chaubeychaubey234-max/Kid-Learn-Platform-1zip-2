import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KidsCard } from "@/components/kids-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Phone, Video, ArrowLeft, UserPlus, PhoneOff, VideoOff, Paperclip, FileText, Image as ImageIcon, X } from "lucide-react";

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
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // ICE candidate queue for proper NAT traversal
  const pendingIceCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

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
          fileUrl: data.fileUrl,
          fileType: data.fileType,
          fileName: data.fileName,
          createdAt: new Date().toISOString(),
        }]);
      }
      
      if (data.type === "call-offer") {
        setIncomingCall({ fromUserId: data.fromUserId, callType: data.callType, sdp: data.sdp });
      }
      
      if (data.type === "call-answer" && peerConnectionRef.current) {
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        
        // Flush pending ICE candidates now that remote description is set
        for (const candidate of pendingIceCandidatesRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (err) {
            console.warn("Failed to add queued ICE candidate:", err);
          }
        }
        pendingIceCandidatesRef.current = [];
        
        console.log("Receivers after answer:", pc.getReceivers().map(r => r.track?.kind));
        setCallState(prev => ({ ...prev, status: "connected" }));
      }
      
      if (data.type === "ice-candidate" && peerConnectionRef.current) {
        const pc = peerConnectionRef.current;
        
        if (pc.remoteDescription) {
          // Remote description exists, add candidate immediately
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else {
          // Queue candidate until remote description is set
          console.log("Queuing ICE candidate until remote description is available");
          pendingIceCandidatesRef.current.push(data.candidate);
        }
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only PNG, JPG, JPEG, and PDF files are allowed.');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('File too large. Maximum size is 10MB.');
      return;
    }
    
    setSelectedFile(file);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setUploadPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setUploadPreview(null);
    }
  };
  
  const clearSelectedFile = () => {
    setSelectedFile(null);
    setUploadPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !selectedFriend || !user) return;

    const friendUserId = selectedFriend.userId === user.id ? selectedFriend.friendId : selectedFriend.userId;

    try {
      let fileUrl: string | undefined;
      let fileType: string | undefined;
      let fileName: string | undefined;
      
      if (selectedFile) {
        setIsUploading(true);
        
        const urlResponse = await fetch("/api/chat/upload-url", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
          },
          body: JSON.stringify({
            name: selectedFile.name,
            size: selectedFile.size,
            contentType: selectedFile.type,
          }),
        });
        
        if (!urlResponse.ok) {
          const error = await urlResponse.json();
          throw new Error(error.error || 'Failed to get upload URL');
        }
        
        const { uploadURL, objectPath } = await urlResponse.json();
        
        await fetch(uploadURL, {
          method: "PUT",
          body: selectedFile,
          headers: { "Content-Type": selectedFile.type },
        });
        
        fileUrl = objectPath;
        fileType = selectedFile.type;
        fileName = selectedFile.name;
        
        setIsUploading(false);
        clearSelectedFile();
      }

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          senderId: user.id,
          receiverId: friendUserId,
          content: newMessage || (fileName ? `Sent ${fileName}` : 'Sent a file'),
          fileUrl,
          fileType,
          fileName,
        }),
      });

      if (response.ok) {
        const message = await response.json();
        setMessages((prev) => [...prev, message]);
        
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: "chat-message",
            receiverId: friendUserId,
            content: newMessage || (fileName ? `Sent ${fileName}` : 'Sent a file'),
            fileUrl,
            fileType,
            fileName,
          }));
        }
        
        setNewMessage("");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
      setIsUploading(false);
      alert("Failed to send message. Please try again.");
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
    
    pc.onicegatheringstatechange = () => {
      console.log("ICE gathering:", pc.iceGatheringState);
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
      console.log("Remote streams count:", event.streams.length);
      console.log("Track enabled:", event.track.enabled, "readyState:", event.track.readyState);
      
      // Use the stream from the event directly - this is properly synchronized
      const remoteStream = event.streams[0];
      if (remoteStream) {
        remoteStreamRef.current = remoteStream;
        console.log("Remote stream tracks:", remoteStream.getTracks().map(t => `${t.kind}:${t.enabled}`));
        
        // Attach to video element (handles both audio and video)
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStream;
          remoteVideoRef.current.play().catch(e => console.log("Video play error:", e));
        }
        
        // Also attach to audio element for voice calls
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStream;
          remoteAudioRef.current.play().catch(e => console.log("Audio play error:", e));
        }
      } else {
        // Fallback: create stream manually if no streams in event
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = new MediaStream();
        }
        remoteStreamRef.current.addTrack(event.track);
        
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = remoteStreamRef.current;
          remoteVideoRef.current.play().catch(e => console.log("Video play error:", e));
        }
        if (remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remoteStreamRef.current;
          remoteAudioRef.current.play().catch(e => console.log("Audio play error:", e));
        }
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
      
      // Reset ICE candidate queue for new call
      pendingIceCandidatesRef.current = [];
      
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
      
      // Debug logs
      console.log("Local tracks:", stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      console.log("Senders:", pc.getSenders().map(s => s.track?.kind));
      
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
      
      // Reset ICE candidate queue for new call
      pendingIceCandidatesRef.current = [];
      
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
      
      // Debug logs
      console.log("Local tracks:", stream.getTracks().map(t => `${t.kind}:${t.enabled}`));
      console.log("Senders:", pc.getSenders().map(s => s.track?.kind));
      
      // Must set remote description (the offer) before creating answer
      await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.sdp));
      
      // Flush any ICE candidates that arrived before remote description
      for (const candidate of pendingIceCandidatesRef.current) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn("Failed to add queued ICE candidate:", err);
        }
      }
      pendingIceCandidatesRef.current = [];
      
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      // Debug after answer
      console.log("Receivers after answer:", pc.getReceivers().map(r => r.track?.kind));
      
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
    
    // Clear ICE candidate queue
    pendingIceCandidatesRef.current = [];
    
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
      {/* Hidden media elements - ALWAYS in DOM for ref availability */}
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      <video 
        ref={remoteVideoRef} 
        autoPlay 
        playsInline 
        style={{ 
          display: callState.active && callState.status === "connected" && callState.type === "video" ? 'block' : 'none',
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          maxHeight: '70vh',
          maxWidth: '100%',
          zIndex: 41,
          borderRadius: '0.5rem',
          backgroundColor: '#1f2937'
        }}
      />
      <video 
        ref={localVideoRef} 
        autoPlay 
        playsInline 
        muted 
        style={{ 
          display: callState.active && callState.status === "connected" && callState.type === "video" ? 'block' : 'none',
          position: 'fixed',
          bottom: '6rem',
          right: '1rem',
          width: '8rem',
          height: '6rem',
          zIndex: 42,
          borderRadius: '0.5rem',
          border: '2px solid white'
        }}
      />
      
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
                  {message.fileUrl && message.fileType?.startsWith('image/') && (
                    <img 
                      src={message.fileUrl} 
                      alt={message.fileName || 'Shared image'} 
                      className="max-w-full rounded-lg mb-2 cursor-pointer"
                      onClick={() => window.open(message.fileUrl, '_blank')}
                    />
                  )}
                  {message.fileUrl && message.fileType === 'application/pdf' && (
                    <a 
                      href={message.fileUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 p-2 rounded-lg mb-2 ${
                        message.senderId === user?.id 
                          ? 'bg-blue-600 hover:bg-blue-700' 
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      <FileText className="w-5 h-5" />
                      <span className="text-sm underline">{message.fileName || 'View PDF'}</span>
                    </a>
                  )}
                  {message.content && !message.content.startsWith('Sent ') && message.content}
                  {message.content && message.content.startsWith('Sent ') && !message.fileUrl && message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {selectedFile && (
            <div className="p-3 border-t bg-gray-50 flex items-center gap-3">
              {uploadPreview ? (
                <img src={uploadPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={clearSelectedFile}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="p-4 border-t bg-white flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Paperclip className="w-5 h-5" />
            </Button>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && !isUploading && sendMessage()}
              disabled={isUploading}
            />
            <Button onClick={sendMessage} disabled={isUploading}>
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
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
