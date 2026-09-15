import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Users, ChevronRight, Plus, Sparkles, ArrowUpRight, Image as ImageIcon } from 'lucide-react';
import { communityPosts, groups as mockGroups, currentUser } from '@/lib/mock-data';
import { communityService } from '@/services/community-service';
import { useApiData } from '@/hooks/use-api-data';
import { useAuth } from '@/contexts/AuthContext';
import CreatePostDialog from '@/components/community/CreatePostDialog';
import { motion } from 'framer-motion';

export default function Community() {
  const { user } = useAuth();
  const author = user ?? currentUser;
  const viewer = author;
  const [posts, setPosts] = useState(communityPosts);
  const [joinedGroups, setJoinedGroups] = useState<string[]>(mockGroups.filter(g=>g.isJoined).map(g=>g.id));

  // Live community feed + groups from the Worker.
  const { data: livePosts, refresh: refreshPosts } = useApiData(
    async () => {
      const items = await communityService.getPosts(30, 0);
      return items.length ? items : communityPosts;
    },
    communityPosts,
    [],
    { pollMs: 30000 },
  );
  const { data: groups } = useApiData(
    async () => {
      const items = await communityService.getGroups();
      return items.length ? items : mockGroups;
    },
    mockGroups,
    [],
  );

  useEffect(() => { setPosts(livePosts); }, [livePosts]);
  useEffect(() => {
    setJoinedGroups(groups.filter(g => g.isJoined).map(g => g.id));
  }, [groups]);

  const handlePostCreated = async (content: string, image?: string) => {
    const optimistic = {
      id: `local-${Date.now()}`,
      author,
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      image,
    };
    setPosts(prev => [optimistic, ...prev]);
    try {
      // POST /community/posts — then refresh so the real id/author land.
      const created = await communityService.createPost(content, image);
      if (created?.id) refreshPosts();
    } catch {
      /* offline: the optimistic post stays visible */
    }
  };

  const handleLike = async (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: p.likes + 1, isLiked: true } : p));
    await communityService.likePost(postId).catch(() => undefined);
  };

  const toggleJoin = async (id: string) => {
    const joining = !joinedGroups.includes(id);
    setJoinedGroups(prev => (joining ? [...prev, id] : prev.filter(g=>g!==id)));
    await communityService.joinGroup(id).catch(() => undefined);
  };

  return (
    <div className="space-y-8 max-w-[1000px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Community</span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> Global family • {posts.length} posts</span>
          </div>
          <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Believers, <span className="italic font-[300] text-muted-foreground">together.</span></h1>
        </div>
        <Link to="/qa"><Button variant="outline" className="rounded-full h-10 px-5 font-[600] gap-1">Q&A Sessions <ChevronRight className="w-4 h-4" /></Button></Link>
      </div>

      <Tabs defaultValue="feed" className="w-full">
        <TabsList className="h-auto p-1.5 rounded-full bg-secondary/70 border border-border/50 w-fit">
          <TabsTrigger value="feed" className="rounded-full px-5 py-2 text-[13px] font-[600] data-[state=active]:bg-foreground data-[state=active]:text-background">Feed</TabsTrigger>
          <TabsTrigger value="groups" className="rounded-full px-5 py-2 text-[13px] font-[600] data-[state=active]:bg-foreground data-[state=active]:text-background">Groups • {groups.length}</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="space-y-5 mt-6">
          <div className="rounded-[1.5rem] border border-border/50 bg-card p-5 flex gap-4">
            <Avatar className="w-10 h-10"><AvatarImage src={author.avatar} /><AvatarFallback>{author.name[0]}</AvatarFallback></Avatar>
            <div className="flex-1">
              <CreatePostDialog onPostCreated={handlePostCreated}>
                <button className="w-full text-left h-11 px-5 rounded-full bg-secondary border border-border/50 text-[14px] text-muted-foreground hover:bg-secondary/80 transition-colors">Share something with the community…</button>
              </CreatePostDialog>
              <div className="mt-3 flex gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-[11px] font-[600]"><ImageIcon className="w-3 h-3" /> Photo</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-[11px] font-[600]"><Users className="w-3 h-3" /> Tag people</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {posts.map((post,i)=>(
              <motion.div key={post.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }}>
                <Card className="rounded-[1.5rem] border-border/50 overflow-hidden hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10"><AvatarImage src={post.author.avatar} /><AvatarFallback>{post.author.name[0]}</AvatarFallback></Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2"><p className="font-[650] tracking-[-0.01em] text-[14px]">{post.author.name}</p><span className="px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-mono uppercase">{post.author.role}</span></div>
                        <p className="font-mono text-[11px] tracking-[0.05em] uppercase text-muted-foreground">{new Date(post.timestamp).toLocaleDateString()} • {new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                    <p className="text-[14px] leading-[1.6]">{post.content}</p>
                    {post.image && <img src={post.image} alt="" className="rounded-[1rem] w-full object-cover max-h-[420px]" />}
                    <div className="flex gap-2 pt-2 border-t border-border/50">
                      <button onClick={()=>handleLike(post.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-foreground hover:text-background text-[13px] font-[600] transition-colors"><Heart className="w-4 h-4" /> {post.likes}</button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary hover:bg-secondary/80 text-[13px] font-[600] transition-colors"><MessageCircle className="w-4 h-4" /> {post.comments}</button>
                      <button className="ml-auto px-3 py-1.5 rounded-full bg-secondary text-[12px] font-[600] flex items-center gap-1">Share <ArrowUpRight className="w-3 h-3" /></button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="grid md:grid-cols-2 gap-4 mt-6">
          {groups.map((group,i)=>(
            <motion.div key={group.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }}>
              <Card className="rounded-[1.5rem] border-border/50 overflow-hidden group hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
                <div className="h-28 bg-cover bg-center relative" style={{ backgroundImage: `url(${group.cover})` }}>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-4 flex items-center gap-2 text-white"><Users className="w-4 h-4" /><span className="font-mono text-[11px] uppercase tracking-[0.1em]">{group.memberCount.toLocaleString()} members</span></div>
                </div>
                <CardContent className="p-5">
                  <h3 className="font-[700] tracking-[-0.01em] text-[15px]">{group.name}</h3>
                  <p className="text-[13px] leading-[1.5] text-muted-foreground mt-1 line-clamp-2">{group.description}</p>
                  <div className="mt-4 flex gap-2">
                    <Button size="sm" className={`rounded-full h-9 px-5 font-[600] flex-1 ${joinedGroups.includes(group.id) ? 'bg-secondary text-foreground hover:bg-secondary/80' : 'bg-foreground text-background'}`} onClick={()=>toggleJoin(group.id)}>{joinedGroups.includes(group.id) ? 'Joined' : 'Join group'}</Button>
                    <Button size="sm" variant="outline" className="rounded-full h-9 w-9 p-0"><ArrowUpRight className="w-4 h-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
