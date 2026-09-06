/**
 * Pure push-up detection logic — no DOM, no camera, fully unit-testable.
 * Consumes normalized pose landmarks (BlazePose 33-point model) and emits
 * rep events plus lightweight form feedback.
 *
 * The detector self-calibrates to the fighter: it learns their personal
 * lockout/bottom elbow angles and their body scale, so short arms, long arms,
 * a phone held close or a phone across the room all count the same reps.
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

/** Fallback thresholds used until the fighter's own range is learned. */
export const DOWN_ANGLE = 105;
export const UP_ANGLE = 152;

/** Side-on push-ups hide half the body, so visibility has to be forgiving. */
const MIN_VISIBILITY = 0.45;
const MIN_REP_MS = 420;
const MAX_REP_MS = 9000;
/** Hips may sag/pike this far before a rep is rejected. */
const STRAIGHT_BODY_ANGLE = 138;
/** Smoothing factor for the elbow angle (higher = snappier, noisier). */
const SMOOTHING = 0.5;
/** Frames a phase must hold before it is accepted (kills landmark jitter). */
const PHASE_HOLD_FRAMES = 2;

/** Personal elbow range must span at least this much to trust calibration. */
const MIN_LEARNED_RANGE = 32;
/** Bottom threshold at this fraction of the personal range below lockout. */
const DOWN_FRACTION = 0.55;
/** Top threshold at this fraction of the personal range below lockout. */
const UP_FRACTION = 0.22;
/** How slowly the learned extremes drift back (degrees per frame). */
const EXTREME_DECAY = 0.015;

/** Absolute floor for torso travel, in torso lengths — the anti-fake gate. */
const MIN_TRAVEL = 0.1;
/** A rep must reach this share of the fighter's own best torso travel. */
const TRAVEL_SHARE = 0.5;
/** Hips must move with the shoulders within this ratio band (whole-body dip). */
const HIP_RATIO_MIN = 0.3;
const HIP_RATIO_MAX = 2.6;
/** Frames of a visible body needed before counting starts. */
const WARMUP_FRAMES = 8;

export type Phase = "unknown" | "up" | "down";

export type DetectorFrame = {
  /** Reps counted so far. */
  reps: number;
  /** True only on the frame a rep completed. */
  repCompleted: boolean;
  phase: Phase;
  /** Smoothed mean elbow angle in degrees, or null when the body isn't visible. */
  elbowAngle: number | null;
  /** 0-100 depth of the current rep, against the fighter's own range. */
  depth: number;
  feedback: string;
  bodyVisible: boolean;
  /** True once the fighter's own range of motion has been learned. */
  calibrated: boolean;
  /** 0-100 progress of the personal calibration. */
  calibration: number;
};

function avg(a: number, b: number) {
  return (a + b) / 2;
}

function visible(...points: Array<Point | undefined>) {
  return points.every((p) => p && (p.visibility ?? 1) >= MIN_VISIBILITY);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Stateful rep counter. One instance per battle session.
 *
 * Accuracy safeguards:
 * - the elbow angle is smoothed (EMA) so landmark jitter cannot flip phases,
 * - thresholds adapt to the fighter's own lockout and bottom angles,
 * - distances are normalized by torso length, which stays measurable side-on,
 *   so the fighter's distance from the camera does not change the counting,
 * - a rep only counts if shoulders AND hips travelled together (arm-only or
 *   elbow-flapping fakes move neither, hip pumping moves only the hips),
 * - reps that are too fast or stalled too long are rejected,
 * - both the down and the lockout position must be reached, in order.
 */
export class PushupDetector {
  reps = 0;
  phase: Phase = "unknown";
  private lastRepAt = 0;
  private reachedDown = false;
  private smoothed: number | null = null;
  private candidatePhase: Phase = "unknown";
  private candidateFrames = 0;
  private downStartedAt = 0;
  private frames = 0;

  // Learned personal elbow range.
  private angleMax = Number.NEGATIVE_INFINITY;
  private angleMin = Number.POSITIVE_INFINITY;

  // Per-rep travel extremes, normalized by torso length.
  private shoulderMin = Number.POSITIVE_INFINITY;
  private shoulderMax = Number.NEGATIVE_INFINITY;
  private hipMin = Number.POSITIVE_INFINITY;
  private hipMax = Number.NEGATIVE_INFINITY;
  /** Best whole-rep shoulder travel seen so far (the fighter's own baseline). */
  private travelBest = 0;
  /** Smoothed torso length in normalized image units. */
  private torso: number | null = null;

  reset() {
    this.reps = 0;
    this.phase = "unknown";
    this.lastRepAt = 0;
    this.reachedDown = false;
    this.smoothed = null;
    this.candidatePhase = "unknown";
    this.candidateFrames = 0;
    this.downStartedAt = 0;
    this.frames = 0;
    this.angleMax = Number.NEGATIVE_INFINITY;
    this.angleMin = Number.POSITIVE_INFINITY;
    this.travelBest = 0;
    this.torso = null;
    this.resetTravel();
  }

  private resetTravel() {
    this.shoulderMin = Number.POSITIVE_INFINITY;
    this.shoulderMax = Number.NEGATIVE_INFINITY;
    this.hipMin = Number.POSITIVE_INFINITY;
    this.hipMax = Number.NEGATIVE_INFINITY;
  }

  /** Personal elbow range, once enough of it has been observed. */
  private learnedRange(): number {
    if (!Number.isFinite(this.angleMax) || !Number.isFinite(this.angleMin)) return 0;
    return this.angleMax - this.angleMin;
  }

  private get calibrated(): boolean {
    return this.frames >= WARMUP_FRAMES && this.learnedRange() >= MIN_LEARNED_RANGE;
  }

  /** Bottom / lockout thresholds, adapted to this fighter when possible. */
  private thresholds(): { down: number; up: number } {
    const range = this.learnedRange();
    const top = this.angleMax;
    if (!this.calibrated) {
      // Very first rep: the personal bottom isn't known yet, so treat a clear
      // bend away from the fighter's own lockout as the bottom. This makes the
      // opening push-up count instead of being spent on calibration.
      if (!Number.isFinite(top)) return { down: DOWN_ANGLE, up: UP_ANGLE };
      return {
        down: clamp(Math.min(DOWN_ANGLE, top - 25), 60, 140),
        up: clamp(top - 10, 112, 176),
      };
    }
    const down = clamp(top - range * DOWN_FRACTION, 68, 128);
    const up = clamp(top - range * UP_FRACTION, 128, 174);
    return up - down >= 14 ? { down, up } : { down: DOWN_ANGLE, up: UP_ANGLE };
  }

  /** Feed one frame of landmarks. `now` is a monotonic ms timestamp. */
  update(landmarks: Point[] | null | undefined, now = Date.now()): DetectorFrame {
    const calibration = Math.round(
      clamp(
        Math.min(
          this.frames / WARMUP_FRAMES,
          this.learnedRange() / MIN_LEARNED_RANGE,
        ) * 100,
        0,
        100,
      ),
    );
    const base: DetectorFrame = {
      reps: this.reps,
      repCompleted: false,
      phase: this.phase,
      elbowAngle: null,
      depth: 0,
      feedback: "Step into frame — full body visible",
      bodyVisible: false,
      calibrated: this.calibrated,
      calibration,
    };
    if (!landmarks || landmarks.length < 29) {
      this.smoothed = null;
      return base;
    }

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
    if (!leftArm && !rightArm) {
      this.smoothed = null;
      return base;
    }

    const angles: number[] = [];
    if (leftArm) angles.push(angleAt(ls!, le!, lw!));
    if (rightArm) angles.push(angleAt(rs!, re!, rw!));
    const raw = angles.reduce((s, v) => s + v, 0) / angles.length;
    this.smoothed =
      this.smoothed === null ? raw : this.smoothed + SMOOTHING * (raw - this.smoothed);
    const elbowAngle = this.smoothed;
    this.frames += 1;

    // Learn this fighter's own lockout and bottom angles, with slow decay so a
    // one-off bad frame cannot widen the range forever.
    this.angleMax = Number.isFinite(this.angleMax)
      ? Math.max(elbowAngle, this.angleMax - EXTREME_DECAY)
      : elbowAngle;
    this.angleMin = Number.isFinite(this.angleMin)
      ? Math.min(elbowAngle, this.angleMin + EXTREME_DECAY)
      : elbowAngle;

    // Body scale: torso length (shoulder→hip) stays measurable side-on, unlike
    // shoulder width, which collapses to zero in a side view.
    const torsoSamples: number[] = [];
    if (visible(ls, lh)) torsoSamples.push(Math.hypot(ls!.x - lh!.x, ls!.y - lh!.y));
    if (visible(rs, rh)) torsoSamples.push(Math.hypot(rs!.x - rh!.x, rs!.y - rh!.y));
    if (torsoSamples.length === 0) {
      // Fall back to twice the upper-arm length.
      if (leftArm) torsoSamples.push(2 * Math.hypot(ls!.x - le!.x, ls!.y - le!.y));
      else if (rightArm) torsoSamples.push(2 * Math.hypot(rs!.x - re!.x, rs!.y - re!.y));
    }
    if (torsoSamples.length > 0) {
      const sample = Math.max(
        0.05,
        torsoSamples.reduce((s, v) => s + v, 0) / torsoSamples.length,
      );
      this.torso = this.torso === null ? sample : this.torso + 0.2 * (sample - this.torso);
    }
    const torso = this.torso ?? 0.25;

    // Scale-invariant vertical positions (in torso lengths).
    const shoulderY: number | null = visible(ls, rs)
      ? avg(ls!.y, rs!.y) / torso
      : leftArm
        ? ls!.y / torso
        : rightArm
          ? rs!.y / torso
          : null;
    const hipY: number | null = visible(lh, rh)
      ? avg(lh!.y, rh!.y) / torso
      : visible(lh)
        ? lh!.y / torso
        : visible(rh)
          ? rh!.y / torso
          : null;

    if (shoulderY !== null) {
      this.shoulderMin = Math.min(this.shoulderMin, shoulderY);
      this.shoulderMax = Math.max(this.shoulderMax, shoulderY);
    }
    if (hipY !== null) {
      this.hipMin = Math.min(this.hipMin, hipY);
      this.hipMax = Math.max(this.hipMax, hipY);
    }
    const shoulderTravel =
      this.shoulderMax > this.shoulderMin ? this.shoulderMax - this.shoulderMin : 0;
    const hipTravel = this.hipMax > this.hipMin ? this.hipMax - this.hipMin : 0;
    const hipTracked = Number.isFinite(this.hipMin) && Number.isFinite(this.hipMax);

    // Hip-sag / pike check: shoulder-hip-knee should stay close to a line.
    let bodyAngle: number | null = null;
    if (visible(ls, lh, lk) && visible(rs, rh, rk)) {
      bodyAngle = avg(angleAt(ls!, lh!, lk!), angleAt(rs!, rh!, rk!));
    } else if (visible(ls, lh, lk)) {
      bodyAngle = angleAt(ls!, lh!, lk!);
    } else if (visible(rs, rh, rk)) {
      bodyAngle = angleAt(rs!, rh!, rk!);
    }
    const bodyStraight = bodyAngle === null || bodyAngle >= STRAIGHT_BODY_ANGLE;

    const { down: downThreshold, up: upThreshold } = this.thresholds();
    const depth = Math.round(
      clamp(((upThreshold - elbowAngle) / Math.max(upThreshold - downThreshold, 1)) * 100, 0, 100),
    );

    // Debounce the phase: it must hold for a few consecutive frames.
    const observed: Phase =
      elbowAngle <= downThreshold ? "down" : elbowAngle >= upThreshold ? "up" : "unknown";
    let confirmed: Phase | null = null;
    if (observed === "unknown") {
      this.candidatePhase = "unknown";
      this.candidateFrames = 0;
    } else if (observed === this.candidatePhase) {
      this.candidateFrames += 1;
      if (this.candidateFrames >= PHASE_HOLD_FRAMES) confirmed = observed;
    } else {
      this.candidatePhase = observed;
      this.candidateFrames = 1;
    }

    let repCompleted = false;
    let feedback: string;

    if (confirmed === "down") {
      if (!this.reachedDown) {
        this.reachedDown = true;
        this.downStartedAt = now;
        this.resetTravel();
      }
      this.phase = "down";
      feedback = bodyStraight ? "Good depth — push up!" : "Keep your hips in line";
    } else if (confirmed === "up") {
      const elapsed = now - this.downStartedAt;
      const paced = now - this.lastRepAt > MIN_REP_MS;
      if (this.reachedDown && paced && elapsed < MAX_REP_MS) {
        // Travel gate, measured against the fighter's own best rep.
        const travelFloor = Math.max(MIN_TRAVEL, this.travelBest * TRAVEL_SHARE);
        const movedEnough = shoulderTravel >= travelFloor;
        // Whole-body dip: hips must travel with the shoulders.
        const ratio = shoulderTravel > 0 ? hipTravel / shoulderTravel : 0;
        const wholeBody = !hipTracked || (ratio >= HIP_RATIO_MIN && ratio <= HIP_RATIO_MAX);

        if (movedEnough && wholeBody && bodyStraight) {
          this.reps += 1;
          repCompleted = true;
          this.lastRepAt = now;
          this.travelBest = Math.max(this.travelBest * 0.9, shoulderTravel);
          feedback = "Rep counted — go again";
        } else if (!bodyStraight) {
          feedback = "Rep rejected — keep your hips in line";
        } else if (!wholeBody) {
          feedback =
            ratio < HIP_RATIO_MIN
              ? "Lower your chest, not just your arms"
              : "Stop pumping your hips — move as one line";
        } else {
          feedback = "Go deeper — chest toward the floor";
        }
      } else {
        feedback = "Locked out — go down";
      }
      this.reachedDown = false;
      this.phase = "up";
      this.resetTravel();
    } else {
      this.phase = this.phase === "unknown" ? "up" : this.phase;
      feedback = !this.calibrated
        ? "Calibrating — do one full push-up"
        : this.reachedDown
          ? "Push all the way up"
          : bodyStraight
            ? "Lower your chest until your elbows bend"
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
      calibrated: this.calibrated,
      calibration,
    };
  }
}
