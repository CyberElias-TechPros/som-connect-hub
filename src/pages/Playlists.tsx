import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Plus, List, Search, Sparkles, MoreHorizontal } from 'lucide-react';
import { playlists as mockPlaylists } from '@/lib/mock-data';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function Playlists() {
  const [playlists, setPlaylists] = useState(mockPlaylists);
  const [q, setQ] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [open, setOpen] = useState(false);

  const filtered = playlists.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  const create = () => {
    if (!newName.trim()) return;
    const pl = {
      id: Date.now().toString(),
      name: newName,
      description: newDesc || 'Curated collection',
      thumbnail: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&h=340&fit=crop',
      contentIds: [],
      createdDate: new Date().toISOString().split('T')[0],
      isPublic: false,
    };
    setPlaylists([pl, ...playlists]);
    setNewName(''); setNewDesc(''); setOpen(false);
  };

  return (
    <div className="space-y-8 max-w-[1100px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Playlists • {playlists.length}</span>
            <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><List className="w-3 h-3" /> Curated journeys</span>
          </div>
          <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">Your <span className="italic font-[300] text-muted-foreground">collections.</span></h1>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="rounded-full bg-foreground text-background font-[600] h-10 px-5 gap-1"><Plus className="w-4 h-4" /> New playlist</Button></DialogTrigger>
          <DialogContent className="rounded-[1.5rem]"><DialogHeader><DialogTitle className="font-display text-[1.4rem]">Create playlist</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="Playlist name" value={newName} onChange={e=>setNewName(e.target.value)} className="h-11 rounded-full" />
              <Textarea placeholder="Description (optional)" value={newDesc} onChange={e=>setNewDesc(e.target.value)} className="rounded-[1rem] min-h-[80px]" />
              <Button onClick={create} className="w-full rounded-full bg-foreground text-background h-11 font-[600]">Create playlist</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-[480px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search playlists…" value={q} onChange={e=>setQ(e.target.value)} className="h-11 pl-11 rounded-full bg-card border-border/60" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((pl,i)=>(
          <motion.div key={pl.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i*0.05 }}>
            <Card className="rounded-[1.5rem] border-border/50 overflow-hidden group hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
              <div className="aspect-[16/10] relative overflow-hidden bg-muted">
                <img src={pl.thumbnail} alt={pl.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur text-[10px] font-mono uppercase font-[700] text-black">{pl.contentIds.length} teachings</div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="w-12 h-12 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-xl"><Play className="w-5 h-5 fill-black text-black ml-0.5" /></div></div>
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-[700] tracking-[-0.01em] leading-[1.2]">{pl.name}</h3><p className="text-[12px] text-muted-foreground mt-1 line-clamp-1">{pl.description}</p></div>
                  <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>
                <div className="mt-3 font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground">Created {pl.createdDate} • {pl.isPublic ? 'Public' : 'Private'}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filtered.length===0 && (
        <div className="py-20 text-center rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/20">
          <p className="font-[600]">No playlists found</p>
          <p className="text-[13px] text-muted-foreground mt-1">Create your first playlist — happy path, always works.</p>
        </div>
      )}
    </div>
  );
}
