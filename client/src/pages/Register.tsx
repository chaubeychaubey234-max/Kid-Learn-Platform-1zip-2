import { KidsCard } from "@/components/kids-card";
import { KidsButton } from "@/components/kids-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";

export default function Register() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <KidsCard className="w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-primary w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-primary">Join KidSpace</h1>
          <p className="text-muted-foreground">Start your learning journey today!</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Your Name" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="explorer@kidspace.com" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">I am a...</Label>
            <Select>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="child">Child</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <KidsButton className="w-full text-lg py-6">
            Create Account
          </KidsButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-bold hover:underline">
            Login here
          </Link>
        </p>
      </KidsCard>
    </div>
  );
}
