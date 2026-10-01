/* BV LANCHES — REFRIGERANTES — estoque individual por sabor v3 */
(()=>{'use strict';

const MINI_FLAVORS=[
  {key:'coca',label:'Coca',emoji:'🥤'},
  {key:'pepsi',label:'Pepsi',emoji:'🥤'},
  {key:'guarana',label:'Guaraná',emoji:'🥤'},
  {key:'laranja',label:'Laranja',emoji:'🍊'}
];
const REFri2_FLAVORS=[
  {key:'guarana',label:'Guaraná',emoji:'🥤'},
  {key:'laranja',label:'Laranja',emoji:'🍊'}
];

const $=id=>document.getElementById(id);
const db=()=>window.BV_SUPABASE||window.sb;
const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
const key=(id,flavor)=>String(id)+'::'+norm(flavor);
const say=m=>{const t=$('toast');if(t){t.textContent=String(m);t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200)}};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const isMini=p=>norm(p?.name)==='refri mini';
const is2L=p=>norm(p?.name)==='refri 2l';
const isFlavorProduct=p=>isMini(p)||is2L(p)||String(p?.category||'')==='Bebidas'&&Object.keys(window.BV_FLAVOR_NAMES||{}).some(k=>k.startsWith(String(p?.id)+'::'));
const flavorsFor=p=>{const prefix=String(p?.id)+'::';const dynamic=Object.keys(window.BV_FLAVOR_NAMES||{}).filter(k=>k.startsWith(prefix)).map(k=>({key:k.slice(prefix.length),label:window.BV_FLAVOR_NAMES[k],emoji:'🥤'}));if(dynamic.length)return dynamic;return isMini(p)?MINI_FLAVORS:is2L(p)?REFri2_FLAVORS:[];};
const getProducts=()=>Array.isArray(window.products)?window.products:[];
const findProduct=kind=>{
  const fn=kind==='mini'?isMini:is2L;
  return getProducts().find(p=>fn(p)&&p.active!==false)||getProducts().find(fn);
};
const stockOf=(id,flavor)=>Math.max(0,Number(window.BV_FLAVOR_STOCKS?.[key(id,flavor)])||0);

async function loadFlavorStocks(){
  const client=db();
  if(!client)return false;
  try{
    const products=getProducts().filter(p=>String(p?.category||'')==='Bebidas');
    const ids=[...new Set(products.map(p=>String(p.id)).filter(Boolean))];
    if(!ids.length){
      window.BV_FLAVOR_STOCKS={};
      window.BV_FLAVOR_NAMES={};
      return true;
    }
    const r=await client.from('product_flavor_stock').select('product_id,flavor,stock,updated_at').in('product_id',ids);
    if(r.error)throw r.error;
    const next={},names={};
    products.forEach(p=>flavorsFor(p).forEach(f=>{next[key(p.id,f.key)]=0;names[key(p.id,f.key)]=f.label;}));
    (r.data||[]).forEach(row=>{const k=key(row.product_id,row.flavor);next[k]=Math.max(0,Number(row.stock)||0);names[k]=String(row.flavor||'').trim();});
    window.BV_FLAVOR_STOCKS=next;window.BV_FLAVOR_NAMES=names;
    return true;
  }catch(e){
    console.error('[BV REFRI STOCK LOAD]',e);
    return false;
  }
}
window.BV_REFRESH_FLAVOR_STOCKS=loadFlavorStocks;

function syncProductTotal(id){
  const p=getProducts().find(x=>String(x.id)===String(id));
  if(!p)return;
  const total=flavorsFor(p).reduce((sum,f)=>sum+stockOf(id,f.key),0);
  p.stock=total;
  try{localStorage.setItem('bv_products',JSON.stringify(getProducts()))}catch(e){}
}

async function setFlavorStock(id,flavor,stock){
  const p=getProducts().find(x=>String(x.id)===String(id));
  const client=db();
  if(!p||!isFlavorProduct(p)||!client)return null;
  const role=norm(window.BV_ROLE||sessionStorage.getItem('bv_role')||'');
  if(!['administrador','admin'].includes(role)){
    say('Acesso restrito ao administrador.');
    return null;
  }
  const f=flavorsFor(p).find(x=>norm(x.key)===norm(flavor)||norm(x.label)===norm(flavor));
  if(!f){say('Sabor inválido.');return null;}
  const value=Math.max(0,Math.floor(Number(stock)||0));
  try{
    const r=await client.rpc('set_product_flavor_stock',{
      p_product_id:id,
      p_flavor:f.label,
      p_stock:value
    });
    if(r.error)throw r.error;
    const saved=Math.max(0,Number(r.data)||0);
    window.BV_FLAVOR_STOCKS=window.BV_FLAVOR_STOCKS||{};
    window.BV_FLAVOR_STOCKS[key(id,f.key)]=saved;
    window.BV_FLAVOR_NAMES=window.BV_FLAVOR_NAMES||{};window.BV_FLAVOR_NAMES[key(id,f.key)]=f.label;
    syncProductTotal(id);
    renderAdminFlavorStocks();
    refreshCatalogFlavorUI();
    say(f.label+' atualizado: '+saved);
    return saved;
  }catch(e){
    console.error('[BV REFRI STOCK SAVE]',e);
    say('Não foi possível salvar o estoque de '+f.label+'.');
    return null;
  }
}

async function changeFlavorStock(id,flavor,delta){
  const current=stockOf(id,flavor);
  return setFlavorStock(id,flavor,current+Number(delta||0));
}
window.BV_SET_FLAVOR_STOCK=setFlavorStock;
window.BV_CHANGE_FLAVOR_STOCK=changeFlavorStock;
window.adjustProductFlavorStock=changeFlavorStock;

function renderAdminFlavorStocks(){
  const manage=document.querySelector('#manage');
  if(!manage)return;
  const products=getProducts().filter(isFlavorProduct);
  document.querySelectorAll('#manage .adminProductCard').forEach(card=>{
    const title=norm(card.querySelector('h3')?.textContent||'');
    const p=products.find(x=>norm(x.name)===title);
    if(!p)return;
    const flavors=flavorsFor(p);
    card.querySelectorAll('.catalogStock,.adminStockBox,.stockControl,.stockControls,[class*="stockControl"]').forEach(el=>{
      if(!el.classList.contains('bvFlavorStockPanel'))el.style.display='none';
    });
    let panel=card.querySelector('.bvFlavorStockPanel');
    if(!panel){
      panel=document.createElement('section');
      panel.className='bvFlavorStockPanel';
      (card.querySelector('.productInfo')||card).appendChild(panel);
    }
    panel.innerHTML='<div class="bvFlavorStockHead"><div><b>ESTOQUE POR SABOR</b><small>Cada sabor possui estoque independente</small></div><strong>'+flavors.reduce((s,f)=>s+stockOf(p.id,f.key),0)+'</strong></div>'+
      '<div class="bvFlavorRows">'+flavors.map(f=>{
        const n=stockOf(p.id,f.key);
        return '<div class="bvFlavorRow" data-id="'+esc(p.id)+'" data-flavor="'+esc(f.key)+'">'+
          '<div class="bvFlavorName"><span>'+f.emoji+'</span><b>'+esc(f.label)+'</b></div>'+
          '<button type="button" class="bvFlavorBtn bvFlavorMinus" aria-label="Diminuir '+esc(f.label)+'">−</button>'+
          '<strong class="bvFlavorNumber">'+n+'</strong>'+
          '<button type="button" class="bvFlavorBtn bvFlavorPlus" aria-label="Aumentar '+esc(f.label)+'">+</button>'+
          '<input class="bvFlavorAdd" type="number" min="1" step="1" value="1" inputmode="numeric" aria-label="Quantidade para '+esc(f.label)+'">'+
          '<button type="button" class="bvFlavorAddBtn">Adicionar</button>'+
        '</div>';
      }).join('')+'</div>';
    panel.querySelectorAll('.bvFlavorMinus').forEach(btn=>btn.onclick=()=>changeFlavorStock(btn.closest('.bvFlavorRow').dataset.id,btn.closest('.bvFlavorRow').dataset.flavor,-1));
    panel.querySelectorAll('.bvFlavorPlus').forEach(btn=>btn.onclick=()=>changeFlavorStock(btn.closest('.bvFlavorRow').dataset.id,btn.closest('.bvFlavorRow').dataset.flavor,1));
    panel.querySelectorAll('.bvFlavorAddBtn').forEach(btn=>btn.onclick=()=>{
      const row=btn.closest('.bvFlavorRow');
      const amount=Math.max(1,Math.floor(Number(row.querySelector('.bvFlavorAdd')?.value)||1));
      changeFlavorStock(row.dataset.id,row.dataset.flavor,amount);
    });
  });
}
window.renderProductsAdminFlavorStocks=renderAdminFlavorStocks;

function pickerFor(p){
  let modal=$('bvRefrigeranteFlavorPicker');
  if(!modal){
    modal=document.createElement('div');
    modal.id='bvRefrigeranteFlavorPicker';
    modal.className='bvRefrigerantePicker';
    modal.innerHTML='<div class="bvRefrigerantePickerBox"><button type="button" class="bvRefrigeranteClose">×</button><div class="bvRefrigeranteKicker">ESCOLHA O SABOR</div><h3></h3><p>Selecione um sabor disponível.</p><div class="bvRefrigeranteChoices"></div></div>';
    document.body.appendChild(modal);
    modal.addEventListener('click',e=>{if(e.target===modal)modal.classList.remove('show')});
    modal.querySelector('.bvRefrigeranteClose').onclick=()=>modal.classList.remove('show');
  }
  modal.querySelector('h3').textContent=p.name;
  const box=modal.querySelector('.bvRefrigeranteChoices');
  box.innerHTML=flavorsFor(p).map(f=>{
    const n=stockOf(p.id,f.key);
    return '<button type="button" data-flavor="'+esc(f.key)+'" '+(n<1?'disabled':'')+'><span>'+f.emoji+'</span><b>'+esc(f.label)+'</b><small>'+n+' disponível'+(n===1?'':'is')+'</small></button>';
  }).join('');
  box.querySelectorAll('button').forEach(btn=>btn.onclick=()=>addFlavorToCart(p,btn.dataset.flavor));
  modal.classList.add('show');
}

async function addFlavorToCart(p,flavor){
  await loadFlavorStocks();
  const f=flavorsFor(p).find(x=>x.key===norm(flavor));
  if(!f)return;
  const available=stockOf(p.id,f.key);
  if(available<1){say('Este sabor está esgotado.');return;}
  window.cart=window.cart||[];
  const id=String(p.id)+'::'+f.key;
  const old=window.cart.find(x=>String(x.id)===id);
  if(old&&Number(old.q||0)>=available){say('Estoque máximo disponível para '+f.label+'.');return;}
  if(old)old.q=Number(old.q||0)+1;
  else window.cart.push({id,productId:p.id,name:p.name+' — '+f.label,price:Number(p.price)||0,q:1,category:p.category||'Bebidas',flavor:f.label});
  try{localStorage.setItem('bv_cart',JSON.stringify(window.cart))}catch(e){}
  $('count')?.replaceChildren(String(window.cart.reduce((a,x)=>a+Number(x.q||0),0)));
  window.renderCart?.();
  $('bvRefrigeranteFlavorPicker')?.classList.remove('show');
}

async function refreshCatalogFlavorUI(){
  await loadFlavorStocks();
  const cards=document.querySelectorAll('#products .productCard');
  cards.forEach(card=>{
    const title=norm(card.querySelector('h3')?.textContent||'');
    const p=getProducts().find(x=>norm(x.name)===title&&isFlavorProduct(x));
    if(!p)return;
    const available=flavorsFor(p).filter(f=>stockOf(p.id,f.key)>0);
    card.classList.toggle('productOutOfStock',available.length===0);
    card.querySelectorAll('.catalogStock,.stockControl,[class*="stockControl"],[class*="stockBadge"],[class*="stockInfo"],[data-stock]').forEach(el=>el.style.display='none');
    const btn=card.querySelector('.productBottom button');
    if(btn){
      btn.disabled=available.length===0;
      btn.className=available.length?'':'addDisabled';
      btn.textContent=available.length?'+ Adicionar':'Esgotado';
      btn.onclick=available.length?()=>pickerFor(p):null;
    }
  });
}
window.BV_REFRESH_REFRI_CATALOG=refreshCatalogFlavorUI;

const originalAddToCart=window.addToCart;
window.addToCart=function(id){
  const p=getProducts().find(x=>String(x.id)===String(id));
  if(isFlavorProduct(p)){pickerFor(p);return;}
  return originalAddToCart?.apply(this,arguments);
};

const originalChange=window.change;
window.change=async function(id,delta){
  const item=(window.cart||[]).find(x=>String(x.id)===String(id));
  if(!item?.productId)return originalChange?.apply(this,arguments);
  const p=getProducts().find(x=>String(x.id)===String(item.productId));
  if(!isFlavorProduct(p))return originalChange?.apply(this,arguments);
  await loadFlavorStocks();
  const flavor=flavorsFor(p).find(f=>norm(f.label)===norm(item.flavor)||f.key===norm(item.flavor));
  if(!flavor)return;
  const next=Number(item.q||0)+Number(delta||0);
  if(delta>0&&next>stockOf(p.id,flavor.key)){say('Estoque máximo disponível para '+flavor.label+'.');return;}
  if(next<=0)window.cart=window.cart.filter(x=>String(x.id)!==String(id));
  else item.q=next;
  try{localStorage.setItem('bv_cart',JSON.stringify(window.cart))}catch(e){}
  window.renderCart?.();
};

function wrapRenders(){
  if(typeof window.renderProductsAdmin==='function'&&!window.__BV_REFRI_ADMIN_WRAPPED){
    const old=window.renderProductsAdmin;
    window.renderProductsAdmin=async function(){
      const result=await old.apply(this,arguments);
      await loadFlavorStocks();
      renderAdminFlavorStocks();
      return result;
    };
    window.__BV_REFRI_ADMIN_WRAPPED=true;
  }
  if(typeof window.renderProducts==='function'&&!window.__BV_REFRI_CATALOG_WRAPPED){
    const old=window.renderProducts;
    window.renderProducts=async function(){
      const result=await old.apply(this,arguments);
      await refreshCatalogFlavorUI();
      return result;
    };
    window.__BV_REFRI_CATALOG_WRAPPED=true;
  }
  renderAdminFlavorStocks();
  refreshCatalogFlavorUI();
}

const style=document.createElement('style');
style.id='bvRefrigeranteStockV3Style';
style.textContent=`
.bvFlavorStockPanel{margin-top:12px;padding:12px;border-radius:14px;background:linear-gradient(145deg,rgba(255,255,255,.06),rgba(255,255,255,.025));border:1px solid rgba(255,255,255,.09);width:100%;box-sizing:border-box}
.bvFlavorStockHead{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:9px}
.bvFlavorStockHead b{display:block;font-size:11px;letter-spacing:.08em}
.bvFlavorStockHead small{display:block;margin-top:3px;font-size:9px;opacity:.55}
.bvFlavorStockHead>strong{min-width:34px;text-align:center;padding:5px 8px;border-radius:8px;background:rgba(229,9,20,.12);color:#ff5961}
.bvFlavorRows{display:grid;gap:7px}
.bvFlavorRow{display:grid;grid-template-columns:minmax(90px,1fr) 34px 42px 34px 58px 72px;gap:5px;align-items:center}
.bvFlavorName{display:flex;align-items:center;gap:6px;min-width:0}
.bvFlavorName b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bvFlavorBtn,.bvFlavorAddBtn{min-height:34px;border:0;border-radius:8px;font-weight:950;cursor:pointer}
.bvFlavorBtn{background:#e50914;color:#fff;font-size:19px}
.bvFlavorNumber{text-align:center;font-size:13px}
.bvFlavorAdd{width:100%;height:34px;box-sizing:border-box;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:#0e1013;color:#fff;text-align:center}
.bvFlavorAddBtn{background:#292e36;color:#fff;font-size:10px;padding:0 5px}
.bvRefrigerantePicker{position:fixed;inset:0;display:none;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.72);z-index:2147483646}
.bvRefrigerantePicker.show{display:flex}
.bvRefrigerantePickerBox{width:min(430px,100%);padding:20px;border-radius:20px;background:linear-gradient(145deg,#1a1d23,#0c0e11);color:#fff;border:1px solid rgba(255,255,255,.12);box-shadow:0 30px 90px rgba(0,0,0,.7)}
.bvRefrigeranteClose{float:right;border:0;background:none;color:#fff;font-size:28px;cursor:pointer}
.bvRefrigeranteKicker{color:#ff5961;font-size:9px;font-weight:950;letter-spacing:.13em}
.bvRefrigerantePickerBox h3{margin:5px 0 2px;font-size:21px}
.bvRefrigerantePickerBox p{margin:0 0 15px;color:#aeb4bd;font-size:12px}
.bvRefrigeranteChoices{display:grid;grid-template-columns:1fr 1fr;gap:9px}
.bvRefrigeranteChoices button{min-height:76px;border:1px solid rgba(255,255,255,.09);border-radius:13px;background:#171a20;color:#fff;display:grid;grid-template-columns:auto 1fr;grid-template-rows:1fr 1fr;column-gap:8px;align-items:center;padding:10px;text-align:left}
.bvRefrigeranteChoices button span{grid-row:1/3;font-size:25px}
.bvRefrigeranteChoices button b{font-size:12px}
.bvRefrigeranteChoices button small{font-size:10px;color:#aeb4bd}
.bvRefrigeranteChoices button:disabled{opacity:.35;filter:grayscale(1)}
@media(max-width:600px){.bvFlavorRow{grid-template-columns:minmax(80px,1fr) 32px 38px 32px 54px 68px}.bvFlavorAdd{font-size:12px}.bvFlavorAddBtn{font-size:9px}.bvRefrigeranteChoices{grid-template-columns:1fr 1fr}}
`;
document.head.appendChild(style);

window.BV_REFRI_FLAVORS_VERSION='2026.10.01.1710';

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(wrapRenders,0));
else setTimeout(wrapRenders,0);
setTimeout(wrapRenders,800);
setTimeout(wrapRenders,1800);
setInterval(()=>{if(document.querySelector('#manage'))renderAdminFlavorStocks()},15000);

})();