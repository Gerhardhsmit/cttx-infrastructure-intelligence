import React from "react";
import { Button } from "@/components/ui/button";
import { CttxLogo } from "@/components/CttxLogo";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { MapPin, Zap, Shield, TrendingUp } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <CttxLogo height="h-9" />
            <span className="font-semibold text-sm text-muted-foreground tracking-wide hidden sm:block">
              Infrastructure Intelligence
            </span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button variant="outline" onClick={() => setLocation("/admin")}>
                Admin Dashboard
              </Button>
            ) : (
              <Button variant="outline" asChild>
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-card via-background to-background opacity-50" />
        <div className="container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Engineering-Grade <span className="text-accent">Infrastructure Intelligence</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Terrain-aware connectivity analysis for private reserves, farms, mining operations, and remote enterprises across South Africa.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                onClick={() => setLocation("/audit/new")}
              >
                <MapPin className="w-5 h-5 mr-2" />
                Start Site Audit
              </Button>
              <Button size="lg" variant="outline">
                Learn More
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 border-t border-border bg-card/30">
        <div className="container">
          <h2 className="text-3xl font-bold mb-12 text-center">Platform Capabilities</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Connectivity Intelligence Score</h3>
              <p className="text-muted-foreground">
                Comprehensive 0-100 scoring based on fibre proximity, signal quality, and backhaul type.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Terrain Complexity Analysis</h3>
              <p className="text-muted-foreground">
                Elevation profiles and obstruction mapping for accurate line-of-sight predictions.
              </p>
            </div>

            <div className="p-6 rounded-lg bg-card border border-border">
              <div className="w-12 h-12 bg-accent/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Resilience Scoring</h3>
              <p className="text-muted-foreground">
                Load-shedding survival analysis and redundancy recommendations for mission-critical operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-border">
        <div className="container max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Audit Your Infrastructure?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Drop a pin on your site, and our intelligence engine will analyze terrain, fibre availability, signal propagation, and resilience in seconds.
          </p>
          <Button
            size="lg"
            className="bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
            onClick={() => setLocation("/audit/new")}
          >
            <MapPin className="w-5 h-5 mr-2" />
            Start Your First Audit
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 py-8 mt-20">
        <div className="container text-center text-muted-foreground text-sm">
          <p>&copy; 2026 CTTX Services. Connecting to the Anything.</p>
        </div>
      </footer>
    </div>
  );
}
