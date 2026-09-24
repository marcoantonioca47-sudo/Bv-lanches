/* BV LANCHES — PWA: instalar como aplicativo */
(function(){
  let deferredPrompt=null;
  function isStandalone(){return window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true}
  function button(){return document.getElementById('bvInstallAppBtn')}
  function show(){const b=button();if(b&&!isStandalone())b.style.display='inline-flex'}
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;show()});
  window.addEventListener('appinstalled',()=>{deferredPrompt=null;const b=button();if(b)b.style.display='none'});
  window.bvInstallApp=async function(){
    if(deferredPrompt){
      deferredPrompt.prompt();
      try{await deferredPrompt.userChoice}catch(e){}
      deferredPrompt=null;const b=button();if(b)b.style.display='none';return;
    }
    if(/iphone|ipad|ipod/i.test(navigator.userAgent)&&!isStandalone()){
      alert('No iPhone: toque em Compartilhar e depois em “Adicionar à Tela de Início”.');return;
    }
    alert('Abra o menu do navegador e escolha “Instalar aplicativo” ou “Adicionar à tela inicial”.');
  };
  if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js',{scope:'./'}).catch(()=>{}));
  document.addEventListener('DOMContentLoaded',show,{once:true});
})();