import { describe, expect, it } from "vitest";
import { pickPrimaryScreenSource } from "./screenshot-capture";
import type { DesktopCapturerSource } from "electron";

function mockSource(id: string, width: number, height: number): DesktopCapturerSource {
  return {
    id,
    name: id,
    display_id: id,
    thumbnail: {
      getSize: () => ({ width, height }),
      toPNG: () => Buffer.alloc(10),
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
