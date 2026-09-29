import type { Modifier } from '@dnd-kit/core';

/** Keep tab drags on the horizontal axis (avoids pulling in @dnd-kit/modifiers). */
export const restrictToHorizontalAxis: Modifier = ({ transform }) => ({ ...transform, y: 0 });
