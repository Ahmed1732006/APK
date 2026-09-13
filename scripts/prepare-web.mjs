import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd(), out=join(root,'www');
if(existsSync(out)) rmSync(out,{recursive:true,force:true}); mkdirSync(out,{recursive:true});
const skip=new Set(['node_modules','.git','.github','android','www','package.json','package-lock.json','capacitor.config.json','scripts']);
for(const name of readdirSync(root)){if(skip.has(name))continue;cpSync(join(root,name),join(out,name),{recursive:true});}
const vendor=join(out,'vendor'); mkdirSync(vendor,{recursive:true});
const appVendor=join(out,'app','vendor'); mkdirSync(appVendor,{recursive:true});
const copies=[
['node_modules/@supabase/supabase-js/dist/umd/supabase.js',join(vendor,'supabase.min.js')],
['node_modules/gsap/dist/gsap.min.js',join(vendor,'gsap.min.js')],
['node_modules/gsap/dist/Draggable.min.js',join(vendor,'Draggable.min.js')],
['node_modules/gsap/dist/MorphSVGPlugin.min.js',join(vendor,'MorphSVGPlugin.min.js')],
['node_modules/jszip/dist/jszip.min.js',join(appVendor,'jszip.min.js')],
['node_modules/pdf-lib/dist/pdf-lib.min.js',join(appVendor,'pdf-lib.min.js')],
['node_modules/pdfjs-dist/build/pdf.min.js',join(appVendor,'pdf.min.js')],
['node_modules/pdfjs-dist/build/pdf.worker.min.js',join(appVendor,'pdf.worker.min.js')]];
for(const [src,dst] of copies) cpSync(join(root,src),dst);
function patch(file,pairs){const f=join(out,file);if(!existsSync(f))return;let s=readFileSync(f,'utf8');for(const [a,b] of pairs)s=s.split(a).join(b);writeFileSync(f,s);}
patch('index.html',[["https://cdn.jsdelivr.net/npm/gsap@3/dist/gsap.min.js",'./vendor/gsap.min.js'],["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",'./vendor/supabase.min.js'],["https://cdn.jsdelivr.net/npm/gsap@3/dist/Draggable.min.js",'./vendor/Draggable.min.js'],["https://assets.codepen.io/16327/MorphSVGPlugin3.min.js",'./vendor/MorphSVGPlugin.min.js']]);
patch('admin-manager.html',[["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",'./vendor/supabase.min.js']]);
patch('admin-videos.html',[["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",'./vendor/supabase.min.js']]);
patch('pdf-forensic-scanner.html',[["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",'./vendor/supabase.min.js'],["https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",'./app/vendor/pdf-lib.min.js']]);
patch('app/index.html',[["https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",'vendor/supabase.min.js'],["https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",'vendor/jszip.min.js'],["https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js",'vendor/pdf-lib.min.js']]);
console.log(`Prepared web assets in ${out}`);


function injectNativeRuntime(file){
  const f=join(out,file); if(!existsSync(f)) return;
  let s=readFileSync(f,'utf8');
  s=s.replace(/\n<script src="\.\/app\/native-navigation\.js"><\/script>/g,'').replace(/\n<script src="\.\/app\/native-notifications\.js"><\/script>/g,'').replace(/\n<script src="\.\/app\/native-push\.js"><\/script>/g,'');
  const tags=`\n<script src="./app/native-navigation.js"></script>`;
  if(/<\/body>/i.test(s)) s=s.replace(/<\/body>/i,tags+'\n</body>'); else s+=tags;
  writeFileSync(f,s);
}
for(const f of ['admin-manager.html','admin-videos.html','pdf-forensic-scanner.html']) injectNativeRuntime(f);
