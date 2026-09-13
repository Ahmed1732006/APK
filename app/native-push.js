(()=>{
  const native=!!(window.Capacitor?.isNativePlatform?.()||window.Capacitor?.platform==='android');
  if(!native)return;
  const Push=window.Capacitor?.Plugins?.PushNotifications;
  if(!Push)return;
  const TOKEN_KEY='iv_fcm_token_v1';
  window.__ivHasFCM=false;
  const safeSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(_){}};
  const getCurrentUser=async()=>{try{ if(typeof sb==='undefined') return null; const {data}=await sb.auth.getSession(); return data?.session?.user||null;}catch(_){return null}};
  async function saveToken(token){
    safeSet(TOKEN_KEY,token||'');
    try{
      const user=await getCurrentUser();
      if(!user||typeof sb==='undefined'||!token)return;
      const payload={user_id:user.id,token,platform:'android',updated_at:new Date().toISOString()};
      const r=await sb.from('device_push_tokens').upsert(payload,{onConflict:'token'});
      if(r.error) console.warn('FCM token storage unavailable',r.error);
    }catch(e){console.warn('FCM token save failed',e)}
  }
  async function ask(){
    try{
      let perm=await Push.checkPermissions();
      if(perm.receive==='prompt') perm=await Push.requestPermissions();
      if(perm.receive!=='granted'){
        window.__ivPushPermission='denied';
        return false;
      }
      window.__ivPushPermission='granted';
      await Push.register();
      return true;
    }catch(e){console.warn('FCM registration failed',e);return false}
  }
  Push.addListener?.('registration',e=>{if(e?.value){window.__ivHasFCM=true;saveToken(e.value)}});
  Push.addListener?.('registrationError',e=>console.warn('FCM registration error',e));
  Push.addListener?.('pushNotificationReceived',e=>{
    try{
      const d=e?.data||{};
      window.__ivHandleNativeNotification?.({kind:d.kind||'notification',id:d.id||d.notification_id||null,title:e?.title||'',body:e?.body||''});
    }catch(_){ }
  });
  Push.addListener?.('pushNotificationActionPerformed',e=>{
    const d=e?.notification?.data||e?.notification?.extra||{};
    window.__ivHandleNativeNotification?.({kind:d.kind||'notification',id:d.id||d.notification_id||null,title:e?.notification?.title||'',body:e?.notification?.body||''});
  });
  window.__ivOpenNotificationSettings=async()=>{try{await Push.requestPermissions()}catch(_){} };
  window.__ivPushRequest=ask;
  setTimeout(async()=>{const ok=await ask(); if(ok) await saveToken(localStorage.getItem(TOKEN_KEY)||'');},900);
})();
