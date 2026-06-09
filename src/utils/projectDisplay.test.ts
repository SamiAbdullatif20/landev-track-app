import { describe, expect, it } from "vitest";
import { getProjectDisplayLabel, projectMatchesQuery } from "./projectDisplay";

describe("projectDisplay", () => {
  it("uses displayLabel for the primary line", () => {
    expect(
      getProjectDisplayLabel({
        displayLabel: "P-1042",
        name: "123 Main St, Auckland",
        projectNumber: "P-1042"
      })
    ).toBe("P-1042");
  });

  it("filters on searchLabel (address), not displayLabel alone", () => {
    const project = {
      id: "1",
      name: "123 Main St",
      displayLabel: "P-1042",
      searchLabel: "123 Main Street, Auckland",
      projectNumber: "P-1042",
      projectAddress: "123 Main Street, Auckland",
      clientName: "Acme Ltd"
    };
    expect(projectMatchesQuery(project, "main street")).toBe(true);
    expect(projectMatchesQuery(project, "P-1042")).toBe(true);
    expect(projectMatchesQuery(project, "acme")).toBe(true);
    expect(projectMatchesQuery(project, "zzz")).toBe(false);
  });
});
