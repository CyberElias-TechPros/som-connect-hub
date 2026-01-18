import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, FileVideo, Eye, TrendingUp, Shield, UserCog, ChevronRight, Activity, BarChart2, PieChart, Calendar, AlertTriangle } from 'lucide-react';
import { adminStats } from '@/lib/mock-data';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { LineChart, Line, PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Legend } from 'recharts';

export default function AdminDashboard() {
  const userGrowthData = [
    { month: 'Jan', users: 105000 },
    { month: 'Feb', users: 112000 },
    { month: 'Mar', users: 118000 },
    { month: 'Apr', users: 122000 },
    { month: 'May', users: 125000 },
    { month: 'Jun', users: 128000 },
    { month: 'Jul', users: 130000 },
    { month: 'Aug', users: 132000 },
    { month: 'Sep', users: 135000 },
    { month: 'Oct', users: 138000 },
    { month: 'Nov', users: 142000 },
    { month: 'Dec', users: 145000 },
  ];

  const contentDistributionData = [
    { name: 'Conferences', value: 850 },
    { name: 'Workshops', value: 320 },
    { name: 'Podcasts', value: 450 },
    { name: 'Media Series', value: 280 },
    { name: 'Originals', value: 440 },
  ];

  const engagementData = [
    { week: 'Week 1', dau: 8200, views: 280000 },
    { week: 'Week 2', dau: 8500, views: 310000 },
    { week: 'Week 3', dau: 8800, views: 340000 },
    { week: 'Week 4', dau: 9100, views: 360000 },
  ];

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--info))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

  // Accessibility: Add keyboard navigation and focus management
  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" aria-label="Filter by this month">
            <Calendar className="w-4 h-4 mr-2" />
            This Month
          </Button>
          <Button variant="outline" size="sm" aria-label="Export dashboard data">
            <BarChart2 className="w-4 h-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{adminStats.totalUsers.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Total Users</p>
            <p className="text-xs text-success mt-1">↑ 12% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-success mb-2" />
            <p className="text-2xl font-bold">{adminStats.activeSubscribers.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Active Subscribers</p>
            <p className="text-xs text-success mt-1">↑ 8% conversion rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <FileVideo className="w-8 h-8 mx-auto text-accent mb-2" />
            <p className="text-2xl font-bold">{adminStats.totalContent.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Content Items</p>
            <p className="text-xs text-success mt-1">↑ 15% growth</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Eye className="w-8 h-8 mx-auto text-info mb-2" />
            <p className="text-2xl font-bold">{(adminStats.monthlyViews / 1000000).toFixed(1)}M</p>
            <p className="text-sm text-muted-foreground">Monthly Views</p>
            <p className="text-xs text-success mt-1">↑ 20% engagement</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ users: { label: 'Users', color: 'hsl(var(--primary))' } }}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="users" stroke="var(--color-users)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Content Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{
              conferences: { label: 'Conferences', color: 'hsl(var(--primary))' },
              workshops: { label: 'Workshops', color: 'hsl(var(--success))' },
              podcasts: { label: 'Podcasts', color: 'hsl(var(--info))' },
              mediaSeries: { label: 'Media Series', color: 'hsl(var(--warning))' },
              originals: { label: 'Originals', color: 'hsl(var(--destructive))' }
            }}>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPieChart>
                  <Pie data={contentDistributionData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" nameKey="name">
                    {contentDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Engagement Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{
            dau: { label: 'Daily Active Users', color: 'hsl(var(--success))' },
            views: { label: 'Content Views', color: 'hsl(var(--info))' }
          }}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="dau" stroke="var(--color-dau)" strokeWidth={2} />
                <Line type="monotone" dataKey="views" stroke="var(--color-views)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className={`hover:bg-muted/50 ${adminStats.pendingReviews > 0 ? 'border-destructive' : ''}`}>
          <CardContent className="p-6 flex items-center gap-4">
            <Shield className="w-10 h-10 text-primary" />
            <div className="flex-1">
              <h3 className="font-semibold">Moderation Queue</h3>
              <p className="text-sm text-muted-foreground">{adminStats.pendingReviews} pending reviews</p>
              {adminStats.pendingReviews > 0 && <p className="text-xs text-destructive mt-1">Requires immediate attention</p>}
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Link to="/admin/moderation" className="contents">
          <Card className="hover:bg-muted/50">
            <CardContent className="p-6 flex items-center gap-4">
              <UserCog className="w-10 h-10 text-primary" />
              <div className="flex-1">
                <h3 className="font-semibold">User Management</h3>
                <p className="text-sm text-muted-foreground">Manage roles & permissions</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" aria-label="View all users">
              <Users className="w-4 h-4 mr-2" />
              View All Users
            </Button>
            <Button variant="outline" className="w-full justify-start" aria-label="View content library">
              <FileVideo className="w-4 h-4 mr-2" />
              Content Library
            </Button>
            <Button variant="outline" className="w-full justify-start" aria-label="View moderation queue">
              <Shield className="w-4 h-4 mr-2" />
              Moderation Queue
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">API Status</span>
                <Badge variant="secondary">Operational</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Database</span>
                <Badge variant="secondary">Healthy</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Storage</span>
                <Badge variant="secondary">78% Used</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-xs">JD</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">John Doe</p>
                  <p className="text-xs text-muted-foreground">Uploaded new sermon</p>
                </div>
                <p className="text-xs text-muted-foreground">2 hrs ago</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center text-white text-xs">SA</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Sarah Adams</p>
                  <p className="text-xs text-muted-foreground">Updated profile</p>
                </div>
                <p className="text-xs text-muted-foreground">5 hrs ago</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-info rounded-full flex items-center justify-center text-white text-xs">PM</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Pastor Michael</p>
                  <p className="text-xs text-muted-foreground">Created new Q&A session</p>
                </div>
                <p className="text-xs text-muted-foreground">1 day ago</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
