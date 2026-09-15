import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Sparkles } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  useEffect(() => {
    console.error("404:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh opacity-20 pointer-events-none" />
      <div className="relative z-10 text-center max-w-[480px] space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary border border-border/50 font-mono text-[10px] tracking-[0.15em] uppercase"><Sparkles className="w-3 h-3" /> 404 • Not found</div>
        <h1 className="font-display text-[5rem] leading-[0.8] tracking-[-0.05em]">404</h1>
        <h2 className="font-display text-[1.8rem] leading-[0.9] tracking-[-0.02em]">This page wandered off.</h2>
        <p className="text-muted-foreground text-[14px] leading-[1.6]">The route "{location.pathname}" doesn’t exist. Let’s get you back — happy path always leads home.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/"><Button className="rounded-full bg-foreground text-background font-[600] gap-1"><ArrowLeft className="w-4 h-4" /> Return home</Button></Link>
          <Link to="/library"><Button variant="outline" className="rounded-full font-[600]">Browse library</Button></Link>
        </div>
      </div>
    </div>
  );
};
export default NotFound;
