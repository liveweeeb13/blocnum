export function getBlockAppearanceClassName(block) {
  return [
    'block-appearance',
    block?.textColor && 'has-block-text-color',
    block?.backgroundColor && 'has-block-background-color',
    block?.borderEnabled && 'has-block-border',
    block?.innerPadding !== undefined && block?.innerPadding !== null && 'has-block-padding',
  ].filter(Boolean).join(' ');
}

export function getBlockAppearanceStyle(block) {
  return {
    '--block-text-color': block?.textColor || undefined,
    '--block-background-color': block?.backgroundColor || undefined,
    '--block-border-color': block?.borderEnabled ? (block.borderColor || '#cbd5e1') : undefined,
    '--block-border-width': block?.borderEnabled ? `${block.borderWidth || 1}px` : undefined,
    '--block-border-radius': block?.borderEnabled ? `${block.borderRadius ?? 8}px` : undefined,
    '--block-inner-padding': block?.innerPadding !== undefined && block?.innerPadding !== null ? `${block.innerPadding}px` : undefined,
  };
}
