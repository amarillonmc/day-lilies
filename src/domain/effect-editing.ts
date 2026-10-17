import { uid, type EffectBlock } from "./model";

/** Copy the block as an independent graph, preserving references inside the copy. */
export function cloneEffect(block: EffectBlock): EffectBlock {
  const copy = structuredClone(block);
  const ids = new Map<string, string>([[block.uid, uid()]]);
  for (const step of block.operations || []) ids.set(step.uid, uid());
  copy.uid = ids.get(block.uid)!;
  copy.operations = copy.operations?.map((step) => ({
    ...step,
    uid: ids.get(step.uid)!,
    ...(step.reference
      ? { reference: ids.get(step.reference) || step.reference }
      : {}),
  }));
  copy.tracking = copy.tracking?.map((rule) => ({
    ...rule,
    uid: uid(),
    sourceStep: ids.get(rule.sourceStep) || rule.sourceStep,
  }));
  return copy;
}
