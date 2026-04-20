import { useState, useCallback, useEffect, useRef } from 'react';
import {
  schedulePlayback,
  startPlayback,
  stopPlayback,
  updateBPM as engineUpdateBPM,
  disposeEngine,
} from '../audio/engine.js';

export function useAudioEngine() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChordIndex, setCurrentChordIndex] = useState(-1);
  const [currentBeatIndex, setCurrentBeatIndex] = useState(-1);
  const playingRef = useRef(false);

  const onBeat = useCallback((chordIdx, beatIdx) => {
    setCurrentChordIndex(chordIdx);
    setCurrentBeatIndex(beatIdx);
  }, []);

  const play = useCallback(async (config) => {
    const { progression, pattern, bpm, capo, curve, mode, tabData, isHumanized } = config;

    // Validate based on mode
    if (mode === 'tab') {
      if (!tabData || tabData.length === 0) return;
    } else {
      if (!progression.length || !pattern.length) return;
    }

    if (playingRef.current) return;
    playingRef.current = true;

    schedulePlayback({
      progression,
      pattern,
      bpm,
      capo,
      onBeat,
      curve: curve || null,
      mode: mode || 'chord',
      tabData: tabData || null,
      isHumanized: isHumanized !== false, // default true
    });

    await startPlayback();
    setIsPlaying(true);
  }, [onBeat]);

  const stop = useCallback(() => {
    playingRef.current = false;
    stopPlayback();
    setIsPlaying(false);
    setCurrentChordIndex(-1);
    setCurrentBeatIndex(-1);
  }, []);

  const changeBPM = useCallback((bpm) => {
    engineUpdateBPM(bpm);
  }, []);

  useEffect(() => {
    return () => { disposeEngine(); };
  }, []);

  return {
    play,
    stop,
    changeBPM,
    isPlaying,
    currentChordIndex,
    currentBeatIndex,
  };
}
