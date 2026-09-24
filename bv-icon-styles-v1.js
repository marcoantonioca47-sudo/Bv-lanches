/* BV LANCHES — ícones com estilo padrão salvo (3D Red) */
(function(){
  const DEFAULT_STYLE='7';
  function applyDefault(){
    document.documentElement.dataset.bvIconStyle=DEFAULT_STYLE;
    try{localStorage.setItem('bv_icon_style',DEFAULT_STYLE)}catch(e){}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',applyDefault,{once:true});
  else applyDefault();
})();