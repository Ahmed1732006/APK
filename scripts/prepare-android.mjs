import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const root=process.cwd();
const android=join(root,'android');
if(!existsSync(android)) throw new Error('Android platform is missing.');
const src=join(root,'android-icon.png');
const densities=['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi'];
for(const d of densities){
  const dir=join(android,'app','src','main','res',`mipmap-${d}`);
  mkdirSync(dir,{recursive:true});
  copyFileSync(src,join(dir,'ic_launcher.png'));
  copyFileSync(src,join(dir,'ic_launcher_round.png'));
}
const manifest=join(android,'app','src','main','AndroidManifest.xml');
if(existsSync(manifest)){
  let s=readFileSync(manifest,'utf8');
  s=s.replace(/android:icon="[^"]*"/,'android:icon="@mipmap/ic_launcher"');
  s=s.replace(/android:roundIcon="[^"]*"/,'android:roundIcon="@mipmap/ic_launcher_round"');
  writeFileSync(manifest,s);
}
const values=join(android,'app','src','main','res','values');
mkdirSync(values,{recursive:true});
const colors=join(values,'colors.xml');
let c=existsSync(colors)?readFileSync(colors,'utf8'):'<resources></resources>';
if(!c.includes('iv_splash_bg')) c=c.replace('</resources>', '  <color name="iv_splash_bg">#05070D</color>\n</resources>');
writeFileSync(colors,c);
function patchTheme(path){
 if(!existsSync(path)) return;
 let s=readFileSync(path,'utf8');
 s=s.replace(/android:windowSplashScreenBackground="[^"]*"/g,'android:windowSplashScreenBackground="@color/iv_splash_bg"');
 s=s.replace(/<item name="android:windowSplashScreenAnimatedIcon">[^<]*<\/item>/g,'<item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>');
 writeFileSync(path,s);
}
patchTheme(join(values,'themes.xml'));
patchTheme(join(values,'styles.xml'));
