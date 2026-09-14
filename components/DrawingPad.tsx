"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { X, Eraser, Eye, EyeOff } from "lucide-react";

interface DrawingPadProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DrawingPad({ isOpen, onClose }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isOpaque, setIsOpaque] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    lastPos.current = pos;

    const ctx = canvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [getPos]);

  const draw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastPos.current) return;

    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }, [isDrawing, getPos]);

  const endDraw = useCallback(() => {
    setIsDrawing(false);
    lastPos.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  // Resize canvas to fill container
  useEffect(() => {
    if (!isOpen) return;

    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = "#1a1a1a";
        ctx.lineWidth = 7;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.fillStyle = "#1a1a1a";
      }
    };

    // Delay to let the DOM settle
    const timer = setTimeout(resize, 50);
    window.addEventListener("resize", resize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", resize);
    };
  }, [isOpen]);

  // Prevent body scroll when pad is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20"
      onClick={onClose}
    >
      <div
        className="relative rounded-3xl shadow-2xl flex flex-col overflow-hidden transition-colors duration-200"
        style={{ width: "min(90vw, 800px)", height: "80vh", backgroundColor: isOpaque ? "rgba(255, 255, 255, 1)" : "rgba(255, 255, 255, 0.75)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <button
            onClick={clearCanvas}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors"
            title="지우기"
            aria-label="지우기"
          >
            <Eraser size={18} />
          </button>

          <button
            onClick={() => setIsOpaque(prev => !prev)}
            className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 rounded-full transition-colors"
            title={isOpaque ? "반투명" : "불투명"}
            aria-label={isOpaque ? "반투명으로 전환" : "불투명으로 전환"}
          >
            {isOpaque ? <Eye size={18} /> : <EyeOff size={18} />}
          </button>

          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-colors"
            title="닫기"
            aria-label="닫기"
          >
            <X size={22} />
          </button>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="flex-1 min-h-0 cursor-crosshair touch-none">
          <canvas
            ref={canvasRef}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
            onTouchCancel={endDraw}
            className="block w-full h-full rounded-b-3xl"
          />
        </div>
      </div>
    </div>
  );
}
