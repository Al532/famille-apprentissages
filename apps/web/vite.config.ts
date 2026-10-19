import {defineConfig} from 'vite';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export default defineConfig(({mode})=>({
 root:path.join(root,'apps/web'),envDir:root,
 define:{__APP__:JSON.stringify(mode==='parents'?'parents':'enfants')},
 build:{outDir:path.join(root,'dist',mode==='parents'?'parents':'enfants'),emptyOutDir:true},
 server:{host:'0.0.0.0',allowedHosts:['terminal.local']},
}));
