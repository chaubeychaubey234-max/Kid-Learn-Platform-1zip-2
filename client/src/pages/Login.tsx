import { KidsCard } from "@/components/kids-card";
import { KidsButton } from "@/components/kids-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <KidsCard className="w-full max-w-md p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-primary w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="text-white w-6 h-6" />
          </div>
          <h1 className="text-3xl font-extrabold text-primary">Welcome Back!</h1>
          <p className="text-muted-foreground">Ready for more adventures?</p>
        </div>

        <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="explorer@kidspace.com" className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" className="rounded-xl" />
          </div>
          <KidsButton className="w-full text-lg py-6">
            Let's Go!
          </KidsButton>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/register" className="text-primary font-bold hover:underline">
            Join the Adventure
          </Link>
        </p>
      </KidsCard>
    </div>
  );
}
