import { describe, expect, it } from "vitest";

import { aliasesMatch, normalizeText } from "../packages/shared/src/index";

describe("multilingual normalization", () => {
  it("strips Arabic tashkeel and tatweel and unifies letter forms", () => {
    expect(normalizeText("الجَزائِر")).toBe(normalizeText("الجزائر"));
    expect(normalizeText("الـعـاصِمَة")).toBe(normalizeText("العاصمة"));
    expect(normalizeText("مُحَمَّد")).toBe("محمد");
    expect(normalizeText("كتابة")).toBe(normalizeText("كتابه"));
    expect(normalizeText("غاية")).toBe(normalizeText("غايه"));
  });

  it("strips French accents and punctuation", () => {
    expect(normalizeText("Région")).toBe("region");
    expect(normalizeText("Élève, çà!")).toBe("eleve ca");
    expect(normalizeText("مصر، الجزائر؛")).toBe("مصر الجزاير");
  });

  it("matches aliases after normalization without contacting a provider", () => {
    expect(aliasesMatch("  الجَزائِر  ", ["الجزائر"])).toBe(true);
    expect(aliasesMatch("region", ["région"])).toBe(true);
    expect(aliasesMatch("something else", ["الجزائر"])).toBe(false);
  });
});
