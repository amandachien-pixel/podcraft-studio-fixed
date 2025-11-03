'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';

interface AudioRecorderSimpleProps {
  onAudioRecorded?: (audioBlob: Blob, audioUrl: string) => void;
}

export function AudioRecorderSimple({ onAudioRecorded }: AudioRecorderSimpleProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        if (onAudioRecorded) {
          onAudioRecorded(audioBlob, url);
        }

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      toast.success('開始錄音');
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('無法訪問麥克風，請檢查權限設置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      toast.success('錄音已停止');
    }
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const deleteAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
    setIsPlaying(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    toast.success('錄音已刪除');
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
      toast.success('錄音已下載');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-4">音頻錄製</h3>

      <div className="flex flex-col gap-4">
        {/* Recording Controls */}
        <div className="flex items-center gap-2">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isRecording}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mic className="w-4 h-4" />
              開始錄音
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
            >
              <Square className="w-4 h-4" />
              停止錄音
            </button>
          )}

          {isRecording && (
            <div className="flex items-center gap-2 text-red-500">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono">{formatTime(recordingTime)}</span>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        {audioUrl && (
          <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-lg">
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <button
                onClick={playAudio}
                disabled={isPlaying}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                播放
              </button>

              <button
                onClick={downloadAudio}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                <Download className="w-4 h-4" />
                下載
              </button>

              <button
                onClick={deleteAudio}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                <Trash2 className="w-4 h-4" />
                刪除
              </button>
            </div>

            {isPlaying && (
              <div className="text-sm text-gray-600">正在播放...</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
