import { readFileSync } from "node:fs";
import { join } from "node:path";
import { APP_VERSION } from "./app-version";

describe("APP_VERSION", () => {
  it("matches the latest semantic version in the changelog", () => {
    const changelog = readFileSync(join(process.cwd(), "CHANGELOG.md"), "utf8");
    const latestVersion = changelog.match(/^## \[(\d+\.\d+\.\d+)\]/m)?.[1];

    expect(latestVersion).toBe(APP_VERSION);
  });
});
