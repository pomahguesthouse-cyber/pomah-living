import { describe, expect, it } from "vitest";
import { defaultCriteria, evaluateSurvey, masterSchema } from "@/lib/prepurchase";
describe("prepurchase", () => {
  it("validates default master and never treats unanswered survey as complete", () => {
    expect(masterSchema.safeParse(defaultCriteria).success).toBe(true);
    const r = evaluateSurvey({criteria:defaultCriteria,answers:{},notes:""});
    expect(r.complete).toBe(false);
    expect(r.score).toBeNull();
    expect(r.unknownCritical).toContain("Indikasi tanah bergerak / longsor");
  });
  it("flags critical risk despite otherwise high score", () => {
    const answers = Object.fromEntries(defaultCriteria.map(c=>[c.id,[...c.options].sort((a,b)=>b.score-a.score)[0]?.label ?? ""]));
    answers["soil"] = "Ya";
    const r = evaluateSurvey({criteria:defaultCriteria,answers,notes:""});
    expect(r.complete).toBe(true);
    expect(r.recommendation).toBe("Perlu pemeriksaan teknis");
  });
});
