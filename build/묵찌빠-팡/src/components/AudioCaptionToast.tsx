import React from 'react';
import { Volume2 } from 'lucide-react';

interface AudioCaptionToastProps {
  caption: string | null;
}

export const AudioCaptionToast: React.FC<AudioCaptionToastProps> = ({ caption }) => {
  if (!caption) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-bounce pointer-events-none">
      <div className="bg-slate-900/95 text-amber-300 border-2 border-amber-400 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-black backdrop-blur-md">
        <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
        <span>{caption}</span>
      </div>
    </div>
  );
};
