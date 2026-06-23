export type AntiCheatSampleInput = {
  mouseMoveCount: number;
  keyPressCount: number;
  clickCount: number;
  scrollCount: number;
  mouseActiveSeconds: number;
  clickActiveSeconds: number;
  activeSeconds: number;
  windowSeconds: number;
  pollTravelPx?: number[];
};

export type AntiCheatSampleResult = {
  validMouseSeconds: number;
  validKeyboardSeconds: number;
  validClickSeconds: number;
  flags: string[];
};

function isRepetitiveClicking(input: AntiCheatSampleInput): boolean {
  if (input.clickCount < 8) {
    return false;
  }
  if (input.keyPressCount > 0) {
    return false;
  }
  return input.mouseMoveCount <= 2;
}

function isArtificialMouseMovement(input: AntiCheatSampleInput): boolean {
  const travels = (input.pollTravelPx ?? []).filter((travel) => travel > 0);
  if (travels.length < 8) {
    return false;
  }
  if (input.scrollCount > 0 || input.keyPressCount > 0) {
    return false;
  }

  const microBandCount = travels.filter((travel) => travel >= 12 && travel <= 20).length;
  return microBandCount / travels.length >= 0.75;
}

/** Ignore repetitive clicking and artificial mouse movement (jiggler-style drift). */
export function applyAntiCheatFilter(input: AntiCheatSampleInput): AntiCheatSampleResult {
  const flags: string[] = [];
  let validMouseSeconds = Math.max(0, input.mouseActiveSeconds);
  let validClickSeconds = Math.max(0, input.clickActiveSeconds);
  let validKeyboardSeconds =
    input.keyPressCount > 0
      ? Math.min(input.activeSeconds, input.windowSeconds)
      : 0;

  if (isRepetitiveClicking(input)) {
    flags.push("repetitive_clicking");
    validMouseSeconds = 0;
    validKeyboardSeconds = 0;
    validClickSeconds = 0;
  } else if (input.clickCount >= 5 && input.mouseMoveCount === 0 && input.scrollCount === 0) {
    flags.push("repetitive_clicking");
    validMouseSeconds = 0;
    validClickSeconds = 0;
  }

  if (isArtificialMouseMovement(input)) {
    flags.push("artificial_mouse_movement");
    validMouseSeconds = Number((validMouseSeconds * 0.2).toFixed(3));
  }

  return {
    validMouseSeconds: Math.max(0, Number(validMouseSeconds.toFixed(3))),
    validKeyboardSeconds: Math.max(0, Number(validKeyboardSeconds.toFixed(3))),
    validClickSeconds: Math.max(0, Number(validClickSeconds.toFixed(3))),
    flags
  };
}
