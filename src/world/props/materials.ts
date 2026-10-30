import * as THREE from 'three';
import { keepAlive } from '../../engine/lod';
import { mat } from '../common';

export const GOLD = () => mat(0xd6b25a, 0.28, { metalness: 0.78 });

const SHARED_STD_VCOL = () => keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, vertexColors: true }));
const SHARED_CLAY_VCOL = () => keepAlive(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, vertexColors: true }));
let _stdVCol: THREE.MeshStandardMaterial | null = null;
let _clayVCol: THREE.MeshStandardMaterial | null = null;
export function vcolStd() { return _stdVCol ?? (_stdVCol = SHARED_STD_VCOL()); }
export function vcolClay() { return _clayVCol ?? (_clayVCol = SHARED_CLAY_VCOL()); }
