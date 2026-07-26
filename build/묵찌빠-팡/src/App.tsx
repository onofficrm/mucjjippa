import React from 'react';
import { GameProvider } from './context/GameContext';
import { MainLayout } from './layouts/MainLayout';

export default function App() {
  return (
    <GameProvider>
      <MainLayout />
    </GameProvider>
  );
}
