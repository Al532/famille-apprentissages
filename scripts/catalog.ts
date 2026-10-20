import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {catalogSchema} from '@famille/core';
const [action,source='content']=process.argv.slice(2),target='packages/catalog/catalog.json',archivePath='packages/catalog/archive.json';
async function readSource(){
 const manifest=JSON.parse(await readFile(path.join(source,'catalog.json'),'utf8'));
 if(!Array.isArray(manifest.packs)||new Set(manifest.packs).size!==manifest.packs.length)throw new Error('Liste de packs invalide ou dupliquée.');
 const modules=[];
 for(const pack of manifest.packs){if(typeof pack!=='string'||!/^packs\/[a-z0-9-]+\.json$/.test(pack))throw new Error('Chemin de pack invalide.');modules.push(JSON.parse(await readFile(path.join(source,pack),'utf8')));}
 return catalogSchema.parse({schemaVersion:manifest.schemaVersion,revision:manifest.revision,modules});
}
const archive=JSON.parse(await readFile(archivePath,'utf8')).map((c:unknown)=>catalogSchema.parse(c));
if(new Set(archive.map((c:{revision:string})=>c.revision)).size!==archive.length)throw new Error('Révisions archivées dupliquées.');
if(action==='import'){
 const catalog=await readSource(),previous=catalogSchema.parse(JSON.parse(await readFile(target,'utf8')));
 const known=[previous,...archive].find(c=>c.revision===catalog.revision);
 if(known&&JSON.stringify(known)!==JSON.stringify(catalog))throw new Error('Révision publiée déjà utilisée : incrémenter la révision du catalogue.');
 if(previous.revision!==catalog.revision&&!archive.some((c:{revision:string})=>c.revision===previous.revision))archive.push(previous);
 await writeFile(archivePath,JSON.stringify(archive,null,2)+'\n');
 await writeFile(target,JSON.stringify(catalog,null,2)+'\n');console.log('Catalogue importé ; anciennes corrections archivées pour le suivi.');
}else if(action==='validate'){
 const catalog=catalogSchema.parse(JSON.parse(await readFile(target,'utf8'))),sourceCatalog=await readSource();
 if(JSON.stringify(catalog)!==JSON.stringify(sourceCatalog))throw new Error('Le catalogue embarqué ne correspond pas aux packs. Exécuter npm run catalog:import puis committer les changements ensemble.');
 console.log(`${catalog.modules.length} modules validés et synchronisés avec les packs sources, révision ${catalog.revision}.`);
}else throw new Error('Commande inconnue.');
