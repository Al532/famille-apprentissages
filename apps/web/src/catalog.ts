import raw from '../../../packages/catalog/catalog.json';
import {catalogSchema} from '@famille/core';
export const catalog=catalogSchema.parse(raw);
