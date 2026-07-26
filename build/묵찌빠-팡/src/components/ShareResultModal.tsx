import React, { useState } from 'react';
import { Share2, Copy, Check, X, Trophy, MessageCircle, Twitter, Send } from 'lucide-react';
import { useGame } from '../context/GameContext';

interface ShareResultModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareResultModal: React.FC<ShareResultModalProps> = ({ isOpen, onClose }) => {
  const { user, activeMatch } = useGame();
  const [copied, setCopied] = useState(false);

  if (!isOpen || !activeMatch) return null;

  const isWin = activeMatch.matchWinner === 'player';
  const shareText = isWin
    ? `🏆 [가위바위보 챔피언십] ${user.nickname}님이 ${activeMatch.stakePoints.toLocaleString()}P 대전에서 승리했습니다! (${user.currentStreak}연승 중🔥)`
    : `⚡ [가위바위보 챔피언십] ${user.nickname}님의 실시간 1:1 명승부 하이라이트!`;

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText + ' https://rps-championship.app');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-scaleUp relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyan-400" />
            <h3 className="font-black text-sm text-white">대전 결과 공유하기</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Preview */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 border border-cyan-500/40 text-center space-y-2 shadow-inner">
          <div className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full text-[10px] font-black">
            <Trophy className="w-3 h-3 text-amber-400" />
            {isWin ? 'VICTORY' : 'DEFEAT'} CARD
          </div>

          <h4 className="text-base font-black text-white">
            {user.nickname} vs {activeMatch.opponent.nickname}
          </h4>

          <p className="text-xs text-amber-300 font-extrabold">
            {isWin ? `+${(activeMatch.stakePoints * 1.9).toLocaleString()}P 획득 (${user.currentStreak}연승)` : '아쉬운 패배'}
          </p>

          <p className="text-[10px] text-slate-400 font-mono">
            RPS CHAMPIONSHIP • 1:1 VERSUS MATCH
          </p>
        </div>

        {/* Share Buttons */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <MessageCircle className="w-5 h-5 text-yellow-400 mb-1" />
            <span className="text-[10px] font-bold text-slate-300">카카오톡</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Twitter className="w-5 h-5 text-cyan-400 mb-1" />
            <span className="text-[10px] font-bold text-slate-300">X (트위터)</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            <Send className="w-5 h-5 text-blue-400 mb-1" />
            <span className="text-[10px] font-bold text-slate-300">라인/밴드</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-5 h-5 text-emerald-400 mb-1" /> : <Copy className="w-5 h-5 text-slate-300 mb-1" />}
            <span className="text-[10px] font-bold text-slate-300">{copied ? '복사됨' : '링크복사'}</span>
          </button>
        </div>

        {/* Copy Text Input */}
        <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800 text-xs">
          <input
            type="text"
            readOnly
            value={shareText}
            className="bg-transparent text-slate-400 flex-1 outline-none text-[10px] truncate"
          />
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 bg-cyan-500 text-slate-950 font-black rounded-lg text-[10px] hover:bg-cyan-400"
          >
            {copied ? '복사됨' : '복사'}
          </button>
        </div>
      </div>
    </div>
  );
};
