/**
 * WaveformVisualizer -- Canvas-based audio waveform display.
 *
 * Two modes:
 * 1. **Live mode**: Renders real-time audio level bars during recording.
 *    Pass `audioLevel` (0-1) from the `useAudioRecorder` hook.
 * 2. **Static mode**: Renders a static waveform from an AudioBuffer.
 *    Pass `audioBuffer` after recording is complete.
 *
 * Uses requestAnimationFrame for smooth 60fps rendering.
 */

import { useCallback, useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WaveformVisualizerProps {
  /** Real-time audio level (0-1) for live visualization */
  audioLevel?: number;
  /** Whether the recorder is currently active */
  isRecording?: boolean;
  /** Canvas width in CSS pixels */
  width?: number;
  /** Canvas height in CSS pixels */
  height?: number;
  /** Bar color */
  barColor?: string;
  /** Background color */
  backgroundColor?: string;
  className?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BAR_WIDTH = 3;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 2;
const MAX_HISTORY = 128;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WaveformVisualizer({
  audioLevel = 0,
  isRecording = false,
  width = 300,
  height = 64,
  barColor = "#2563EB",
  backgroundColor = "transparent",
  className = "",
}: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<number[]>([]);
  const animFrameRef = useRef<number>(0);

  /**
   * Push the latest audio level into the rolling history buffer.
   */
  const pushLevel = useCallback((level: number) => {
    const history = historyRef.current;
    history.push(level);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
  }, []);

  /**
   * Draw the waveform bars on the canvas.
   */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const canvasWidth = width * dpr;
    const canvasHeight = height * dpr;

    // Set actual canvas dimensions (for crisp rendering)
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, width, height);
    if (backgroundColor !== "transparent") {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
    }

    const history = historyRef.current;
    const totalBarWidth = BAR_WIDTH + BAR_GAP;
    const maxBars = Math.floor(width / totalBarWidth);
    const barsToRender = Math.min(history.length, maxBars);

    // Calculate starting x position (right-aligned, new bars appear on the right)
    const startX = width - barsToRender * totalBarWidth;
    const startIdx = history.length - barsToRender;

    ctx.fillStyle = barColor;

    for (let i = 0; i < barsToRender; i++) {
      const level = history[startIdx + i];
      const barHeight = Math.max(
        MIN_BAR_HEIGHT,
        level * (height - 4) // leave 2px margin top/bottom
      );
      const x = startX + i * totalBarWidth;
      const y = (height - barHeight) / 2; // center vertically

      // Rounded rectangle for each bar
      const radius = Math.min(BAR_WIDTH / 2, barHeight / 2);
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + BAR_WIDTH - radius, y);
      ctx.quadraticCurveTo(x + BAR_WIDTH, y, x + BAR_WIDTH, y + radius);
      ctx.lineTo(x + BAR_WIDTH, y + barHeight - radius);
      ctx.quadraticCurveTo(
        x + BAR_WIDTH,
        y + barHeight,
        x + BAR_WIDTH - radius,
        y + barHeight
      );
      ctx.lineTo(x + radius, y + barHeight);
      ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();
    }

    // Reset the transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [width, height, barColor, backgroundColor]);

  /**
   * Animation loop: push the current level and redraw.
   */
  const animate = useCallback(() => {
    pushLevel(audioLevel);
    draw();
    animFrameRef.current = requestAnimationFrame(animate);
  }, [audioLevel, pushLevel, draw]);

  // Start/stop animation when recording state changes
  useEffect(() => {
    if (isRecording) {
      historyRef.current = [];
      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
      // Draw one final frame (shows the frozen waveform)
      draw();
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = 0;
      }
    };
  }, [isRecording, animate, draw]);

  // Redraw when audioLevel changes during recording
  useEffect(() => {
    if (isRecording) {
      pushLevel(audioLevel);
      draw();
    }
  }, [audioLevel, isRecording, pushLevel, draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className={`block ${className}`}
      role="img"
      aria-label={
        isRecording
          ? "Visualizacion de audio en vivo"
          : "Forma de onda de audio"
      }
    />
  );
}
