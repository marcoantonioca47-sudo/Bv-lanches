(function(){
  'use strict';
  const cats=['Lanches','Bebidas','Adicionais','Promocoes'];
  window.BV_MENU_CATEGORY=window.BV_MENU_CATEGORY||'Lanches';
  window.BV_CAT=window.BV_CAT||'Lanches';
  window.setMenuCategory=async function(cat,btn){
    cat=cats.includes(String(cat))?String(cat):'Lanches';
    window.BV_MENU_CATEGORY=cat;
    window.BV_CAT=cat;
    document.querySelectorAll('#page-cardapio .menuCategoryTabs button').forEach(function(x){
      x.classList.toggle('active',String(x.dataset.menuCategory||'')===cat);
    });
    try{
      if(cat==='Promocoes' && typeof window.BV_REFRESH_PROMOTIONS==='function'){
        await window.BV_REFRESH_PROMOTIONS();
      }
      if(typeof window.BV_REFRESH_FLAVOR_STOCKS==='function') await window.BV_REFRESH_FLAVOR_STOCKS();
      if(typeof window.renderProducts==='function') await window.renderProducts();
    }catch(e){
      console.error('[BV MENU TABS]',e);
      const box=document.getElementById('products');
      if(box) box.innerHTML='<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar esta categoria.</b><small>Tente novamente.</small><button type="button" onclick="setMenuCategory(\''+cat+'\',document.querySelector(\'#page-cardapio .menuCategoryTabs button[data-menu-category=\\\''+cat+'\\\']\'))">Tentar novamente</button></div>';
    }
  };
  window.BV_OPEN_BEBIDAS=function(){
    const b=document.querySelector('#page-cardapio .menuCategoryTabs button[data-menu-category="Bebidas"]');
    if(typeof window.showPage==='function') window.showPage('cardapio');
    return window.setMenuCategory('Bebidas',b);
  };
  window.BV_OPEN_PROMOCOES=function(){
    const b=document.querySelector('#page-cardapio .menuCategoryTabs button[data-menu-category="Promocoes"]');
    if(typeof window.showPage==='function') window.showPage('cardapio');
    return window.setMenuCategory('Promocoes',b);
  };
})();