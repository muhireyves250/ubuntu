import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Nobody using the system is told how a risk colour is worked out: the words
 * "AI", "rules" or "model" must not appear in anything the app shows. This
 * reads every source file, drops comments and imports, and looks at what is
 * left (strings and on-screen text).
 */

const SRC = path.resolve(__dirname, "..");
const ENGINE_WORDS = /\b(rules?|rule engine|model|algorithm)\b|machine learning/i;
const FORBIDDEN = { test: (line: string) => /\bAI\b/.test(line) || ENGINE_WORDS.test(line) };

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.(ts|tsx)$/.test(name) && !full.includes(`${path.sep}test${path.sep}`)
      ? [full]
      : [];
  });
}

function visibleText(source: string): string[] {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .filter((line) => !/^\s*(import|export type|export interface)\b/.test(line));
}

describe("no engine wording", () => {
  it("finds the source files it is meant to check", () => {
    expect(sourceFiles(SRC).length).toBeGreaterThan(50);
  });

  it("flags engine wording when it is there", () => {
    expect(visibleText('<h3>AI Prediction</h3>').some((l) => FORBIDDEN.test(l))).toBe(true);
    expect(visibleText('const a = "Triggered rules";').some((l) => FORBIDDEN.test(l))).toBe(true);
    expect(visibleText("// the model said so").some((l) => FORBIDDEN.test(l))).toBe(false);
  });

  it("names neither the AI nor the rules anywhere a user can read it", () => {
    const hits: string[] = [];
    for (const file of sourceFiles(SRC)) {
      visibleText(readFileSync(file, "utf8")).forEach((line, i) => {
        if (FORBIDDEN.test(line)) hits.push(`${path.relative(SRC, file)}:${i + 1}: ${line.trim().slice(0, 100)}`);
      });
    }
    expect(hits).toEqual([]);
  });
});
