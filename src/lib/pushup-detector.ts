/**
 * Pure push-up detection logic — no DOM, no camera, fully unit-testable.
 * Consumes normalized pose landmarks (BlazePose 33-point model) and emits
 * rep events plus lightweight form feedback.
 */

export type Point = { x: number; y: number; z?: number; visibility?: number };

export const LM = {
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
} as const;

/** Skeleton edges drawn as the yellow overlay. */
export const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
  [0, 11],
  [0, 12],
];

/** Angle at point `b` formed by a-b-c, in degrees. */
export function angleAt(a: Point, b: Point, c: Point): number {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const dot = abx * cbx + aby * cby;
  const mag = Math.hypot(abx, aby) * Math.hypot(cbx, cby);
  if (mag === 0) return 180;
  const cos = Math.min(1, Math.max(-1, dot / mag));
  return (Math.acos(cos) * 180) / Math.PI;
}

export const DOWN_ANGLE = 100;
export const UP_ANGLE = 155;
const MIN_VISIBILITY = 0.5;
const MIN_REP_MS = 350;
const STRAIGHT_BODY_ANGLE = 150;

export type Phase = "unknown" | "up" | "down";

export type DetectorFrame = {
  /** Reps counted so far. */
  reps: number;
  /** True only on the frame a rep completed. */
  repCompleted: boolean;
  phase: Phase;
  /** Mean elbow angle in degrees, or null when the body isn't visible. */
  elbowAngle: number | null;
  /** 0-100 depth of the current rep. */
  depth: number;
  feedback: string;
  bodyVisible: boolean;
};

function avg(a: number, b: number) {
  return (a + b) / 2;
}

function visible(...points: Array<Point | undefined>) {
  return points.every((p) => p && (p.visibility ?? 1) >= MIN_VISIBILITY);
}

/**
 * Stateful rep counter. One instance per battle session.
 */
export class PushupDetector {
  reps = 0;
  phase: Phase = "unknown";
  private lastRepAt = 0;
  private reachedDown = false;

  reset() {
    this.reps = 0;
    this.phase = "unknown";
    this.lastRepAt = 0;
    this.reachedDown = false;
  }

  /** Feed one frame of landmarks. `now` is a monotonic ms timestamp. */
  update(landmarks: Point[] | null | undefined, now = Date.now()): DetectorFrame {
    const base: DetectorFrame = {
      reps: this.reps,
      repCompleted: false,
      phase: this.phase,
      elbowAngle: null,
      depth: 0,
      feedback: "Step into frame — full body side-on",
      bodyVisible: false,
    };
    if (!landmarks || landmarks.length < 29) return base;

    const ls = landmarks[LM.leftShoulder];
    const rs = landmarks[LM.rightShoulder];
    const le = landmarks[LM.leftElbow];
    const re = landmarks[LM.rightElbow];
    const lw = landmarks[LM.leftWrist];
    const rw = landmarks[LM.rightWrist];
    const lh = landmarks[LM.leftHip];
    const rh = landmarks[LM.rightHip];
    const lk = landmarks[LM.leftKnee];
    const rk = landmarks[LM.rightKnee];

    const leftArm = visible(ls, le, lw);
    const rightArm = visible(rs, re, rw);
    if (!leftArm && !rightArm) return base;

    const angles: number[] = [];
    if (leftArm) angles.push(angleAt(ls, le, lw));
    if (rightArm) angles.push(angleAt(rs, re, rw));
    const elbowAngle = angles.reduce((s, v) => s + v, 0) / angles.length;

    // Hip-sag / pike check: shoulder-hip-knee should stay close to a line.
    let bodyAngle: number | null = null;
    if (visible(ls, lh, lk) && visible(rs, rh, rk)) {
      bodyAngle = avg(angleAt(ls, lh, lk), angleAt(rs, rh, rk));
    } else if (visible(ls, lh, lk)) {
      bodyAngle = angleAt(ls, lh, lk);
    } else if (visible(rs, rh, rk)) {
      bodyAngle = angleAt(rs, rh, rk);
    }

    const depth = Math.round(
      Math.min(100, Math.max(0, ((UP_ANGLE - elbowAngle) / (UP_ANGLE - DOWN_ANGLE)) * 100)),
    );

    let repCompleted = false;
    let feedback = "";

    const bodyStraight = bodyAngle === null || bodyAngle >= STRAIGHT_BODY_ANGLE;

    if (elbowAngle <= DOWN_ANGLE) {
      this.phase = "down";
      this.reachedDown = true;
      feedback = bodyStraight ? "Good depth — push up!" : "Keep your hips in line";
    } else if (elbowAngle >= UP_ANGLE) {
      if (this.reachedDown && now - this.lastRepAt > MIN_REP_MS) {
        this.reps += 1;
        repCompleted = true;
        this.lastRepAt = now;
      }
      this.reachedDown = false;
      this.phase = "up";
      feedback = bodyStraight ? "Locked out — go down" : "Keep your hips in line";
    } else {
      this.phase = this.phase === "unknown" ? "up" : this.phase;
      feedback = this.reachedDown
        ? "Push all the way up"
        : bodyStraight
          ? "Lower until elbows bend to 90°"
          : "Keep your hips in line";
    }

    return {
      reps: this.reps,
      repCompleted,
      phase: this.phase,
      elbowAngle: Math.round(elbowAngle),
      depth,
      feedback,
      bodyVisible: true,
    };
  }
}
