import type { ReactNode } from 'react';
export type ModelInteractions = { toggle: (channel: string) => void; hover: (channel: string | null) => void };
export default function PreviewPart({ channel, interactions, children }: { channel: string; interactions?: ModelInteractions; children: ReactNode }) {
  return <group onClick={event => { event.stopPropagation(); if (event.delta <= 4) interactions?.toggle(channel); }}
    onPointerOver={event => { event.stopPropagation(); interactions?.hover(channel); }} onPointerOut={event => { event.stopPropagation(); interactions?.hover(null); }}>{children}</group>;
}
