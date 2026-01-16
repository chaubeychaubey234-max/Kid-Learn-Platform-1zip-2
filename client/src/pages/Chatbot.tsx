import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { KidsCard } from "@/components/kids-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Bot, User, Sparkles, Paperclip, FileText, Image as ImageIcon, X } from "lucide-react";

interface ChatMessage {
  role: "user" | "bot";
  content: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
}

const suggestedQuestions = [
  "Tell me a fun fact!",
  "What's your favorite animal?",
  "Tell me a joke!",
  "How do rainbows form?",
  "What are stars made of?",
];

export default function Chatbot() {
  const { user, getAuthHeader } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "bot", content: "Hi there! I'm your friendly AI buddy! What would you like to talk about today? Ask me anything fun! You can also share pictures or PDFs with me and I'll help explain them!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input;
    if ((!text.trim() && !selectedFile) || loading || !user) return;

    let fileUrl: string | undefined;
    let fileType: string | undefined;
    let fileName: string | undefined;
    let fileBase64: string | undefined;
    
    if (selectedFile) {
      setIsUploading(true);
      
      try {
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
          throw new Error('Failed to get upload URL');
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
        
        if (selectedFile.type.startsWith('image/')) {
          const reader = new FileReader();
          fileBase64 = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(selectedFile);
          });
        }
        
        setIsUploading(false);
        clearSelectedFile();
      } catch (err) {
        console.error("File upload error:", err);
        setIsUploading(false);
        alert("Failed to upload file. Please try again.");
        return;
      }
    }

    const userMessage: ChatMessage = { 
      role: "user", 
      content: text || (fileName ? `[Shared: ${fileName}]` : ''),
      fileUrl,
      fileType,
      fileName,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chatbot/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          userId: user.id,
          message: text || (fileName ? `Please look at this ${fileType?.includes('pdf') ? 'PDF document' : 'image'} I shared and explain it to me in a fun, kid-friendly way!` : ''),
          fileUrl,
          fileType,
          fileName,
          fileBase64,
        }),
      });

      const data = await response.json();
      const botMessage: ChatMessage = { role: "bot", content: data.response };
      setMessages((prev) => [...prev, botMessage]);
      
      // Award points for asking chatbot a question
      try {
        await fetch("/api/gamification/chatbot-question", {
          method: "POST",
          headers: getAuthHeader(),
        });
      } catch (err) {
        console.log("Points not awarded:", err);
      }
    } catch (err) {
      console.error("Chatbot error:", err);
      setMessages((prev) => [...prev, { role: "bot", content: "Oops! Something went wrong. Let's try again!" }]);
    }

    setLoading(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-purple-100 to-blue-100">
      <div className="p-4 bg-white/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-full p-2">
            <Bot className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">AI Buddy</h1>
            <p className="text-sm text-muted-foreground">Your friendly chat friend!</p>
          </div>
          <Sparkles className="w-6 h-6 text-yellow-500 ml-auto animate-pulse" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div className={`rounded-full p-2 h-fit ${
              message.role === "user" 
                ? "bg-blue-500" 
                : "bg-gradient-to-r from-purple-500 to-blue-500"
            }`}>
              {message.role === "user" ? (
                <User className="w-5 h-5 text-white" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            <KidsCard className={`max-w-[80%] p-4 ${
              message.role === "user" 
                ? "bg-blue-500 text-white" 
                : "bg-white"
            }`}>
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
                    message.role === "user" 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : 'bg-purple-100 hover:bg-purple-200'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-sm underline">{message.fileName || 'View PDF'}</span>
                </a>
              )}
              <p className="text-lg">{message.content}</p>
            </KidsCard>
          </div>
        ))}
        
        {loading && (
          <div className="flex gap-3">
            <div className="rounded-full p-2 bg-gradient-to-r from-purple-500 to-blue-500">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <KidsCard className="p-4 bg-white">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </KidsCard>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {messages.length <= 2 && (
        <div className="px-4 pb-2">
          <p className="text-sm text-muted-foreground mb-2">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => sendMessage(question)}
                className="text-sm"
              >
                {question}
              </Button>
            ))}
          </div>
        </div>
      )}

      {selectedFile && (
        <div className="px-4 py-3 bg-white/90 border-t flex items-center gap-3 max-w-2xl mx-auto">
          {uploadPreview ? (
            <img src={uploadPreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg" />
          ) : (
            <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center">
              <FileText className="w-8 h-8 text-purple-500" />
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

      <div className="p-4 bg-white/80 backdrop-blur-sm border-t">
        <div className="flex gap-2 max-w-2xl mx-auto">
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
            disabled={loading || isUploading}
            className="shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </Button>
          <Input
            placeholder="Ask me anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && !isUploading && sendMessage()}
            disabled={loading || isUploading}
            className="text-lg"
          />
          <Button 
            onClick={() => sendMessage()} 
            disabled={loading || isUploading}
            className="bg-gradient-to-r from-purple-500 to-blue-500"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
