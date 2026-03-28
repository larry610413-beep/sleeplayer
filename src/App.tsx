/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Film, 
  AlertCircle, 
  Clock, 
  Trash2, 
  Bell, 
  BellOff, 
  Play, 
  Pause, 
  X, 
  Moon,
  Volume2,
  VolumeX,
  FastForward,
  Rewind
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface Schedule {
  id: string;
  time: string;
  isEnabled: boolean;
}

interface SavedData {
  isYouTubeMode?: boolean;
  youtubeId?: string;
  youtubeInputUrl?: string;
  schedules?: Schedule[];
  pointA?: number | null;
  pointB?: number | null;
  pointC?: number | null;
  pointD?: number | null;
  playMode?: 'all' | 'ad';
  targetRepeats?: string;
  pauseDuration?: string;
  currentTime?: number;
}

// --- Components ---

const YoutubeIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className={className}>
    <path fill="#FF0000" d="M2.5 7.1C2.6 6 3.4 5.2 4.5 5c2.5-.3 7.5-.3 7.5-.3s5 0 7.5.3c1.1.2 1.9 1 2 2.1.3 2.4.3 4.9.3 4.9s0 2.5-.3 4.9c-.1 1.1-.9 1.9-2 2.1-2.5.3-7.5.3-7.5.3s-5 0-7.5-.3c-1.1-.2-1.9-1-2-2.1-.3-2.4-.3-4.9-.3-4.9s0-2.5.3-4.9Z"/>
    <path fill="#FFFFFF" d="M10 15l5-3-5-3v6Z"/>
  </svg>
);

const getSavedData = (): SavedData => {
  try { 
    const saved = localStorage.getItem('alarmAppMemory'); 
    return saved ? JSON.parse(saved) : {}; 
  } catch (e) { 
    return {}; 
  }
};

export default function App() {
  const savedData = useMemo(() => getSavedData(), []);
  
  const [videoSource, setVideoSource] = useState<string | null>(null);
  const [isYouTubeMode, setIsYouTubeMode] = useState(savedData.isYouTubeMode || false);
  const [youtubeId, setYoutubeId] = useState(savedData.youtubeId || '');
  const [youtubeInputUrl, setYoutubeInputUrl] = useState(savedData.youtubeInputUrl || '');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState<{ type: string; text: string; id: number } | null>(null); 
  
  const [pointA, setPointA] = useState<number | null>(savedData.pointA ?? null);
  const [pointB, setPointB] = useState<number | null>(savedData.pointB ?? null);
  const [pointC, setPointC] = useState<number | null>(savedData.pointC ?? null);
  const [pointD, setPointD] = useState<number | null>(savedData.pointD ?? null);
  
  const [playMode, setPlayMode] = useState<'all' | 'ad'>(savedData.playMode || 'all');
  const [isPlaying, setIsPlaying] = useState(false); 
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [hasStartedPlayingOnce, setHasStartedPlayingOnce] = useState(false); 
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);
  const [targetRepeats, setTargetRepeats] = useState(savedData.targetRepeats || ''); 
  const [currentRepeats, setCurrentRepeats] = useState(1);
  const [pauseDuration, setPauseDuration] = useState(savedData.pauseDuration || ''); 
  const [isPausing, setIsPausing] = useState(false);
  const [currentTime, setCurrentTime] = useState(savedData.currentTime || 0);
  const [duration, setDuration] = useState(0);
  const [schedules, setSchedules] = useState<Schedule[]>(savedData.schedules || []);
  const [newTime, setNewTime] = useState('');
  const [lastTriggered, setLastTriggered] = useState<string | null>(null);
  const [isNightMode, setIsNightMode] = useState(false);
  const [nowTime, setNowTime] = useState(new Date());

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const timelineRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const loopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volumeTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const isSofteningVolume = useRef(false);
  const originalVolumeRef = useRef(100);

  // --- Helpers ---

  const getMediaCurrentTime = () => {
    if (isYouTubeMode && ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) return ytPlayerRef.current.getCurrentTime();
    return videoRef.current ? videoRef.current.currentTime : 0;
  };

  const saveData = (extra = {}) => {
    const ct = getMediaCurrentTime();
    const dataToSave = { 
      isYouTubeMode, youtubeId, youtubeInputUrl, schedules, pointA, pointB, 
      pointC, pointD, playMode, targetRepeats, pauseDuration, 
      currentTime: ct || currentTime, ...extra 
    };
    localStorage.setItem('alarmAppMemory', JSON.stringify(dataToSave));
  };

  useEffect(() => {
    saveData();
  }, [isYouTubeMode, youtubeId, youtubeInputUrl, schedules, pointA, pointB, pointC, pointD, playMode, targetRepeats, pauseDuration]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveData();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isYouTubeMode, youtubeId, currentTime]);

  const setMediaCurrentTime = (time: number) => {
    if (isYouTubeMode && ytPlayerRef.current && ytPlayerRef.current.seekTo) ytPlayerRef.current.seekTo(time, true);
    else if (videoRef.current) videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const playMedia = () => {
    if (isYouTubeMode && ytPlayerRef.current && ytPlayerRef.current.playVideo) {
       ytPlayerRef.current.playVideo();
    } else if (videoRef.current) {
       videoRef.current.play().catch(e => console.log("Auto-play prevented", e));
    }
    setIsPlaying(true);
    setHasStartedPlayingOnce(true);
  };

  const pauseMedia = () => {
    if (isYouTubeMode && ytPlayerRef.current && ytPlayerRef.current.pauseVideo) ytPlayerRef.current.pauseVideo();
    else if (videoRef.current) videoRef.current.pause();
    setIsPlaying(false);
  };

  const isMediaPaused = () => {
    if (isYouTubeMode && ytPlayerRef.current && ytPlayerRef.current.getPlayerState) {
      const state = ytPlayerRef.current.getPlayerState();
      return state !== 1 && state !== 3; 
    }
    return videoRef.current ? videoRef.current.paused : true;
  };

  const setMediaVolume = (volRatio: number) => {
    if (isYouTubeMode && ytPlayerRef.current && ytPlayerRef.current.setVolume) ytPlayerRef.current.setVolume(originalVolumeRef.current * volRatio);
    else if (videoRef.current) videoRef.current.volume = (originalVolumeRef.current / 100) * volRatio;
  };

  const getMediaVolume = () => {
    if (isYouTubeMode && ytPlayerRef.current && ytPlayerRef.current.getVolume) return ytPlayerRef.current.getVolume();
    return videoRef.current ? videoRef.current.volume * 100 : 100;
  };

  const extractYouTubeID = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleYouTubeSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const id = extractYouTubeID(youtubeInputUrl);
    if (id) {
      setVideoSource(null); setIsAudioMode(false); setHasStartedPlayingOnce(false);
      setYoutubeId(id); setIsYouTubeMode(true); setError('');
      setCurrentTime(0); setDuration(0);
    } else {
      setError('無效的 YouTube 網址'); setTimeout(() => setError(''), 3000);
    }
  };

  // --- YouTube API ---
  useEffect(() => {
    if (isYouTubeMode && youtubeId) {
      const initYT = () => {
        const currentOrigin = window.location.protocol.startsWith('http') ? window.location.origin : '*';
        if ((window as any).YT && (window as any).YT.Player) {
          ytPlayerRef.current = new (window as any).YT.Player('ytplayer-div', {
            height: '100%', width: '100%', videoId: youtubeId,
            playerVars: { 'playsinline': 1, 'controls': 1, 'rel': 0, 'enablejsapi': 1, 'origin': currentOrigin },
            events: {
              'onReady': (event: any) => {
                setDuration(event.target.getDuration());
                originalVolumeRef.current = event.target.getVolume();
                if (savedData.currentTime) {
                  event.target.seekTo(savedData.currentTime, true);
                }
              },
              'onStateChange': (event: any) => {
                if (event.data === (window as any).YT.PlayerState.PLAYING) { 
                    setIsPlaying(true); setHasStartedPlayingOnce(true); setDuration(event.target.getDuration()); 
                } 
                else if (event.data === (window as any).YT.PlayerState.PAUSED) setIsPlaying(false);
                else if (event.data === (window as any).YT.PlayerState.ENDED) handleVideoEnded();
              },
              'onError': (event: any) => {
                if(event.data === 150 || event.data === 101) setError("此影片版權方禁止在外部播放，請換一部影片");
                else setError("播放發生錯誤 (代碼: " + event.data + ")，請重新載入");
                setTimeout(() => setError(''), 5000);
              }
            }
          });
        }
      };
      if (!(window as any).YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        (window as any).onYouTubeIframeAPIReady = initYT;
      } else {
        const container = document.getElementById('yt-container-wrapper');
        if(container) { container.innerHTML = '<div id="ytplayer-div"></div>'; initYT(); }
      }
    }
    return () => { if (ytPlayerRef.current && ytPlayerRef.current.destroy) { ytPlayerRef.current.destroy(); ytPlayerRef.current = null; } };
  }, [isYouTubeMode, youtubeId]);

  // --- Playback Loop ---
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) interval = setInterval(() => {
      const ct = getMediaCurrentTime();
      setCurrentTime(ct);
      handleTimeUpdate(ct);
    }, 200);
    return () => clearInterval(interval);
  }, [isYouTubeMode, isPlaying, playMode, pointA, pointB, pointC, pointD, currentRepeats, isPausing]);

  // --- Night Mode & Wake Lock ---
  useEffect(() => {
    let wakeLock: any = null; 
    let clockInterval: NodeJS.Timeout | null = null;
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && isNightMode) {
        try { wakeLock = await (navigator as any).wakeLock.request('screen'); } catch (err) { console.error('無法取得防休眠:', err); }
      }
    };

    if (isNightMode) {
      requestWakeLock();
      clockInterval = setInterval(() => setNowTime(new Date()), 1000);
    } else {
      if (wakeLock) { wakeLock.release(); wakeLock = null; }
      if (clockInterval) clearInterval(clockInterval);
    }
    return () => {
      if (wakeLock) wakeLock.release();
      if (clockInterval) clearInterval(clockInterval);
    };
  }, [isNightMode]);

  const nextAlarmTime = useMemo(() => {
    if (!schedules || schedules.length === 0) return null;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const enabledAlarms = schedules.filter(s => s.isEnabled).map(s => {
      const [h, m] = s.time.split(':').map(Number);
      const totalMins = h * 60 + m;
      const diff = totalMins >= currentMins ? totalMins - currentMins : (totalMins + 24 * 60) - currentMins;
      return { time: s.time, diff };
    });
    if (enabledAlarms.length === 0) return null;
    enabledAlarms.sort((a, b) => a.diff - b.diff);
    return enabledAlarms[0].time;
  }, [schedules, nowTime]);

  const showFeedback = (type: string, text: string) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setFeedback({ type, text, id: Date.now() });
    feedbackTimeoutRef.current = setTimeout(() => setFeedback(null), 600);
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const currentDur = duration || (videoRef.current ? videoRef.current.duration : 0);
    if (clickX < rect.width / 3) {
      let newTime = getMediaCurrentTime() - 5;
      if (playMode === 'ad') { const { start } = getADBoundaries(); if (start !== null && newTime < start) newTime = start; } 
      else if (newTime < 0) newTime = 0;
      setMediaCurrentTime(newTime);
      showFeedback('rewind', '⏪ -5s');
    } else if (clickX > (rect.width * 2) / 3) {
      let newTime = getMediaCurrentTime() + 10;
      if (playMode === 'ad') { const { end } = getADBoundaries(); if (end !== null && newTime > end) newTime = end - 0.1; } 
      else if (newTime > currentDur) newTime = currentDur;
      setMediaCurrentTime(newTime);
      showFeedback('forward', '⏩ +10s');
    } else {
      if (isMediaPaused()) { applySoftVolume(); playMedia(); showFeedback('play', '▶️ 播放'); } 
      else { pauseMedia(); showFeedback('pause', '⏸️ 暫停'); }
    }
  };

  const resetLoopingState = () => {
    setCurrentRepeats(1); setIsPausing(false);
    if (loopTimeoutRef.current) { clearTimeout(loopTimeoutRef.current); loopTimeoutRef.current = null; }
  };

  const handleCloseVideo = (e?: React.MouseEvent) => {
    if (e && e.stopPropagation) e.stopPropagation(); 
    if (videoSource) URL.revokeObjectURL(videoSource);
    setVideoSource(null); setIsYouTubeMode(false); setYoutubeId(''); setYoutubeInputUrl(''); 
    setIsAudioMode(false); setIsNightMode(false); handleClearAll(); setIsPlaying(false); 
    setCurrentTime(0); setDuration(0); setHasStartedPlayingOnce(false); setError('');
    localStorage.removeItem('alarmAppMemory');
  };

  const getADBoundaries = () => {
    const points = [pointA, pointB, pointC, pointD].filter(p => p !== null) as number[];
    if (points.length < 2) return { start: null, end: null };
    return { start: Math.min(...points), end: Math.max(...points) };
  };

  const handlePlayAll = () => {
    if (playMode !== 'all') { setPlayMode('all'); resetLoopingState(); applySoftVolume(); playMedia(); } 
    else {
      if (isMediaPaused()) {
        const maxRepeats = targetRepeats.trim() === '' ? 1 : parseInt(targetRepeats, 10);
        if (!isNaN(maxRepeats) && currentRepeats >= maxRepeats) { resetLoopingState(); setMediaCurrentTime(0); }
        applySoftVolume(); playMedia();
      } else pauseMedia();
    }
  };

  const handleADPlay = () => {
    const hasAB = pointA !== null && pointB !== null; const hasCD = pointC !== null && pointD !== null;
    if (!hasAB && !hasCD) { setError('請先設定區段'); setTimeout(() => setError(''), 3000); return; }
    const startPoint = hasAB ? pointA : pointC;
    if (playMode !== 'ad') { 
      setPlayMode('ad'); resetLoopingState(); 
      const ct = getMediaCurrentTime();
      let needsReset = false;
      if (hasAB && hasCD) { if (ct < (pointA as number) || (ct >= (pointB as number) && ct < (pointC as number)) || ct >= (pointD as number)) needsReset = true; } 
      else if (hasAB && (ct < (pointA as number) || ct >= (pointB as number))) needsReset = true;
      else if (hasCD && (ct < (pointC as number) || ct >= (pointD as number))) needsReset = true;
      if (needsReset) setMediaCurrentTime(startPoint as number);
      applySoftVolume(); playMedia(); 
    } 
    else {
      if (isMediaPaused()) {
        const maxRepeats = targetRepeats.trim() === '' ? 1 : parseInt(targetRepeats, 10);
        if (!isNaN(maxRepeats) && currentRepeats >= maxRepeats) { resetLoopingState(); setMediaCurrentTime(startPoint as number); } 
        else {
          const ct = getMediaCurrentTime();
          if (hasAB && hasCD) { if (ct < (pointA as number) || (ct >= (pointB as number) && ct < (pointC as number)) || ct >= (pointD as number)) setMediaCurrentTime(startPoint as number); } 
          else if (hasAB && (ct < (pointA as number) || ct >= (pointB as number))) setMediaCurrentTime(startPoint as number);
          else if (hasCD && (ct < (pointC as number) || ct >= (pointD as number))) setMediaCurrentTime(startPoint as number);
        }
        applySoftVolume(); playMedia();
      } else pauseMedia();
    }
  };

  const handleClearAll = () => { setPointA(null); setPointB(null); setPointC(null); setPointD(null); setPlayMode('all'); resetLoopingState(); };
  
  const applySoftVolume = () => {
    volumeTimeoutsRef.current.forEach(clearTimeout); volumeTimeoutsRef.current = [];
    if (!isSofteningVolume.current) originalVolumeRef.current = getMediaVolume();
    isSofteningVolume.current = true;
    setMediaVolume(2/7);
    for (let i = 1; i <= 5; i++) {
      const timeout = setTimeout(() => { setMediaVolume((i + 2) / 7); if (i === 5) isSofteningVolume.current = false; }, i * 1000);
      volumeTimeoutsRef.current.push(timeout);
    }
  };

  // --- Alarm Trigger ---
  useEffect(() => {
    const intervalId = setInterval(() => {
      if ((!videoRef.current && !isYouTubeMode) || schedules.length === 0) return;
      const now = new Date();
      const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const activeSchedule = schedules.find(s => s.isEnabled && s.time === currentTimeStr);
      if (activeSchedule && lastTriggered !== currentTimeStr) {
        resetLoopingState(); if (isNightMode) setIsNightMode(false);
        if (playMode === 'ad') {
          const hasAB = pointA !== null && pointB !== null; const hasCD = pointC !== null && pointD !== null;
          if (!hasAB && !hasCD) setPlayMode('all');
        }
        applySoftVolume(); playMedia(); setLastTriggered(currentTimeStr);
        setSchedules(prev => prev.map(s => s.id === activeSchedule.id ? { ...s, isEnabled: false } : s));
      }
    }, 1000);
    return () => clearInterval(intervalId);
  }, [schedules, lastTriggered, playMode, pointA, pointB, pointC, pointD, isNightMode, isYouTubeMode]);

  const handleAddSchedule = () => {
    if (newTime.length !== 4) { setError('請輸入 4 位數時間'); setTimeout(() => setError(''), 3000); return; }
    const hours = parseInt(newTime.slice(0, 2), 10); const minutes = parseInt(newTime.slice(2, 4), 10);
    if (hours > 23 || minutes > 59) { setError('請輸入有效時間'); setTimeout(() => setError(''), 3000); return; }
    const formattedTime = `${newTime.slice(0, 2)}:${newTime.slice(2, 4)}`;
    if (schedules.find(s => s.time === formattedTime)) { setError('時間已設定過'); setTimeout(() => setError(''), 3000); return; }
    setSchedules([...schedules, { id: Date.now().toString(), time: formattedTime, isEnabled: true }]);
    setNewTime(''); pauseMedia();
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => setNewTime(e.target.value.replace(/\D/g, '').slice(0, 4));
  const toggleSchedule = (id: string) => setSchedules(schedules.map(s => s.id === id ? { ...s, isEnabled: !s.isEnabled } : s));
  const deleteSchedule = (id: string) => setSchedules(schedules.filter(s => s.id !== id));
  const formatTime = (seconds: number) => { if (isNaN(seconds)) return "00:00"; return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`; };
  
  const handleABToggle = () => {
    const ct = getMediaCurrentTime();
    if (pointA === null) { setPointA(ct); setPlayMode('all'); resetLoopingState(); } 
    else if (pointB === null) { if (ct > pointA) { setPointB(ct); setPlayMode('all'); resetLoopingState(); pauseMedia(); } else { setError('B點必須大於A點'); setTimeout(() => setError(''), 3000); } } 
    else { setPointA(null); setPointB(null); if (pointC === null && pointD === null) setPlayMode('all'); resetLoopingState(); }
  };

  const handleCDToggle = () => {
    const ct = getMediaCurrentTime();
    if (pointC === null) { setPointC(ct); setPlayMode('all'); resetLoopingState(); } 
    else if (pointD === null) { if (ct > pointC) { setPointD(ct); setPlayMode('all'); resetLoopingState(); pauseMedia(); } else { setError('D點必須大於C點'); setTimeout(() => setError(''), 3000); } } 
    else { setPointC(null); setPointD(null); if (pointA === null && pointB === null) setPlayMode('all'); resetLoopingState(); }
  };

  // --- Dragging Logic ---
  useEffect(() => {
    if (!draggingPoint) return;
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!timelineRef.current || !duration) return;
      if (e instanceof TouchEvent) e.preventDefault();
      const rect = timelineRef.current.getBoundingClientRect();
      const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
      let newTime = ((clientX - rect.left) / rect.width) * duration;
      newTime = Math.max(0, Math.min(newTime, duration));

      if (draggingPoint === 'A') { if (pointB !== null && newTime > pointB) newTime = pointB - 0.1; setPointA(newTime); }
      else if (draggingPoint === 'B') { if (pointA !== null && newTime < pointA) newTime = pointA + 0.1; setPointB(newTime); }
      else if (draggingPoint === 'C') { if (pointD !== null && newTime > pointD) newTime = pointD - 0.1; setPointC(newTime); }
      else if (draggingPoint === 'D') { if (pointC !== null && newTime < pointC) newTime = pointC + 0.1; setPointD(newTime); }
      setMediaCurrentTime(newTime);
    };
    const handleUp = () => setDraggingPoint(null);
    window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false }); window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove); window.removeEventListener('touchend', handleUp);
    };
  }, [draggingPoint, duration, pointA, pointB, pointC, pointD]);

  const handleTimelineClick = (e: React.MouseEvent) => {
    if (!timelineRef.current || !duration || draggingPoint) return;
    const rect = timelineRef.current.getBoundingClientRect();
    let newTime = ((e.clientX - rect.left) / rect.width) * duration;
    if (playMode === 'ad') {
        const hasAB = pointA !== null && pointB !== null; const hasCD = pointC !== null && pointD !== null;
        if (hasAB && hasCD) { if (newTime < (pointA as number)) newTime = pointA as number; if (newTime > (pointD as number)) newTime = (pointD as number) - 0.1; if (newTime >= (pointB as number) && newTime < (pointC as number)) newTime = pointC as number; } 
        else if (hasAB) { if (newTime < (pointA as number)) newTime = pointA as number; if (newTime > (pointB as number)) newTime = (pointB as number) - 0.1; } 
        else if (hasCD) { if (newTime < (pointC as number)) newTime = pointC as number; if (newTime > (pointD as number)) newTime = (pointD as number) - 0.1; }
    }
    setMediaCurrentTime(newTime);
  };

  const handleTimeUpdate = (ct: number) => {
    if (playMode === 'ad' && !isPausing && !draggingPoint) {
      const hasAB = pointA !== null && pointB !== null; const hasCD = pointC !== null && pointD !== null;
      if (!hasAB && !hasCD) return;
      const startPoint = hasAB ? pointA : pointC;
      const triggerCycleEnd = () => {
        const maxRepeats = targetRepeats.trim() === '' ? 1 : parseInt(targetRepeats, 10);
        if (!isNaN(maxRepeats) && currentRepeats >= maxRepeats) { pauseMedia(); setMediaCurrentTime(startPoint as number); return; }
        const pauseTime = parseInt(pauseDuration, 10);
        if (!isNaN(pauseTime) && pauseTime > 0) {
          pauseMedia(); setIsPausing(true);
          loopTimeoutRef.current = setTimeout(() => {
            if (playMode === 'ad') { setMediaCurrentTime(startPoint as number); applySoftVolume(); playMedia(); setCurrentRepeats(prev => prev + 1); setIsPausing(false); }
          }, pauseTime * 1000);
        } else { setMediaCurrentTime(startPoint as number); applySoftVolume(); playMedia(); setCurrentRepeats(prev => prev + 1); }
      };
      if (hasAB && hasCD) { if (ct >= (pointB as number) && ct < (pointC as number)) { setMediaCurrentTime(pointC as number); applySoftVolume(); } else if (ct >= (pointD as number)) triggerCycleEnd(); else if (ct < (pointA as number)) setMediaCurrentTime(pointA as number); } 
      else if (hasAB) { if (ct >= (pointB as number)) triggerCycleEnd(); else if (ct < (pointA as number)) setMediaCurrentTime(pointA as number); } 
      else if (hasCD) { if (ct >= (pointD as number)) triggerCycleEnd(); else if (ct < (pointC as number)) setMediaCurrentTime(pointC as number); }
    }
  };

  const handleVideoEnded = () => {
    if (playMode === 'all') {
      const maxRepeats = targetRepeats.trim() === '' ? 1 : parseInt(targetRepeats, 10);
      if (!isNaN(maxRepeats) && currentRepeats >= maxRepeats) { pauseMedia(); setMediaCurrentTime(0); return; }
      const pauseTime = parseInt(pauseDuration, 10);
      if (!isNaN(pauseTime) && pauseTime > 0) {
        setIsPausing(true);
        loopTimeoutRef.current = setTimeout(() => { if (playMode === 'all') { setMediaCurrentTime(0); applySoftVolume(); playMedia(); setCurrentRepeats(prev => prev + 1); setIsPausing(false); } }, pauseTime * 1000);
      } else { setMediaCurrentTime(0); applySoftVolume(); playMedia(); setCurrentRepeats(prev => prev + 1); }
    }
  };

  const handleLocalFile = (file: File) => {
    if (!file) return;
    setIsYouTubeMode(false); setYoutubeId(''); setYoutubeInputUrl(''); setHasStartedPlayingOnce(false);
    const validExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.3gp', '.mp3'];
    if (!(file.type.startsWith('video/') || file.type.startsWith('audio/')) && !validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) { setError('請上傳有效的影音格式'); return; }
    setIsAudioMode(file.type.startsWith('audio/') || file.name.toLowerCase().endsWith('.mp3'));
    setError(''); if (videoSource) URL.revokeObjectURL(videoSource);
    setVideoSource(URL.createObjectURL(file));
    setCurrentTime(0); setDuration(0);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files) handleLocalFile(e.target.files[0]); e.target.value = ''; };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const handleDrop = (e: React.DragEvent) => { e.preventDefault(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleLocalFile(e.dataTransfer.files[0]); };

  const sortedSchedules = useMemo(() => {
    return [...schedules].sort((a, b) => a.time.localeCompare(b.time));
  }, [schedules]);

  const getADTotalDuration = () => {
    let total = 0;
    if (pointA !== null && pointB !== null) total += (pointB - pointA);
    if (pointC !== null && pointD !== null) total += (pointD - pointC);
    return total > 0 ? formatTime(total) : null;
  };

  const startEditingAlarm = (id: string, time: string) => {
    setEditingId(id);
    setEditValue(time.replace(':', ''));
  };

  const submitEditAlarm = (id: string) => {
    if (editValue.length !== 4) { 
      setError('時間格式需為 4 位數'); setEditingId(null); 
      setTimeout(() => setError(''), 3000); return; 
    }
    const hours = parseInt(editValue.slice(0, 2), 10);
    const minutes = parseInt(editValue.slice(2, 4), 10);
    if (hours > 23 || minutes > 59) { 
      setError('無效時間'); setEditingId(null); 
      setTimeout(() => setError(''), 3000); return; 
    }
    const formatted = `${editValue.slice(0, 2)}:${editValue.slice(2, 4)}`;
    setSchedules(prev => prev.map(s => s.id === id ? { ...s, time: formatted } : s));
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center font-sans text-neutral-200">
      {/* Night Mode Overlay */}
      <AnimatePresence>
        {isNightMode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] bg-black flex flex-col items-center justify-center cursor-pointer" 
            onClick={() => setIsNightMode(false)}
          >
            <div className="text-[5rem] sm:text-9xl font-mono text-neutral-800 tracking-wider">
              {nowTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
            </div>
            {nextAlarmTime && (
              <div className="mt-4 flex items-center gap-2 text-neutral-600">
                <Bell className="w-5 h-5 sm:w-8 sm:h-8" />
                <span className="text-3xl sm:text-5xl font-mono tracking-widest">{nextAlarmTime}</span>
              </div>
            )}
            <div className="mt-12 px-6 py-2 border border-neutral-800 text-neutral-600 rounded-full text-sm">
              輕觸螢幕退出夜間模式
            </div>
            <p className="mt-4 text-[10px] text-neutral-700">防休眠已開啟，鬧鐘將準時啟動</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full h-full sm:h-auto sm:max-w-4xl bg-neutral-800 sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Player Container */}
        <div 
          className={`relative w-full ${isAudioMode ? 'aspect-[21/9] min-h-[220px]' : 'aspect-[4/3] sm:aspect-video min-h-[280px]'} bg-black flex flex-col items-center justify-center group flex-shrink-0 transition-all duration-300`} 
          onDragOver={handleDragOver} 
          onDrop={handleDrop}
        >
          {(!videoSource && !isYouTubeMode) ? (
            <div className="flex flex-col items-center justify-center w-full h-full text-neutral-500 p-4">
              <form onSubmit={handleYouTubeSubmit} className="mb-12 w-full max-w-[250px]">
                <input 
                  type="url" 
                  placeholder="貼上 YouTube 網址..." 
                  value={youtubeInputUrl} 
                  onFocus={() => setYoutubeInputUrl('')}
                  onChange={e => setYoutubeInputUrl(e.target.value)} 
                  className="w-full bg-neutral-900 border border-neutral-700 text-white px-3 py-2 rounded-lg text-[11px] focus:border-red-500 outline-none text-center" 
                />
                <button type="submit" className="hidden"></button>
              </form>
              <div className="flex items-center gap-20">
                <label className="flex flex-col items-center cursor-pointer hover:opacity-70 transition-opacity">
                  <input type="file" onChange={handleFileChange} accept="video/*,audio/*,.mp4,.mkv,.avi,.mov,.wmv,.flv,.webm,.m4v,.3gp,.mp3" className="hidden" />
                  <Film className="w-12 h-12 opacity-50" />
                </label>
                <button onClick={() => handleYouTubeSubmit()} className="flex flex-col items-center cursor-pointer hover:opacity-80 transition-opacity">
                  <YoutubeIcon className="w-12 h-12" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <button onClick={handleCloseVideo} className="absolute top-[12px] right-[12px] z-50 p-2 bg-neutral-900/60 hover:bg-red-600 text-white rounded-full backdrop-blur-md transition-all shadow-lg">
                <X className="w-5 h-5" />
              </button>
              {isYouTubeMode ? (
                <div id="yt-container-wrapper" className="w-full h-full pointer-events-auto bg-black">
                  <div id="ytplayer-div"></div>
                </div>
              ) : (
                <video 
                  ref={videoRef} 
                  src={videoSource || undefined} 
                  className={`w-full h-full object-contain transition-colors duration-300 ${isAudioMode ? 'bg-[#262626] pb-10' : ''}`} 
                  controls 
                  onTimeUpdate={(e: any) => setCurrentTime(e.target.currentTime)} 
                  onLoadedMetadata={(e: any) => { setDuration(e.target.duration); if(savedData.currentTime) e.target.currentTime = savedData.currentTime; }} 
                  onEnded={handleVideoEnded} 
                  playsInline 
                />
              )}
              {/* Invisible Click Overlay for Controls */}
              <div 
                className="absolute left-0 right-0 z-30 cursor-pointer" 
                style={{ top: '15%', bottom: '25%', pointerEvents: (!hasStartedPlayingOnce && isYouTubeMode) ? 'none' : 'auto' }} 
                onClick={handleVideoClick} 
              />
              
              {/* Feedback Animations */}
              <AnimatePresence>
                {feedback && (
                  <motion.div 
                    key={feedback.id}
                    initial={{ opacity: 0, scale: 0.8, x: '-50%', y: '-50%' }}
                    animate={{ opacity: 1, scale: 1.1 }}
                    exit={{ opacity: 0, scale: 1 }}
                    className={`absolute top-1/2 flex items-center justify-center bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold pointer-events-none z-40 ${feedback.type === 'rewind' ? 'left-[20%]' : feedback.type === 'forward' ? 'left-[80%]' : 'left-[50%]'}`}
                  >
                    {feedback.text}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>

        {/* Timeline & Loop Controls */}
        {(videoSource || isYouTubeMode) && duration > 0 && (
          <div className="w-full bg-neutral-800/90 px-4 py-3 border-b border-neutral-700/80 flex flex-col">
            <div className="flex flex-col gap-1 w-full">
              <div 
                ref={timelineRef} 
                onClick={handleTimelineClick} 
                className="relative w-full h-4 bg-neutral-700 rounded-full cursor-pointer group mt-8 mb-2"
              >
                {/* Loop Regions */}
                {pointA !== null && (
                  <div 
                    className="absolute h-full bg-blue-500/30 rounded-full" 
                    style={{ left: `${(pointA / duration) * 100}%`, width: pointB !== null ? `${((pointB - pointA) / duration) * 100}%` : `${(1 - pointA / duration) * 100}%` }}
                  ></div>
                )}
                {pointC !== null && (
                  <div 
                    className="absolute h-full bg-purple-500/30 rounded-full" 
                    style={{ left: `${(pointC / duration) * 100}%`, width: pointD !== null ? `${((pointD - pointC) / duration) * 100}%` : `${(1 - pointC / duration) * 100}%` }}
                  ></div>
                )}
                
                {/* Progress Bar */}
                <div className="absolute left-0 top-0 h-full bg-blue-500 rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                
                {/* Draggable Points */}
                {pointA !== null && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-10 h-10 z-20 -ml-5 flex items-center justify-center cursor-ew-resize touch-none" 
                    style={{ left: `${(pointA / duration) * 100}%` }} 
                    onMouseDown={() => setDraggingPoint('A')} 
                    onTouchStart={() => setDraggingPoint('A')}
                  >
                    <div className="h-8 w-2 bg-green-400 rounded-full shadow-lg border border-green-200"></div>
                  </div>
                )}
                {pointB !== null && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-10 h-10 z-20 -ml-5 flex items-center justify-center cursor-ew-resize touch-none" 
                    style={{ left: `${(pointB / duration) * 100}%` }} 
                    onMouseDown={() => setDraggingPoint('B')} 
                    onTouchStart={() => setDraggingPoint('B')}
                  >
                    <div className="h-8 w-2 bg-red-400 rounded-full shadow-lg border border-red-200"></div>
                  </div>
                )}
                {pointC !== null && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-10 h-10 z-20 -ml-5 flex items-center justify-center cursor-ew-resize touch-none" 
                    style={{ left: `${(pointC / duration) * 100}%` }} 
                    onMouseDown={() => setDraggingPoint('C')} 
                    onTouchStart={() => setDraggingPoint('C')}
                  >
                    <div className="h-8 w-2 bg-yellow-400 rounded-full shadow-lg border border-yellow-200"></div>
                  </div>
                )}
                {pointD !== null && (
                  <div 
                    className="absolute top-1/2 -translate-y-1/2 w-10 h-10 z-20 -ml-5 flex items-center justify-center cursor-ew-resize touch-none" 
                    style={{ left: `${(pointD / duration) * 100}%` }} 
                    onMouseDown={() => setDraggingPoint('D')} 
                    onTouchStart={() => setDraggingPoint('D')}
                  >
                    <div className="h-8 w-2 bg-purple-400 rounded-full shadow-lg border border-purple-200"></div>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center w-full font-mono text-xs text-neutral-400 mt-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <button 
                onClick={handlePlayAll} 
                className={`w-10 h-8 justify-center rounded text-sm font-medium transition-colors flex items-center ${playMode === 'all' ? 'bg-orange-500 text-white' : 'bg-neutral-900 text-neutral-300'}`}
              >
                {playMode === 'all' && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              
              <div className="relative flex-1 min-w-[50px] flex justify-center">
                {getADTotalDuration() && <span className="absolute bottom-[100%] mb-1 text-[15px] text-blue-300 font-mono font-bold">{getADTotalDuration()}</span>}
                <button 
                  onClick={handleADPlay} 
                  className={`w-full h-8 justify-center rounded text-xs font-bold transition-colors flex items-center ${playMode === 'ad' ? 'bg-blue-600 text-white' : 'bg-neutral-900 text-neutral-300'}`}
                >
                  A-D
                </button>
              </div>
              
              <button 
                onClick={handleABToggle} 
                className={`flex-1 min-w-[50px] h-8 justify-center rounded text-xs font-bold transition-colors flex items-center ${pointA !== null ? 'bg-green-600 text-white' : 'bg-neutral-900 text-neutral-300'}`}
              >
                {pointA === null ? 'A點' : pointB === null ? 'B點' : 'CL'}
              </button>
              
              <button 
                onClick={handleCDToggle} 
                className={`flex-1 min-w-[50px] h-8 justify-center rounded text-xs font-bold transition-colors flex items-center ${pointC !== null ? 'bg-purple-600 text-white' : 'bg-neutral-900 text-neutral-300'}`}
              >
                {pointC === null ? 'C點' : pointD === null ? 'D點' : 'CL'}
              </button>

              <div className="flex gap-1.5 w-full mt-1">
                <div className="flex-1 flex items-center justify-center bg-neutral-900 h-8 rounded border border-neutral-700">
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="1" 
                    value={targetRepeats} 
                    onFocus={(e) => e.target.select()} 
                    onChange={(e) => setTargetRepeats(e.target.value.replace(/\D/g, ''))} 
                    className="bg-transparent text-white text-sm outline-none w-8 text-center" 
                  />
                  <span className="text-xs text-neutral-400 ml-1">次</span>
                </div>
                <div className="flex-1 flex items-center justify-center bg-neutral-900 h-8 rounded border border-neutral-700">
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    placeholder="0" 
                    value={pauseDuration} 
                    onFocus={(e) => e.target.select()} 
                    onChange={(e) => setPauseDuration(e.target.value.replace(/\D/g, ''))} 
                    className="bg-transparent text-white text-sm outline-none w-8 text-center" 
                  />
                  <span className="text-xs text-neutral-400 ml-1">秒</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alarm List & Settings */}
        <div className="px-3 pt-3 pb-10 bg-neutral-800 flex-1 overflow-y-auto">
          <form onSubmit={(e) => { e.preventDefault(); handleAddSchedule(); }} className="flex items-center gap-2 w-full mb-3">
            <div className="flex items-center justify-center bg-neutral-900 w-10 h-10 rounded border border-neutral-700 flex-shrink-0">
              <Clock className="w-5 h-5 text-neutral-400" />
            </div>
            <input 
              type="text" 
              inputMode="numeric" 
              value={newTime} 
              onChange={handleTimeChange} 
              onFocus={(e) => e.target.select()} 
              placeholder="時間" 
              className="w-20 sm:w-24 flex-shrink-0 h-10 bg-neutral-900 text-white text-sm px-2 rounded outline-none text-center tracking-widest border border-neutral-700" 
            />
            <button 
              type="submit" 
              disabled={!videoSource && !isYouTubeMode} 
              className="px-3 sm:px-4 h-10 bg-blue-600 text-white rounded text-sm font-bold disabled:opacity-50 flex-1 sm:flex-none"
            >
              新增
            </button>
            <button 
              type="button" 
              onClick={() => handleCloseVideo()} 
              className="px-3 h-10 bg-neutral-700 text-neutral-200 rounded text-xs font-bold flex items-center justify-center gap-1 border border-neutral-600 flex-shrink-0"
            >
              清除
            </button>
            <button 
              type="button" 
              onClick={() => setIsNightMode(true)} 
              disabled={!videoSource && !isYouTubeMode} 
              className="px-3 h-10 bg-indigo-900 text-indigo-200 rounded text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1 border border-indigo-500/30 flex-shrink-0"
            >
              <Moon className="w-4 h-4 text-yellow-400" />
              夜間
            </button>
          </form>

          {sortedSchedules.length > 0 && (
            <div className="flex flex-col gap-2 pr-1">
              {sortedSchedules.map(schedule => (
                <div key={schedule.id} className="flex items-center justify-between bg-neutral-900 px-3 py-2 rounded-lg border border-neutral-700/50">
                  <div className="flex items-center gap-2 overflow-hidden flex-1 mr-2">
                    {schedule.isEnabled ? <Bell className="w-4 h-4 text-green-400 flex-shrink-0" /> : <BellOff className="w-4 h-4 text-neutral-500 flex-shrink-0" />}
                    {editingId === schedule.id ? (
                      <input 
                        autoFocus 
                        type="text" 
                        inputMode="numeric" 
                        value={editValue} 
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setEditValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        onBlur={() => submitEditAlarm(schedule.id)}
                        onKeyDown={(e) => { if(e.key === 'Enter') submitEditAlarm(schedule.id); if(e.key === 'Escape') setEditingId(null); }}
                        className="bg-neutral-800 text-white font-mono text-sm border-none outline-none w-16 px-1 rounded"
                      />
                    ) : (
                      <span 
                        onClick={() => startEditingAlarm(schedule.id, schedule.time)} 
                        className={`font-mono text-sm cursor-pointer underline decoration-dotted underline-offset-4 ${schedule.isEnabled ? 'text-white' : 'text-neutral-500 line-through'}`}
                      >
                        {schedule.time}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 items-center">
                    <button 
                      onClick={() => toggleSchedule(schedule.id)} 
                      className={`px-3 py-1 rounded text-xs font-bold transition-colors w-12 text-center ${schedule.isEnabled ? 'bg-green-600 text-white' : 'bg-transparent text-white border border-neutral-700'}`}
                    >
                      {schedule.isEnabled ? 'ON' : 'off'}
                    </button>
                    <button onClick={() => deleteSchedule(schedule.id)} className="p-1 text-white rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-400 bg-red-400/10 px-3 py-2 rounded text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
