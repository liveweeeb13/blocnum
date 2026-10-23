export function getAttachedButtons(block) {
  if (Array.isArray(block?.attachedButtons)) return block.attachedButtons;
  return block?.attachedButton ? [block.attachedButton] : [];
}
