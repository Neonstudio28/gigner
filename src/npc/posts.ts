/**
 * Places the town layout marks for its people: where somebody starts the day, the benches and the hang-outs.
 * The layout fills this while it builds; the townsfolk read it once the world stands.
 */
export type PostPose = 'stand' | 'sit' | 'talk' | 'hips' | 'cross' | 'point' | 'wave' | 'carry' | 'lean' | 'stride';

export interface Post {
  kind: 'stand' | 'seat';
  x: number;
  y: number;
  z: number;
  ry: number;
  /** What the place is: 'street', 'beach', 'pier', 'play', 'green', or the id of the building it belongs to. */
  tag: string;
  /** Index of that building in the site list. */
  site?: number;
  /** Somebody starts here: their model (or 'any') and what they are doing. */
  model?: string;
  pose?: PostPose;
  carry?: string;
  /** People of one ring stand talking together. */
  ring?: number;
  /** Where to stand before sitting down (seats are inside the bench's footprint). */
  ax?: number;
  az?: number;
}

const POSTS: Post[] = [];
let rings = 0;
export const posts = () => POSTS;
export function clearPosts() {
  POSTS.length = 0;
  rings = 0;
}
export function addPost(p: Post) {
  POSTS.push(p);
  return p;
}
export const newRing = () => ++rings;
