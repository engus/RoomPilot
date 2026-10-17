import { expect, it } from 'vitest';
import { findRoomOverlaps } from './overlaps';

const rectangle = (id: string, x: number, y: number, width: number, height: number) => ({
  id, polygon: [{ x, y }, { x: x + width, y }, { x: x + width, y: y + height }, { x, y: y + height }],
});

it('finds a small room completely swallowed by a large room', () => {
  expect(findRoomOverlaps([rectangle('large', 0, 0, 100, 100), rectangle('small', 60, 20, 20, 30)])).toEqual([['large', 'small']]);
});

it('finds crossing rooms even when neither contains a vertex of the other', () => {
  expect(findRoomOverlaps([rectangle('horizontal', 0, 40, 100, 20), rectangle('vertical', 40, 0, 20, 100)])).toEqual([['horizontal', 'vertical']]);
});

it('finds identical outlines and collinear partial overlaps', () => {
  expect(findRoomOverlaps([rectangle('first', 0, 0, 100, 100), rectangle('same', 0, 0, 100, 100), rectangle('partial', 0, 80, 100, 100)])).toEqual([['first', 'same'], ['first', 'partial'], ['same', 'partial']]);
});

it('does not flag shared walls, shared corners, or separated rooms', () => {
  expect(findRoomOverlaps([rectangle('first', 0, 0, 100, 100), rectangle('wall', 100, 0, 100, 100), rectangle('corner', 200, 100, 100, 100), rectangle('separate', 0, 300, 100, 100)])).toEqual([]);
});

it('respects the cutout of an L-shaped room instead of comparing bounding boxes', () => {
  const hallway = { id: 'hallway', polygon: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 40 }, { x: 40, y: 40 }, { x: 40, y: 100 }, { x: 0, y: 100 }] };
  expect(findRoomOverlaps([hallway, rectangle('inside-cutout', 40, 40, 60, 60)])).toEqual([]);
  expect(findRoomOverlaps([hallway, rectangle('crossing-cutout', 30, 30, 60, 60)])).toEqual([['hallway', 'crossing-cutout']]);
});

it('detects overlaps at normalized coordinate scale without changing the supplied rooms', () => {
  const rooms = [rectangle('large', 0, 0, 1, 1), rectangle('small', 0.5, 0.5, 0.2, 0.2)];
  const original = structuredClone(rooms);
  expect(findRoomOverlaps(rooms)).toEqual([['large', 'small']]);
  expect(rooms).toEqual(original);
});
