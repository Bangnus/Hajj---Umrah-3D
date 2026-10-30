/**
 * Multi-tier Level of Detail (LOD) + per-instance camera Frustum Culling.
 * - Close range (LOD 0): high-detail sculpted multi-part geometry + shadows.
 * - Mid range (LOD 1): clean medium-poly geometry.
 * - Far range (LOD 2): ultra-low-poly matte "clay" (ดินน้ำมัน) silhouette, no shadow casting.
 * - Outside camera frustum or beyond max view distance: 0 instances uploaded / 0 triangles drawn.
 */

export { keepAlive, makeLOD, mergeParts, type PartSpec } from './lod/merge';
export { lodStats, updateLodSystem } from './lod/system';
export { createCrowdLOD, type CrowdHandle } from './lod/crowd';
export { createPropFieldLOD, type PropInstance, type PropTierLayer, type PropTierSpec } from './lod/propField';
