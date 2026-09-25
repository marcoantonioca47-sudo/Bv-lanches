/* BV LANCHES — camada de estabilidade final
   Mantém o Motoboy somente em Pedidos e Taxa de entrega.
   Evita conflitos de navegação entre módulos antigos.
*/
(()=>{
 'use strict';
 const moto=()=>String(window.BV_ROLE||'').toLowerCase()==='motoboy';
 const allowed=new Set(['pedidos','taxa-entrega']);
 function apply(){
   if(!moto()) return;
   document.querySelectorAll('.sideNav [data-page]').forEach(el=>{
     const p=el.dataset.page;
     el.style.display=allowed.has(p)?'':'none';
   });
   document.querySelectorAll('.sideNav .navTitle,.sideNav .adminOnly,.sideBottom .adminOnly').forEach(el=>el.style.display='none');
   document.querySelectorAll('.cartTop,.floatingCart,.homeNotificationBar').forEach(el=>el.style.setProperty('display','none','important'));
 }
 function hook(){
   if(typeof window.showPage!=='function') return setTimeout(hook,100);
   if(window.BV_CLEAN_NAV_HOOKED) return;
   const original=window.showPage;
   window.showPage=function(page,internal){
     if(moto() && !allowed.has(String(page)) && page!=='inicio') page='pedidos';
     const r=original.call(this,page,internal);
     if(moto()) apply();
     return r;
   };
   window.BV_CLEAN_NAV_HOOKED=true;
   apply();
 }
 window.BV_CLEANUP_VERSION='2026.09.25.120';
 document.addEventListener('DOMContentLoaded',()=>{hook();setTimeout(apply,300);setTimeout(apply,1000)});
 window.addEventListener('load',()=>{hook();apply()});
})();
