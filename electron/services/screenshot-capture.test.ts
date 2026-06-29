import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DesktopCapturerSource } from "electron";

const mockGetAllDisplays = vi.fn();
const mockGetSources = vi.fn();

vi.mock("electron", () => ({
  app: { isPackaged: false },
  desktopCapturer: {
    getSources: (...args: unknown[]) => mockGetSources(...args)
  },
  screen: {
    getAllDisplays: () => mockGetAllDisplays()
  }
}));

vi.mock("../utils/windows-silent-capture", () => ({
  withSilentWindowsCapture: <T>(callback: () => T) => callback()
}));

vi.mock("./screenshot-compress", () => ({
  TARGET_SCREENSHOT_BYTES: 500_000,
  PREFERRED_JPEG_QUALITY: 80,
  SCREENSHOT_CAPTURE_MAX_WIDTH: 640,
  computeScaledDimensions: (width: number, height: number, maxWidth: number) => ({
    width: width <= maxWidth ? width : maxWidth,
    height: width <= maxWidth ? height : Math.max(1, Math.round((height * maxWidth) / width))
  }),
  encodeNativeImageToJpeg: () => ({
    buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]),
    quality: 80
  })
}));

import {
  captureAllDisplaysJpeg,
  listScreenCaptureSources,
  pickPrimaryScreenSource,
  sortScreenSourcesByDisplayOrder
} from "./screenshot-capture";

function mockSource(
  id: string,
  width: number,
  height: number,
  displayId?: string
): DesktopCapturerSource {
  return {
    id,
    name: id,
    display_id: displayId,
    thumbnail: {
      getSize: () => ({ width, height }),
      toPNG: () => Buffer.alloc(10),
      resize: () => ({
        getSize: () => ({ width, height }),
        toPNG: () => Buffer.alloc(10),
        destroy: () => undefined
      }),
      destroy: () => undefined
    }
  } as unknown as DesktopCapturerSource;
}

describe("pickPrimaryScreenSource", () => {
  it("prefers screen sources over windows and largest area", () => {
    const picked = pickPrimaryScreenSource([
      mockSource("window:1", 400, 720),
      mockSource("screen:0", 1920, 1080),
      mockSource("screen:1", 1280, 720)
    ]);
    expect(picked?.id).toBe("screen:0");
  });
});

describe("listScreenCaptureSources", () => {
  it("returns only screen sources when present", () => {
    const sources = [
      mockSource("window:1", 400, 720),
      mockSource("screen:0", 1920, 1080),
      mockSource("screen:1", 1280, 720)
    ];
    expect(listScreenCaptureSources(sources).map((source) => source.id)).toEqual([
      "screen:0",
      "screen:1"
    ]);
  });
});

describe("sortScreenSourcesByDisplayOrder", () => {
  beforeEach(() => {
    mockGetAllDisplays.mockReset();
  });

  it("orders screens left-to-right by display bounds", () => {
    mockGetAllDisplays.mockReturnValue([
      { id: 2, bounds: { x: 1920, y: 0, width: 1920, height: 1080 } },
      { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } }
    ]);

    const sorted = sortScreenSourcesByDisplayOrder([
      mockSource("screen:2", 1920, 1080, "2"),
      mockSource("screen:1", 1920, 1080, "1")
    ]);

    expect(sorted.map((source) => source.id)).toEqual(["screen:1", "screen:2"]);
  });

  it("places unknown display_id sources last by thumbnail area", () => {
    mockGetAllDisplays.mockReturnValue([
      { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } }
    ]);

    const sorted = sortScreenSourcesByDisplayOrder([
      mockSource("screen:unknown", 800, 600),
      mockSource("screen:1", 1920, 1080, "1")
    ]);

    expect(sorted.map((source) => source.id)).toEqual(["screen:1", "screen:unknown"]);
  });
});

describe("captureAllDisplaysJpeg", () => {
  beforeEach(() => {
    mockGetSources.mockReset();
    mockGetAllDisplays.mockReset();
    mockGetAllDisplays.mockReturnValue([
      { id: 1, bounds: { x: 0, y: 0, width: 1920, height: 1080 } },
      { id: 2, bounds: { x: 1920, y: 0, width: 1280, height: 720 } }
    ]);
  });

  it("returns one JPEG result per connected display", async () => {
    mockGetSources.mockResolvedValue([
      mockSource("screen:1", 1920, 1080, "1"),
      mockSource("screen:2", 1280, 720, "2")
    ]);

    const results = await captureAllDisplaysJpeg({ width: 1280, height: 720 });
    expect(results).toHaveLength(2);
    expect(results[0]?.sourceId).toBe("screen:1");
    expect(results[0]?.displayId).toBe("1");
    expect(results[1]?.sourceId).toBe("screen:2");
    expect(results[1]?.displayId).toBe("2");
  });

  it("returns a single result for one display", async () => {
    mockGetSources.mockResolvedValue([mockSource("screen:1", 1920, 1080, "1")]);

    const results = await captureAllDisplaysJpeg({ width: 1280, height: 720 });
    expect(results).toHaveLength(1);
  });
});
