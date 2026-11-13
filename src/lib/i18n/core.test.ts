import { describe, expect, it } from "vitest";
import { plural, translate } from "./core";

const ru = (s: string, v?: Record<string, string | number>) => translate("ru", s, v);

describe("i18n", () => {
  it("returns English unchanged and fills vars", () => {
    expect(translate("en", "Today")).toBe("Today");
    expect(translate("en", "Savi stage {n}: {name}", { n: 2, name: "Sprout" })).toBe("Savi stage 2: Sprout");
  });
  it("translates exact keys and falls back to English", () => {
    expect(ru("Today")).toBe("Сегодня");
    expect(ru("Some text nobody translated")).toBe("Some text nobody translated");
  });
  it("picks Russian plural forms", () => {
    expect(["1", "2", "5", "11", "21", "24"].map((n) => plural(n, "день", "дня", "дней"))).toEqual(["день", "дня", "дней", "дней", "день", "дня"]);
    expect(ru("3 days left")).toBe("осталось 3 дня");
  });
  it("matches generated sentences and translates captured foods and lists", () => {
    expect(ru("Last chance for baby spinach and pork chops.")).toBe("Последний шанс: молодой шпинат и свиные отбивные.");
    expect(ru("Uses up spinach (2 days left) and feta (date is today)")).toBe("Использует шпинат (осталось 2 дня) и фета (срок сегодня)");
    expect(ru("Freeze it by tomorrow: it then keeps for weeks.")).toBe("Заморозьте до завтра — так продукт пролежит неделями.");
  });
  it("translates quantities", () => {
    expect(ru("2 pcs")).toBe("2 шт");
    expect(ru("1.5 kg")).toBe("1,5 кг");
  });
});
