'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  Volume2,
  VolumeX,
  Send,
  CloudSun,
  Newspaper,
  BookOpen,
  FileText,
  ScanFace,
  PlaySquare,
  Cpu,
  ArrowRight,
  RotateCcw,
  Trash2,
  Square,
  Network,
  AlertCircle,
  AudioLines,
  X,
} from 'lucide-react';
import type { FerrumCommandResponse } from '@/app/api/ferrum/route';

interface FerrumVoiceAssistantProps {
  onOpenArchitecture?: () => void;
}

interface ConversationTurn {
  id: string;
  timestamp: string;
  userTranscript: string;
  response: FerrumCommandResponse;
}

const WAVEFORM_BAR_COUNT = 32;
const DEFAULT_IDLE_WAVEFORM = new Array(WAVEFORM_BAR_COUNT).fill(10);

const VOICE_PRESETS = [
  {
    label: 'Weather Telemetry',
    prompt: "Hey Ferrum, what's the weather in San Francisco right now?",
    module: 'Utilities → Weather API',
    icon: CloudSun,
  },
  {
    label: 'Tech News Briefing',
    prompt: 'Hey Ferrum, read me the top technology news headlines.',
    module: 'news.py → News API',
    icon: Newspaper,
  },
  {
    label: 'Save Note to data.txt',
    prompt: 'Remember that the production deployment is scheduled for 5 PM.',
    module: 'ferrum.py → data.txt',
    icon: FileText,
  },
  {
    label: 'Biometric Verification',
    prompt: 'Run face recognition check and verify operator identity.',
    module: 'Face recognition.py → trainer.yml',
    icon: ScanFace,
  },
  {
    label: 'Wikipedia Lexicon',
    prompt: 'Define quantum error correction using Wikipedia.',
    module: 'diction.py → Wikipedia API',
    icon: BookOpen,
  },
  {
    label: 'YouTube Stream',
    prompt: 'Play neural architecture lectures on YouTube.',
    module: 'youtube.py → YouTube',
    icon: PlaySquare,
  },
];

const INITIAL_TURN: ConversationTurn = {
  id: 'init_boot',
  timestamp: 'Ready',
  userTranscript: 'System boot: Initialize Ferrum voice assistant',
  response: {
    spokenResponse:
      'Ferrum voice assistant online. Microphone input, Speech Recognition, and pyttsx3 audio synthesis are standing by. Tap the microphone to speak or type a command below.',
    dispatchedModule: 'ferrum.py',
    externalService: 'Local Runtime',
    dataArtifact: 'data.json · trainer.yml',
    executionPath: [
      'Microphone',
      'Speech Recognition',
      'ferrum.py',
      'Command Parser / Dispatcher',
      'Text-to-Speech (pyttsx3)',
      'Speaker',
    ],
    latencyMs: 94,
    payload: {
      type: 'core',
      title: 'Ferrum Core Engine Ready',
      subtitle: 'All 5 architecture layers active in background',
      metrics: [
        { label: 'Core Engine', value: 'ferrum.py' },
        { label: 'Voice Output', value: 'pyttsx3 TTS' },
        { label: 'Biometric Auth', value: 'Verified (98.4%)' },
        { label: 'Active Modules', value: '11 Routed' },
      ],
    },
  },
};

export default function FerrumVoiceAssistant({
  onOpenArchitecture,
}: FerrumVoiceAssistantProps) {
  const [inputCommand, setInputCommand] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioLevels, setAudioLevels] = useState<number[]>(
    DEFAULT_IDLE_WAVEFORM
  );
  const [peakVolume, setPeakVolume] = useState<number>(0);
  const [isVoiceDetected, setIsVoiceDetected] = useState<boolean>(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [thinkingStoppedNotice, setThinkingStoppedNotice] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [savedNotes, setSavedNotes] = useState<string[]>([
    'Audit repaired weather_api and utilities_mod wiring before release',
    'Retrain trainer.yml with 50 frontal face samples',
  ]);
  const [turns, setTurns] = useState<ConversationTurn[]>([INITIAL_TURN]);

  // Refs for MediaRecorder + Web Audio Analyser + optional SpeechRecognition + AbortController
  const abortControllerRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const ttsAnimFrameRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptHintRef = useRef<string>('');
  const hasSpokenAudioRef = useRef<boolean>(false);
  const silenceStartRef = useRef<number | null>(null);
  const cancelRequestedRef = useRef<boolean>(false);

  // Load saved data.txt notes from localStorage on mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('ferrum_data_txt_notes');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedNotes(parsed);
        }
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Animate synthetic waveform when Ferrum TTS is speaking aloud
  useEffect(() => {
    if (!isSpeaking || isListening) {
      if (ttsAnimFrameRef.current) {
        cancelAnimationFrame(ttsAnimFrameRef.current);
        ttsAnimFrameRef.current = null;
      }
      if (!isListening) {
        setAudioLevels(DEFAULT_IDLE_WAVEFORM);
        setPeakVolume(0);
      }
      return;
    }

    let lastUpdate = 0;
    const animateTtsWave = (timestamp: number) => {
      if (timestamp - lastUpdate > 55) {
        lastUpdate = timestamp;
        const t = timestamp / 110;
        const half = WAVEFORM_BAR_COUNT / 2;
        const nextBars = new Array(WAVEFORM_BAR_COUNT).fill(12).map((_, idx) => {
          const distFromCenter = Math.abs(idx - half) / half;
          const envelope = Math.max(0.2, 1 - distFromCenter * 0.75);
          const wave =
            Math.abs(Math.sin(t + idx * 0.45) * 0.65 + Math.cos(t * 1.4 - idx * 0.3) * 0.35);
          return Math.max(12, Math.min(92, Math.round(wave * envelope * 88 + 12)));
        });
        setAudioLevels(nextBars);
        setPeakVolume(Math.max(...nextBars));
      }
      ttsAnimFrameRef.current = requestAnimationFrame(animateTtsWave);
    };

    ttsAnimFrameRef.current = requestAnimationFrame(animateTtsWave);
    return () => {
      if (ttsAnimFrameRef.current) {
        cancelAnimationFrame(ttsAnimFrameRef.current);
        ttsAnimFrameRef.current = null;
      }
    };
  }, [isSpeaking, isListening]);

  // Persist notes to localStorage
  const persistNotes = useCallback((nextNotes: string[]) => {
    setSavedNotes(nextNotes);
    try {
      window.localStorage.setItem(
        'ferrum_data_txt_notes',
        JSON.stringify(nextNotes)
      );
    } catch {
      // ignore storage errors
    }
  }, []);

  // Speak response aloud via browser speechSynthesis (pyttsx3 equivalent)
  const speakText = useCallback(
    (text: string) => {
      if (
        !ttsEnabled ||
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.02;
        utterance.pitch = 0.96;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [ttsEnabled]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Apply response from /api/ferrum to state & TTS
  const handleFerrumResponse = useCallback(
    (data: FerrumCommandResponse, fallbackLabel: string) => {
      if (data?.payload?.noteAction === 'save' && data.payload.noteContent) {
        const updated = [data.payload.noteContent, ...savedNotes];
        persistNotes(updated);
      } else if (data?.payload?.noteAction === 'clear') {
        persistNotes([]);
      }

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      const resolvedTranscript =
        (data.userTranscript && data.userTranscript.trim()) || fallbackLabel;

      const newTurn: ConversationTurn = {
        id: `turn_${Date.now()}`,
        timestamp: timeStr,
        userTranscript: resolvedTranscript,
        response: data,
      };

      setTurns((prev) => [newTurn, ...prev]);
      speakText(data.spokenResponse);
    },
    [persistNotes, savedNotes, speakText]
  );

  // Stop/abort in-flight thinking & processing request
  const stopThinking = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsProcessing(false);
    setInterimTranscript('');
    setThinkingStoppedNotice(
      'Thinking stopped by user — ready for a new voice or text command.'
    );
  }, []);

  // Execute a text command against /api/ferrum
  const executeCommand = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || isProcessing) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsProcessing(true);
      setThinkingStoppedNotice(null);
      setInputCommand('');
      setInterimTranscript('');
      setMicError(null);

      try {
        console.info('[Ferrum Voice Client] [Text Dispatch] Sending command:', {
          command: trimmed,
        });
        const res = await fetch('/api/ferrum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: trimmed,
            savedNotes,
          }),
          signal: controller.signal,
        });

        const data = (await res.json()) as FerrumCommandResponse;
        console.info('[Ferrum Voice Client] [Text Response] Received packet:', {
          status: res.status,
          userTranscript: data.userTranscript,
          dispatchedModule: data.dispatchedModule,
          packetDiagnostics: data.packetDiagnostics,
        });
        handleFerrumResponse(data, trimmed);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.info('[Ferrum Voice Client] [Aborted] Text command aborted by user');
          return;
        }
        console.error('[Ferrum Voice Client] [Text Error]', err);
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsProcessing(false);
        }
      }
    },
    [handleFerrumResponse, isProcessing, savedNotes]
  );

  // Execute a recorded audio blob against /api/ferrum (multimodal Gemini audio + browser hint)
  const executeAudioCommand = useCallback(
    async (audioBlob: Blob, hintTranscript: string) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsProcessing(true);
      setThinkingStoppedNotice(null);
      setInterimTranscript('');

      try {
        // Convert Blob to base64 string
        const base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const base64 = result.includes(',')
              ? result.split(',')[1]
              : result;
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(audioBlob);
        });

        if (controller.signal.aborted) {
          return;
        }

        const cleanMime =
          (audioBlob.type || 'audio/webm').split(';')[0].trim() || 'audio/webm';

        console.info('[Ferrum Voice Client] [Audio Packet Dispatch] POST /api/ferrum', {
          blobBytes: audioBlob.size,
          base64Chars: base64Audio.length,
          cleanMimeType: cleanMime,
          hintTranscript: hintTranscript.trim() || '(none)',
        });

        const res = await fetch('/api/ferrum', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            command: hintTranscript.trim(),
            audioBase64: base64Audio,
            audioMimeType: cleanMime,
            savedNotes,
          }),
          signal: controller.signal,
        });

        const data = (await res.json()) as FerrumCommandResponse;
        console.info('[Ferrum Voice Client] [Audio Packet Response] Received:', {
          status: res.status,
          userTranscript: data.userTranscript,
          dispatchedModule: data.dispatchedModule,
          spokenResponse: data.spokenResponse,
          packetDiagnostics: data.packetDiagnostics,
        });
        handleFerrumResponse(
          data,
          hintTranscript.trim() || 'Voice command via Microphone'
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          console.info('[Ferrum Voice Client] [Aborted] Audio packet aborted by user');
          return;
        }
        console.error('[Ferrum Voice Client] [Audio Packet Error]', err);
        if (hintTranscript.trim()) {
          await executeCommand(hintTranscript.trim());
        }
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
          setIsProcessing(false);
        }
      }
    },
    [executeCommand, handleFerrumResponse, savedNotes]
  );

  // Clean up active audio streams, timers, and speech recognition
  const cleanupRecordingResources = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {
        // ignore
      }
      audioContextRef.current = null;
    }
    setAudioLevels(DEFAULT_IDLE_WAVEFORM);
    setPeakVolume(0);
    setIsVoiceDetected(false);
    setRecordingSeconds(0);
  }, []);

  // Stop active voice recording and dispatch recorded audio
  const stopVoiceRecording = useCallback(() => {
    setIsListening(false);
    // Stop SpeechRecognition first so it flushes any final words
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        if (recorder.state === 'recording') {
          recorder.requestData();
        }
        recorder.stop();
      } catch {
        cleanupRecordingResources();
      }
    } else {
      const hint = transcriptHintRef.current.trim();
      cleanupRecordingResources();
      if (hint && !cancelRequestedRef.current) {
        executeCommand(hint);
      }
    }
  }, [cleanupRecordingResources, executeCommand]);

  // Cancel active voice recording without sending
  const cancelVoiceRecording = useCallback(() => {
    cancelRequestedRef.current = true;
    setInterimTranscript('');
    transcriptHintRef.current = '';
    stopVoiceRecording();
  }, [stopVoiceRecording]);

  // Start real microphone recording + 32-band live waveform visualizer + optional SpeechRecognition hint
  const startVoiceRecording = useCallback(async () => {
    stopSpeaking();
    setMicError(null);
    setInterimTranscript('');
    transcriptHintRef.current = '';
    audioChunksRef.current = [];
    hasSpokenAudioRef.current = false;
    silenceStartRef.current = null;
    cancelRequestedRef.current = false;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      setMicError(
        'Microphone API is not available in this browser context. Please type your command below.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.info('[Ferrum Voice Client] [Mic Start] Microphone stream opened:', {
        tracks: stream.getAudioTracks().map((t) => ({
          label: t.label,
          enabled: t.enabled,
          readyState: t.readyState,
        })),
      });
      mediaStreamRef.current = stream;
      setIsListening(true);
      setRecordingSeconds(0);
      const recordStartTime = Date.now();
      let consecutiveVoiceFrames = 0;

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // 1. Optional browser SpeechRecognition for real-time interim words on screen
      const SpeechRecognitionCtor =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).SpeechRecognition ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitSpeechRecognition;

      if (SpeechRecognitionCtor) {
        try {
          const recognition = new SpeechRecognitionCtor();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = 'en-US';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onresult = (event: any) => {
            let combined = '';
            for (let i = 0; i < event.results.length; ++i) {
              combined += event.results[i][0].transcript + ' ';
            }
            const clean = combined.trim();
            if (clean) {
              transcriptHintRef.current = clean;
              setInterimTranscript(clean);
              hasSpokenAudioRef.current = true;
              silenceStartRef.current = null;
              console.info('[Ferrum Voice Client] [SpeechRecognition Hint]:', clean);
            }
          };
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          recognition.onerror = (errEvent: any) => {
            console.info(
              '[Ferrum Voice Client] [SpeechRecognition Notice] Continuing with MediaRecorder audio capture:',
              errEvent?.error || 'unknown'
            );
          };
          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          // MediaRecorder handles recording if SpeechRecognition fails
        }
      }

      // 2. Web Audio API AnalyserNode for live 32-bar symmetric waveform visualizer & silence auto-stop
      const AudioCtx =
        window.AudioContext ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.72;
        source.connect(analyser);

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const halfBars = WAVEFORM_BAR_COUNT / 2;

        const updateMeter = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(freqData);

          let sum = 0;
          let maxBin = 0;
          for (let i = 1; i <= halfBars; i++) {
            const val = freqData[i] || 0;
            sum += val;
            if (val > maxBin) maxBin = val;
          }

          const avgLevel = sum / halfBars;
          const now = Date.now();
          // Ignore the first 600ms so mouse click or mic initialization pop doesn't trigger false speech lock
          const pastWarmup = now - recordStartTime > 600;
          const voiceActiveNow = pastWarmup && (avgLevel > 28 || maxBin > 85);
          setIsVoiceDetected(voiceActiveNow);

          // Build a 32-bar center-mirrored acoustic waveform with subtle carrier motion when listening
          const mirroredBars = new Array(WAVEFORM_BAR_COUNT).fill(14);
          for (let i = 0; i < halfBars; i++) {
            const rawVal = freqData[i + 1] || 0;
            const norm = rawVal / 255;
            // Subtle breathing carrier wave so the user always sees the mic is live even in quiet rooms
            const carrier =
              Math.sin(now / 150 + i * 0.45) * 6 +
              Math.cos(now / 95 - i * 0.3) * 4;
            const barHeight = Math.max(
              14,
              Math.min(100, Math.round(norm * 95 + 16 + carrier))
            );
            // Place low/mid vocal frequencies near the center and higher frequencies toward the edges
            const rightIdx = halfBars + i;
            const leftIdx = halfBars - 1 - i;
            mirroredBars[rightIdx] = barHeight;
            mirroredBars[leftIdx] = Math.max(
              14,
              Math.min(100, Math.round(barHeight * 0.94 + (i % 2 === 0 ? 3 : -2)))
            );
          }

          setAudioLevels(mirroredBars);
          setPeakVolume(
            Math.min(100, Math.max(8, Math.round((maxBin / 255) * 100)))
          );

          if (voiceActiveNow) {
            consecutiveVoiceFrames += 1;
            if (consecutiveVoiceFrames >= 5) {
              hasSpokenAudioRef.current = true;
            }
            silenceStartRef.current = null;
          } else {
            consecutiveVoiceFrames = 0;
            if (hasSpokenAudioRef.current) {
              if (!silenceStartRef.current) {
                silenceStartRef.current = now;
              } else if (now - silenceStartRef.current > 2600) {
                // Auto-complete recording after 2.6s of silence following sustained speech
                stopVoiceRecording();
                return;
              }
            }
          }

          animFrameRef.current = requestAnimationFrame(updateMeter);
        };
        animFrameRef.current = requestAnimationFrame(updateMeter);
      }

      // 3. MediaRecorder to capture actual voice audio for Gemini multimodal transcription
      const preferredMime =
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : typeof MediaRecorder !== 'undefined' &&
            MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const wasCancelled = cancelRequestedRef.current;
        const chunks = [...audioChunksRef.current];
        const mimeType =
          (recorder.mimeType || 'audio/webm').split(';')[0].trim() ||
          'audio/webm';

        // Wait 250ms so browser SpeechRecognition can flush its final words into transcriptHintRef
        setTimeout(() => {
          const hint = transcriptHintRef.current.trim();
          const totalBytes = chunks.reduce((acc, c) => acc + c.size, 0);
          console.info('[Ferrum Voice Client] [Mic Stop] Assembled recording:', {
            wasCancelled,
            chunkCount: chunks.length,
            totalBytes,
            mimeType,
            hintTranscript: hint || '(none)',
          });

          cleanupRecordingResources();

          if (wasCancelled) {
            return;
          }

          if (chunks.length > 0 && totalBytes > 100) {
            const blob = new Blob(chunks, { type: mimeType });
            executeAudioCommand(blob, hint);
            return;
          }
          if (hint) {
            executeCommand(hint);
            return;
          }
          console.warn(
            '[Ferrum Voice Client] [Packet Dropped] Recording had 0 usable audio bytes and no SpeechRecognition transcript'
          );
          setMicError(
            'Recording was too brief or silent to capture audio. Hold the mic for a couple of seconds while speaking, then tap Send.'
          );
        }, 250);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(200);
    } catch (err) {
      cleanupRecordingResources();
      setIsListening(false);
      const message =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Microphone access was blocked by the browser. Please allow microphone permission in your browser address bar, or type your command below.'
          : 'Could not access microphone hardware. Please check your audio input device or type your command below.';
      setMicError(message);
    }
  }, [
    cleanupRecordingResources,
    executeAudioCommand,
    executeCommand,
    stopSpeaking,
    stopVoiceRecording,
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      cleanupRecordingResources();
    };
  }, [cleanupRecordingResources]);

  const toggleListening = () => {
    if (isProcessing) {
      stopThinking();
      return;
    }
    setThinkingStoppedNotice(null);
    if (isListening) {
      stopVoiceRecording();
    } else {
      startVoiceRecording();
    }
  };

  const activeTurn = turns[0] || INITIAL_TURN;
  const activeResponse = activeTurn.response;
  const formattedTimer = `00:${
    recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds
  }`;

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0F17] text-slate-100 selection:bg-sky-500/30">
      {/* Minimal 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-6 px-6 py-3.5 bg-[#0B0F17]/90 backdrop-blur-md border-b border-slate-800/80">
        {/* Zone 1: Brand Identity */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold tracking-tight text-white">
              FERRUM
            </span>
            <span className="text-slate-600" aria-hidden="true">
              ·
            </span>
            <span className="font-mono text-xs text-slate-400">
              ferrum.py Voice Assistant
            </span>
          </div>
        </div>

        {/* Zone 2: Live Runtime Telemetry (Zero-pill middle-dot metadata) */}
        <div className="hidden md:flex items-center gap-2 font-mono text-xs text-slate-400 tabular-nums">
          <span
            className={
              isListening
                ? 'text-sky-400 font-semibold animate-pulse'
                : isProcessing
                ? 'text-amber-400 font-semibold animate-pulse'
                : isSpeaking
                ? 'text-emerald-400 font-semibold'
                : 'text-emerald-400'
            }
          >
            {isListening
              ? `LISTENING · MIC RECORDING (${formattedTimer})`
              : isProcessing
              ? 'TRANSCRIBING & DISPATCHING...'
              : isSpeaking
              ? 'SPEAKING (PYTTSX3)'
              : 'STANDBY'}
          </span>
          <span aria-hidden="true">·</span>
          <span>Module: {activeResponse.dispatchedModule}</span>
          <span aria-hidden="true">·</span>
          <span>Latency: {activeResponse.latencyMs}ms</span>
        </div>

        {/* Zone 3: Audio & Optional Architecture Toggle */}
        <div className="flex items-center gap-2.5">
          {isProcessing && (
            <button
              type="button"
              onClick={stopThinking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-300 bg-rose-500/15 border border-rose-500/40 rounded-lg hover:bg-rose-500/25 transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Thinking</span>
            </button>
          )}

          {isSpeaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors cursor-pointer"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Audio</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (ttsEnabled) stopSpeaking();
              setTtsEnabled((v) => !v);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
              ttsEnabled
                ? 'bg-slate-800/90 text-slate-200 border-slate-700 hover:bg-slate-800'
                : 'bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300'
            }`}
            title="Toggle pyttsx3 Speech Synthesis"
          >
            {ttsEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>TTS On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-500" />
                <span>TTS Muted</span>
              </>
            )}
          </button>

          {onOpenArchitecture && (
            <button
              type="button"
              onClick={onOpenArchitecture}
              className="hidden items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Reveal underlying 5-layer system architecture workbench"
            >
              <Network className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Architecture</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Voice Assistant Stage */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-6 flex flex-col justify-between gap-7">
        {/* Centerpiece: Ferrum Voice Orb + Live Waveform Visualizer Stage + Spoken Response */}
        <section className="flex flex-col items-center text-center pt-2">
          {/* Interactive Voice Orb Button with Dynamic Amplitude Halo Rings */}
          <div className="relative flex items-center justify-center mb-5">
            {/* Outer pulsing acoustic ring */}
            <div
              className={`absolute w-40 h-40 rounded-full transition-all duration-300 pointer-events-none ${
                isListening
                  ? 'bg-sky-500/20 animate-ping'
                  : isSpeaking
                  ? 'bg-emerald-500/15 animate-pulse'
                  : isProcessing
                  ? 'bg-amber-500/15 animate-pulse'
                  : 'bg-emerald-500/5 opacity-40'
              }`}
            />
            {/* Secondary volume-reactive ring */}
            <div
              style={{
                transform: isListening
                  ? `scale(${1 + (peakVolume / 100) * 0.35})`
                  : isSpeaking
                  ? `scale(${1 + (peakVolume / 100) * 0.2})`
                  : 'scale(1)',
              }}
              className={`absolute w-32 h-32 rounded-full border transition-transform duration-75 pointer-events-none ${
                isListening
                  ? isVoiceDetected
                    ? 'border-sky-400/90 bg-sky-500/15 shadow-lg shadow-sky-500/20'
                    : 'border-sky-500/50 bg-sky-500/10'
                  : isSpeaking
                  ? 'border-emerald-400/60 bg-emerald-500/10'
                  : 'border-slate-800/90'
              }`}
            />

            <button
              type="button"
              onClick={toggleListening}
              aria-pressed={isListening}
              aria-label={
                isListening
                  ? 'Stop recording and send voice command'
                  : isProcessing
                  ? 'Stop thinking and cancel processing'
                  : 'Start voice command recording'
              }
              className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center gap-1.5 border transition-all duration-200 cursor-pointer shadow-2xl ${
                isListening
                  ? 'bg-sky-600 hover:bg-sky-500 border-sky-300 text-white shadow-sky-500/40 scale-105'
                  : isProcessing
                  ? 'bg-amber-600 hover:bg-rose-600 border-amber-300 text-white shadow-amber-500/30 scale-105'
                  : isSpeaking
                  ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/30'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-emerald-400 hover:border-emerald-500/60'
              }`}
            >
              {isListening || isProcessing ? (
                <Square className="w-6 h-6 fill-current animate-pulse" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
              <span className="font-mono text-[10px] tracking-wider uppercase font-semibold">
                {isListening
                  ? 'Tap to Send'
                  : isProcessing
                  ? 'Stop'
                  : isSpeaking
                  ? 'Speaking'
                  : 'Tap Mic'}
              </span>
            </button>
          </div>

          {/* Dedicated Audio Waveform Visualizer & Pulsing Listening State Indicator */}
          <div
            role="status"
            aria-live="polite"
            className={`w-full max-w-2xl mx-auto mb-5 rounded-xl border px-5 py-3.5 transition-all duration-300 ${
              isListening
                ? 'bg-sky-950/30 border-sky-500/60 shadow-lg shadow-sky-950/50'
                : isSpeaking
                ? 'bg-emerald-950/25 border-emerald-500/40'
                : isProcessing
                ? 'bg-amber-950/20 border-amber-500/40'
                : 'bg-slate-900/60 border-slate-800/80'
            }`}
          >
            {/* Visualizer Header: Pulsing State Indicator + Audio Telemetry */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800/80 text-xs font-mono">
              <div className="flex items-center gap-2">
                {isListening ? (
                  <>
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400" />
                    </span>
                    <span className="font-semibold text-sky-300 tracking-wide">
                      LISTENING · VOICE CAPTURE ACTIVE
                    </span>
                  </>
                ) : isSpeaking ? (
                  <>
                    <AudioLines className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span className="font-semibold text-emerald-300 tracking-wide">
                      SPEAKING · PYTTSX3 AUDIO SYNTHESIS
                    </span>
                  </>
                ) : isProcessing ? (
                  <>
                    <AudioLines className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                    <span className="font-semibold text-amber-300 tracking-wide">
                      PROCESSING VOICE STREAM...
                    </span>
                  </>
                ) : (
                  <>
                    <AudioLines className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-400">
                      AUDIO WAVEFORM MONITOR · STANDBY
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 text-[11px] text-slate-400 tabular-nums">
                {isListening ? (
                  <>
                    <span
                      className={
                        isVoiceDetected
                          ? 'text-emerald-400 font-semibold'
                          : 'text-sky-300/80'
                      }
                    >
                      {isVoiceDetected
                        ? 'VOICE SIGNAL LOCKED'
                        : 'SPEAK INTO MIC'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="text-sky-300">Level {peakVolume}%</span>
                    <span aria-hidden="true">·</span>
                    <span className="text-white font-semibold">
                      {formattedTimer}
                    </span>
                  </>
                ) : isSpeaking ? (
                  <span className="text-emerald-400">
                    Output Gain {peakVolume}%
                  </span>
                ) : (
                  <span className="text-slate-500">
                    Click &ldquo;Tap Mic&rdquo; to activate voice waveform
                  </span>
                )}
              </div>
            </div>

            {/* 32-Band Symmetric Oscilloscope / Frequency Waveform Bars */}
            <div
              className="flex items-center justify-center gap-1 sm:gap-1.5 h-14 px-2"
              aria-hidden="true"
            >
              {audioLevels.map((lvl, idx) => {
                const activeHeightPx = isListening
                  ? Math.max(6, Math.round((lvl / 100) * 52))
                  : isSpeaking
                  ? Math.max(6, Math.round((lvl / 100) * 44))
                  : 4;

                const barColorClass = isListening
                  ? isVoiceDetected && lvl > 45
                    ? 'bg-emerald-400 shadow-xs shadow-emerald-400/50'
                    : 'bg-sky-400'
                  : isSpeaking
                  ? 'bg-emerald-400/90'
                  : isProcessing
                  ? 'bg-amber-400/60 animate-pulse'
                  : 'bg-slate-700/70';

                return (
                  <div
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-75 ${barColorClass}`}
                    style={{ height: `${activeHeightPx}px` }}
                  />
                );
              })}
            </div>

            {/* Live Transcript / Listening / Thinking Controls Footer inside Waveform Box */}
            {isListening ? (
              <div className="mt-2.5 pt-2.5 border-t border-sky-500/20 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs text-sky-200 text-left truncate max-w-md">
                  {interimTranscript
                    ? `Live transcript: "${interimTranscript}..."`
                    : 'Listening for voice command... (auto-sends on pause)'}
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Cancel</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold text-white bg-sky-600 hover:bg-sky-500 transition-colors cursor-pointer"
                  >
                    <Send className="w-3 h-3" />
                    <span>Finish &amp; Send</span>
                  </button>
                </div>
              </div>
            ) : isProcessing ? (
              <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
                <p className="font-mono text-xs text-amber-200 text-left truncate max-w-md">
                  Thinking &amp; dispatching via ferrum.py...
                </p>
                <button
                  type="button"
                  onClick={stopThinking}
                  className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-mono font-semibold text-white bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer shrink-0"
                >
                  <Square className="w-3 h-3 fill-current" />
                  <span>Stop Thinking</span>
                </button>
              </div>
            ) : (
              <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="truncate">
                  {thinkingStoppedNotice ? (
                    <span className="text-amber-300">
                      {thinkingStoppedNotice}
                    </span>
                  ) : (
                    <>
                      Last command:{' '}
                      <span className="text-slate-200">
                        &ldquo;{activeTurn.userTranscript}&rdquo;
                      </span>
                    </>
                  )}
                </span>
                <span className="text-slate-500 shrink-0 hidden sm:inline">
                  32-Band Acoustic Spectrum
                </span>
              </div>
            )}
          </div>

          {/* Microphone Error Notice if Blocked */}
          {micError && (
            <div className="max-w-lg mx-auto mb-3 px-4 py-2.5 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{micError}</span>
            </div>
          )}

          {/* Ferrum Spoken Response Display */}
          <div className="max-w-2xl mx-auto">
            <h1
              className="font-display text-xl sm:text-2xl md:text-3xl font-semibold text-white leading-snug tracking-tight"
              style={{ textWrap: 'balance' }}
            >
              &ldquo;{activeResponse.spokenResponse}&rdquo;
            </h1>
          </div>

          {/* Subtle Single-Line Execution Trace */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[11px] text-slate-400">
            {activeResponse.executionPath.map((step, idx) => (
              <React.Fragment key={`${step}-${idx}`}>
                <span
                  className={
                    step === 'ferrum.py' ||
                    step === activeResponse.dispatchedModule
                      ? 'text-emerald-400 font-medium'
                      : 'text-slate-400'
                  }
                >
                  {step}
                </span>
                {idx < activeResponse.executionPath.length - 1 && (
                  <ArrowRight className="w-3 h-3 text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Active Module Output Card & Persistent Memory (data.txt) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left 8 Cols: Active Module Telemetry Card */}
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 font-mono text-xs text-emerald-400">
                  <span>{activeResponse.dispatchedModule}</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-400">
                    {activeResponse.externalService}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-slate-500">
                    {activeResponse.dataArtifact}
                  </span>
                </div>
                <h2 className="font-display text-base font-semibold text-white mt-1">
                  {activeResponse.payload.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {activeResponse.payload.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => speakText(activeResponse.spokenResponse)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Replay Voice</span>
              </button>
            </div>

            {/* Structured Metrics Grid */}
            {activeResponse.payload.metrics &&
              activeResponse.payload.metrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {activeResponse.payload.metrics.map((metric, idx) => (
                    <div
                      key={`${metric.label}-${idx}`}
                      className="bg-slate-950/70 border border-slate-800/90 rounded-lg p-3"
                    >
                      <div className="text-[11px] font-mono text-slate-400">
                        {metric.label}
                      </div>
                      <div className="text-sm font-mono font-semibold text-white mt-1 tabular-nums">
                        {metric.value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            {/* Structured Items List */}
            {activeResponse.payload.items &&
              activeResponse.payload.items.length > 0 && (
                <div className="space-y-2.5">
                  {activeResponse.payload.items.map((item, idx) => (
                    <div
                      key={`${item.title}-${idx}`}
                      className="flex items-start justify-between gap-4 p-3 rounded-lg bg-slate-950/60 border border-slate-800/80"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-slate-100">
                          {item.title}
                        </div>
                        <div className="text-xs text-slate-400 leading-relaxed">
                          {item.detail}
                        </div>
                      </div>
                      {item.meta && (
                        <span className="font-mono text-[11px] text-slate-500 whitespace-nowrap shrink-0 tabular-nums">
                          {item.meta}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Right 4 Cols: Persistent data.txt Memory & Recent Log */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="font-mono text-xs text-sky-400">
                  data.txt · Persistent Notes
                </div>
                <h3 className="font-display text-sm font-semibold text-white mt-0.5">
                  Ferrum Memory Store
                </h3>
              </div>
              {savedNotes.length > 0 && (
                <button
                  type="button"
                  onClick={() => persistNotes([])}
                  className="text-xs font-mono text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Clear data.txt notes"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {savedNotes.length === 0 ? (
              <p className="text-xs text-slate-500 leading-relaxed py-2">
                No notes stored in <code className="font-mono">data.txt</code>.
                Say{' '}
                <span className="text-slate-300">
                  &ldquo;Remember that...&rdquo;
                </span>{' '}
                to write a new entry.
              </p>
            ) : (
              <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {savedNotes.map((note, index) => (
                  <li
                    key={`${note}-${index}`}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2"
                  >
                    <span className="font-mono text-emerald-400 shrink-0 tabular-nums">
                      0{index + 1}
                    </span>
                    <span className="leading-relaxed">{note}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Recent Session Transcript Count */}
            {turns.length > 1 && (
              <div className="pt-3 border-t border-slate-800 space-y-2">
                <div className="font-mono text-[11px] text-slate-400">
                  Recent Voice Commands ({turns.length - 1})
                </div>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {turns.slice(1, 4).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => executeCommand(t.userTranscript)}
                      className="w-full text-left text-xs text-slate-400 hover:text-slate-200 truncate font-mono py-1 cursor-pointer"
                    >
                      <span className="text-slate-600">{t.timestamp}</span> ·{' '}
                      {t.userTranscript}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Bottom Command Input Bar & Quick Voice Presets */}
        <section className="space-y-4 pb-2">
          {/* Quick Voice Command Triggers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {VOICE_PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.label}
                  type="button"
                  disabled={isProcessing}
                  onClick={() => executeCommand(preset.prompt)}
                  className="group text-left p-3 rounded-xl bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800/90 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between text-slate-400 group-hover:text-emerald-400 transition-colors">
                    <Icon className="w-4 h-4" />
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-200 truncate">
                      {preset.label}
                    </div>
                    <div className="font-mono text-[10px] text-slate-500 truncate mt-0.5">
                      {preset.module}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Command Bar with Inline Listening Indicator */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeCommand(inputCommand);
            }}
            className={`flex items-center gap-3 rounded-xl p-2 shadow-lg border transition-colors ${
              isListening
                ? 'bg-sky-950/30 border-sky-500/70'
                : 'bg-slate-900 border-slate-700/90 focus-within:border-emerald-500/70'
            }`}
          >
            <button
              type="button"
              onClick={toggleListening}
              disabled={isProcessing}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg transition-colors cursor-pointer shrink-0 font-mono text-xs font-medium ${
                isListening
                  ? 'bg-sky-600 hover:bg-sky-500 text-white animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title={
                isListening
                  ? 'Stop recording and send voice command'
                  : 'Record voice command via Microphone'
              }
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">
                {isListening ? `Listening (${formattedTimer})` : 'Voice'}
              </span>
            </button>

            <input
              type="text"
              value={inputCommand}
              onChange={(e) => setInputCommand(e.target.value)}
              placeholder={
                isListening
                  ? interimTranscript
                    ? `Capturing voice: "${interimTranscript}..."`
                    : 'Microphone recording active — speak your command now...'
                  : 'Ask Ferrum anything (e.g., "What is the weather?", "Read top news", "Remember launch is Friday")...'
              }
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none font-sans px-1"
            />

            {isListening ? (
              <button
                type="button"
                onClick={stopVoiceRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer shrink-0"
              >
                <span>Stop &amp; Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : isProcessing ? (
              <button
                type="button"
                onClick={stopThinking}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition-colors cursor-pointer shrink-0"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Thinking</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={!inputCommand.trim()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors cursor-pointer shrink-0"
              >
                <span>Send to Ferrum</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
