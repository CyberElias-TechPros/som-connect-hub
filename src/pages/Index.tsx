import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Search, Play, Clock, TrendingUp, BookOpen, Users, MessageCircle, Library, Calendar, ChevronRight } from 'lucide-react';
import { featuredContent, conferences, podcasts, originals, dailyConfessions, rorReadings, currentUser } from '@/lib/mock-data';

export default function Index() {
  const [searchQuery, setSearchQuery] = useState('');

  // Mock continue watching - content with progress
  const continueWatching = featuredContent.filter(c => c.progress).slice(0, 4);

  // Mock trending content
  const trendingContent = [...conferences, ...podcasts, ...originals]
    .sort((a, b) => b.views - a.views)
    .slice(0, 6);

  // Mock recommendations
  const recommendations = [...podcasts, ...originals].slice(0, 6);

  const quickAccessCards = [
    {
      title: 'Library',
      description: 'Browse all content',
      icon: Library,
      href: '/library',
      color: 'bg-blue-500',
    },
    {
      title: 'Q&A Sessions',
      description: 'Join live sessions',
      icon: MessageCircle,
      href: '/qa-sessions',
      color: 'bg-green-500',
    },
    {
      title: 'Daily Tools',
      description: 'Confessions & ROR',
      icon: BookOpen,
      href: '/tools',
      color: 'bg-purple-500',
    },
    {
      title: 'Community',
      description: 'Connect with believers',
      icon: Users,
      href: '/community',
      color: 'bg-orange-500',
    },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // In real app, navigate to search page with query
    console.log('Searching for:', searchQuery);
  };

  return (
    <div className="space-y-8 p-4 md:p-0">
      {/* Search Bar */}
      <div className="max-w-2xl mx-auto">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search for teachings, speakers, topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3 text-lg"
          />
        </form>
      </div>

      {/* Featured Content Carousel */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Featured Content</h2>
        <Carousel className="w-full">
          <CarouselContent>
            {featuredContent.map((content) => (
              <CarouselItem key={content.id} className="md:basis-1/2 lg:basis-1/3">
                <Card className="overflow-hidden">
                  <div className="aspect-video relative">
                    <img
                      src={content.thumbnail}
                      alt={content.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <Button size="lg" className="gap-2">
                        <Play className="w-5 h-5" />
                        Watch Now
                      </Button>
                    </div>
                    {content.isPremium && (
                      <Badge className="absolute top-2 right-2">Premium</Badge>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold mb-2 line-clamp-2">{content.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={content.speaker.avatar} />
                        <AvatarFallback>{content.speaker.name[0]}</AvatarFallback>
                      </Avatar>
                      <span>{content.speaker.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {content.duration}
                      </span>
                      <span>{content.views.toLocaleString()} views</span>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>

      {/* Continue Watching */}
      {continueWatching.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Continue Watching</h2>
            <Link to="/library" className="text-primary hover:underline flex items-center gap-1">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {continueWatching.map((content) => (
              <Card key={content.id} className="overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={content.thumbnail}
                    alt={content.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                    <Progress value={content.progress} className="h-1" />
                  </div>
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <Button size="lg">
                      <Play className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold text-sm mb-1 line-clamp-2">{content.title}</h3>
                  <p className="text-xs text-muted-foreground">{content.speaker.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Daily Tools Preview */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Daily Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Confession */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold">Daily Confession</h3>
                  <p className="text-sm text-muted-foreground">{dailyConfessions[0].date}</p>
                </div>
              </div>
              <h4 className="font-medium mb-2">{dailyConfessions[0].title}</h4>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {dailyConfessions[0].content}
              </p>
              <Link to="/tools">
                <Button variant="outline" className="w-full">Read Full Confession</Button>
              </Link>
            </CardContent>
          </Card>

          {/* ROR Reading */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-secondary rounded-full flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">ROR Reading</h3>
                  <p className="text-sm text-muted-foreground">{rorReadings[0].date}</p>
                </div>
              </div>
              <h4 className="font-medium mb-2">{rorReadings[0].title}</h4>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                {rorReadings[0].content}
              </p>
              <Link to="/tools">
                <Button variant="outline" className="w-full">Read Full Study</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trending Content */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            Trending Now
          </h2>
          <Link to="/library" className="text-primary hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trendingContent.map((content) => (
            <Card key={content.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={content.thumbnail}
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="bg-black/60 text-white">
                    {content.category}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">{content.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{content.views.toLocaleString()} views</span>
                  <span>•</span>
                  <span>{content.speaker.name}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Personalized Recommendations */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Recommended for {currentUser.name.split(' ')[0]}</h2>
          <Link to="/library" className="text-primary hover:underline flex items-center gap-1">
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recommendations.map((content) => (
            <Card key={content.id} className="overflow-hidden">
              <div className="aspect-video relative">
                <img
                  src={content.thumbnail}
                  alt={content.title}
                  className="w-full h-full object-cover"
                />
                {content.isPremium && (
                  <Badge className="absolute top-2 right-2">Premium</Badge>
                )}
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 line-clamp-2">{content.title}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={content.speaker.avatar} />
                    <AvatarFallback>{content.speaker.name[0]}</AvatarFallback>
                  </Avatar>
                  <span>{content.speaker.name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{content.category}</span>
                  <span>{content.views.toLocaleString()} views</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Quick Access Cards */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickAccessCards.map((card) => (
            <Link key={card.title} to={card.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <div className={`w-12 h-12 ${card.color} rounded-full flex items-center justify-center mx-auto mb-3`}>
                    <card.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
