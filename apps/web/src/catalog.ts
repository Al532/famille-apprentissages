import raw from '../../../packages/catalog/catalog.json';
import archive from '../../../packages/catalog/archive.json';
import {catalogSchema} from '@famille/core';
export const catalog=catalogSchema.parse(raw);
export const catalogs=[catalog,...archive.map(c=>catalogSchema.parse(c)).filter(c=>c.revision!==catalog.revision)];
