import {defineConfig} from 'vite';
import {pwaPlugin} from '../../scripts/pwa';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
export default defineConfig(({mode})=>({
 root:path.join(root,'apps/web'),envDir:root,
 plugins:[pwaPlugin(mode==='parents')],
 base:process.env.GITHUB_PAGES_BASE!==undefined?`${process.env.GITHUB_PAGES_BASE.replace(/\/$/,'')}/${mode==='parents'?'parents':'enfants'}/`:'/',
 define:{__APP__:JSON.stringify(mode==='parents'?'parents':'enfants')},
 build:{outDir:path.join(root,'dist',mode==='parents'?'parents':'enfants'),emptyOutDir:true},
 server:{host:'0.0.0.0',allowedHosts:['terminal.local']},
}));
