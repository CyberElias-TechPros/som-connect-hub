import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Users, ChevronRight, Plus } from 'lucide-react';
import { communityPosts, groups, currentUser } from '@/lib/mock-data';
import CreatePostDialog from '@/components/community/CreatePostDialog';

export default function Community() {
  const [posts, setPosts] = useState(communityPosts);

  const handlePostCreated = (content: string, image?: string) => {
    const newPost = {
      id: Date.now().toString(),
      author: currentUser,
      content,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: 0,
      image,
    };
    setPosts(prev => [newPost, ...prev]);
  };

  const handleLike = (postId: string) => {
    setPosts(prev =>
      prev.map(post =>
        post.id === postId ? { ...post, likes: post.likes + 1 } : post
      )
    );
  };

  return (<div className="space-y-6 p-4 md:p-0"><div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Community</h1><Link to="/qa"><Button variant="outline" size="sm">Q&A Sessions <ChevronRight className="w-4 h-4 ml-1" /></Button></Link></div><Tabs defaultValue="feed"><TabsList><TabsTrigger value="feed">Feed</TabsTrigger><TabsTrigger value="groups">Groups</TabsTrigger></TabsList><TabsContent value="feed" className="space-y-4 mt-4"><CreatePostDialog onPostCreated={handlePostCreated}><Button className="w-full gap-2"><Plus className="w-4 h-4" />Create Post</Button></CreatePostDialog>{posts.map(post => (<Card key={post.id}><CardContent className="p-4 space-y-3"><div className="flex items-center gap-3"><Avatar><AvatarImage src={post.author.avatar} /><AvatarFallback>{post.author.name[0]}</AvatarFallback></Avatar><div><p className="font-medium text-sm">{post.author.name}</p><p className="text-xs text-muted-foreground">{new Date(post.timestamp).toLocaleDateString()}</p></div></div><p className="text-sm">{post.content}</p>{post.image && <img src={post.image} alt="" className="rounded-lg w-full" />}<div className="flex gap-4 pt-2"><button onClick={() => handleLike(post.id)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><Heart className="w-4 h-4" />{post.likes}</button><button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><MessageCircle className="w-4 h-4" />{post.comments}</button></div></CardContent></Card>))}</TabsContent><TabsContent value="groups" className="space-y-4 mt-4">{groups.map(group => (<Card key={group.id} className="overflow-hidden"><div className="h-24 bg-cover bg-center" style={{backgroundImage: `url(${group.cover})`}} /><CardContent className="p-4"><h3 className="font-semibold">{group.name}</h3><p className="text-sm text-muted-foreground line-clamp-2">{group.description}</p><div className="flex items-center justify-between mt-3"><span className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="w-4 h-4" />{group.memberCount.toLocaleString()}</span><Button size="sm" variant={group.isJoined ? "secondary" : "default"}>{group.isJoined ? 'Joined' : 'Join'}</Button></div></CardContent></Card>))}</TabsContent></Tabs></div>); }
