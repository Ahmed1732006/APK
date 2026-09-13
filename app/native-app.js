/* IN THE VOID Android-only UX layer.
   Keeps downloaded files inside the app, provides an in-app image/video/PDF viewer,
   and turns the standalone admin tools into normal in-app pages with a safe Back button. */
(() => {
  const isAndroid = !!(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.platform === 'android');
  if (!isAndroid) return;

  const DB_NAME = 'in_the_void_app_files';
  const STORE = 'files';
  const META_PREFIX = 'iv_app_cached_v2:';

  const css = document.createElement('style');
  css.id = 'iv-native-app-style';
  css.textContent = `
    .iv-file-viewer{position:fixed;inset:0;z-index:110000;background:rgba(3,7,12,.94);display:flex;align-items:center;justify-content:center;padding:14px;backdrop-filter:blur(10px)}
    .iv-file-panel{position:relative;width:min(1000px,96vw);height:min(92vh,900px);border:1px solid rgba(255,255,255,.14);border-radius:22px;background:rgba(12,18,28,.98);box-shadow:0 30px 90px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden}
    .iv-file-head{min-height:58px;display:flex;align-items:center;gap:8px;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.1);color:#fff;direction:rtl}
    .iv-file-head strong{min-width:0;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font:800 13px/1.4 Cairo,system-ui,sans-serif}
    .iv-file-head button{border:1px solid rgba(255,255,255,.13);background:rgba(255,255,255,.07);color:#fff;border-radius:11px;padding:8px 11px;cursor:pointer;font:800 11px Cairo,system-ui,sans-serif}
    .iv-file-body{flex:1;min-height:0;overflow:auto;padding:14px;display:flex;align-items:center;justify-content:center}
    .iv-file-body img{max-width:100%;max-height:100%;object-fit:contain;border-radius:12px}
    .iv-file-body video{width:100%;max-height:100%;background:#000;border-radius:12px}
    .iv-pdf-pages{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%}
    .iv-pdf-page{background:#fff;box-shadow:0 8px 25px rgba(0,0,0,.25);max-width:100%;height:auto;display:block}
    .iv-pdf-loading{color:#dbeafe;font:800 13px Cairo,system-ui,sans-serif;text-align:center;padding:30px}
    .iv-native-back{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;margin:0 0 14px!important;padding:10px 14px!important;border:1px solid var(--border,#dbe5ef)!important;border-radius:13px!important;background:var(--surface,#fff)!important;color:var(--text,#111827)!important;font:900 12px Cairo,system-ui,sans-serif!important;box-shadow:0 5px 16px rgba(15,23,42,.06)!important;cursor:pointer!important}
    .iv-native-back:hover{transform:translateY(-1px)}
    .iv-native-note{padding:9px 12px;border-radius:12px;background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.18);color:#64748b;font:700 11px/1.8 Cairo,system-ui,sans-serif;margin:0 0 12px}
    @media(max-width:600px){.iv-file-viewer{padding:7px}.iv-file-panel{width:100%;height:96vh;border-radius:18px}.iv-file-head{min-height:54px}.iv-file-body{padding:8px}.iv-native-back{width:100%;margin-bottom:10px!important}}
  `;
  document.head.appendChild(css);

  function openDb(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE,{keyPath:'key'}); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error||new Error('تعذر فتح التخزين المحلي.'));
    });
  }
  async function dbGet(key){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readonly').objectStore(STORE).get(key);r.onsuccess=()=>resolve(r.result||null);r.onerror=()=>reject(r.error);});
  }
  async function dbPut(row){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(row);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});
  }
  async function dbDelete(key){
    const db=await openDb();
    return new Promise((resolve,reject)=>{const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(key);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error);});
  }
  function keyFor(path){ return META_PREFIX + String(path||''); }
  function getMeta(path){ try{return JSON.parse(localStorage.getItem(keyFor(path))||'null');}catch(_){return null;} }
  function setMeta(path,meta){ try{localStorage.setItem(keyFor(path),JSON.stringify(meta));}catch(_){} }
  function clearMeta(path){ try{localStorage.removeItem(keyFor(path));}catch(_){} }
  function fileNameFrom(path){ return decodeURIComponent(String(path||'').split('?')[0].split('/').pop()||'file'); }
  function mimeFor(name, fallback='application/octet-stream'){
    const ext=String(name||'').split('.').pop().toLowerCase();
    return ({pdf:'application/pdf',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/x-m4v'})[ext]||fallback;
  }
  function isPdf(name,type){return String(type||'').includes('pdf')||/\.pdf$/i.test(name||'');}
  function isImage(name,type){return String(type||'').startsWith('image/')||/\.(png|jpe?g|webp|gif|bmp)$/i.test(name||'');}
  function isVideo(name,type){return String(type||'').startsWith('video/')||/\.(mp4|webm|mov|m4v|ogv)$/i.test(name||'');}

  function showViewer(blob,name,opts={}){
    const old=document.querySelector('.iv-file-viewer'); if(old) old.remove();
    const url=URL.createObjectURL(blob);
    const overlay=document.createElement('div'); overlay.className='iv-file-viewer';
    const panel=document.createElement('div'); panel.className='iv-file-panel';
    const head=document.createElement('div'); head.className='iv-file-head';
    const title=document.createElement('strong'); title.textContent=name||'ملف';
    const other=document.createElement('button'); other.type='button'; other.textContent='فتح من برنامج آخر';
    const close=document.createElement('button'); close.type='button'; close.textContent='×'; close.setAttribute('aria-label','إغلاق');
    head.append(title);
    if(isPdf(name,blob.type)) head.append(other);
    head.append(close);
    const body=document.createElement('div'); body.className='iv-file-body';
    panel.append(head,body); overlay.append(panel); document.body.append(overlay);
    const cleanup=()=>{URL.revokeObjectURL(url);overlay.remove();};
    close.onclick=cleanup; overlay.addEventListener('click',e=>{if(e.target===overlay)cleanup();});

    if(isImage(name,blob.type)){
      const img=document.createElement('img'); img.src=url; img.alt=name||'صورة'; body.append(img);
    }else if(isVideo(name,blob.type)){
      const v=document.createElement('video'); v.src=url; v.controls=true; v.autoplay=true; v.playsInline=true; body.append(v);
    }else if(isPdf(name,blob.type)){
      const pages=document.createElement('div'); pages.className='iv-pdf-pages'; body.append(pages);
      const loading=document.createElement('div'); loading.className='iv-pdf-loading'; loading.textContent='جاري فتح ملف PDF داخل التطبيق…'; pages.append(loading);
      renderPdf(blob,pages).catch(async err=>{
        loading.textContent='تعذر عرض الـPDF داخل التطبيق. يمكنك استخدام «فتح من برنامج آخر».';
        console.warn('PDF viewer',err);
      });
      other.onclick=()=>openWithOtherApp(blob,name);
    }else{
      const note=document.createElement('div'); note.className='iv-pdf-loading'; note.textContent='تم حفظ الملف داخل التطبيق. اضغط «فتح من برنامج آخر» لاختياره بتطبيق مناسب.'; body.append(note);
      other.style.display='inline-flex'; other.onclick=()=>openWithOtherApp(blob,name);
    }
  }

  async function ensurePdfJs(){
    if(window.pdfjsLib) return window.pdfjsLib;
    await new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-iv-pdfjs]');
      if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
      const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'; s.dataset.ivPdfjs='1'; s.onload=resolve; s.onerror=()=>reject(new Error('PDF.js unavailable')); document.head.append(s);
    });
    if(!window.pdfjsLib) throw new Error('PDF.js unavailable');
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    return window.pdfjsLib;
  }
  async function renderPdf(blob,container){
    const pdfjs=await ensurePdfJs();
    const data=new Uint8Array(await blob.arrayBuffer());
    const doc=await pdfjs.getDocument({data}).promise;
    container.innerHTML='';
    for(let i=1;i<=doc.numPages;i++){
      const page=await doc.getPage(i);
      const base=page.getViewport({scale:1});
      const maxWidth=Math.min(container.clientWidth||900,900);
      const scale=Math.max(.7,Math.min(1.65,maxWidth/base.width));
      const viewport=page.getViewport({scale});
      const canvas=document.createElement('canvas'); canvas.className='iv-pdf-page';
      canvas.width=Math.ceil(viewport.width); canvas.height=Math.ceil(viewport.height);
      container.append(canvas);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    }
  }

  async function openWithOtherApp(blob,name){
    try{
      const file=new File([blob],name||'file.pdf',{type:blob.type||mimeFor(name)});
      if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
        await navigator.share({title:name||'ملف PDF',text:'فتح الملف باستخدام تطبيق آخر',files:[file]});
        return;
      }
      throw new Error('SHARE_UNAVAILABLE');
    }catch(err){
      if(err?.name==='AbortError') return;
      try{
        const u=URL.createObjectURL(blob); window.open(u,'_blank'); setTimeout(()=>URL.revokeObjectURL(u),15000);
      }catch(_){ alert('هذا الجهاز لا يوفر اختيار برنامج خارجي لهذا الملف.'); }
    }
  }

  async function getMaterialBlob(path,name){
    const {data,error}=await sb.storage.from('materials').download(path);
    if(error) throw error;
    return data;
  }
  async function cacheMaterial(button){
    const path=button?.dataset?.file; const name=button?.dataset?.name||fileNameFrom(path)||'ملف';
    if(!path) throw new Error('لا يوجد مسار للملف.');
    if(typeof window.__midadStartDownloadAnimation==='function') window.__midadStartDownloadAnimation(button);
    try{
      const blob=await getMaterialBlob(path,name);
      const key=keyFor(path);
      await dbPut({key,path,name,type:blob.type||mimeFor(name),blob,savedAt:Date.now()});
      setMeta(path,{name,type:blob.type||mimeFor(name),savedAt:Date.now()});
      if(typeof window.__midadCompleteDownloadAnimation==='function') window.__midadCompleteDownloadAnimation(button);
      updateButtons();
      showViewer(blob,name);
    }catch(err){
      if(typeof window.__midadCancelDownloadAnimation==='function') window.__midadCancelDownloadAnimation(button);
      throw err;
    }
  }
  async function openCached(path,name,button){
    const row=await dbGet(keyFor(path));
    if(!row?.blob){clearMeta(path);updateButtons();return false;}
    showViewer(row.blob,row.name||name||'ملف');
    return true;
  }
  function updateButtons(){
    document.querySelectorAll('.btn-download[data-act="download-file"][data-file]').forEach(btn=>{
      const path=btn.dataset.file; const cached=!!getMeta(path);
      btn.classList.add('iv-native-file-btn');
      btn.dataset.cached=cached?'1':'0';
      if(cached){
        btn.innerHTML='<i class="fas fa-folder-open"></i> فتح';
        btn.title='الملف محفوظ داخل التطبيق — اضغط لفتحه';
      }else{
        btn.innerHTML='<i class="fas fa-download"></i> تحميل';
        btn.title='حفظ الملف داخل التطبيق';
      }
    });
  }

  // Capture before the platform's normal download handler. In Android, nothing
  // is written to the public Downloads folder; the file stays in app storage.
  document.addEventListener('click',async e=>{
    const btn=e.target?.closest?.('.btn-download[data-act="download-file"][data-file]');
    if(!btn) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    const path=btn.dataset.file; const name=btn.dataset.name||fileNameFrom(path)||'ملف';
    try{
      if(getMeta(path)){
        const opened=await openCached(path,name,btn);
        if(opened) return;
      }
      await cacheMaterial(btn);
    }catch(err){showToast?.(err?.message||'تعذر حفظ الملف داخل التطبيق.','error');}
  },true);

  // Clicking a material image opens it in the same app instead of doing nothing.
  document.addEventListener('click',e=>{
    const thumb=e.target?.closest?.('.item-thumb[data-material-image]');
    if(!thumb) return;
    e.preventDefault();e.stopPropagation();
    const url=thumb.dataset.materialImage; if(!url) return;
    showViewerUrl(url,thumb.dataset.materialName||'صورة');
  },true);
  async function showViewerUrl(url,name){
    try{
      const r=await fetch(url); const blob=await r.blob(); showViewer(blob,name);
    }catch(err){window.open(url,'_blank');}
  }

  const observer=new MutationObserver(()=>updateButtons());
  observer.observe(document.body,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',updateButtons,{once:true});
  setTimeout(updateButtons,0);
  window.__ivNativeFileOpen=showViewer;
})();
