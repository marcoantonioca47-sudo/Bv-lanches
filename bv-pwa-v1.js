/* BV LANCHES — PWA: instalar como aplicativo + área segura */
(function(){
  let deferredPrompt=null;
  function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
  function button(){return document.getElementById('bvInstallAppBtn')}
  function show(){const b=button();if(b&&!isStandalone())b.style.display='inline-flex'}
  function applySafeArea(){
    if(!isStandalone())return;
    const id='bv-pwa-safe-area-v1';
    if(document.getElementById(id))return;
    const s=document.createElement('style');s.id=id;s.textContent=
      ':root{--bv-safe-top:env(safe-area-inset-top,0px);--bv-safe-right:env(safe-area-inset-right,0px);--bv-safe-bottom:env(safe-area-inset-bottom,0px);--bv-safe-left:env(safe-area-inset-left,0px)}'+
      'body{box-sizing:border-box;padding-left:var(--bv-safe-left);padding-right:var(--bv-safe-right);padding-bottom:var(--bv-safe-bottom)}'+
      '.topbar{padding-top:calc(10px + var(--bv-safe-top));min-height:calc(58px + var(--bv-safe-top));box-sizing:border-box}'+
      '.sideNav{padding-top:var(--bv-safe-top);padding-bottom:var(--bv-safe-bottom);box-sizing:border-box}'+
      '.content{padding-bottom:calc(24px + var(--bv-safe-bottom))}';
    document.head.appendChild(s);
  }
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show()});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;const b=button();if(b)b.style.display='none'});
  window.bvInstallApp=async function(){
    if(deferredPrompt){deferredPrompt.prompt();try{await deferredPrompt.userChoice}catch(e){}deferredPrompt=null;const b=button();if(b)b.style.display='none';return;}
    if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!isStandalone()){alert('No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.');return;}
    alert('Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.');
  };
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(()=>{}));
  document.addEventListener('DOMContentLoaded',()=>{show();applySafeArea()},{once:true});
  window.addEventListener('pageshow',applySafeArea);
})();