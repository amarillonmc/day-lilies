import { describe, expect, it } from "vitest";
import { compileCard } from "../src/domain/compiler";
import {
  createCard,
  createEffect,
  createOperation,
  createProject,
} from "../src/domain/model";

function fixture() {
  const card = createCard(100040001);
  card.kind = "spell";
  const block = createEffect("sequence", card);
  const a = createOperation("destroy"),
    b = createOperation("banish"),
    c = createOperation("recover");
  a.targetName = "Separate group A";
  b.targetName = "Separate group B";
  c.selection = "result";
  c.reference = a.uid;
  block.operations = [a, b, c];
  card.effects = [block];
  return {
    card,
    block,
    a,
    b,
    c,
    project: { ...createProject(), cards: [card] },
  };
}

describe("independent target groups and named results", () => {
  it("compiles multiple target groups with joint allocation and chain-local cleanup", () => {
    const { card, project, a, b } = fixture();
    const result = compileCard(card, project);
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual(
      [],
    );
    expect(result.lua).toContain("CHAININFO_CHAIN_ID");
    expect(result.lua).toContain(
      "EVENT_CHAIN_NEGATED,EVENT_CHAIN_DISABLED,EVENT_CHAIN_END",
    );
    expect(result.lua).toContain("augment(owner[c],seen)");
    expect(result.lua).toContain(`targets["${a.uid}"]`);
    expect(result.lua).toContain(`targets["${b.uid}"]`);
    expect(result.lua).toContain("Card.IsRelateToChain");
    expect(result.lua).not.toContain("SetLabelObject");
    expect(result.lua).toContain("g:DeleteGroup()");
  });
  it("can reference any declared target group and any earlier actual result", () => {
    const { card, project, a, b, c } = fixture();
    c.selection = "target-group";
    c.reference = b.uid;
    expect(compileCard(card, project).lua).toContain(
      `local g=targets["${b.uid}"]`,
    );
    c.selection = "result";
    c.reference = a.uid;
    expect(compileCard(card, project).lua).toContain(
      `local g=results["${a.uid}"]`,
    );
  });
  it("rejects missing, future and duplicate result identifiers", () => {
    const { card, project, a, c } = fixture();
    a.selection = "result";
    a.reference = c.uid;
    expect(
      compileCard(card, project).diagnostics.some((d) =>
        d.message.includes("前面的处理"),
      ),
    ).toBe(true);
    a.selection = "target";
    c.reference = "deleted";
    expect(compileCard(card, project).lua).toBe("");
    c.reference = a.uid;
    c.uid = a.uid;
    expect(
      compileCard(card, project).diagnostics.some((d) =>
        d.message.includes("不能重复"),
      ),
    ).toBe(true);
  });
  it("keeps overlap opt-in on both groups and never falls back to selected cards after failure", () => {
    const { card, project, a, b } = fixture();
    a.targetOverlap = "allow";
    b.targetOverlap = "allow";
    const result = compileCard(card, project);
    expect(result.lua).toContain("local overlap={true,true}");
    expect(result.lua).toContain("not (overlap[i] and overlap[j])");
    expect(result.lua).toContain("if not success then previous=nil end");
    expect(result.lua).toContain("if previous then previous:KeepAlive()");
  });
  it("does not sum mutually exclusive branches into a guaranteed operation count", () => {
    const { card, project, block, a, b } = fixture();
    b.action = "destroy";
    b.next = "if-failed";
    block.operations = [a, b];
    const lua = compileCard(card, project).lua;
    expect(
      lua.match(/Duel.SetOperationInfo\(0,CATEGORY_DESTROY,/g),
    ).toHaveLength(1);
    expect(lua).toContain("Duel.SetOperationInfo(0,CATEGORY_DESTROY,nil,0,");
  });
});
