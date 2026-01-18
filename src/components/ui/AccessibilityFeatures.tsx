import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Slider } from './slider';
import { Switch } from './switch';
import { Moon, Sun, Contrast, TextCursorInput, Type, Volume2, VolumeX } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function AccessibilityToolbar() {
  const { theme, toggleTheme } = useTheme();
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  const [dyslexiaFont, setDyslexiaFont] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);

  useEffect(() => {
    // Apply accessibility settings to document
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`);
    
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
    
    if (dyslexiaFont) {
      document.body.classList.add('dyslexia-font');
    } else {
      document.body.classList.remove('dyslexia-font');
    }
  }, [fontSize, highContrast, dyslexiaFont]);

  const toggleToolbar = () => {
    setShowToolbar(!showToolbar);
  };

  if (!showToolbar) {
    return (
      <Button
        onClick={toggleToolbar}
        className="fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full shadow-lg"
        aria-label="Open accessibility toolbar"
        title="Accessibility Options"
      >
        <span className="text-xl">♿</span>
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-background border rounded-lg shadow-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Accessibility Options</h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleToolbar}
          aria-label="Close accessibility toolbar"
        >
          ×
        </Button>
      </div>

      <div className="space-y-4">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4" />
            <span>Dark Mode</span>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={toggleTheme}
            aria-label="Toggle dark mode"
          />
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Contrast className="w-4 h-4" />
            <span>High Contrast</span>
          </div>
          <Switch
            checked={highContrast}
            onCheckedChange={setHighContrast}
            aria-label="Toggle high contrast mode"
          />
        </div>

        {/* Dyslexia Font */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <span>Dyslexia Font</span>
          </div>
          <Switch
            checked={dyslexiaFont}
            onCheckedChange={setDyslexiaFont}
            aria-label="Toggle dyslexia friendly font"
          />
        </div>

        {/* Font Size */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TextCursorInput className="w-4 h-4" />
            <span>Font Size: {fontSize}px</span>
          </div>
          <Slider
            value={[fontSize]}
            onValueChange={(value) => setFontSize(value[0])}
            min={12}
            max={24}
            step={1}
            aria-label="Adjust font size"
          />
        </div>

        {/* Mute Audio */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span>Mute Audio</span>
          </div>
          <Switch
            checked={muted}
            onCheckedChange={setMuted}
            aria-label="Toggle mute audio"
          />
        </div>

        {/* Reset Button */}
        <Button
          onClick={() => {
            setFontSize(16);
            setHighContrast(false);
            setDyslexiaFont(false);
            setMuted(false);
          }}
          className="w-full"
          variant="outline"
        >
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
}