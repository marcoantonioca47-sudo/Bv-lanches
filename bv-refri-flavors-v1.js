/* BV LANCHES — Refri Mini com 4 sabores e estoque individual */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
const toast=m=>{const x=$('toast');if(x){x.textContent=String(m);x.classList.add('show');setTimeout(()=>x.classList.remove('show'),3000)}};
const sb=()=>window.BV_SUPABASE||window.sb;
const MINI_FLAVORS=[
  {key:'coca',label:'Coca',emoji:'🥤'},
  {key:'pepsi',label:'Pepsi',emoji:'🥤'},
  {key:'guarana',label:'Guaraná',emoji:'🥤'},
  {key:'laranja',label:'Laranja',emoji:'🍊'}
];
const isMini=p=>norm(p?.name)==='refri mini';
const is2L=p=>norm(p?.name)==='refri 2l';
const flavorConfig=p=>isMini(p)?MINI_FLAVORS:[{key:'guarana',label:'Guaraná',emoji:'🥤'},{key:'laranja',label:'Laranja',emoji:'🍊'}];
const flavorLabel=(p,key)=>flavorConfig(p).find(x=>x.key===key)?.label||key;

window.BV_REFRESH_FLAVOR_STOCKS=async()=>{
  const db=sb(); if(!db)return false;
  const ps=(window.products||[]).filter(p=>isMini(p)||is2L(p));
  if(!ps.length){window.BV_FLAVOR_STOCKS={};return false}
  try{
    const ids=ps.map(p=>p.id);
    const r=await db.from('product_flavor_stock').select('product_id,flavor,stock').in('product_id',ids);
    if(r.error)throw r.error;
    const next={};
    ps.forEach(p=>flavorConfig(p).forEach(f=>next[String(p.id)+'::'+f.key]=0));
    (r.data||[]).forEach(row=>{
      const k=norm(row.flavor);
      const p=ps.find(x=>String(x.id)===String(row.product_id));
      if(p&&flavorConfig(p).some(f=>f.key===k))next[String(row.product_id)+'::'+k]=Math.max(0,Number(row.stock)||0);
    });
    window.BV_FLAVOR_STOCKS=next;
    return true;
  }catch(e){console.error('[BV REFRI FLAVORS]',e);return false}
};

const oldAdd=window.BV_ADD_PRODUCT_TO_CART;
window.BV_ADD_PRODUCT_TO_CART=(p,flavor='')=>{
  if(!p||!isMini(p))return typeof oldAdd==='function'?oldAdd(p,flavor):undefined;
  const key=norm(flavor), valid=MINI_FLAVORS.find(f=>f.key===key);
  if(!valid)return toast('Escolha um sabor para o Refri Mini.');
  const stock=Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[String(p.id)+'::'+key]??0));
  const cartId=String(p.id)+'::'+key;
  const existing=(window.cart||[]).find(x=>String(x.id)===cartId);
  if(stock<=0)return toast('Este sabor está esgotado.');
  if((Number(existing?.q)||0)>=stock)return toast('Quantidade máxima disponível para '+valid.label+': '+stock+'.');
  const item={id:cartId,productId:p.id,name:String(p.name||'Refri Mini')+' — '+valid.label,price:Number(p.price)||0,q:1,category:String(p.category||'Bebidas'),flavor:valid.label};
  if(existing)existing.q=(Number(existing.q)||0)+1;else window.cart.push(item);
  localStorage.setItem('bv_cart',JSON.stringify(window.cart||[]));
  if($('count'))$('count').textContent=(window.cart||[]).reduce((s,x)=>s+(Number(x.q)||0),0);
  if($('sideCount'))$('sideCount').textContent=(window.cart||[]).reduce((s,x)=>s+(Number(x.q)||0),0);
  window.renderCart?.();toast('Refri Mini '+valid.label+' adicionado ao pedido.');
};

const oldAddToCart=window.addToCart;
window.addToCart=(id)=>{
  const p=(window.products||[]).find(x=>String(x.id)===String(id));
  if(isMini(p)){window.BV_OPEN_FLAVOR_PICKER?.(p);return}
  return typeof oldAddToCart==='function'?oldAddToCart(id):undefined;
};

const oldPicker=window.BV_OPEN_FLAVOR_PICKER;
window.BV_OPEN_FLAVOR_PICKER=async p=>{
  if(!isMini(p))return typeof oldPicker==='function'?oldPicker(p):undefined;
  const db=sb(); if(!db)return toast('Banco de dados indisponível.');
  let productId=String(p.id), stocks={};
  try{
    const r=await db.from('product_flavor_stock').select('flavor,stock').eq('product_id',productId);
    if(r.error)throw r.error;
    MINI_FLAVORS.forEach(f=>stocks[f.key]=0);
    (r.data||[]).forEach(row=>{const k=norm(row.flavor);if(MINI_FLAVORS.some(f=>f.key===k))stocks[k]=Math.max(0,Number(row.stock)||0)});
    window.BV_FLAVOR_STOCKS={...(window.BV_FLAVOR_STOCKS||{})};
    MINI_FLAVORS.forEach(f=>window.BV_FLAVOR_STOCKS[productId+'::'+f.key]=stocks[f.key]);
  }catch(e){console.error('[BV REFri MINI PICKER]',e);return toast('Não foi possível consultar os sabores.')}
  let m=$('bvFlavorModal');
  if(!m){
    m=document.createElement('div');m.id='bvFlavorModal';m.className='bvFlavorModal';
    m.innerHTML='<div class="bvFlavorBox"><button type="button" class="bvFlavorClose">×</button><small>ESCOLHA O SABOR</small><h3>Refri Mini</h3><p>Selecione o sabor:</p><div class="bvFlavorOptions"></div></div>';
    document.body.appendChild(m);
    m.querySelector('.bvFlavorClose')?.addEventListener('click',()=>window.BV_CLOSE_FLAVOR_PICKER?.());
    m.addEventListener('click',e=>{if(e.target===m)window.BV_CLOSE_FLAVOR_PICKER?.()});
  }
  m.dataset.productId=productId;m.dataset.flavorProduct='mini';
  const box=m.querySelector('.bvFlavorOptions');if(!box)return;
  box.innerHTML='';
  MINI_FLAVORS.forEach(f=>{
    const b=document.createElement('button');b.type='button';b.disabled=stocks[f.key]<=0;
    b.innerHTML=f.emoji+' '+f.label+' <small>('+stocks[f.key]+' em estoque)</small>';
    b.addEventListener('click',()=>window.BV_SELECT_FLAVOR(f.key));box.appendChild(b);
  });
  m.classList.add('show');
};

const oldSelect=window.BV_SELECT_FLAVOR;
window.BV_SELECT_FLAVOR=async flavor=>{
  const m=$('bvFlavorModal'),pId=m?.dataset.productId;
  if(!m||!pId)return;
  const p=(window.products||[]).find(x=>String(x.id)===String(pId));
  if(!isMini(p))return typeof oldSelect==='function'?oldSelect(flavor):undefined;
  const key=norm(flavor),f=MINI_FLAVORS.find(x=>x.key===key);
  if(!f)return toast('Sabor inválido.');
  const stock=Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[pId+'::'+key]??0));
  const existing=(window.cart||[]).find(x=>String(x.id)===pId+'::'+key);
  if(stock<=0)return toast('Este sabor está esgotado.');
  if((Number(existing?.q)||0)>=stock)return toast('Quantidade máxima disponível: '+stock+'.');
  window.BV_CLOSE_FLAVOR_PICKER?.();
  window.BV_ADD_PRODUCT_TO_CART?.(p,f.label);
};

const oldChange=window.change;
window.change=async(id,d)=>{
  const r=(window.cart||[]).find(x=>String(x.id)===String(id));
  const p=r&&(window.products||[]).find(x=>String(x.id)===String(r.productId||String(r.id).split('::')[0]));
  if(!p||!isMini(p)||r?.isPromotion)return typeof oldChange==='function'?oldChange(id,d):undefined;
  const key=norm(r.flavor),stock=Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[String(p.id)+'::'+key]??0));
  if(Number(d)>0&&Number(r.q||0)>=stock)return toast('Quantidade máxima disponível para '+flavorLabel(p,key)+': '+stock+'.');
  r.q=(Number(r.q)||0)+Number(d||0);if(r.q<=0)window.cart=window.cart.filter(x=>String(x.id)!==String(id));
  localStorage.setItem('bv_cart',JSON.stringify(window.cart||[]));window.renderCart?.();
};

const oldAdjust=window.adjustProductFlavorStock;
window.adjustProductFlavorStock=async(productId,flavor,delta)=>{
  const p=(window.products||[]).find(x=>String(x.id)===String(productId));
  const allowed=flavorConfig(p).some(f=>f.key===norm(flavor));
  if(!allowed)return typeof oldAdjust==='function'?oldAdjust(productId,flavor,delta):undefined;
  if(!['administrador','admin'].includes(String(window.BV_ROLE||'').toLowerCase()))return toast('Acesso restrito ao administrador.');
  const db=sb();if(!db)return toast('Banco de dados indisponível.');
  const key=norm(flavor),label=flavorLabel(p,key);
  try{
    const r=await db.rpc('adjust_product_flavor_stock',{p_product_id:String(productId),p_flavor:label,p_delta:Number(delta)||0});
    if(r.error)throw r.error;
    await window.BV_REFRESH_FLAVOR_STOCKS();
    window.renderProductsAdmin?.();window.renderProducts?.();
    toast(label+' atualizado: '+Number(r.data||0));return Number(r.data||0);
  }catch(e){console.error('[BV MINI STOCK]',e);toast('Erro ao atualizar estoque de '+label+': '+(e?.message||'tente novamente.'));return null}
};

const oldRender=window.renderProducts;
window.renderProducts=async()=>{
  if(typeof oldRender!=='function')return;
  await oldRender();
  const cat=window.BV_CAT||'Lanches';if(cat!=='Bebidas')return;
  const minis=(window.products||[]).filter(p=>p.active!==false&&isMini(p));
  if(!minis.length)return;
  await window.BV_REFRESH_FLAVOR_STOCKS?.();
  document.querySelectorAll('#products .productCard').forEach(card=>{
    const title=norm(card.querySelector('h3')?.textContent);
    if(title!=='refri mini')return;
    const p=minis.find(x=>norm(x.name)==='refri mini');if(!p)return;
    const stocks=MINI_FLAVORS.map(f=>({f,n:Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[String(p.id)+'::'+f.key]??0))}));
    let box=card.querySelector('.flavorStock');
    if(!box){box=document.createElement('div');box.className='catalogStock flavorStock';const info=card.querySelector('.productInfo');info?.insertBefore(box,info.querySelector('.productBottom'))}
    box.innerHTML='<span>ESTOQUE POR SABOR</span><div class="flavorStockGrid">'+stocks.map(x=>'<div class="flavorStockItem"><span>'+x.f.emoji+' '+x.f.label+'</span><strong>'+x.n+'</strong></div>').join('')+'</div>';
    const bottom=card.querySelector('.productBottom');const oldBtn=bottom?.querySelector('button');if(oldBtn){oldBtn.disabled=false;oldBtn.classList.remove('addDisabled');oldBtn.textContent='+ Escolher sabor';oldBtn.onclick=()=>window.BV_OPEN_FLAVOR_PICKER?.(p)}
    card.classList.toggle('productOutOfStock',stocks.every(x=>x.n<=0));\n    hideMiniGeneralStock();
  });
};

const hideMiniGeneralStock=()=>{\n  document.querySelectorAll('#products .productCard,#manage .adminProductCard').forEach(card=>{\n    const title=norm(card.querySelector('h3')?.textContent);\n    if(title!=='refri mini')return;\n    card.querySelectorAll('.catalogStock:not(.flavorStock),.adminStockBox:not(.adminMiniFlavorBox),[class*="stockControl"]:not(.adminMiniFlavorBox)').forEach(el=>el.style.display='none');\n    card.querySelectorAll('input[name*="stock"],input[id*="stock"]').forEach(el=>{const row=el.closest('.formRow,.field,.adminStockBox,.productInfo'); if(row&&!row.querySelector('.adminMiniFlavorBox'))row.style.display='none'});\n  });\n};\n\nconst oldAdmin=window.renderProductsAdmin;
window.renderProductsAdmin=async()=>{
  if(typeof oldAdmin!=='function')return;
  await oldAdmin();
  const minis=(window.products||[]).filter(p=>p.active!==false&&isMini(p));if(!minis.length)return;
  await window.BV_REFRESH_FLAVOR_STOCKS?.();
  const cards=[...document.querySelectorAll('#manage .adminProductCard')];
  cards.forEach(card=>{
    const title=norm(card.querySelector('h3')?.textContent);if(title!=='refri mini')return;
    const p=minis.find(x=>norm(x.name)==='refri mini');if(!p)return;
    let box=card.querySelector('.adminMiniFlavorBox');
    if(!box){box=document.createElement('div');box.className='adminStockBox adminMiniFlavorBox';const info=card.querySelector('.productInfo');info?.insertBefore(box,info.querySelector('.productBottom'))}
    box.innerHTML='<span style="display:block;margin-bottom:8px">ESTOQUE POR SABOR</span>'+MINI_FLAVORS.map(f=>'<div class="adminStockControls" style="justify-content:space-between;margin-top:8px"><b>'+f.emoji+' '+f.label+'</b><button type="button" class="stockMinus" onclick="adjustProductFlavorStock(\''+p.id+'\',\''+f.label+'\',-1)">−</button><strong>'+Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[String(p.id)+'::'+f.key]??0))+'</strong><button type="button" class="stockPlus" onclick="adjustProductFlavorStock(\''+p.id+'\',\''+f.label+'\',1)">+</button></div>').join('');
  });
};

if(!$('bvMiniFlavorStyle')){
 const st=document.createElement('style');st.id='bvMiniFlavorStyle';st.textContent='.flavorStockGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.adminMiniFlavorBox{display:block!important}.adminMiniFlavorBox .adminStockControls b{font-size:12px;min-width:92px}.bvFlavorOptions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.bvFlavorOptions button{min-height:50px}.bvFlavorOptions button small{display:block;margin-top:3px;opacity:.7}@media(max-width:600px){.flavorStockGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.bvFlavorOptions{grid-template-columns:1fr 1fr}.adminMiniFlavorBox .adminStockControls b{min-width:82px;font-size:11px}}</style>';document.head.appendChild(st);
}
window.BV_REFRI_FLAVORS_VERSION='2026.09.26.981';
})();