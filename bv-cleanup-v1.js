/* BV LANCHES — camada de estabilidade final
   Camada leve de compatibilidade. A limpeza completa do Motoboy fica
   centralizada em bv-motoboy-v3.js para evitar listeners/loops duplicados.
*/
(()=>{
 'use strict';
 window.BV_CLEANUP_VERSION='2026.09.25.140';
 function apply(){
   if(String(window.BV_ROLE||'').toLowerCase()!=='motoboy') return;
   const allowed=new Set(['pedidos','taxa-entrega']);
   document.querySelectorAll('.sideNav [data-page]').forEach(el=>{
     const p=el.dataset.page;
     el.style.setProperty('display',allowed.has(p)?'':'none','important');
   });
   document.querySelectorAll('.sideNav .navTitle,.sideNav .adminOnly,.sideBottom .adminOnly').forEach(el=>{
     el.style.setProperty('display','none','important');
   });
 }
 const boot=()=>{apply();setTimeout(apply,250);};
 if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
 else boot();
})();