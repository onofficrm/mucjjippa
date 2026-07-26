import React, { useState } from 'react';
import { GitBranch, Trophy, Tv, ArrowLeft, Search, Eye, Filter, Sparkles, UserCheck, Flame } from 'lucide-react';
import { useGame } from '../context/GameContext';
import { mockBracketData, ExpandedBracketNode } from '../data/mockData';
import { sound } from '../utils/audio';

export const TournamentBracketPage: React.FC = () => {
  const { navigateTo, goBack, setSpectatingMatch } = useGame();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<string>('all');

  const roundFilterOptions = [
    { key: 'all', label: '전체 대진표' },
    { key: '128', label: '128강' },
    { key: '64', label: '64강' },
    { key: '32', label: '32강' },
    { key: '16', label: '16강' },
    { key: '8', label: '8강' },
    { key: '4', label: '준결승(4강)' },
    { key: 'final', label: '🏆 결승전' },
  ];

  // Filter matches
  const filteredMatches = mockBracketData.filter((match) => {
    const matchesRound = selectedRoundFilter === 'all' || match.roundKey === selectedRoundFilter;
    const matchesQuery =
      searchQuery.trim() === '' ||
      match.player1.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.player2.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      match.roundName.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesRound && matchesQuery;
  });

  const handleSpectateMatch = (match: ExpandedBracketNode) => {
    sound.playClick();
    setSpectatingMatch({
      player1: match.player1.name,
      player2: match.player2.name,
      p1Avatar: match.player1.avatar,
      p2Avatar: match.player2.avatar,
      p1Choice: 'rock',
      p2Choice: 'scissors',
      p1Score: match.player1.score || 0,
      p2Score: match.player2.score || 0,
      status: match.roundName,
    });
    navigateTo('spectate');
  };

  return (
    <div className="space-y-5 pb-20 md:pb-8 max-w-4xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로가기
        </button>

        <button
          onClick={() => navigateTo('spectate')}
          className="text-xs font-black text-cyan-300 bg-cyan-950/90 border border-cyan-500/50 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 hover:bg-cyan-900 transition-all shadow-md animate-pulse"
        >
          <Tv className="w-3.5 h-3.5 text-cyan-400" />
          LIVE 중계 관전실
        </button>
      </div>

      {/* Title Card */}
      <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/50 rounded-3xl p-5 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-black mb-2">
          <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
          128강 실시간 공식 대진표
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white">
          정규 챔피언십 토너먼트 <span className="text-amber-400">대진 브래킷</span>
        </h2>
        <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
          내 위치가 자동으로 강조됩니다. 경기를 클릭하면 실시간 관전실로 이동합니다.
        </p>
      </div>

      {/* Search Bar & Round Filter Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          {/* Participant Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="선수 이름 또는 닉네임 검색..."
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-bold flex items-center gap-1">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>내 경기 위치:</span>
            <span className="text-cyan-300 font-extrabold bg-cyan-500/20 px-2 py-0.5 rounded-md border border-cyan-500/30">
              [Dorirang (나)] 🏆 결승전 진출
            </span>
          </div>
        </div>

        {/* Filter Round Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
          {roundFilterOptions.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSelectedRoundFilter(opt.key)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                selectedRoundFilter === opt.key
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-black shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ================= DESKTOP VIEW: TRADITIONAL BRACKET TREE ================= */}
      <div className="hidden lg:block bg-slate-900/90 border border-slate-800 rounded-3xl p-5 shadow-2xl overflow-x-auto">
        <h3 className="text-xs font-black text-amber-400 mb-4 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          데스크톱 한눈에 보는 토너먼트 트리를 지원합니다 (128강~결승)
        </h3>

        <div className="flex items-center justify-between min-w-[850px] gap-4 py-2">
          {/* Column 1: 16강 / 8강 */}
          <div className="flex-1 space-y-4">
            <div className="text-[11px] font-black text-slate-400 text-center pb-1 border-b border-slate-800">
              8강 (QUARTER FINALS)
            </div>
            {mockBracketData
              .filter((m) => m.roundKey === '8')
              .map((match) => (
                <div
                  key={match.id}
                  onClick={() => handleSpectateMatch(match)}
                  className={`bg-slate-950 p-2.5 rounded-2xl border transition-all cursor-pointer hover:scale-102 ${
                    match.player1.isUser || match.player2.isUser
                      ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[9px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                    <span>{match.tableNo}</span>
                    {match.player1.isUser || match.player2.isUser ? (
                      <span className="text-[8px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.2 rounded">
                        MY MATCH
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-xs font-bold">
                    <div
                      className={`flex justify-between items-center p-1 rounded ${
                        match.player1.isWinner ? 'text-cyan-300 font-black' : 'text-slate-400'
                      }`}
                    >
                      <span>{match.player1.avatar} {match.player1.name}</span>
                      <span>{match.player1.score}</span>
                    </div>
                    <div
                      className={`flex justify-between items-center p-1 rounded ${
                        match.player2.isWinner ? 'text-cyan-300 font-black' : 'text-slate-400'
                      }`}
                    >
                      <span>{match.player2.avatar} {match.player2.name}</span>
                      <span>{match.player2.score}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Connection Divider Line */}
          <div className="text-slate-700 font-bold text-lg">➔</div>

          {/* Column 2: 준결승 (4강) */}
          <div className="flex-1 space-y-4">
            <div className="text-[11px] font-black text-purple-400 text-center pb-1 border-b border-slate-800">
              준결승 (SEMI FINALS)
            </div>
            {mockBracketData
              .filter((m) => m.roundKey === '4')
              .map((match) => (
                <div
                  key={match.id}
                  onClick={() => handleSpectateMatch(match)}
                  className={`bg-slate-950 p-2.5 rounded-2xl border transition-all cursor-pointer hover:scale-102 ${
                    match.player1.isUser || match.player2.isUser
                      ? 'border-cyan-400 ring-2 ring-cyan-500/40 bg-cyan-950/30'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-[9px] font-bold text-purple-300 mb-1 flex items-center justify-between">
                    <span>{match.roundName}</span>
                    {match.player1.isUser || match.player2.isUser ? (
                      <span className="text-[8px] bg-cyan-400 text-slate-950 font-black px-1.5 py-0.2 rounded">
                        MY MATCH
                      </span>
                    ) : null}
                  </div>
                  <div className="space-y-1 text-xs font-bold">
                    <div
                      className={`flex justify-between items-center p-1 rounded ${
                        match.player1.isWinner ? 'text-cyan-300 font-black' : 'text-slate-400'
                      }`}
                    >
                      <span>{match.player1.avatar} {match.player1.name}</span>
                      <span>{match.player1.score}</span>
                    </div>
                    <div
                      className={`flex justify-between items-center p-1 rounded ${
                        match.player2.isWinner ? 'text-cyan-300 font-black' : 'text-slate-400'
                      }`}
                    >
                      <span>{match.player2.avatar} {match.player2.name}</span>
                      <span>{match.player2.score}</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {/* Connection Divider Line */}
          <div className="text-amber-400 font-bold text-xl">➔</div>

          {/* Column 3: 결승전 (FINAL) */}
          <div className="flex-1">
            <div className="text-[11px] font-black text-amber-400 text-center pb-1 border-b border-slate-800 mb-4">
              🏆 최종 결승전 (FINAL)
            </div>
            {mockBracketData
              .filter((m) => m.roundKey === 'final')
              .map((match) => (
                <div
                  key={match.id}
                  onClick={() => handleSpectateMatch(match)}
                  className="bg-gradient-to-b from-amber-950/90 via-slate-950 to-purple-950/90 border-2 border-amber-400 p-4 rounded-3xl shadow-2xl shadow-amber-500/20 cursor-pointer hover:scale-105 transition-all text-center space-y-2 relative overflow-hidden"
                >
                  <div className="absolute top-1 right-2 text-[9px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                    LIVE 관전
                  </div>
                  <div className="text-2xl">🏆</div>
                  <div className="text-xs font-black text-amber-300">황금 결승 아레나</div>

                  <div className="space-y-1.5 text-xs font-black">
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-cyan-400/80 text-cyan-300 flex justify-between items-center">
                      <span>{match.player1.avatar} {match.player1.name}</span>
                      <span className="text-amber-400 font-mono text-sm">1</span>
                    </div>
                    <div className="text-[10px] text-amber-400 font-black">VS (3판 2선승)</div>
                    <div className="bg-slate-900/90 p-2 rounded-xl border border-slate-700 text-white flex justify-between items-center">
                      <span>{match.player2.avatar} {match.player2.name}</span>
                      <span className="text-amber-400 font-mono text-sm">1</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ================= MOBILE & GENERAL CARD LIST VIEW ================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
          <span>대진 매치 목록 ({filteredMatches.length}개)</span>
          <span>카드 클릭 시 관전실 입장</span>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400 text-xs">
            검색 결과에 해당하는 대진이 없습니다.
          </div>
        ) : (
          filteredMatches.map((match) => {
            const hasUser = match.player1.isUser || match.player2.isUser;

            return (
              <div
                key={match.id}
                onClick={() => handleSpectateMatch(match)}
                className={`relative overflow-hidden bg-slate-900/90 rounded-3xl p-4 border transition-all cursor-pointer hover:border-cyan-400/80 active:scale-98 shadow-xl space-y-2.5 ${
                  hasUser
                    ? 'border-2 border-cyan-400 shadow-cyan-500/20 ring-2 ring-cyan-500/30'
                    : 'border-slate-800'
                }`}
              >
                {/* Top Badge Info */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-200">{match.roundName}</span>
                    <span className="text-[10px] font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                      {match.tableNo}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {hasUser && (
                      <span className="text-[10px] font-black bg-cyan-400 text-slate-950 px-2 py-0.5 rounded-full shadow">
                        내 위치 (MY MATCH)
                      </span>
                    )}

                    {match.isLive ? (
                      <span className="text-[10px] font-black bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-white" />
                        LIVE 진행 중
                      </span>
                    ) : match.isCompleted ? (
                      <span className="text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                        경기 완료
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Match Players Score Box */}
                <div className="grid grid-cols-2 gap-2 text-xs font-black">
                  {/* Player 1 */}
                  <div
                    className={`p-2.5 rounded-2xl border flex items-center justify-between ${
                      match.player1.isWinner
                        ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-lg">{match.player1.avatar}</span>
                      <span className="truncate">{match.player1.name}</span>
                    </div>
                    {match.player1.score !== undefined && (
                      <span className="font-mono text-sm ml-1 text-amber-400">{match.player1.score}</span>
                    )}
                  </div>

                  {/* Player 2 */}
                  <div
                    className={`p-2.5 rounded-2xl border flex items-center justify-between ${
                      match.player2.isWinner
                        ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-lg">{match.player2.avatar}</span>
                      <span className="truncate">{match.player2.name}</span>
                    </div>
                    {match.player2.score !== undefined && (
                      <span className="font-mono text-sm ml-1 text-amber-400">{match.player2.score}</span>
                    )}
                  </div>
                </div>

                {/* Footer Spectate Prompt */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    관전자: {match.spectators || 120}명
                  </span>
                  <span className="text-cyan-400 font-extrabold flex items-center gap-0.5 hover:underline">
                    실시간 관전하기 →
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
