import { useCallback, useEffect, useRef, useState } from 'react';
import { UserSettings } from '../types';
import { sound } from '../utils/audio';
import { usePersistentState } from './usePersistentState';

const SETTINGS_STORAGE_KEY = 'rps_settings';

export const defaultUserSettings: UserSettings = {
  masterVolume: 0.8,
  bgmVolume: 0.5,
  sfxVolume: 0.8,
  bgmEnabled: true,
  hapticEnabled: true,
  reduceMotion: false,
  largeFont: false,
  audioSubtitlesEnabled: true,
};

export interface UseSoundResult extends UserSettings {
  muted: boolean;
  toggleMute: () => void;
  setVolumes: (master: number, bgm: number, sfx: number) => void;
  toggleBGM: () => void;
  setHapticEnabled: (enabled: boolean) => void;
  setReduceMotion: (enabled: boolean) => void;
  setLargeFont: (enabled: boolean) => void;
  setAudioSubtitlesEnabled: (enabled: boolean) => void;
  caption: string | null;
}

/**
 * 사운드·접근성 설정 훅.
 * 저장 키(`rps_settings`)와 항목은 기존과 동일해 사용자 설정이 유지된다.
 */
export function useSound(): UseSoundResult {
  const [settings, setSettings] = usePersistentState<UserSettings>(
    SETTINGS_STORAGE_KEY,
    defaultUserSettings,
    { merge: true }
  );
  const [muted, setMuted] = useState<boolean>(() => sound.getMuted());
  const [caption, setCaption] = useState<string | null>(null);
  const captionTimerRef = useRef<number | null>(null);

  // 저장된 볼륨을 사운드 엔진에 반영
  useEffect(() => {
    sound.setVolumes(settings.masterVolume, settings.bgmVolume, settings.sfxVolume);
  }, [settings.masterVolume, settings.bgmVolume, settings.sfxVolume]);

  useEffect(() => {
    sound.setCaptionCallback((text) => {
      if (!settings.audioSubtitlesEnabled) return;
      setCaption(text);
      if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
      captionTimerRef.current = window.setTimeout(() => setCaption(null), 2200);
    });

    return () => {
      sound.setCaptionCallback(null);
      if (captionTimerRef.current) window.clearTimeout(captionTimerRef.current);
    };
  }, [settings.audioSubtitlesEnabled]);

  const toggleMute = useCallback(() => {
    setMuted(sound.toggleMute());
  }, []);

  const setVolumes = useCallback(
    (master: number, bgm: number, sfx: number) => {
      setSettings((prev) => ({ ...prev, masterVolume: master, bgmVolume: bgm, sfxVolume: sfx }));
      sound.setVolumes(master, bgm, sfx);
    },
    [setSettings]
  );

  const toggleBGM = useCallback(() => {
    sound.playClick();
    setSettings((prev) => {
      if (prev.bgmEnabled) sound.stopBGM();
      else sound.startBGM();
      return { ...prev, bgmEnabled: !prev.bgmEnabled };
    });
  }, [setSettings]);

  const setFlag = useCallback(
    (key: keyof UserSettings) => (enabled: boolean) =>
      setSettings((prev) => ({ ...prev, [key]: enabled })),
    [setSettings]
  );

  return {
    ...settings,
    muted,
    toggleMute,
    setVolumes,
    toggleBGM,
    setHapticEnabled: setFlag('hapticEnabled'),
    setReduceMotion: setFlag('reduceMotion'),
    setLargeFont: setFlag('largeFont'),
    setAudioSubtitlesEnabled: setFlag('audioSubtitlesEnabled'),
    caption,
  };
}
