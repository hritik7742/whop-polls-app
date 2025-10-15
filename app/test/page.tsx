import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Settings } from 'lucide-react';

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Whop Polls App
          </h1>
          <p className="text-xl text-muted-foreground">
            Professional polls application with beautiful UI
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Experience View</CardTitle>
                  <CardDescription>
                    Users can view and vote on polls
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Beautiful poll cards with voting interface, real-time updates, and professional design.
              </p>
              <Link href="/experiences/test-experience">
                <Button className="w-full">
                  View Experience
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-card/50 backdrop-blur-sm hover:shadow-md transition-all duration-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Dashboard View</CardTitle>
                  <CardDescription>
                    Admins can create and manage polls
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Full poll management with creation dialog, statistics, and professional dashboard.
              </p>
              <Link href="/dashboard/test-company">
                <Button className="w-full">
                  View Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <h2 className="text-2xl font-semibold">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="p-4 rounded-lg bg-muted/30">
              <h3 className="font-medium text-foreground mb-2">Professional UI</h3>
              <p>Built with shadcn/ui, Tailwind CSS, and modern design principles</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <h3 className="font-medium text-foreground mb-2">Real-time Updates</h3>
              <p>Live vote counts and instant feedback with Supabase</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <h3 className="font-medium text-foreground mb-2">Full Featured</h3>
              <p>Create polls, vote, manage, and track engagement</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
