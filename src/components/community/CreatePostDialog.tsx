import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Camera, Image as ImageIcon, Send } from 'lucide-react';
import { currentUser } from '@/lib/mock-data';
import { useToast } from '@/components/ui/use-toast';

export interface CreatePostDialogProps {
  onPostCreated: (content: string, image?: string) => void;
  children: React.ReactNode;
}

export default function CreatePostDialog({ onPostCreated, children }: CreatePostDialogProps) {
  const [content, setContent] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: 'Empty Post',
        description: 'Please enter some content before posting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    // Simulate API call
    setTimeout(() => {
      onPostCreated(content, image || undefined);
      setContent('');
      setImage(null);
      setIsSubmitting(false);
      setIsOpen(false);
      
      toast({
        title: 'Post Created',
        description: 'Your post has been shared with the community!',
      });
    }, 1000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Post</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium text-sm">
              {currentUser.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{currentUser.name}</p>
              <Textarea
                placeholder={`What's on your mind, ${currentUser.name.split(' ')[0]}?`}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[100px] mt-2"
                rows={4}
              />
            </div>
          </div>
          
          {image && (
            <div className="relative">
              <img
                src={image}
                alt="Preview"
                className="w-full h-40 object-cover rounded-lg"
              />
              <Button
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0"
                onClick={() => setImage(null)}
              >
                ×
              </Button>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Label htmlFor="image-upload" className="flex-1">
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button variant="outline" className="w-full gap-2">
                <ImageIcon className="w-4 h-4" />
                {image ? 'Change Image' : 'Add Image'}
              </Button>
            </Label>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
            className="w-full gap-2"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}