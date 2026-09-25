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

 window.BV_CLEANUP_VERSION='2026.09.25.124';
 document.addEventListener('DOMContentLoaded',()=>{hook();setTimeout(apply,300);setTimeout(apply,1000)});
 window.addEventListener('load',()=>{hook();apply()});
})();
