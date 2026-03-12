import { readFileSync, readdirSync, existsSync } from "fs";
import { join, resolve } from "path";

/**
 * Loads skill markdown files from the skills/ directory at project root.
 * Each skill lives in skills/{skill-name}/SKILL.md.
 *
 * Skills are loaded once at startup (synchronous) and served from memory.
 * MCP servers communicate over stdio, so all log output goes to stderr.
 */
export class SkillLoader {
  private skills = new Map<string, string>();
  private skillsDir: string;

  constructor(skillsDir?: string) {
    // Default: skills/ directory relative to project root (2 levels up from src/skills/)
    this.skillsDir = skillsDir ?? resolve(import.meta.dirname, "../../skills");
  }

  /**
   * Read all SKILL.md files from the skills directory.
   * Safe to call multiple times (clears and reloads).
   */
  loadAll(): void {
    this.skills.clear();

    if (!existsSync(this.skillsDir)) {
      console.error(`[skills] Directory not found: ${this.skillsDir}`);
      return;
    }

    const entries = readdirSync(this.skillsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const skillFile = join(this.skillsDir, entry.name, "SKILL.md");
      if (existsSync(skillFile)) {
        try {
          const content = readFileSync(skillFile, "utf-8");
          this.skills.set(entry.name, content);
        } catch (err) {
          console.error(`[skills] Failed to read ${skillFile}: ${err}`);
        }
      }
    }

    console.error(
      `[skills] Loaded ${this.skills.size} skills: ${[...this.skills.keys()].join(", ")}`,
    );
  }

  /**
   * Get a skill's markdown content by name.
   * Returns null if the skill is not found.
   */
  get(name: string): string | null {
    return this.skills.get(name) ?? null;
  }

  /**
   * List all loaded skill names (sorted alphabetically).
   */
  list(): string[] {
    return [...this.skills.keys()].sort();
  }

  /**
   * Number of loaded skills.
   */
  get size(): number {
    return this.skills.size;
  }
}
