import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../packages/pinthread/package.json', import.meta.url));
const { build } = require('esbuild');
const dist = new URL('./dist/', import.meta.url);
await rm(dist,{recursive:true,force:true});
await cp(new URL('../../packages/pinthread-site/dist/',import.meta.url),dist,{recursive:true});
await mkdir(new URL('setup-review/', dist), {recursive:true});
await mkdir(new URL('setup/connect/', dist), {recursive:true});
const template = await readFile(new URL('install/index.html',dist),'utf8');
const review = template.replace(/<title>[^<]+<\/title>/,"<title>Setup review — pinthread</title>").replace(/<script type="module" src="[^"]+"><\/script>/g,'<script type="module" src="/review.js"></script>')
 .replace(/<link rel="canonical"[^>]+>/,'<meta name="robots" content="noindex">')
 .replace(/<main id="main"[^>]*>[\s\S]*?<\/main>/,`<main id="main" class="document"><h1>Set up pinthread.</h1><p class="lede">Connect from your website. Start leaving feedback right here.</p><section class="doc-section"><h2>Review first-time setup</h2><p>Use the pinthread sidebar to review site addresses and connect your project. The same sidebar becomes your comments panel when setup finishes.</p><p>This interactive preview uses sample data and simulates sign-in. It does not create a Google account or a real workspace.</p></section><section class="doc-section"><h2>Try each state</h2><p><a class="text-link" href="/setup-review/">Restart setup</a></p><p><a class="text-link" href="/setup-review/?mode=peek">Replay the drawer peek</a></p><p><a class="text-link" href="/setup-review/?mode=connected">Open the connected tool</a></p></section></main>`);
await writeFile(new URL('setup-review/index.html',dist),review);
const callback = template.replace(/<script type="module" src="[^"]+"><\/script>/g,'<script type="module" src="/callback.js"></script>')
 .replace(/<main id="main"[^>]*>[\s\S]*?<\/main>/,`<main id="main" class="document"><h1>Sample connection.</h1><p class="lede">Preview the return from sign-in.</p><section class="doc-section"><p>No account is created and no credentials are requested.</p><button class="text-link" id="complete-connection">Complete sample connection →</button></section></main>`);
await writeFile(new URL('setup/connect/index.html',dist),callback);
await writeFile(new URL('callback.js',dist),`const p=new URLSearchParams(location.search);document.querySelector('#complete-connection').onclick=()=>{if(p.get('origin')!==location.origin||!window.opener)return;window.opener.postMessage({type:'pinthread:setup',code:p.get('code'),project:'pinthread_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',repo:'sample/website',token:'sample-review-token',user:{id:'google:sample',name:'Sample reviewer',verified:true}},location.origin);window.close();};`);
await writeFile(new URL('_redirects', dist), '/ /setup-review/ 302\n/setup/connect /setup/connect/index.html 200\n');
await writeFile(new URL('robots.txt',dist),'User-agent: *\nDisallow: /\n');
await build({entryPoints:[new URL('./review.ts', import.meta.url).pathname],outdir:dist.pathname,bundle:true,splitting:true,format:'esm',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'review-only-host',setup(build){build.onResolve({filter:/^@tjcages\/pinthread$/},()=>({path:'host-demo',namespace:'review'}));build.onLoad({filter:/.*/,namespace:'review'},()=>({contents:'export const initPinthread=()=>({comment(){},open(){},close(){},destroy(){},refresh(){}});',loader:'js'}));}}]});
