import React, { useState } from 'react';
import { Sparkles, Clock, Trophy, Ticket, Check, ArrowRight, X, PlayCircle } from 'lucide-react';
import { sound } from '../utils/audio';

interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onStartPractice?: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isOpen,
  onClose,
  onStartPractice,
}) => {
  const [step, setStep] = useState<number>(1);

  if (!isOpen) return null;

  const handleNext = () => {
    sound.playClick();
    if (step < 4) {
      setStep((prev) => prev + 1);
    } else {
      onClose();
      if (onStartPractice) onStartPractice();
    }
  };

  const handleSkip = () => {
    sound.playClick();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gradient-to-b from-slate-900 via-slate-950 to-indigo-950 border-2 border-cyan-400 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden text-slate-100">
        {/* Glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400 font-black text-xs">
              {step}/4
            </span>
            <span className="text-xs font-black text-slate-200">초보자 가이드 튜토리얼</span>
          </div>

          <button
            onClick={handleSkip}
            className="text-xs text-slate-400 hover:text-white font-bold flex items-center gap-1 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800"
          >
            <span>건너뛰기</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Contents */}
        <div className="py-6 min-h-[220px] flex flex-col items-center justify-center text-center">
          {step === 1 && (
            <div className="space-y-4 animate-scaleUp">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-cyan-500/10 border-2 border-cyan-400 flex items-center justify-center text-4xl shadow-xl shadow-cyan-500/20 animate-bounce">
                ✊✌️✋
              </div>
              <div>
                <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-1">
                  1단계: 수 선택
                </span>
                <h3 className="text-lg font-black text-white">가위·바위·보 중 하나를 선택하세요.</h3>
                <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
                  원하는 손 모양 버튼을 클릭하여 상대방과의 대결 수(Hand)를 결정합니다.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-scaleUp">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 border-2 border-amber-400 flex items-center justify-center text-4xl shadow-xl shadow-amber-500/20 animate-pulse">
                ⏱️
              </div>
              <div>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">
                  2단계: 자유로운 변경
                </span>
                <h3 className="text-lg font-black text-white">제한시간 안에는 언제든 변경할 수 있습니다.</h3>
                <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
                  카운트다운 타이머(5초)가 끝나기 직전까지 상대 심리를 파악하며 자유롭게 제출 손을 바꿀 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-scaleUp">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-purple-500/10 border-2 border-purple-400 flex items-center justify-center text-4xl shadow-xl shadow-purple-500/20 animate-bounce">
                💰
              </div>
              <div>
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-widest block mb-1">
                  3단계: 승리 보상
                </span>
                <h3 className="text-lg font-black text-white">승리하면 포인트를 획득합니다.</h3>
                <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
                  상대를 물리치면 배팅된 포인트의 최대 1.9배 수익 및 연승 경험치를 보유하게 됩니다.
                </p>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-scaleUp">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-4xl shadow-xl shadow-emerald-500/20 animate-pulse">
                🎫
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">
                  4단계: 전국 토너먼트
                </span>
                <h3 className="text-lg font-black text-white">티켓을 모아 토너먼트에 참가하세요.</h3>
                <p className="text-xs text-slate-300 mt-2 max-w-xs mx-auto leading-relaxed">
                  출석체크나 상점에서 모은 토너먼트 티켓으로 128강 실시간 전국 챔피언십에 도전하세요!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mb-5 border border-slate-800">
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-300"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              onClick={() => {
                sound.playClick();
                setStep((prev) => prev - 1);
              }}
              className="py-3 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300"
            >
              이전
            </button>
          )}

          <button
            onClick={handleNext}
            className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            {step < 4 ? (
              <>
                <span>다음 단계</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>튜토리얼 완료 (연습 게임 하기)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
