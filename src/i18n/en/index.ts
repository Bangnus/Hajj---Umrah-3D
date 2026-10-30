import { registerEn } from '..';
import { EN_CORE } from './core';
import { EN_HAJJ } from './hajj';
import { EN_MADINAH } from './madinah';
import { EN_UMRAH } from './umrah';

registerEn({ ...EN_CORE, ...EN_UMRAH, ...EN_MADINAH, ...EN_HAJJ });
