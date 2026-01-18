import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Camera, Upload } from 'lucide-react';
import { currentUser } from '@/lib/mock-data';
import { useToast } from '@/hooks/use-toast';

export default function EditProfile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser.avatar || null);
  const [isUploading, setIsUploading] = useState(false);
  
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, etc.)',
        variant: 'destructive',
      });
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }
    
    // Simulate upload process
    setIsUploading(true);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarPreview(e.target?.result as string);
      setIsUploading(false);
      
      toast({
        title: 'Avatar updated',
        description: 'Your profile picture has been updated successfully',
      });
    };
    reader.readAsDataURL(file);
  };
  
  const handleSave = () => {
    // Get form values
    const name = (document.getElementById('name') as HTMLInputElement).value;
    const bio = (document.getElementById('bio') as HTMLTextAreaElement).value;
    const affiliation = (document.getElementById('affiliation') as HTMLInputElement).value;
    
    // Update user data (in a real app, this would call an API)
    console.log('Saving profile:', { name, bio, affiliation, avatar: avatarPreview });
    
    toast({
      title: 'Profile updated',
      description: 'Your profile has been saved successfully',
    });
    
    navigate(-1);
  };
  
  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold">Edit Profile</h1>
      </div>

      <div className="flex flex-col items-center">
        <div className="relative">
          <Avatar className="w-24 h-24">
            <AvatarImage src={avatarPreview || undefined} alt="User profile picture" />
            <AvatarFallback aria-label="User initials">DE</AvatarFallback>
          </Avatar>
          <Button
            size="icon"
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            aria-label={isUploading ? "Uploading avatar..." : "Change profile picture"}
          >
            {isUploading ? <Upload className="w-4 h-4 animate-pulse" /> : <Camera className="w-4 h-4" />}
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleAvatarUpload}
            disabled={isUploading}
            aria-label="Avatar upload"
            id="avatar-upload-input"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2" id="avatar-upload-hint">
          Click to upload avatar (max 5MB)
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            defaultValue={currentUser.name}
            aria-describedby="name-help"
            required
          />
          <p id="name-help" className="text-xs text-muted-foreground mt-1">
            Your full name as it appears on your account
          </p>
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            defaultValue={currentUser.email}
            disabled
            aria-describedby="email-help"
          />
          <p id="email-help" className="text-xs text-muted-foreground mt-1">
            Your email address cannot be changed here
          </p>
        </div>
        <div>
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            defaultValue={currentUser.bio}
            rows={3}
            aria-describedby="bio-help"
            maxLength={200}
          />
          <p id="bio-help" className="text-xs text-muted-foreground mt-1">
            Tell others about yourself (max 200 characters)
          </p>
        </div>
        <div>
          <Label htmlFor="affiliation">SOM Affiliation</Label>
          <Input
            id="affiliation"
            defaultValue={currentUser.affiliation}
            aria-describedby="affiliation-help"
          />
          <p id="affiliation-help" className="text-xs text-muted-foreground mt-1">
            Your SOM ministry or church affiliation
          </p>
        </div>
      </div>

      <Button className="w-full" onClick={handleSave}>
        Save Changes
      </Button>
    </div>
  );
}
