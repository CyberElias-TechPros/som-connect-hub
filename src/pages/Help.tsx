import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, MessageCircle, Mail, Sparkles, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { faqItems } from '@/lib/mock-data';
import { motion } from 'framer-motion';

export default function Help() {
  const [q, setQ] = useState('');
  const filtered = faqItems.filter(f=> f.question.toLowerCase().includes(q.toLowerCase()) || f.answer.toLowerCase().includes(q.toLowerCase()) || f.category.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-8 max-w-[800px] mx-auto">
      <div>
        <div className="flex items-center gap-2 mb-3"><span className="px-2.5 py-1 rounded-full bg-foreground text-background font-mono text-[10px] tracking-[0.15em] uppercase">Help center</span><span className="font-mono text-[10px] tracking-[0.1em] uppercase text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" /> We’re here</span></div>
        <h1 className="font-display text-[2.2rem] md:text-[3rem] leading-[0.9] tracking-[-0.03em]">How can we <span className="italic font-[300] text-muted-foreground">help?</span></h1>
      </div>

      <div className="relative max-w-[560px]">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search FAQs, e.g. subscription, download…" value={q} onChange={e=>setQ(e.target.value)} className="h-12 pl-11 rounded-full bg-card border-border/60" />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <Link to="/qa" className="group">
          <Card className="rounded-[1.25rem] border-border/50 bg-card p-5 flex gap-3 hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
            <div className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div>
            <div className="flex-1"><div className="font-[650] text-[14px]">Ask in a live Q&amp;A</div><div className="text-[12px] text-muted-foreground">Speakers answer live — join the next session</div></div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
          </Card>
        </Link>
        <a href="mailto:support@somconnect.com?subject=SOM%20CONNECT%20support" className="group">
          <Card className="rounded-[1.25rem] border-border/50 bg-card p-5 flex gap-3 hover:border-foreground/10 hover:shadow-[0_8px_24px_hsl(var(--foreground)/0.06)] transition-all">
            <div className="w-10 h-10 rounded-full bg-secondary border border-border/50 flex items-center justify-center"><Mail className="w-5 h-5" /></div>
            <div className="flex-1"><div className="font-[650] text-[14px]">Email us</div><div className="text-[12px] text-muted-foreground">support@somconnect.com</div></div>
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors mt-1" />
          </Card>
        </a>
      </div>

      <Card className="rounded-[1.5rem] border-border/50">
        <CardContent className="p-2">
          <Accordion type="single" collapsible className="w-full">
            {filtered.map((faq,i)=>(
              <AccordionItem key={i} value={`item-${i}`} className="border-border/50 px-4">
                <AccordionTrigger className="text-left font-[600] tracking-[-0.01em] text-[14px] hover:no-underline">
                  <span className="flex items-center gap-3"><span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] font-mono uppercase tracking-[0.05em]">{faq.category}</span>{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-[13px] leading-[1.6] text-muted-foreground pb-4">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {filtered.length===0 && (
        <div className="py-12 text-center space-y-4 rounded-[1.5rem] border border-dashed border-border/60 bg-secondary/20">
          <p className="text-muted-foreground text-[14px]">No FAQ matches "{q}" — try "subscription" or "download".</p>
          <Link to="/qa"><Button variant="outline" className="rounded-full font-[600] gap-1">Ask a speaker instead <ArrowUpRight className="w-4 h-4" /></Button></Link>
        </div>
      )}
    </div>
  );
}
