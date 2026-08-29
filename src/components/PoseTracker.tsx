import { useEffect, useRef, useState } from "react";
import { PushupDetector, POSE_CONNECTIONS, type DetectorFrame } from "@/lib/pushup-detector";

type Props = {
  /** When false the detector keeps rendering the skeleton but stops counting. */
  counting: boolean;
  onRep: () => void;
  onFrame?: (frame: DetectorFrame) => void;
};

const WASM_BASE = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

/**
 * Live camera push-up tracker. Runs MediaPipe Pose Landmarker fully on-device,
 * draws a yellow skeleton overlay and reports detected reps in real time.
 * Browser-only: must be rendered behind <ClientOnly>.
 */
export function PoseTracker({ counting, onRep, onFrame }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detector = useRef(new PushupDetector());
  const countingRef = useRef(counting);
  const onRepRef = useRef(onRep);
  const onFrameRef = useRef(onFrame);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("Loading pose engine…");

  countingRef.current = counting;
  onRepRef.current = onRep;
  onFrameRef.current = onFrame;

  useEffect(() => {
    let stream: MediaStream | null = null;
    let raf = 0;
    let landmarker: import("@mediapipe/tasks-vision").PoseLandmarker | null = null;
    let cancelled = false;
    let lastVideoTime = -1;

    async function boot() {
      try {
        const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
        const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
        landmarker = await PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
        if (cancelled) return;

        setMessage("Requesting camera…");
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) return;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();
        setStatus("ready");
        loop();
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setMessage(
          error instanceof Error && error.name === "NotAllowedError"
            ? "Camera permission denied — allow access to use the live tracker."
            : "Could not start the camera tracker on this device.",
        );
      }
    }

    function loop() {
      raf = requestAnimationFrame(loop);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !landmarker || video.readyState < 2) return;
      if (video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;

      const result = landmarker.detectForVideo(video, performance.now());
      const landmarks = result.landmarks?.[0] ?? null;

      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (landmarks) drawSkeleton(ctx, landmarks, canvas.width, canvas.height);
      }

      const before = detector.current.reps;
      const frame = detector.current.update(
        countingRef.current ? landmarks : null,
        performance.now(),
      );
      if (frame.reps > before) onRepRef.current();
      onFrameRef.current?.(frame);
    }

    void boot();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((track) => track.stop());
      landmarker?.close();
    };
  }, []);

  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-border bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full object-cover"
        aria-hidden
      />
      {status !== "ready" && (
        <div className="absolute inset-0 grid place-items-center bg-background/80 px-6 text-center">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">{message}</p>
        </div>
      )}
    </div>
  );
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  landmarks: Array<{ x: number; y: number; visibility?: number }>,
  width: number,
  height: number,
) {
  ctx.lineWidth = Math.max(3, width * 0.005);
  ctx.strokeStyle = "#FFD400";
  ctx.shadowColor = "rgba(255, 212, 0, 0.6)";
  ctx.shadowBlur = 12;

  for (const [a, b] of POSE_CONNECTIONS) {
    const p1 = landmarks[a];
    const p2 = landmarks[b];
    if (!p1 || !p2) continue;
    if ((p1.visibility ?? 1) < 0.4 || (p2.visibility ?? 1) < 0.4) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x * width, p1.y * height);
    ctx.lineTo(p2.x * width, p2.y * height);
    ctx.stroke();
  }

  ctx.fillStyle = "#FFF176";
  const radius = Math.max(4, width * 0.007);
  landmarks.forEach((point, index) => {
    if (index > 32 || (point.visibility ?? 1) < 0.4) return;
    ctx.beginPath();
    ctx.arc(point.x * width, point.y * height, radius, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;
}
