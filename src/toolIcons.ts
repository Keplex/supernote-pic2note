/** The editor and its read-only quick-start examples use these exact assets. */
export const toolImages = {
  compare: [require('../assets/compare.png'), require('../assets/compare-white.png')],
  undo: [require('../assets/undo.png'), require('../assets/undo-white.png')],
  redo: [require('../assets/redo.png'), require('../assets/redo-white.png')],
  rotate: [require('../assets/rotate.png'), require('../assets/rotate-white.png')],
  mirrorX: [require('../assets/mirror-x.png')], mirrorY: [require('../assets/mirror-y.png')],
  invert: [require('../assets/invert.png'), require('../assets/invert-white.png')],
  mask: [require('../assets/mask.png'), require('../assets/mask-white.png')],
  dockLeft: [require('../assets/dock-left.png')], dockRight: [require('../assets/dock-right.png')],
};
export type ToolIcon = keyof typeof toolImages;
