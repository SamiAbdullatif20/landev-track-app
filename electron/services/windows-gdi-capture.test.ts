import { describe, expect, it } from "vitest";
import { computePrimaryCaptureGeometry } from "./windows-gdi-capture";

describe("computePrimaryCaptureGeometry", () => {
  it("maps logical 1920x1080 at 200% scale to full physical 3840x2160 capture", () => {
    const geometry = computePrimaryCaptureGeometry(480, {
      bounds: { x: 0, y: 0, width: 1920, height: 1080 },
      scaleFactor: 2
    });

    expect(geometry.physicalWidth).toBe(3840);
    expect(geometry.physicalHeight).toBe(2160);
    expect(geometry.outputWidth).toBe(480);
    expect(geometry.outputHeight).toBe(270);
  });

  it("maps logical bounds on a scaled secondary-origin monitor", () => {
    const geometry = computePrimaryCaptureGeometry(480, {
      bounds: { x: -1920, y: 0, width: 1920, height: 1080 },
      scaleFactor: 1.5
    });

    expect(geometry.sourceX).toBe(-2880);
    expect(geometry.sourceY).toBe(0);
    expect(geometry.physicalWidth).toBe(2880);
    expect(geometry.physicalHeight).toBe(1620);
  });

  it("keeps 1:1 geometry when scale factor is 100%", () => {
    const geometry = computePrimaryCaptureGeometry(480, {
      bounds: { x: 0, y: 0, width: 2560, height: 1440 },
      scaleFactor: 1
    });

    expect(geometry.physicalWidth).toBe(2560);
    expect(geometry.physicalHeight).toBe(1440);
    expect(geometry.outputWidth).toBe(480);
    expect(geometry.outputHeight).toBe(270);
  });
});
