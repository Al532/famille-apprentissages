import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {catalogSchema} from '@famille/core';
const [action,source]=process.argv.slice(2),target='packages/catalog/catalog.json';
if(action==='import'){
 if(!source)throw new Error('Usage: npm run catalog:import -- ../famille-exercices');
 const manifest=JSON.parse(await readFile(path.join(source,'catalog.json'),'utf8'));
 const modules=[];
 for(const pack of manifest.packs){if(typeof pack!=='string'||!/^packs\/[a-z0-9-]+\.json$/.test(pack))throw new Error('Chemin de pack invalide.');modules.push(JSON.parse(await readFile(path.join(source,pack),'utf8')));}
 const catalog=catalogSchema.parse({schemaVersion:manifest.schemaVersion,revision:manifest.revision,modules});
 await writeFile(target,JSON.stringify(catalog,null,2)+'\n');console.log('Catalogue importé. Revoir le diff, vérifier puis déployer les deux interfaces et les fonctions ensemble.');
}else if(action==='validate'){const catalog=catalogSchema.parse(JSON.parse(await readFile(target,'utf8')));console.log(`${catalog.modules.length} modules validés, révision ${catalog.revision}.`);}else throw new Error('Commande inconnue.');
