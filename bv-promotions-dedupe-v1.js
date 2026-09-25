/* BV LANCHES — deduplicação de promoções v1 */
(()=>{
  'use strict';
  const key=v=>String(v??'').trim().toLowerCase();
  const uniqueById=list=>{
    const seen=new Set();
    return (Array.isArray(list)?list:[]).filter(item=>{
      const id=key(item?.id);
      if(!id||seen.has(id))return false;
      seen.add(id);return true;
    });
  };
  const normalizePromotionData=()=>{
    if(Array.isArray(window.promotions))window.promotions=uniqueById(window.promotions);
    if(window.promotionItems&&typeof window.promotionItems==='object'){
      const clean={};
      Object.keys(window.promotionItems).forEach(id=>{
        const seen=new Set();
        clean[id]=(Array.isArray(window.promotionItems[id])?window.promotionItems[id]:[]).filter(item=>{
          const product=key(item?.product_id||item?.id);
          if(!product)return false;
          const signature=product+'|'+Math.max(1,Number(item?.quantity)||1);
          if(seen.has(signature))return false;
          seen.add(signature);return true;
        });
      });
      window.promotionItems=clean;
    }
  };
  const wrap=(name,after)=>{
    const original=window[name];
    if(typeof original!=='function'||original.__bvPromoDedupe)return;
    const wrapped=function(...args){const result=original.apply(this,args);try{after();}catch(e){console.warn('[BV PROMO DEDUPE]',e)}return result};
    wrapped.__bvPromoDedupe=true;
    window[name]=wrapped;
  };
  const apply=()=>{
    normalizePromotionData();
    wrap('BV_REFRESH_PROMOTIONS',normalizePromotionData);
    wrap('renderProducts',normalizePromotionData);
    wrap('renderPromotionsAdmin',normalizePromotionData);
    wrap('renderHomePromoBanner',normalizePromotionData);
  };
  window.BV_PROMOTIONS_DEDUPE_VERSION='2026.09.25.1';
  apply();
  setTimeout(apply,250);
  setTimeout(apply,1000);
})();
