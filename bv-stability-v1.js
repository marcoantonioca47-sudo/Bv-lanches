/* BV LANCHES — estabilidade geral v1
   Camada final independente: navegação, auth, cardápio, carrinho, checkout,
   pedidos, dashboard, taxas, produtos e usuários. */
(()=>{ 
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const toast=m=>{const x=$('toast');if(x){x.textContent=String(m);x.classList.add('show');setTimeout(()=>x.classList.remove('show'),3000)}};
  window.bvModal=(opts={},onClose)=>{
    const old=document.getElementById('bvSystemModal');if(old)old.remove();
    const type=opts.type==='success'?'success':'info';
    const wrap=document.createElement('div');wrap.id='bvSystemModal';wrap.className='bvSystemModal '+type;
    wrap.innerHTML='<div class="bvSystemModalCard" role="dialog" aria-modal="true">'+
      '<div class="bvSystemModalTop"><div class="bvSystemModalIcon">'+String(opts.icon||'✓')+'</div><div><span class="bvSystemModalKicker">'+String(opts.kicker||'BV LANCHES')+'</span><h3 class="bvSystemModalTitle">'+esc(opts.title||'Aviso')+'</h3></div></div>'+
      '<div class="bvSystemModalBody">'+String(opts.message||'')+'</div>'+
      '<div class="bvSystemModalActions"><button type="button" class="bvSystemModalBtn">'+esc(opts.button||'OK')+'</button></div></div>';
    document.body.appendChild(wrap);
    const close=()=>{wrap.classList.remove('show');setTimeout(()=>wrap.remove(),180);if(typeof onClose==='function')onClose()};
    wrap.querySelector('.bvSystemModalBtn')?.addEventListener('click',close);
    wrap.addEventListener('click',e=>{if(e.target===wrap)close()});
    requestAnimationFrame(()=>wrap.classList.add('show'));
    setTimeout(()=>wrap.querySelector('.bvSystemModalBtn')?.focus(),80);
    return {close};
  };
  if(!$('bvDeliveryCardStyle')){
    const st=document.createElement('style');st.id='bvDeliveryCardStyle';st.textContent='.bvDeliveryCard .orderBody{display:grid;gap:10px}.bvOrderCustomer{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.bvOrderCustomer b{font-size:18px}.bvOrderCustomer span{font-size:12px;opacity:.7;text-align:right}.bvOrderItems{padding:10px 12px;border-radius:12px;background:rgba(255,255,255,.035)}.bvOrderItems small,.bvDeliveryTitle{font-size:10px;font-weight:900;letter-spacing:.12em;opacity:.65}.bvOrderItems p{margin:5px 0 0;line-height:1.45}.bvDeliveryBox{padding:13px 14px;border-radius:14px;background:rgba(229,9,20,.06);border:1px solid rgba(229,9,20,.18)}.bvAddressMain{margin-top:5px;font-weight:850;line-height:1.35}.bvAddressSub{margin-top:3px;font-size:13px;opacity:.75}.orderPaymentBadge{margin-top:0!important}.bvDeliveryCard .orderFoot{display:flex;align-items:end;justify-content:space-between;gap:12px}.bvDeliveryCard .orderFoot>div{display:flex;flex-direction:column;gap:3px}.bvDeliveryCard .orderFoot small{font-size:10px;letter-spacing:.1em;opacity:.65}.bvDeliveryCard .orderFoot strong{font-size:21px}@media(max-width:600px){.bvOrderCustomer{display:block}.bvOrderCustomer span{display:block;text-align:left;margin-top:3px}.bvDeliveryCard .orderFoot{align-items:stretch;flex-direction:column}.bvDeliveryCard .orderFoot select{width:100%}}';document.head.appendChild(st);
  }

  const orderCategoryStyle=document.createElement('style');orderCategoryStyle.textContent='.bvOrderItemGroup{padding:7px 0}.homePromoGroup{display:flex;flex-direction:column;gap:2px;margin-top:5px}.homePromoGroup small{font-size:10px;font-weight:900;letter-spacing:.08em;opacity:.85}.homePromoGroup span{font-size:13px;font-weight:700}.bvOrderItemGroup+ .bvOrderItemGroup{border-top:1px solid rgba(255,255,255,.07);margin-top:4px}.bvOrderItemGroup small{display:block;font-size:9px!important;font-weight:950!important;letter-spacing:.12em;color:#ff5b64!important}.bvOrderItemGroup p{margin:4px 0 0;line-height:1.45}';document.head.appendChild(orderCategoryStyle);
  const cartCategoryStyle=document.createElement('style');cartCategoryStyle.textContent='.cartCategoryLabel{display:block!important;margin:0 0 3px;font-size:9px!important;font-weight:950!important;letter-spacing:.12em;color:#ff5b64!important;text-transform:uppercase}.cartInfo b{display:block}';document.head.appendChild(cartCategoryStyle);
  const catalogStockStyle=document.createElement('style');catalogStockStyle.textContent='.catalogStock{margin:10px 0;padding:8px 10px;border-radius:11px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:8px}.catalogStock span{font-size:9px;font-weight:900;letter-spacing:.12em;opacity:.65}.catalogStock strong{font-size:16px}.catalogStock small{font-size:10px;opacity:.65}.catalogStock.out{border-color:rgba(229,9,20,.5);background:rgba(229,9,20,.1)}.catalogStock.out strong,.catalogStock.out em{color:#ff5b64}.catalogStock em{font-size:9px;font-weight:900;font-style:normal;letter-spacing:.08em}.productOutOfStock .productImage{opacity:.55}.productOutOfStock h3{opacity:.7}.addDisabled{opacity:.5!important;cursor:not-allowed!important;background:#555!important;border-color:#666!important}';document.head.appendChild(catalogStockStyle);
  const prodStyle=document.createElement('style');prodStyle.textContent=`    .adminStockBox{margin:12px 0 4px;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;gap:12px}
    .adminStockBox>span{font-size:10px;font-weight:900;letter-spacing:.12em;opacity:.7}
    .adminStockControls{display:flex;align-items:center;gap:8px}
    .adminStockControls button{width:38px;height:38px;border:1px solid rgba(255,255,255,.14);border-radius:11px;background:rgba(255,255,255,.08);color:#fff;font-size:24px;font-weight:900;line-height:1;cursor:pointer}
    .adminStockControls button:active{transform:scale(.94)}
    .adminStockControls .stockPlus{background:rgba(229,9,20,.18);border-color:rgba(229,9,20,.45)}
    .adminStockControls strong{min-width:42px;text-align:center;font-size:20px}

    #orders .bvProductionSection{margin:0 0 22px}
    #orders .bvProductionSectionHead{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:0 0 12px;padding:14px 16px;border-radius:18px;background:rgba(255,255,255,.035);border:1px solid rgba(255,255,255,.08)}
    #orders .bvProductionSectionHead>div{display:flex;flex-direction:column;gap:4px}
    #orders .bvProductionSectionHead span{font-size:18px;font-weight:900;letter-spacing:.02em}
    #orders .bvProductionSectionHead small{font-size:12px;color:#9699a3}
    #orders .bvProductionSectionHead strong{min-width:42px;height:42px;display:grid;place-items:center;border-radius:13px;font-size:19px;background:#22242b}
    #orders .bvNewOrdersSection .bvProductionSectionHead{background:linear-gradient(135deg,rgba(229,9,20,.20),rgba(255,92,0,.10));border:2px solid rgba(229,9,20,.72);box-shadow:0 0 0 1px rgba(229,9,20,.08),0 14px 34px rgba(229,9,20,.12)}
    #orders .bvNewOrdersSection .bvProductionSectionHead span{font-size:22px}
    #orders .bvNewOrdersSection .bvProductionSectionHead strong{background:#e50914;color:#fff;box-shadow:0 8px 20px rgba(229,9,20,.28)}
    #orders .bvProductionGrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px}
    #orders .bvNewOrderCard{position:relative;overflow:hidden;border:2px solid rgba(229,9,20,.72)!important;box-shadow:0 14px 34px rgba(229,9,20,.16)}
    #orders .bvNewOrderRibbon{padding:11px 14px;background:#e50914;color:#fff;font-weight:950;font-size:15px;letter-spacing:.04em}
    #orders .bvNewOrderCard .orderHead{padding-top:15px}
    #orders .bvNewStatusBadge{background:#e50914!important;color:#fff!important;font-weight:950!important}
    #orders .bvStartOrderBtn{width:100%;min-height:54px;border:0;border-radius:15px;background:#e50914;color:#fff;font-size:17px;font-weight:950;letter-spacing:.02em;cursor:pointer;box-shadow:0 10px 24px rgba(229,9,20,.25)}
    #orders .bvStartOrderBtn:active{transform:scale(.98)}
    #orders .bvProductionOrderCard{opacity:.88}
    #orders .bvProductionLocked{font-size:11px;color:#777b86;text-align:right}
    @media(max-width:650px){
      #orders .bvProductionGrid{grid-template-columns:1fr}
      #orders .bvProductionSectionHead span{font-size:17px}
      #orders .bvNewOrdersSection .bvProductionSectionHead span{font-size:20px}
      #orders .bvStartOrderBtn{min-height:58px;font-size:18px}
    }
  `;document.head.appendChild(prodStyle);
  window.BV_STABILITY_VERSION='2026.09.25.315';
  const firstLoginDone=()=>{try{return localStorage.getItem('bv_first_login_done')==='1'}catch(e){return false}};
  window.BV_HAS_NAVIGATED=false;
  const NAV_KEY='bv_current_page';
  const getSavedPage=()=>{try{return String(localStorage.getItem(NAV_KEY)||'').trim()}catch(e){return ''}};
  const savePage=p=>{try{if(p)localStorage.setItem(NAV_KEY,String(p))}catch(e){}};
  const clearSavedPage=()=>{try{localStorage.removeItem(NAV_KEY)}catch(e){}};
  // Mantém a tela atual após F5/recarregamento. A restauração acontece depois da autenticação e do perfil.

  try{window.cart=Array.isArray(window.cart)?window.cart:(JSON.parse(localStorage.getItem('bv_cart')||'[]')||[])}catch{window.cart=[]}
  try{window.products=Array.isArray(window.products)?window.products:(JSON.parse(localStorage.getItem('bv_products')||'[]')||[])}catch{window.products=[]}
  if(!Array.isArray(window.orders))window.orders=[];
  const sb=window.BV_SUPABASE||(window.supabase&&window.BV_SUPABASE_CONFIG?supabase.createClient(window.BV_SUPABASE_CONFIG.url,window.BV_SUPABASE_CONFIG.publishableKey):null);
  if(sb)window.BV_SUPABASE=sb;

  const labels={inicio:'Início',cardapio:'Cardápio',pedido:'Meu pedido',acompanhar:'Acompanhar pedido',dashboard:'Dashboard',pedidos:'Pedidos',produtos:'Produtos',promocoes:'Promoções',cupons:'Cupons',config:'Configurações','taxa-entrega':'Taxa de entrega'};
  const status={recebido:'Liberado',aguardando_pagamento:'Aguardando pagamento',em_preparo:'Em preparo',em_producao:'Pronto',saiu_entrega:'Saiu para entrega',entregue:'Entregue',cancelado:'Cancelado'};
  const payLabel={pix:'Pix',dinheiro:'Dinheiro',cartao:'Cartão'};

  window.admin=()=>['administrador','admin'].includes(window.BV_ROLE);
  window.applyAccess=()=>{
    const role=String(window.BV_ROLE||'usuario').trim().toLowerCase();
    window.BV_ROLE=role;
    document.querySelectorAll('.adminOnly').forEach(x=>x.style.display=['administrador','admin'].includes(role)?'':'none');
    document.querySelectorAll('.adminHide').forEach(x=>x.style.display=['administrador','admin'].includes(role)?'none':'');
    document.querySelectorAll('[data-role="motoboyOnly"]').forEach(x=>x.style.display=role==='motoboy'?'':'none');
    if(role==='motoboy'){
      // O motoboy não possui tela Início/Cardápio/Meu pedido/Acompanhar.
      // A área dele começa diretamente em Pedidos e só permite Pedidos + Taxa de entrega.
      const motoAllowed=new Set(['pedidos','taxa-entrega']);
      document.querySelectorAll('.sideNav [data-page]').forEach(x=>{
        const page=String(x.dataset.page||'');
        const adminLink=x.classList.contains('adminOnly')||x.classList.contains('adminDeliveryFeeLink');
        x.style.setProperty('display',motoAllowed.has(page)&&!adminLink?'':'none','important');
      });
      document.querySelectorAll('.sideNav .navTitle,.sideBottom .adminOnly').forEach(x=>x.style.setProperty('display','none','important'));
      document.querySelector('.cartTop')?.style.setProperty('display','none','important');

      // Esconde as páginas que não pertencem ao motoboy e nunca deixa Início ficar ativa.
      document.querySelectorAll('.page').forEach(page=>{
        const id=String(page.id||'');
        const name=id.replace(/^page-/,'');
        if(!motoAllowed.has(name)) page.style.setProperty('display','none','important');
      });
      const active=document.querySelector('.page.activePage');
      const activeName=String(active?.id||'').replace(/^page-/,'');
      if(active && !motoAllowed.has(activeName)) active.classList.remove('activePage');
    }
    if($('loggedUserName'))$('loggedUserName').textContent=window.BV_USER_NAME||'';
  };
  window.toggleSidebar=()=>{$('sidebar')?.classList.toggle('open')};
  window.openAdmin=p=>{if(!window.admin())return toast('Acesso restrito ao administrador.');window.showPage(p||'dashboard')};
  window.showPage=(p,internal=false)=>{
    const role=String(window.BV_ROLE||'').toLowerCase();
    if(role==='motoboy' && !['pedidos','taxa-entrega'].includes(String(p))) p='pedidos';
    if(!internal){window.BV_HAS_NAVIGATED=true;savePage(p)}
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('activePage'));
    $('page-'+p)?.classList.add('activePage');
    if($('pageTitle'))$('pageTitle').textContent=labels[p]||p;
    document.querySelectorAll('.sideNav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p));
    if(innerWidth<=850)$('sidebar')?.classList.remove('open');
    if(p==='cardapio'){window.renderProducts();window.BV_REFRESH_PRODUCTS?.();}
    if(p==='pedido'){window.initPaymentSelection?.();window.renderCart();setTimeout(window.loadProfile,50)}
    if(p==='acompanhar'){window.BV_REFRESH_ORDERS?.();window.setupTrackingRealtime?.();window.startTrackingStatusPolling?.();}
    if(p==='dashboard')window.renderDashboard();
    if(p==='pedidos'){if(window.BV_ROLE==='motoboy')window.renderMotoOrders?.();else window.renderAdmin()}
    if(p==='taxa-entrega')window.renderMotoFeeOrders?.()
    if(p==='produtos')window.renderProductsAdmin?.();if(p==='promocoes')window.renderPromotionsAdmin?.();
    if(p==='config'){window.refreshDeliveryFees();window.renderUsers?.()}
  };

  window.renderMotoFeeOrders=async()=>{
    if(!['motoboy','administrador','admin'].includes(window.BV_ROLE))return;
    const b=$('motoFeeOrders');if(!b||!sb)return;
    b.innerHTML='<div class="emptyState"><span>⏳</span><b>Carregando taxas...</b></div>';
    try{
      const {data:{user}}=await sb.auth.getUser();if(!user)return;
      const isAdmin=['administrador','admin'].includes(window.BV_ROLE);
      const q=sb.from('orders').select('id,order_number,delivery_fee,created_at,motoboy_id').eq('status','entregue').order('created_at',{ascending:false});
      if(!isAdmin)q.eq('motoboy_id',user.id);
      const r=await q;
      if(r.error)throw r.error;
      const rows=r.data||[];
      const filter=window.BV_MOTO_FEE_FILTER||'all';
      const now=new Date();const startOfDay=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      let startDate=null,endDate=null,specific=null;
      if(filter==='today')startDate=startOfDay;
      if(filter==='week'){const day=startOfDay.getDay();startDate=new Date(startOfDay);startDate.setDate(startDate.getDate()-(day===0?6:day-1));}
      if(filter==='month')startDate=new Date(now.getFullYear(),now.getMonth(),1);
      if(filter.startsWith('specific:'))specific=filter.slice(9);
      if(specific){const parts=specific.split('-').map(Number);startDate=new Date(parts[0],parts[1]-1,parts[2]);endDate=new Date(parts[0],parts[1]-1,parts[2]+1);}
      const filtered=specific?rows.filter(o=>{const d=new Date(o.created_at);return d>=startDate&&d<endDate}):startDate?rows.filter(o=>new Date(o.created_at)>=startDate):rows;
      const totalFees=filtered.reduce((sum,o)=>sum+Number(o.delivery_fee||0),0);
      const fmtDate=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')};
      const title=isAdmin?'ADMINISTRAÇÃO':'MOTOBOY';
      const emptyText=isAdmin?'Escolha outro filtro para consultar as taxas das entregas.':'Escolha outro filtro para consultar suas taxas.';
      if($('deliveryFeeEyebrow'))$('deliveryFeeEyebrow').textContent=title;
      if($('deliveryFeeDescription'))$('deliveryFeeDescription').textContent=isAdmin?'Consulte o total das taxas de todas as entregas realizadas.':'Consulte o total das suas taxas das entregas realizadas.';
      b.innerHTML='<div class="motoFeeFilter"><div class="motoFeeQuickFilters"><button type="button" class="'+(filter==='today'?'active':'')+'" onclick="setMotoFeeFilter(\'today\')">Hoje</button><button type="button" class="'+(filter==='week'?'active':'')+'" onclick="setMotoFeeFilter(\'week\')">Esta semana</button><button type="button" class="'+(filter==='month'?'active':'')+'" onclick="setMotoFeeFilter(\'month\')">Este mês</button><button type="button" class="'+(filter==='all'?'active':'')+'" onclick="setMotoFeeFilter(\'all\')">Todas</button></div><label><span>Data específica</span><input id="motoFeeDate" type="date" value="'+(specific||'')+'" onchange="setMotoFeeSpecificDate(this.value)"></label></div>'+
        '<div class="motoFeeHeader"><div><small>ENTREGAS REALIZADAS</small><strong>'+filtered.length+'</strong></div><div><small>'+(isAdmin?'TOTAL DE TAXAS':'TOTAL A RECEBER')+'</small><strong>'+money(totalFees)+'</strong></div></div>'+
        (filtered.length?'<div class="motoFeeList">'+filtered.map(o=>'<article class="motoFeeOrder"><div class="motoFeeOrderNumber"><small>PEDIDO</small><b>#'+esc(String(o.order_number).padStart(3,'0'))+'</b><small>DATA</small><b>'+fmtDate(o.created_at)+'</b></div><div class="motoFeeValue"><small>TAXA DE ENTREGA</small><strong>'+money(o.delivery_fee)+'</strong></div></article>').join('')+'</div>':'<div class="emptyState"><span>💰</span><b>Nenhuma entrega no período</b><small>'+emptyText+'</small></div>');
    }catch(e){console.error('Delivery fee orders',e);b.innerHTML='<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar as taxas</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoFeeOrders()">Tentar novamente</button></div>'}
  };
  window.setMotoFeeFilter=filter=>{window.BV_MOTO_FEE_FILTER=filter||'all';window.renderMotoFeeOrders()};
  window.setMotoFeeSpecificDate=value=>{window.BV_MOTO_FEE_FILTER=value?'specific:'+value:'all';window.renderMotoFeeOrders()};

  window.setMenuCategory=(cat,b)=>{window.BV_MENU_CATEGORY=cat;document.querySelectorAll('#page-cardapio .menuCategoryTabs button').forEach(x=>x.classList.remove('active'));b?.classList.add('active');window.BV_CAT=cat;window.renderProducts()};
  window.renderProducts=()=>{const b=$('products');if(!b)return;if(window.BV_MENU_CATEGORY==='Promocoes'){const now=Date.now(),active=(window.promotions||[]).filter(x=>x.active&&(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now)),ps=window.products||[];b.innerHTML=active.length?active.map(x=>{const items=window.promotionItems?.[x.id]||[],legacy=x.product_id?[{product_id:x.product_id,quantity:1}]:[],list=(items.length?items:legacy).map(i=>{const p=ps.find(y=>String(y.id)===String(i.product_id));return (i.quantity||1)+'x '+(p?.name||'Produto')}).join(' • ');return '<article class="productCard promotionCatalogCard"><div class="productImage"><span>🏷️</span></div><div class="promoCatalogBody"><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'Oferta especial do BV Lanches')+'</p><div class="promotionCatalogItems">'+esc(list)+'</div><div class="promotionCatalogPrice"><del>'+money(x.original_price||0)+'</del><strong>'+money(x.promotional_price||0)+'</strong></div><button type="button" class="promoCatalogButton" onclick="addPromotionToCart(\''+esc(x.id)+'\')">Adicionar promoção</button></div></article>'}).join(''):'<div class="emptyState"><span>🏷️</span><b>Nenhuma promoção ativa.</b><small>As promoções aparecerão aqui enquanto estiverem ativas.</small></div>';return;}
    b.innerHTML='';
    const cat=window.BV_CAT||'Lanches';
    const a=(window.products||[]).filter(p=>p.active!==false&&String(p.category||'Lanches')===cat);
    const now=Date.now();
    b.innerHTML=a.length?a.map(p=>{
      const fallback=p.category==='Bebidas'?'🥤':'🍔';
      const promo=(window.promotions||[]).find(x=>String(x.product_id)===String(p.id)&&x.active&&(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now));
      const addonKey=String(p.name||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
      const addonPos={bacon:'0% 0%',ovo:'25% 0%',cheddar:'50% 0%',requeijao:'75% 0%',bife:'100% 0%',calabresa:'0% 100%',milho:'25% 100%',batata:'50% 100%',mussarela:'75% 100%',presunto:'100% 100%'};
      const media=(p.image_url?'<img src="'+esc(p.image_url)+'" alt="'+esc(p.name)+'" loading="lazy" decoding="async">'+'<span style="display:none">'+fallback+'</span>':'<span>'+fallback+'</span>');
      const isRefrigerante=String(p.category||'')==='Bebidas'&&/coca|refri|refrigerante/i.test(String(p.name||''));
      const stock=Math.max(0,Number(p.stock)||0);
      const outOfStock=isRefrigerante&&stock<=0;
      const stockHtml=isRefrigerante?'<div class="catalogStock '+(outOfStock?'out':'')+'"><span>ESTOQUE</span><strong>'+stock+'</strong>'+(outOfStock?'<em>ESGOTADO</em>':'<small>disponível</small>')+'</div>':'';
      const priceHtml='<b>'+money(p.price)+'</b>';
      const addButton=outOfStock?'<button type="button" disabled class="addDisabled">Esgotado</button>':'<button type="button" onclick="addToCart(\''+esc(p.id)+'\')">+ Adicionar</button>';
      return '<article class="productCard product '+(outOfStock?'productOutOfStock':'')+'">'+(promo?'<div class="promoBadge">🔥 PROMOÇÃO</div>':'')+'<div class="productImage">'+media+'</div><div class="productInfo"><h3>'+esc(p.name)+'</h3><p>'+esc(p.description||'')+'</p>'+stockHtml+'<div class="productBottom">'+priceHtml+addButton+'</div></div></article>';
    }).join(''):'<div class="panel"><p class="muted">Nenhum produto disponível nesta categoria.</p></div>';
  };
  window.addPromotionToCart=async id=>{const promo=(window.promotions||[]).find(x=>String(x.id)===String(id));if(!promo)return toast('Promoção não encontrada.');const now=Date.now();if(!promo.active|| (promo.starts_at&&new Date(promo.starts_at).getTime()>now) || (promo.ends_at&&new Date(promo.ends_at).getTime()<now))return toast('Esta promoção não está mais ativa.');const items=window.promotionItems?.[promo.id]||[];const legacy=promo.product_id?[{product_id:promo.product_id,quantity:1}]:[];const rows=items.length?items:legacy;if(!rows.length)return toast('Esta promoção não possui itens.');const ps=window.products||[];const resolved=rows.map(i=>({p:ps.find(p=>String(p.id)===String(i.product_id)),q:Math.max(1,Number(i.quantity)||1)}));if(resolved.some(x=>!x.p))return toast('Não foi possível localizar todos os itens da promoção.');const key='promo:'+promo.id;const r=window.cart.find(x=>x.id===key);if(r)r.q=(Number(r.q)||0)+1;else window.cart.push({id:key,name:'🎁 '+promo.name,price:Number(promo.promotional_price)||0,q:1,isPromotion:true,promotionId:promo.id,promotionItems:resolved.map(x=>({id:x.p.id,name:x.p.name,quantity:x.q}))});saveCart();toast('Promoção adicionada ao pedido por '+money(promo.promotional_price)+'.');showPage('pedido')};
  const saveCart=()=>{localStorage.setItem('bv_cart',JSON.stringify(window.cart||[]));const n=(window.cart||[]).reduce((s,x)=>s+(Number(x.q)||0),0);if($('count'))$('count').textContent=n;if($('sideCount'))$('sideCount').textContent=n;window.renderCart()};
  window.addToCart=id=>{const p=(window.products||[]).find(x=>String(x.id)===String(id));if(!p)return toast('Produto não encontrado.');const category=String(p.category||'Lanches');const isRefrigerante=category==='Bebidas'&&/coca|refri|refrigerante/i.test(String(p.name||''));const stock=Math.max(0,Number(p.stock)||0);if(isRefrigerante&&stock<=0)return toast('Este refrigerante está esgotado.');const r=window.cart.find(x=>String(x.id)===String(id));if(r){r.q=(Number(r.q)||0)+1;r.category=category}else window.cart.push({id:p.id,name:p.name,price:Number(p.price)||0,q:1,category});saveCart();toast('Produto adicionado ao pedido.')};
  window.change=(id,d)=>{const r=window.cart.find(x=>String(x.id)===String(id));if(!r)return;const p=(window.products||[]).find(x=>String(x.id)===String(id));const category=r.category||p?.category||'Lanches';const isRefrigerante=category==='Bebidas'&&/coca|refri|refrigerante/i.test(String(r.name||p?.name||''));const stock=Math.max(0,Number(p?.stock)||0);if(Number(d)>0&&isRefrigerante&&stock<=Number(r.q||0))return toast('Quantidade máxima disponível em estoque: '+stock+'.');r.q=(Number(r.q)||0)+Number(d||0);if(r.q<=0)window.cart=window.cart.filter(x=>String(x.id)!==String(id));saveCart()};
  window.removeFromCart=id=>{window.cart=window.cart.filter(x=>String(x.id)!==String(id));saveCart()};
  window.renderCart=()=>{
    const b=$('cart');if(!b)return;
    const c=window.cart||[],sub=c.reduce((s,x)=>s+(Number(x.price)||0)*(Number(x.q)||0),0),fee=Number($('fee')?.dataset.value||0);
    b.innerHTML=c.length?c.map(x=>{const p=(window.products||[]).find(y=>String(y.id)===String(x.id));const category=String(x.category||p?.category||'Lanches');const categoryLabel=category==='Adicionais'?'ADICIONAIS':category==='Bebidas'?'BEBIDAS':'ITEM';return `<div class="cartRow"><div class="cartInfo"><small class="cartCategoryLabel">${categoryLabel}</small><b>${esc(x.name)}</b><small>${x.isPromotion?'Itens da promoção: '+(x.promotionItems||[]).map(i=>i.quantity+'x '+i.name).join(' • '):money(x.price)+' cada'}</small></div><div class="cartQty"><button type="button" onclick="change('${esc(x.id)}',-1)">−</button><strong>${Number(x.q)||0}</strong><button type="button" onclick="change('${esc(x.id)}',1)">+</button><button type="button" class="remove" onclick="removeFromCart('${esc(x.id)}')">×</button></div></div>`}).join(''):'<div class="emptyCart"><span>🛒</span><b>Seu carrinho está vazio</b><small>Escolha seus lanches no cardápio.</small><button type="button" onclick="showPage(\'cardapio\')">Ver cardápio</button></div>';
    if($('sub'))$('sub').textContent=money(sub);if($('fee'))$('fee').textContent=money(fee);if($('total'))$('total').textContent=money(sub+fee);
    const n=c.reduce((s,x)=>s+(Number(x.q)||0),0);if($('count'))$('count').textContent=n;if($('sideCount'))$('sideCount').textContent=n;
  };
  window.mode=(m,b)=>{document.querySelectorAll('#page-pedido .tabs button').forEach(x=>x.classList.remove('active'));b?.classList.add('active');window.BV_MODE=m;$('address')&&($('address').style.display=m==='entrega'?'block':'none');window.refreshNeighborhoodFee()};
  window.pay=(p,b)=>{
    const label=String(p||'Pix');
    window.BV_PAYMENT=label;
    localStorage.setItem('bv_payment',label);
    document.querySelectorAll('#page-pedido .pay button').forEach(x=>x.classList.toggle('active',x===b));
    $('troco')?.classList.toggle('hide',label!=='Dinheiro');
  };
  window.initPaymentSelection=()=>{
    // Estado do pagamento fica sincronizado com o botão visível.
    // Evita reaproveitar acidentalmente um método antigo do navegador.
    const current=String(window.BV_PAYMENT||'').toLowerCase();
    if(current!=='pix'&&current!=='dinheiro'&&current!=='cartão'&&current!=='cartao'){
      window.BV_PAYMENT='Pix';
    }
    const buttons=[...document.querySelectorAll('#page-pedido .pay button')];
    if(!buttons.length)return;
    const active=buttons.find(x=>x.classList.contains('active'));
    if(active){
      const t=String(active.textContent||'').toLowerCase();
      const label=t.includes('dinheiro')?'Dinheiro':t.includes('cart')?'Cartão':'Pix';
      window.BV_PAYMENT=label;
      localStorage.setItem('bv_payment',label);
      $('troco')?.classList.toggle('hide',label!=='Dinheiro');
    }else{
      window.pay('Pix',buttons[0]);
    }
  };

  let bvFeeTimer=null;
  window.refreshNeighborhoodFeeSoon=()=>{
    clearTimeout(bvFeeTimer);
    bvFeeTimer=setTimeout(()=>window.refreshNeighborhoodFee?.(),60);
  };
  window.refreshNeighborhoodFee=async()=>{
    const f=$('fee');if(!f)return;
    if(window.BV_MODE==='retirada'){f.dataset.value='0';f.textContent=money(0);window.renderCart();return}
    let v=Number(window.BV_DEFAULT_FEE||0);
    if(sb){try{const r=await sb.from('neighborhood_fees').select('name,fee').eq('active',true);if(!r.error){const hit=(r.data||[]).find(x=>norm(x.name)===norm($('bairro')?.value||''));if(hit)v=Number(hit.fee)||0}}catch{}}
    f.dataset.value=String(v);f.textContent=money(v);window.renderCart();
  };
  window.BV_OPEN_PRODUCT_FORM=()=>{
    const panel=$('productFormPanel');
    if(!panel)return toast('Formulário de produto não encontrado. Recarregue a página.');
    panel.classList.add('show','open');
    panel.style.setProperty('display','block','important');
    requestAnimationFrame(()=>panel.scrollIntoView({behavior:'smooth',block:'start'}));
    setTimeout(()=>{$('productName')?.focus({preventScroll:true})},180);
  };
  window.openProductForm=window.BV_OPEN_PRODUCT_FORM;
  window.BV_CLOSE_PRODUCT_FORM=()=>{
    const panel=$('productFormPanel');
    if(!panel)return;
    panel.classList.remove('show','open');
    panel.style.removeProperty('display');
  };
  window.closeProductForm=window.BV_CLOSE_PRODUCT_FORM;

  window.login=async()=>{
    $('err')&&($('err').textContent='');
    if(!sb)return $('err').textContent='Conexão com o banco indisponível. Recarregue a página.';
    const email=$('email')?.value.trim(),pass=$('pass')?.value||'';
    if(!email||!pass)return $('err').textContent='Informe e-mail e senha.';
    const r=await sb.auth.signInWithPassword({email,password:pass});
    if(r.error)return $('err').textContent=r.error.message;
    try{localStorage.setItem('bv_first_login_done','1')}catch(e){}
    await window.loadApp();
  };
  window.registerUser=async e=>{
    e.preventDefault();$('registerErr')&&($('registerErr').textContent='');
    const n=$('registerName')?.value.trim(),em=$('registerEmail')?.value.trim(),pw=$('registerPass')?.value||'',pw2=$('registerPass2')?.value||'';
    if(pw!==pw2)return $('registerErr').textContent='As senhas não conferem.';
    if(!sb)return $('registerErr').textContent='Conexão indisponível.';
    const r=await sb.auth.signUp({email:em,password:pw});
    if(r.error)return $('registerErr').textContent=r.error.message;
    if(r.data.user){const z=await sb.from('profiles').upsert({id:r.data.user.id,name:n,role:'usuario'},{onConflict:'id'});if(z.error)return $('registerErr').textContent=z.error.message}
    window.closeRegister();toast(r.data.session?'Conta criada com sucesso.':'Conta criada. Confirme o e-mail se o sistema solicitar.');
  };
  window.logout=async()=>{if(sb)await sb.auth.signOut();window.BV_ROLE='';window.BV_USER_NAME='';clearSavedPage();window.applyAccess();$('login')&&($('login').style.display='flex');window.showPage('inicio',true)};

  window.loadProfile=async()=>{
    if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;
    const r=await sb.from('profiles').select('name,phone,street,number,neighborhood,cep,complement').eq('id',user.id).maybeSingle();const d=r.data;if(!d)return;
    [['name',d.name],['phone',d.phone],['street',d.street],['num',d.number],['bairro',d.neighborhood],['cep',d.cep],['comp',d.complement]].forEach(([id,v])=>{if($(id)&&v!=null)$(id).value=v||''});
    window.refreshNeighborhoodFeeSoon();
  };
  ['bairro','street','num','cep'].forEach(id=>{
    const el=$(id); if(!el)return;
    ['input','change','paste','blur'].forEach(ev=>el.addEventListener(ev,()=>window.refreshNeighborhoodFeeSoon()));
  });
  const saveProfile=async()=>{if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;await sb.from('profiles').update({name:$('name')?.value.trim()||'',phone:$('phone')?.value.trim()||'',street:$('street')?.value.trim()||'',number:$('num')?.value.trim()||'',neighborhood:$('bairro')?.value.trim()||'',cep:$('cep')?.value.trim()||'',complement:$('comp')?.value.trim()||''}).eq('id',user.id)};


  window.orderItemsMarkup=items=>{let rows=[];if(Array.isArray(items)){rows=items.map(i=>({name:String(i?.product_name||i?.name||'Produto'),quantity:Math.max(1,Number(i?.quantity)||1)}));}else{const raw=String(items??'').trim();if(raw){rows=raw.split(/\s*(?:•|,|\n)\s*/).map(part=>{const m=part.match(/^([0-9]+)x\s*(.+)$/i);return{name:String(m?m[2]:part).trim(),quantity:Math.max(1,Number(m?m[1]:1)||1)}}).filter(x=>x.name);}}const groups={Lanches:[],Bebidas:[],Adicionais:[]};rows.forEach(i=>{const name=i.name||'Produto';const p=(window.products||[]).find(x=>norm(x?.name)===norm(name));const cat=String(p?.category||'').trim().toLowerCase();const key=cat==='bebidas'?'Bebidas':cat==='adicionais'?'Adicionais':'Lanches';groups[key].push(i.quantity+'x '+name)});return ['Lanches','Bebidas','Adicionais'].filter(k=>groups[k].length).map(k=>'<div class="bvOrderItemGroup"><small>'+k.toUpperCase()+'</small><p>'+esc(groups[k].join(' • '))+'</p></div>').join('')||'<div class="bvOrderItemGroup"><small>LANCHES</small><p>Itens do pedido</p></div>'};
  window.orderLabel=o=>Number(o?.orderNumber)>0?String(Math.trunc(o.orderNumber)).padStart(3,'0'):String(o?.id||'').slice(-5);
  window.renderAdmin=()=>{
    const b=$('orders');if(!b)return;
    // Garante que a lista administrativa seja carregada mesmo quando a tela
    // for aberta antes da primeira sincronização do banco.
    if((!Array.isArray(window.orders)||window.orders.length===0)&&typeof window.BV_REFRESH_ORDERS==='function'&&!window.BV_ADMIN_REFRESHING){
      window.BV_ADMIN_REFRESHING=true;
      Promise.resolve(window.BV_REFRESH_ORDERS()).finally(()=>{window.BV_ADMIN_REFRESHING=false;});
      return;
    }
    const q=norm($('orderSearch')?.value||''),sf=$('orderStatusFilter')?.value||'',pf=$('orderPaymentFilter')?.value||'',df=$('orderDateFilter')?.value||'',now=Date.now();
    const filtered=(window.orders||[]).filter(o=>{
      if(['entregue','cancelado'].includes(String(o.rawStatus||'').toLowerCase()))return false;
      const text=norm([o.customer,o.phone,o.address?.rua,o.address?.bairro,window.orderLabel(o),o.id].join(' '));
      if(q&&!text.includes(q))return false;
      const rawStatus=String(o.rawStatus||'').toLowerCase();
      if(sf&&rawStatus!==String(sf).toLowerCase())return false;
      if(pf&&o.payment!==pf)return false;
      if(df){
        const t=new Date(o.created_at).getTime();
        if(df==='today'){const d=new Date();d.setHours(0,0,0,0);if(t<d.getTime())return false}
        else if(now-t>Number(df)*86400000)return false
      }
      return true;
    });
    // Os cards administrativos continuam mostrando todos os pedidos ativos.
    // O filtro de "somente novos" pertence exclusivamente ao painel de produção (bvKitchen).
    const novos=filtered;
    const card=o=>{
      const raw=String(o.rawStatus||'').toLowerCase();
      const isNew=raw==='recebido';
      const pm=String(o.payment||'').toLowerCase();
      const paymentBadge=pm.includes('dinheiro')?'💵 Dinheiro'+(Number(o.changeFor)>0?' · Troco para '+money(o.changeFor):''):pm.includes('cart')?'💳 Cartão':pm.includes('pix')?'🟦 PIX':'';
      const statusText=isNew?'NOVO PEDIDO':String(o.status||'Pedido').toUpperCase();
      const address=[o.address?.rua,o.address?.bairro].filter(Boolean).join(' · ');
      return '<article class="orderCard bvDeliveryCard '+(isNew?'bvNewOrderCard':'bvProductionOrderCard')+'">'+
        (isNew?'<div class="bvNewOrderRibbon">🔔 NOVO PEDIDO</div>':'')+
        '<div class="orderHead"><div><small>PEDIDO</small><b>#'+esc(window.orderLabel(o))+'</b></div><span class="statusBadge '+(isNew?'bvNewStatusBadge':'')+'">'+esc(statusText)+'</span></div>'+
        '<div class="orderBody">'+
          '<div class="bvOrderCustomer"><b>'+esc(o.customer||'Cliente')+'</b><span>'+esc(o.phone||'Telefone não informado')+'</span></div>'+
          '<div class="bvOrderItems">'+window.orderItemsMarkup(o.items)+'</div>'+
          '<div class="bvDeliveryBox"><div class="bvDeliveryTitle">📍 ENTREGA</div><div class="bvAddressMain">'+esc(o.address?.rua||'Endereço não informado')+'</div>'+(o.address?.bairro?'<div class="bvAddressSub">Bairro: '+esc(o.address.bairro)+'</div>':'')+(o.address?.numero?'<div class="bvAddressSub">Nº '+esc(o.address.numero)+'</div>':'')+'</div>'+
          (paymentBadge?'<div class="orderPaymentBadge">'+paymentBadge+'</div>':'')+
        '</div>'+
        '<div class="orderFoot"><div><small>TOTAL</small><strong>'+money(o.total)+'</strong></div>'+
        '<div class="bvOrderActions">'+
        (isNew?'<button type="button" class="bvStartOrderBtn" onclick="statusOrder(\''+esc(o.id)+'\',\'em_preparo\')">▶ INICIAR PREPARO</button>':String(o.rawStatus||'').toLowerCase()==='em_preparo'?'<button type="button" class="bvStartOrderBtn bvReadyOrderBtn" onclick="statusOrder(\''+esc(o.id)+'\',\'em_producao\')">✓ PRONTO</button>':'<span class="bvProductionLocked">Status controlado pela produção/entrega</span>')+
        '<button type="button" class="bvCancelOrderBtn" onclick="cancelOrder(\''+esc(o.id)+'\')">Cancelar pedido</button></div>'+
        '</div></article>';
    };
    const emPreparoCount=(window.orders||[]).filter(o=>{
      const s=String(o.rawStatus||'').trim().toLowerCase();
      return s==='em_preparo';
    }).length;
    const section=(title,sub,rows,cls,count=rows.length,always=false)=>{
      if(!rows.length&&!always)return '';
      return '<section class="bvProductionSection '+cls+'"><div class="bvProductionSectionHead"><div><span>'+title+'</span><small>'+sub+'</small></div><strong>'+count+'</strong></div>'+
        (rows.length?'<div class="bvProductionGrid">'+rows.map(card).join('')+'</div>':'')+
        '</section>';
    };
    b.innerHTML=section('🍳 PEDIDOS EM PREPARO','Quantidade de pedidos em preparo neste momento.',novos,'bvNewOrdersSection',emPreparoCount,true)+
      (!novos.length?'<div class="emptyState"><span>📋</span><b>Nenhum pedido novo</b><small>Novos pedidos aparecerão automaticamente aqui.</small></div>':'');
    if(novos.length)b.scrollIntoView({block:'nearest',behavior:'smooth'});
  };
  window.cancelOrder=async(id)=>{
    if(!sb||!window.admin())return toast('Acesso restrito ao administrador.');
    const o=(window.orders||[]).find(x=>String(x.id)===String(id));
    if(!o)return toast('Pedido não encontrado. Atualize a lista e tente novamente.');
    if(String(o.rawStatus||'').toLowerCase()==='cancelado')return toast('Este pedido já está cancelado.');
    if(!confirm('Cancelar este pedido?'))return;
    const r=await sb.from('orders').update({status:'cancelado',updated_at:new Date().toISOString()}).eq('id',id).neq('status','cancelado');
    if(r.error)return toast('Não foi possível cancelar o pedido: '+r.error.message);
    window.orders=(window.orders||[]).filter(x=>String(x.id)!==String(id));
    window.renderAdmin?.();
    toast('Pedido cancelado.');
  };
  window.statusOrder=async(id,s)=>{
    if(!sb||!window.admin())return toast('Acesso restrito ao administrador.');
    s=String(s||'').trim().toLowerCase();
    if(!['em_preparo','em_producao'].includes(s))return toast('Status inválido para esta etapa.');
    const o=(window.orders||[]).find(x=>String(x.id)===String(id));
    if(!o)return toast('Pedido não encontrado. Atualize a lista e tente novamente.');
    const current=String(o.rawStatus||'').toLowerCase();
    if(s==='em_preparo'&&current!=='recebido')return toast('Somente pedidos novos podem ser iniciados.');
    if(s==='em_producao'&&current!=='em_preparo')return toast('Somente pedidos em preparo podem ser marcados como Pronto.');
    const r=await sb.from('orders').update({status:s,updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error)return toast(r.error.message==='PIX_AGUARDANDO_PAGAMENTO'?'PIX ainda não foi pago.':('Erro ao atualizar status: '+r.error.message));
    await window.BV_REFRESH_ORDERS?.();
    window.renderAdmin?.();
    toast('Status atualizado.');
  };
  window.setDashboardDateFilter=value=>{window.BV_DASHBOARD_DATE=value||'';const input=$('dashboardDateFilter');if(input)input.value=window.BV_DASHBOARD_DATE;window.renderDashboard()};
  window.renderDashboard=()=>{
    const all=window.orders||[];
    const selected=window.BV_DASHBOARD_DATE||'';
    const localDateKey=o=>{const d=new Date(o?.created_at);if(Number.isNaN(d.getTime()))return '';return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
    const byDate=o=>!selected||localDateKey(o)===selected;
    const filtered=all.filter(byDate);
    const done=all.filter(o=>o.rawStatus==='entregue'||o.status==='Entregue');
    const delivered=done.filter(byDate);
    const pending=filtered.filter(o=>!['Entregue','Cancelado'].includes(o.status));
    const purchaseTotal=o=>{const total=Number(o?.total)||0;const fee=Number(o?.deliveryFee ?? o?.delivery_fee)||0;return Math.max(0,total-fee)};
    const rev=delivered.reduce((s,o)=>s+purchaseTotal(o),0);
    if($('sOrders'))$('sOrders').textContent=delivered.length;
    if($('sRevenue'))$('sRevenue').textContent=money(rev);
    if($('sAvg'))$('sAvg').textContent=money(delivered.length?rev/delivered.length:0);
    if($('sNew'))$('sNew').textContent=pending.length;
    const chart=$('dashboardChart');
    if(chart){
      const statusMap=[
        ['recebido','Novo'],['em_preparo','Em preparo'],['em_producao','Pronto'],
        ['saiu_entrega','Saiu para entrega'],['entregue','Entregue'],['cancelado','Cancelado']
      ];
      const cs=statusMap.map(([raw])=>filtered.filter(o=>String(o.rawStatus||'')===raw).length);
      const mx=Math.max(1,...cs);
      chart.innerHTML=statusMap.map(([raw,label],i)=>'<div class="chartBar"><div class="chartTrack"><div class="chartFill" style="height:'+Math.max(5,cs[i]/mx*100)+'%"></div></div><b>'+cs[i]+'</b><small>'+label+'</small></div>').join('');
      const title=chart.closest('.analyticsPanel')?.querySelector('.panelTitle small');
      if(title)title.textContent=selected?'Distribuição dos pedidos em '+selected.split('-').reverse().join('/'):'Distribuição dos pedidos por status';
    }
    const nc=$('notificationCenter'),badge=$('notificationBadge'),homeBadge=$('homeNotificationBadge');
    if(badge)badge.textContent=pending.length;
    if(homeBadge)homeBadge.textContent=pending.length;
    if(nc)nc.innerHTML=pending.slice(0,10).map(o=>'<div class="notificationItem"><b>Pedido #'+esc(window.orderLabel(o))+'</b><small>'+esc(o.customer||'Cliente')+' · '+esc(o.status)+'</small></div>').join('')||'<div class="notificationItem">Nenhuma pendência.</div>';
    const list=$('dashboardOrders');
    if(list){
      const fmtDate=o=>{const d=new Date(o.created_at);return Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')+' · '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
      list.innerHTML=delivered.length?delivered.slice(0,20).map((o,i)=>'<div class="line dashboardOrderLine"><span class="dashboardOrderMain"><b>Pedido #'+esc(window.orderLabel(o))+' · '+esc(o.customer||'Cliente')+'</b><small>'+esc(o.items||'Nenhum item informado')+'</small><small class="dashboardOrderDate">📅 <strong>'+esc(fmtDate(o))+'</strong></small></span><strong class="dashboardOrderValue">'+money(purchaseTotal(o))+'</strong><button type="button" class="dashboardOrderDetailsBtn" data-dashboard-order-index="'+i+'">Ver detalhes</button></div>').join(''):'<div class="emptyState"><span>📋</span><b>Nenhum pedido entregue'+(selected?' nesta data':' ainda')+'</b><small>'+(selected?'Escolha outra data ou clique em Todos.':'Os pedidos entregues aparecerão aqui.')+'</small></div>';
      list.querySelectorAll('.dashboardOrderDetailsBtn').forEach(btn=>{btn.addEventListener('click',()=>{const i=Number(btn.dataset.dashboardOrderIndex);const o=delivered.slice(0,20)[i];if(o)window.showDashboardOrderDetails(o)})});
    }
  };
  window.showDashboardOrderDetails=o=>{
    if(!o)return;
    const purchaseTotal=o=>Math.max(0,(Number(o?.total)||0)-(Number(o?.deliveryFee ?? o?.delivery_fee)||0));
    const deliveryFee=Number(o?.deliveryFee ?? o?.delivery_fee)||0;
    const orderTotal=purchaseTotal(o)+deliveryFee;
    let m=$('dashboardOrderDetails');
    if(!m){m=document.createElement('div');m.id='dashboardOrderDetails';m.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(7px)';document.body.appendChild(m)}
    const d=new Date(o.created_at);const date=Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const address=o.address?((o.address.rua||'')+(o.address.bairro?' — '+o.address.bairro:'')):'Retirada no local';
    m.innerHTML='<div style="width:min(620px,100%);max-height:90vh;overflow:auto;background:#111419;color:#fff;border:1px solid #343a44;border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.7);padding:22px;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:15px"><div><small style="color:#e50914;font-weight:900;letter-spacing:1px">DETALHES DO PEDIDO</small><h2 style="margin:6px 0">#'+esc(window.orderLabel(o))+'</h2></div><button type="button" onclick="closeDashboardOrderDetails()" style="width:40px;height:40px;border:1px solid #343a44;border-radius:10px;background:#20242a;color:#fff;font-size:24px;cursor:pointer">×</button></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:15px"><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>CLIENTE</small><br><b>'+esc(o.customer||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>STATUS</small><br><b>'+esc(o.status||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>WHATSAPP</small><br><b>'+esc(o.phone||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>DATA E HORA</small><br><b>'+esc(date)+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>PAGAMENTO</small><br><b>'+esc(o.payment||'Não informado')+'</b></div></div><div style="margin-top:12px;background:#1a1e24;padding:14px;border-radius:10px"><small>ENDEREÇO</small><p style="margin:6px 0 0">'+esc(address)+'</p></div><div style="margin-top:12px;background:#1a1e24;padding:14px;border-radius:10px"><small>ITENS DO PEDIDO</small><p style="margin:6px 0 0;line-height:1.7">'+esc(o.items||'Nenhum item informado')+'</p></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:15px;border-top:1px solid #343a44"><span style="font-weight:800">TOTAL DO PEDIDO (COM TAXA)</span><strong style="font-size:24px;color:#e50914">'+money(orderTotal)+'</strong></div></div>';
  };
  window.closeDashboardOrderDetails=()=>{$('dashboardOrderDetails')?.remove()};
  window.toggleNotifications=()=>{$('notificationCenter')?.classList.toggle('show');$('notificationCenter')?.classList.toggle('open')};
  window.clearOrderFilters=()=>{['orderSearch','orderStatusFilter','orderPaymentFilter','orderDateFilter'].forEach(id=>{if($(id))$(id).value=''});window.renderAdmin()};
  ['orderSearch','orderStatusFilter','orderPaymentFilter','orderDateFilter'].forEach(id=>$(id)?.addEventListener('input',window.renderAdmin));

  window.refreshDeliveryFees=async()=>{
    const b=$('bairroFees');if(!b||!sb)return;const r=await sb.from('neighborhood_fees').select('*').order('name');if(r.error)return b.innerHTML='<p class="muted">Erro ao carregar taxas: '+esc(r.error.message)+'</p>';
    b.innerHTML=(r.data||[]).map(x=>`<div class="feeRow"><div><b>${esc(x.name)}</b><small> ${money(x.fee)}</small></div><div class="feeActions"><button type="button" onclick="updateBairroFee('${esc(x.name)}')">Editar</button><button type="button" onclick="deleteBairroFee('${esc(x.name)}')">Excluir</button></div></div>`).join('')||'<p class="muted">Nenhum bairro cadastrado.</p>';
  };
  window.addBairroFee=async()=>{
    if(!sb)return;const n=$('bairroCfg')?.value.trim(),f=Number(String($('bairroFeeCfg')?.value||'').replace(',','.'));if(!n||!Number.isFinite(f)||f<0)return toast('Informe bairro e uma taxa válida.');
    const r=await sb.from('neighborhood_fees').upsert({name:n,fee:f,active:true},{onConflict:'name'});if(r.error)return toast('Erro ao salvar taxa: '+r.error.message);$('bairroCfg').value='';$('bairroFeeCfg').value='';await window.refreshDeliveryFees();toast('Taxa salva.');
  };
  window.updateBairroFee=async n=>{const v=prompt('Nova taxa para '+n);if(v===null)return;const f=Number(String(v).replace(',','.'));if(!Number.isFinite(f)||f<0)return toast('Taxa inválida.');const r=await sb.from('neighborhood_fees').update({fee:f,active:true}).eq('name',n);if(r.error)return toast('Erro: '+r.error.message);await window.refreshDeliveryFees();toast('Taxa atualizada.')};
  window.deleteBairroFee=async n=>{if(!confirm('Excluir a taxa de '+n+'?'))return;const r=await sb.from('neighborhood_fees').delete().eq('name',n);if(r.error)return toast('Erro ao excluir: '+r.error.message);await window.refreshDeliveryFees();toast('Bairro excluído.')};
  window.saveCfg=async()=>{if(!sb)return;const f=Number(String($('feeCfg')?.value||0).replace(',','.')),w=$('waCfg')?.value.trim()||'';if(!Number.isFinite(f)||f<0)return toast('Taxa padrão inválida.');const r=await sb.from('settings').upsert({id:1,fee:f,whatsapp:w},{onConflict:'id'});if(r.error)return toast('Erro ao salvar configurações: '+r.error.message);window.BV_DEFAULT_FEE=f;toast('Configurações salvas.')};

  window.promotions=[];window.promotionItems={};
  window.BV_REFRESH_PROMOTIONS=async()=>{if(!sb)return;const r=await sb.from('promotions').select('*').order('created_at',{ascending:false});if(r.error)return toast('Erro ao carregar promoções: '+r.error.message);window.promotions=r.data||[];const ids=window.promotions.map(x=>x.id);window.promotionItems={};if(ids.length){const z=await sb.from('promotion_items').select('promotion_id,product_id,quantity').in('promotion_id',ids);if(!z.error)(z.data||[]).forEach(i=>{(window.promotionItems[i.promotion_id]??=[]).push(i)})}
    const productIds=[...new Set(Object.values(window.promotionItems).flat().map(i=>i.product_id).filter(Boolean).concat(window.promotions.map(x=>x.product_id).filter(Boolean)))];
    if(productIds.length){const pr=await sb.from('products').select('id,stock,active').in('id',productIds);if(!pr.error){const stockById={};(pr.data||[]).forEach(p=>stockById[String(p.id)]=Number(p.stock)||0);const disableIds=[];window.promotions.forEach(p=>{if(!p.active)return;const rows=window.promotionItems[p.id]?.length?window.promotionItems[p.id]:(p.product_id?[{product_id:p.product_id,quantity:1}]:[]);if(rows.some(i=>{const prod=(pr.data||[]).find(x=>String(x.id)===String(i.product_id));const cat=String(window.products?.find(x=>String(x.id)===String(i.product_id))?.category||'').trim().toLowerCase();return cat!=='lanches'&&((stockById[String(i.product_id)]??0)<=0)}))disableIds.push(p.id)});if(disableIds.length){await Promise.all(disableIds.map(id=>sb.from('promotions').update({active:false}).eq('id',id)));window.promotions.forEach(p=>{if(disableIds.includes(p.id))p.active=false})}}}
    window.renderProducts();window.renderPromotionsAdmin?.();window.renderHomePromoBanner?.()};
  window.renderProducts=window.renderProducts;
  window.BV_PROMO_TIMER=null;
  window.renderHomePromoBanner=()=>{
    const box=$('homePromoBanner'),track=$('homePromoTrack'),dots=$('homePromoDots');if(!box||!track||!dots)return;
    const now=Date.now(),active=(window.promotions||[]).filter(x=>x.active&&(!x.starts_at||new Date(x.starts_at).getTime()<=now)&&(!x.ends_at||new Date(x.ends_at).getTime()>=now));
    if(!active.length){box.classList.remove('show');track.innerHTML='';dots.innerHTML='';clearInterval(window.BV_PROMO_TIMER);return}
    const ps=(window.products||[]).filter(x=>x.active!==false);
    track.innerHTML=active.map(x=>{const items=window.promotionItems?.[x.id]||[],legacy=x.product_id?[{product_id:x.product_id,quantity:1}]:[];const groups={Lanches:[],Bebidas:[],Adicionais:[]};(items.length?items:legacy).forEach(it=>{const p=ps.find(y=>String(y.id)===String(it.product_id));const name=p?.name||'Produto';const cat=String(p?.category||'').trim().toLowerCase();const key=cat==='bebidas'?'Bebidas':cat==='adicionais'?'Adicionais':'Lanches';groups[key].push((it.quantity||1)+'x '+name)});const list=['Lanches','Bebidas','Adicionais'].filter(k=>groups[k].length).map(k=>'<div class="homePromoGroup"><small>'+k.toUpperCase()+'</small><span>'+esc(groups[k].join(' • '))+'</span></div>').join('');return '<article class="homePromoSlide"'+(x.image_url?' style="background-image:linear-gradient(90deg,rgba(8,8,10,.96) 0%,rgba(8,8,10,.72) 45%,rgba(8,8,10,.18) 100%),url(\''+esc(x.image_url)+'\');background-size:cover;background-position:center;"':'')+'><div class="homePromoCopy"><small class="homePromoKicker">🔥 OFERTA ESPECIAL</small><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'Aproveite enquanto durar!')+'</p><div class="homePromoItems">'+list+'</div></div><div class="homePromoPrice"><del>'+money(x.original_price||0)+'</del><strong>'+money(x.promotional_price||0)+'</strong><button type="button" onclick="showPage(\'cardapio\')">Ver oferta →</button></div></article>'}).join('');
    dots.innerHTML=active.map((_,i)=>'<i class="'+(i===0?'active':'')+'"></i>').join('');box.classList.add('show');let index=0;clearInterval(window.BV_PROMO_TIMER);track.style.transform='translateX(0)';if(active.length>1)window.BV_PROMO_TIMER=setInterval(()=>{index=(index+1)%active.length;track.style.transform='translateX(-'+index*100+'%)';dots.querySelectorAll('i').forEach((d,i)=>d.classList.toggle('active',i===index))},5000);
  };
  window.generatePromotionImage=async promotionId=>{
    try{
      const promo=(window.promotions||[]).find(x=>String(x.id)===String(promotionId));
      if(!promo)throw new Error('Promoção não encontrada.');
      if(window.BV_REFRESH_PROMOTIONS)await window.BV_REFRESH_PROMOTIONS();

      const items=window.promotionItems?.[promo.id]||[];
      const ps=window.products||[];
      const rows=items.length?items:(promo.product_id?[{product_id:promo.product_id,quantity:1}]:[]);
      const base=rows.map(i=>({
        p:ps.find(x=>String(x.id)===String(i.product_id)),
        q:Math.max(1,Number(i.quantity)||1)
      })).filter(x=>x.p);
      if(!base.length)throw new Error('A promoção não possui produtos válidos.');

      toast('🖼️ Criando banner grátis com todos os itens juntos...');

      const loadImg=url=>new Promise(resolve=>{
        if(!url)return resolve(null);
        const im=new Image();
        im.crossOrigin='anonymous';
        im.onload=()=>resolve(im);
        im.onerror=()=>resolve(null);
        im.src=url;
      });

      const units=[];
      base.forEach(x=>{for(let i=0;i<x.q;i++)units.push(x.p)});
      const visible=units.slice(0,9);
      const imgs=await Promise.all(visible.map(p=>loadImg(p.image_url)));

      const c=document.createElement('canvas');
      c.width=1200;c.height=800;
      const ctx=c.getContext('2d');
      if(!ctx)throw new Error('Seu navegador não suporta criação de banners.');

      // Arte única, sem API e sem custo.
      const bg=ctx.createLinearGradient(0,0,1200,800);
      bg.addColorStop(0,'#120003');bg.addColorStop(.48,'#61070d');bg.addColorStop(1,'#07080a');
      ctx.fillStyle=bg;ctx.fillRect(0,0,c.width,c.height);

      const glow=ctx.createRadialGradient(600,430,40,600,430,520);
      glow.addColorStop(0,'rgba(255,205,0,.20)');
      glow.addColorStop(.48,'rgba(229,9,20,.12)');
      glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;ctx.fillRect(0,0,c.width,c.height);

      // Cabeçalho do banner.
      ctx.textAlign='center';
      ctx.fillStyle='#ffd400';ctx.font='900 27px Arial';
      ctx.fillText('BV LANCHES',600,45);
      ctx.fillStyle='#fff';ctx.font='900 48px Arial';
      ctx.fillText('PROMOÇÃO IMPERDÍVEL',600,102);

      // Área única do combo: os produtos se sobrepõem e formam uma única composição.
      ctx.save();
      ctx.fillStyle='rgba(0,0,0,.20)';
      ctx.beginPath();ctx.ellipse(600,485,500,120,0,0,Math.PI*2);ctx.fill();
      ctx.restore();

      const positions=[];
      const n=visible.length;
      if(n===1)positions.push([600,405,300]);
      else if(n===2)positions.push([505,405,300],[695,405,300]);
      else if(n===3)positions.push([600,355,300],[465,470,280],[735,470,280]);
      else{
        const cols=n<=4?2:3;
        const top=n<=4?2:Math.ceil(n/3);
        for(let i=0;i<n;i++){
          const row=Math.floor(i/cols),col=i%cols;
          const count=Math.min(cols,n-row*cols);
          const spacing=190;
          const x=600+(col-(count-1)/2)*spacing;
          const y=360+row*145;
          positions.push([x,y,n>=7?235:260]);
        }
      }

      const drawImageCover=(im,x,y,size)=>{
        const w=im.naturalWidth||im.width||1,h=im.naturalHeight||im.height||1;
        const ratio=Math.max(size/w,size/h);
        const dw=w*ratio,dh=h*ratio;
        ctx.save();
        ctx.translate(x-size/2,y-size/2);
        ctx.shadowColor='rgba(0,0,0,.55)';ctx.shadowBlur=22;ctx.shadowOffsetY=12;
        ctx.beginPath();ctx.roundRect(0,0,size,size,28);ctx.clip();
        ctx.drawImage(im,(size-dw)/2,(size-dh)/2,dw,dh);
        ctx.restore();
      };

      visible.forEach((p,i)=>{
        const [x,y,size]=positions[i]||[600,410,240];
        const im=imgs[i];
        if(im)drawImageCover(im,x,y,size);
        else{
          ctx.save();
          ctx.fillStyle='rgba(255,255,255,.08)';
          ctx.beginPath();ctx.arc(x,y,size*.32,0,Math.PI*2);ctx.fill();
          ctx.fillStyle='#fff';ctx.font='900 54px Arial';
          ctx.textAlign='center';
          ctx.fillText(p.category==='Bebidas'?'🥤':'🍔',x,y+18);
          ctx.restore();
        }
      });

      // Identificação do combo uma única vez — sem cards separados.
      const comboText=base.map(x=>x.q+'x '+x.p.name).join(' + ');
      ctx.textAlign='center';
      ctx.fillStyle='#fff';ctx.font='900 25px Arial';
      ctx.fillText(comboText.slice(0,78),600,610);

      ctx.fillStyle='#ffd400';ctx.font='900 64px Arial';
      ctx.fillText(money(Number(promo.promotional_price)||0),600,690);

      ctx.fillStyle='#fff';ctx.font='900 22px Arial';
      ctx.fillText('PEÇA JÁ O SEU!  •  OFERTA ESPECIAL',600,742);

      const data=c.toDataURL('image/jpeg',.82);
      const upd=await sb.from('promotions').update({image_url:data}).eq('id',promo.id);
      if(upd.error)throw upd.error;

      promo.image_url=data;
      window.renderHomePromoBanner?.();
      window.renderPromotionsAdmin?.();
      toast('✅ Banner grátis criado com os itens em uma única composição.');
      return true;
    }catch(e){
      console.error('[BV FREE PROMO IMAGE]',e);
      toast('❌ '+(e?.message||'Não foi possível criar a imagem.'));
      return false;
    }
  };
  window.renderPromotionsAdmin=()=>{const ps=(window.products||[]).filter(x=>x.active!==false);const b=$('promotionsManage');if(!b)return;const a=window.promotions||[];const itemBox=$('promoItems');if(itemBox&&!itemBox.children.length)window.addPromoItemRow?.();b.innerHTML=a.length?a.map(x=>{const items=window.promotionItems?.[x.id]||[];const legacy=x.product_id?[{product_id:x.product_id,quantity:1}]:[];const list=(items.length?items:legacy).map(i=>{const p=ps.find(y=>String(y.id)===String(i.product_id));return (i.quantity||1)+'x '+esc(p?.name||'Produto')}).join(' + ');return '<article class="promotionAdminCard"><div class="promoAdminMain"><div class="promoAdminInfo"><span class="promoBadge">🔥 PROMOÇÃO</span><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'')+'</p><small>'+list+'</small></div></div><div class="promoAdminPrice"><del>'+money(x.original_price||0)+'</del><b>'+money(x.promotional_price||0)+'</b></div><div class="promoActions"><button type="button" onclick="window.generatePromotionImage(this.getAttribute(&quot;data-promotion-id&quot;))" data-promotion-id="'+esc(x.id)+'">🤖 '+(x.image_url?'Atualizar banner':'Gerar banner')+'</button><button type="button" data-promotion-id="'+esc(x.id)+'" onclick="togglePromotion(this.getAttribute(&quot;data-promotion-id&quot;),'+(!x.active)+')">'+(x.active?'Desativar':'Ativar')+'</button><button type="button" data-promotion-id="'+esc(x.id)+'" onclick="removePromotion(this.getAttribute(&quot;data-promotion-id&quot;))">Excluir</button></div></article>'}).join(''):'<div class="emptyState"><span>🏷️</span><b>Nenhuma promoção cadastrada.</b><small>Cadastre a primeira oferta abaixo.</small></div>'};
  window.addPromotion=async e=>{e.preventDefault();const n=$('promoName')?.value.trim(),d=$('promoDesc')?.value.trim(),pp=Number($('promoPrice')?.value),sa=$('promoStart')?.value||null,ea=$('promoEnd')?.value||null;const rows=[...document.querySelectorAll('.promoItemRow')].map(r=>({product_id:r.querySelector('.promoItemProduct')?.value,quantity:Math.max(1,Number(r.querySelector('.promoItemQty')?.value)||1)})).filter(x=>x.product_id);if(!n||!rows.length||!Number.isFinite(pp)||pp<0)return toast('Preencha nome, itens e preço promocional.');const products=rows.map(r=>(window.products||[]).find(p=>String(p.id)===String(r.product_id))).filter(Boolean);if(products.length!==rows.length)return toast('Há produto inválido na promoção.');const original=products.reduce((s,p,i)=>s+(Number(p.price)||0)*rows[i].quantity,0);if(pp>=original)return toast('O preço promocional deve ser menor que o valor normal dos itens.');const r=await sb.from('promotions').insert({name:n,description:d||'',product_id:products[0].id,original_price:original,promotional_price:pp,starts_at:sa?new Date(sa).toISOString():null,ends_at:ea?new Date(ea).toISOString():null,active:true}).select('id').single();if(r.error)return toast('Erro ao cadastrar promoção: '+r.error.message);const ins=await sb.from('promotion_items').insert(rows.map(x=>({promotion_id:r.data.id,product_id:x.product_id,quantity:x.quantity})));if(ins.error){await sb.from('promotions').delete().eq('id',r.data.id);return toast('Erro ao salvar os itens da promoção: '+ins.error.message)}e.target.reset();document.getElementById('promoItems')?.replaceChildren();window.addPromoItemRow?.();await window.BV_REFRESH_PROMOTIONS();toast('Promoção cadastrada com '+rows.length+' item(ns).');await window.generatePromotionImage(r.data.id);};
  window.addPromoItemRow=()=>{const box=$('promoItems');if(!box)return;const row=document.createElement('div');row.className='promoItemRow';row.innerHTML='<select class="promoItemProduct" required><option value="">Produto</option>'+((window.products||[]).filter(x=>x.active!==false).map(p=>'<option value="'+esc(p.id)+'">'+esc(p.name)+' — '+money(p.price)+'</option>').join(''))+'</select><input class="promoItemQty" type="number" min="1" step="1" value="1" required><button type="button" onclick="this.closest(\'.promoItemRow\').remove()">×</button>';box.appendChild(row)};
  window.togglePromotion=async(id,v)=>{const r=await sb.from('promotions').update({active:!!v,updated_at:new Date().toISOString()}).eq('id',id);if(r.error)return toast('Erro: '+r.error.message);await window.BV_REFRESH_PROMOTIONS();toast(v?'Promoção ativada.':'Promoção desativada.')};
  window.removePromotion=async id=>{if(!confirm('Excluir esta promoção?'))return;const r=await sb.from('promotions').delete().eq('id',id);if(r.error)return toast('Erro ao excluir: '+r.error.message);await window.BV_REFRESH_PROMOTIONS();toast('Promoção excluída.')};
  window.adjustProductStock=async(id,delta)=>{
    if(!['administrador','admin'].includes(String(window.BV_ROLE||'').toLowerCase()))return toast('Acesso restrito ao administrador.');
    const p=(window.products||[]).find(x=>String(x.id)===String(id));
    if(!p)return toast('Produto não encontrado.');
    const current=Math.max(0,Number(p.stock)||0), next=Math.max(0,current+Number(delta||0));
    if(next===current)return;
    const r=await sb.rpc('adjust_product_stock',{p_product_id:id,p_delta:Number(delta)||0});
    if(r.error)return toast('Erro ao atualizar estoque: '+r.error.message);
    p.stock=Number(r.data)||0;
    try{localStorage.setItem('bv_products',JSON.stringify(window.products||[]))}catch(e){}
    window.renderProductsAdmin?.();
    window.renderProducts?.();
  };
  window.renderProductsAdmin=()=>{
    const b=$('manage');if(!b)return;
    const a=(window.products||[]).filter(x=>x.active!==false);
    b.innerHTML=a.map(x=>{
      const fallback=x.category==='Bebidas'?'🥤':'🍔';
      const media=x.image_url?'<img src="'+esc(x.image_url)+'" alt="'+esc(x.name)+'" loading="lazy" decoding="async" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'grid\'">'+'<span style="display:none">'+fallback+'</span>':'<span>'+fallback+'</span>';
      const isRefrigerante=String(x.category||'')==='Bebidas';
      const stock=Math.max(0,Number(x.stock)||0);
      const stockHtml=isRefrigerante?'<div class="adminStockBox"><span>ESTOQUE</span><div class="adminStockControls"><button type="button" class="stockMinus" aria-label="Diminuir estoque" onclick="adjustProductStock(\''+esc(x.id)+'\',-1)">−</button><strong>'+stock+'</strong><button type="button" class="stockPlus" aria-label="Aumentar estoque" onclick="adjustProductStock(\''+esc(x.id)+'\',1)">+</button></div></div>':'';
      return '<article class="productCard adminProductCard"><div class="productImage">'+media+'</div><div class="productInfo"><small class="eyebrow">'+esc(x.category||'Lanches')+'</small><h3>'+esc(x.name)+'</h3><p>'+esc(x.description||'')+'</p>'+stockHtml+'<div class="productBottom"><b>'+money(x.price)+'</b><button type="button" onclick="removeProduct(\''+esc(x.id)+'\')">Excluir produto</button></div></div></article>';
    }).join('')||'<div class="emptyState"><span>📦</span><b>Nenhum produto cadastrado.</b><small>Cadastre um produto para começar seu cardápio.</small></div>';
  };
  window.addProduct=async e=>{e.preventDefault();const role=String(window.BV_ROLE||'').trim().toLowerCase();if(!['administrador','admin'].includes(role))return toast('Acesso restrito ao administrador.');if(!sb)return toast('Banco de dados indisponível. Recarregue a página.');const form=e.target;const n=$('productName')?.value.trim()||'',raw=String($('productPrice')?.value||'').trim().replace(',','.'),p=Number(raw),cat=String($('productCategory')?.value||'').trim(),d=$('productDesc')?.value.trim()||'';if(!n)return toast('Informe o nome do produto.');if(raw===''||!Number.isFinite(p)||p<0)return toast('Informe um valor válido para o produto.');if(!['Lanches','Bebidas','Adicionais'].includes(cat))return toast('Selecione uma categoria válida.');const btn=form.querySelector('.formSave');if(btn){btn.disabled=true;btn.textContent='Cadastrando...'}try{const r=await sb.from('products').insert({name:n,price:p,category:cat,description:d,active:true}).select('id').single();if(r.error)throw r.error;form.reset();if($('productCategory'))$('productCategory').value='Lanches';window.closeProductForm();await window.BV_REFRESH_PRODUCTS();toast('Produto cadastrado com sucesso.')}catch(err){console.error('Cadastro de produto:',err);const msg=err?.message||'Verifique os dados e tente novamente.';toast('Erro ao cadastrar produto: '+msg)}finally{if(btn){btn.disabled=false;btn.textContent='✓ Cadastrar produto'}}};
  window.removeProduct=async id=>{if(!confirm('Excluir este produto do cardápio?'))return;const r=await sb.from('products').update({active:false}).eq('id',id);if(r.error)return toast('Erro ao excluir: '+r.error.message);await window.BV_REFRESH_PRODUCTS();toast('Produto removido.')};
  window.BV_REFRESH_PRODUCTS=async()=>{if(!sb)return;const r=await sb.from('products').select('*').order('created_at');if(r.error)return toast('Erro ao carregar cardápio: '+r.error.message);window.products=r.data||[];localStorage.setItem('bv_products',JSON.stringify(window.products));window.renderProducts();window.renderProductsAdmin?.();window.renderPromotionsAdmin?.();await window.BV_REFRESH_PROMOTIONS?.()};
  window.BV_REFRESH_PROMOTIONS?.();
  window.BV_REFRESH_ORDERS=async()=>{
    if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;
    let role=String(window.BV_ROLE||'').trim().toLowerCase();
    if(!role){
      const pr=await sb.from('profiles').select('role').eq('id',user.id).maybeSingle();
      role=String(pr.data?.role||'usuario').trim().toLowerCase();
      window.BV_ROLE=role;
    }
    let q=sb.from('orders').select('id,order_number,user_id,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id,change_for,pix_payment_id,pix_qr_code,pix_qr_code_base64,pix_expires_at').neq('status','cancelado').order('created_at',{ascending:false});
    if(role==='motoboy')q=q.or('and(status.in.(em_preparo,em_producao),motoboy_id.is.null),and(status.in.(em_preparo,em_producao),motoboy_id.eq.'+user.id+'),and(status.eq.saiu_entrega,motoboy_id.eq.'+user.id+')');else if(!['administrador','admin'].includes(String(role).toLowerCase()))q=q.eq('user_id',user.id);
    const r=await q;if(r.error)return toast('Erro ao carregar pedidos: '+r.error.message);
    const ids=(r.data||[]).map(x=>x.id);let its=[];if(ids.length){const z=await sb.from('order_items').select('order_id,product_name,quantity').in('order_id',ids);if(!z.error)its=z.data||[]}
    const g={};its.forEach(i=>(g[i.order_id]??=[]).push(i));
    window.orders=(r.data||[]).map(o=>({id:o.id,orderNumber:o.order_number,created_at:o.created_at,customer:o.customer_name,phone:o.phone,total:Number(o.total)||0,payment:payLabel[o.payment_method]||o.payment_method,changeFor:Number(o.change_for)||null,paymentStatus:o.payment_status||'pendente',status:status[o.status]||o.status,rawStatus:o.status,address:o.address?{rua:o.address,bairro:o.neighborhood}:null,deliveryFee:Number(o.delivery_fee)||0,motoboyId:o.motoboy_id,pixPaymentId:o.pix_payment_id||null,pixQrCode:o.pix_qr_code||'',pixQrCodeBase64:o.pix_qr_code_base64||'',pixExpiresAt:o.pix_expires_at||null,items:(g[o.id]||[]).map(i=>({product_name:i.product_name,quantity:i.quantity}))}));
    if(role==='motoboy'){window.renderMotoOrders?.();return;}
    window.renderAdmin();
    window.renderDashboard();
    // Acompanhar pedido: só redesenha quando os dados realmente mudaram.
    // Isso evita o efeito de "piscar/oscilando" causado pelo polling/realtime.
    if(document.getElementById('page-acompanhar')?.classList.contains('activePage')){
      const trackId=localStorage.getItem('bv_track_id');
      const found=(window.orders||[]).find(x=>String(x.id)===String(trackId));
      if(found){
        const sig=JSON.stringify({
          id:found.id,status:found.rawStatus,payment:found.payment,paymentStatus:found.paymentStatus,
          motoboyId:found.motoboyId,changeFor:found.changeFor,total:found.total,
          pixPaymentId:found.pixPaymentId,pixQrCode:found.pixQrCode,pixQrCodeBase64:found.pixQrCodeBase64,
          pixExpiresAt:found.pixExpiresAt
        });
        if(sig!==window.BV_TRACKING_RENDER_SIG){
          window.BV_TRACKING_RENDER_SIG=sig;
          window.renderTracking(found);
        }
      }
    }
    window.startGlobalPixPolling?.();
  };
  window.BV_GLOBAL_PIX_TIMER=null;
  window.startGlobalPixPolling=()=>{
    if(window.BV_GLOBAL_PIX_TIMER)return;
    const tick=async()=>{
      try{
        const sbx=sb||window.BV_SUPABASE;
        if(!sbx)return;
        const {data:{user}}=await sbx.auth.getUser();
        if(!user)return;
        const pending=(window.orders||[]).filter(o=>String(o.payment||'').toLowerCase()==='pix'&&String(o.paymentStatus||'').toLowerCase()!=='pago'&&!['entregue','cancelado'].includes(String(o.rawStatus||'').toLowerCase()));
        for(const o of pending){
          const r=await sbx.functions.invoke('pix-status',{body:{order_id:o.id}});
          if(!r.error&&r.data?.paid){
            await window.BV_REFRESH_ORDERS?.();
            if(String(localStorage.getItem('bv_track_id'))===String(o.id))window.renderTracking?.((window.orders||[]).find(x=>String(x.id)===String(o.id)));
            toast('✅ PIX confirmado! Pagamento recebido.');
            break;
          }
        }
      }catch(e){console.warn('[BV GLOBAL PIX]',e)}
      window.BV_GLOBAL_PIX_TIMER=setTimeout(tick,5000);
    };
    window.BV_GLOBAL_PIX_TIMER=setTimeout(tick,2000);
  };
  window.BV_TRACKING_POLL_TIMER=null;
window.BV_TRACKING_RENDER_SIG='';
window.startTrackingStatusPolling=()=>{
  if(window.BV_TRACKING_POLL_TIMER)return;
  const tick=async()=>{
    try{
      if(!document.getElementById('page-acompanhar')?.classList.contains('activePage')){window.BV_TRACKING_POLL_TIMER=null;return;}
      await window.BV_REFRESH_ORDERS?.();
      const id=localStorage.getItem('bv_track_id');
      const found=(window.orders||[]).find(x=>String(x.id)===String(id));
      if(found){
        const sig=JSON.stringify({
          id:found.id,status:found.rawStatus,payment:found.payment,paymentStatus:found.paymentStatus,
          motoboyId:found.motoboyId,changeFor:found.changeFor,total:found.total,
          pixPaymentId:found.pixPaymentId,pixQrCode:found.pixQrCode,pixQrCodeBase64:found.pixQrCodeBase64,
          pixExpiresAt:found.pixExpiresAt
        });
        if(sig!==window.BV_TRACKING_RENDER_SIG){
          window.BV_TRACKING_RENDER_SIG=sig;
          window.renderTracking(found);
        }
      }
      if(found&&!['entregue','cancelado'].includes(String(found.rawStatus||'').toLowerCase())) window.BV_TRACKING_POLL_TIMER=setTimeout(tick,3000);
      else window.BV_TRACKING_POLL_TIMER=null;
    }catch(e){console.warn('[BV TRACKING POLL]',e);window.BV_TRACKING_POLL_TIMER=setTimeout(tick,5000);}
  };
  window.BV_TRACKING_POLL_TIMER=setTimeout(tick,1000);
};
window.BV_TRACKING_REALTIME=null;
  window.setupTrackingRealtime=async()=>{
    if(!sb||window.BV_TRACKING_REALTIME)return;
    const {data:{user}}=await sb.auth.getUser();
    if(!user)return;
    window.BV_TRACKING_REALTIME=sb.channel('bv-tracking-'+user.id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'orders',filter:'user_id=eq.'+user.id},async payload=>{
        // BV_REFRESH_ORDERS já redesenha o acompanhamento somente quando o
        // pedido realmente mudou. Não chamar renderTracking novamente aqui,
        // pois isso fazia o card oscilar a cada evento do Realtime.
        await window.BV_REFRESH_ORDERS?.();
      })
      .subscribe(status=>{console.log('[BV TRACKING] Realtime:',status);});
  };
  window.copyPixCode=async()=>{const code=String(window.BV_PIX_CODE||'');if(!code)return toast('Código PIX indisponível.');try{await navigator.clipboard.writeText(code);toast('Pix Copia e Cola copiado!')}catch{const ta=document.createElement('textarea');ta.value=code;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('Pix Copia e Cola copiado!')}};  window.BV_PIX_STATUS_TIMER=null;
  window.stopPixStatusPolling=()=>{if(window.BV_PIX_STATUS_TIMER){clearTimeout(window.BV_PIX_STATUS_TIMER);window.BV_PIX_STATUS_TIMER=null}};
  window.startPixStatusPolling=o=>{
    window.stopPixStatusPolling();
    const order=o||(window.orders||[]).find(x=>String(x.id)===String(localStorage.getItem('bv_track_id')));
    if(!order)return;
    const pending=String(order.payment||'').toLowerCase()==='pix' && String(order.paymentStatus||'').toLowerCase()!=='pago' && !['entregue','cancelado'].includes(String(order.rawStatus||'').toLowerCase());
    if(!pending)return;
    const expires=order.pixExpiresAt?new Date(order.pixExpiresAt).getTime():0;
    const poll=async()=>{
      try{
        const sbx=sb||window.BV_SUPABASE;
        if(!sbx)return;
        const r=await sbx.functions.invoke('pix-status',{body:{order_id:order.id}});
        if(!r.error&&r.data?.paid){
          toast('✅ PIX confirmado! Pagamento recebido.');
          await window.BV_REFRESH_ORDERS?.();
          const updated=(window.orders||[]).find(x=>String(x.id)===String(order.id));
          if(updated)window.renderTracking(updated);
          return;
        }
      }catch(e){console.warn('[BV PIX STATUS]',e)}
      if(expires && Date.now()>=expires){window.stopPixStatusPolling();return}
      window.BV_PIX_STATUS_TIMER=setTimeout(poll,4000);
    };
    window.BV_PIX_STATUS_TIMER=setTimeout(poll,1200);
  };
  window.renderTracking=o=>{const b=$("trackingResult");if(!b)return;o=o||(window.orders||[]).find(x=>String(x.id)===String(localStorage.getItem('bv_track_id')))||(window.orders||[]).find(x=>!['entregue','cancelado'].includes(String(x.rawStatus||'').toLowerCase()));if(!o){b.innerHTML='<p class="muted">Nenhum pedido em andamento.</p>';return}const rawStatus=String(o.rawStatus||o.status||'').trim().toLowerCase();const displayStatus=String(status[rawStatus]||o.status||rawStatus||'Pedido recebido');o.status=displayStatus;o.rawStatus=rawStatus;window.BV_PIX_CODE=o.pixQrCode||'';const isPix=String(o.payment||'').toLowerCase()==='pix';const paid=String(o.paymentStatus||'').toLowerCase()==='pago';const qr=o.pixQrCodeBase64?'<img src="data:image/png;base64,'+esc(o.pixQrCodeBase64)+'" alt="QR Code PIX" style="width:min(240px,70vw);display:block;margin:14px auto;border-radius:14px;background:#fff;padding:8px;box-sizing:border-box">':'';const pixBox=isPix&&!paid?'<div style="margin-top:16px;padding:16px;border:1px solid rgba(0,200,120,.22);border-radius:16px;background:rgba(0,120,80,.08);text-align:center"><b style="display:block;font-size:15px">PIX — aguardando pagamento</b><small class="muted">Pague pelo QR Code ou use o Pix Copia e Cola.</small>'+qr+(o.pixQrCode?'<button type="button" onclick="copyPixCode()" style="width:100%;margin-top:8px;padding:12px;border:0;border-radius:10px;background:#e50914;color:#fff;font-weight:900;cursor:pointer">📋 Copiar Pix Copia e Cola</button>':'<small style="display:block;margin-top:10px;color:#ffb0b0">QR Code ainda não disponível.</small>')+'</div>':(isPix&&paid?'<div style="margin-top:16px;padding:14px;border-radius:14px;background:rgba(0,160,90,.12);border:1px solid rgba(0,200,120,.25);text-align:center"><b>✅ PIX confirmado</b><small class="muted" style="display:block;margin-top:4px">Pagamento recebido. Pedido liberado para preparo.</small></div>':'');b.innerHTML='<div class="trackingCard"><small>PEDIDO</small><h3>#'+esc(window.orderLabel(o))+'</h3><div class="trackingStatusLabel"><span>STATUS DO PEDIDO</span><b>'+esc(displayStatus)+'</b></div><p>'+esc(o.items||'')+'</p><strong>'+money(o.total)+'</strong>'+pixBox+'</div>';window.startPixStatusPolling(o)};
  window.trackLastOrder=async()=>{try{await window.BV_REFRESH_ORDERS?.();const o=(window.orders||[])[0];if(!o)return toast('Você ainda não possui pedidos.');localStorage.setItem('bv_track_id',o.id);const input=$('trackId');if(input)input.value=window.orderLabel(o);window.renderTracking(o)}catch{toast('Não foi possível consultar seu último pedido.')}};
  window.trackSpecificOrder=async id=>{const o=(window.orders||[]).find(x=>String(x.id)===String(id));if(!o)return toast('Pedido não encontrado.');localStorage.setItem('bv_track_id',o.id);const input=$('trackId');if(input)input.value=window.orderLabel(o);window.renderTracking(o)};
  window.trackOrder=async()=>{
    try{
      const sbx=sb||window.BV_SUPABASE;
      if(!sbx)return toast('Sistema indisponível. Tente novamente.');
      const {data:{user},error:authError}=await sbx.auth.getUser();
      if(authError||!user)return toast('Faça login para consultar seus pedidos.');

      const raw=($('trackId')?.value||'').replace(/^#/,'').trim();
      const phone=($('trackPhone')?.value||'').replace(/\\D/g,'');

      await window.BV_REFRESH_ORDERS?.();
      if(!raw){
        const orders=window.orders||[];
        const b=$('trackingResult');
        if(!orders.length)return toast('Você ainda não possui pedidos.');
        b.innerHTML='<div class="trackingOrdersList"><div class="trackingListHead"><div><small>MEUS PEDIDOS</small><h3>Todos os seus pedidos</h3><p>Selecione um pedido para acompanhar.</p></div><strong>'+orders.length+'</strong></div>'+
          orders.map(x=>{
          const d=new Date(x.created_at);
          const date=Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR');
          const time=Number.isNaN(d.getTime())?'':d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
          return '<button type="button" class="trackingOrderOption" data-order-id="'+esc(String(x.id))+'"><span class="trackingOrderMain"><span class="trackingOrderNumber">#'+esc(window.orderLabel(x))+'</span><span class="trackingOrderStatus">'+esc(x.status||'')+'</span><span class="trackingOrderItems">'+esc(x.items||'Itens do pedido')+'</span></span><span class="trackingOrderMeta"><strong>'+money(x.total)+'</strong><small>'+date+(time?' · '+time:'')+'</small><em>Ver pedido ›</em></span></button>'
        }).join('')+
          '</div>';
        b.querySelectorAll('.trackingOrderOption').forEach(btn=>btn.addEventListener('click',()=>window.trackSpecificOrder(btn.dataset.orderId)));
        return;
      }
      let o=(window.orders||[]).find(x=>{
        const number=String(x.orderNumber||'');
        const label=window.orderLabel(x);
        const id=String(x.id||'');
        return number===raw || label===raw.padStart(3,'0') || id===raw;
      });

      if(!o && /^\\d+$/.test(raw)){
        let q=sbx.from('orders')
          .select('id,order_number,user_id,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id')
          .eq('id',raw);
        const byId=await q.maybeSingle();
        if(byId.data)o=byId.data;
        if(!o){
          const byNumber=await sbx.from('orders')
            .select('id,order_number,user_id,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id')
            .eq('user_id',user.id)
            .eq('order_number',Number(raw))
            .maybeSingle();
          if(byNumber.data)o=byNumber.data;
        }
      }

      if(o && o.user_id && String(o.user_id)!==String(user.id))o=null;
      if(o && phone){
        const saved=String(o.phone||'').replace(/\\D/g,'');
        if(saved && saved!==phone)return toast('O WhatsApp informado não corresponde a este pedido.');
      }
      if(!o)return toast('Pedido não encontrado para o cliente logado.');

      if(!o.orderNumber && o.order_number)o.orderNumber=o.order_number;
      if(!o.rawStatus&&o.status)o.rawStatus=o.status;
      if(!o.status||!o.items){
        const its=await sbx.from('order_items').select('product_name,quantity').eq('order_id',o.id);
        if(!its.error){
          o.items=(its.data||[]).map(i=>i.quantity+'x '+i.product_name).join(', ');
        }
        o.status=status[o.rawStatus||o.status]||o.status;
        o.total=Number(o.total)||0;
      }
      localStorage.setItem('bv_track_id',o.id);
      window.renderTracking(o);
    }catch(e){
      console.error('[BV TRACK] Falha ao consultar pedido',e);
      toast('Não foi possível consultar o pedido.');
    }
  };

  window.renderMotoOrders=async()=>{
    if(window.BV_ROLE!=='motoboy')return;
    const b=$('orders');if(!b)return;
    const filters=$('adminOrderFilters');if(filters)filters.style.display='none';
    const deliveryPanel=$('motoDeliveryPanel');if(deliveryPanel)deliveryPanel.style.display='none';
    if(!sb)return;
    b.innerHTML='<div class="emptyState"><span>⏳</span><b>Buscando pedidos...</b><small>Atualizando seus pedidos.</small></div>';
    try{
      const {data:{user}}=await sb.auth.getUser();if(!user)return;
      const fields='id,order_number,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id';
      // Busca em duas etapas para garantir que um pedido coletado continue visível.
      // 1) pedidos em preparo ainda sem motoboy; 2) pedidos já coletados pelo motoboy atual.
      const [availableRes,assignedRes]=await Promise.all([
        // Todo pedido em "Em preparação" fica disponível para coleta.
        sb.from('orders').select(fields).eq('status','em_preparo').or('motoboy_id.is.null,motoboy_id.eq.'+user.id).order('created_at',{ascending:false}),
        // Depois de coletado, permanece na tela do motoboy até ser entregue.
        sb.from('orders').select(fields).eq('status','saiu_entrega').eq('motoboy_id',user.id).order('created_at',{ascending:false})
      ]);
      if(availableRes.error)throw availableRes.error;
      if(assignedRes.error)throw assignedRes.error;
      const seen=new Set();
      const rows=[...(availableRes.data||[]),...(assignedRes.data||[])].filter(o=>{if(seen.has(String(o.id)))return false;seen.add(String(o.id));return true}).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
      const ids=rows.map(x=>x.id);let its=[];
      if(ids.length){const z=await sb.from('order_items').select('order_id,product_name,quantity').in('order_id',ids);if(z.error)throw z.error;its=z.data||[]}
      const g={};its.forEach(i=>(g[i.order_id]??=[]).push(i));
      const available=rows.map(o=>({id:o.id,orderNumber:o.order_number,customer:o.customer_name,phone:o.phone,total:Number(o.total)||0,payment:payLabel[o.payment_method]||o.payment_method,status:status[o.status]||o.status,rawStatus:o.status,address:o.address?{rua:o.address,bairro:o.neighborhood}:null,deliveryFee:Number(o.delivery_fee)||0,motoboyId:o.motoboy_id,created_at:o.created_at,items:(g[o.id]||[]).map(i=>i.quantity+'x '+i.product_name).join(', ')}));
      window.orders=available;
      b.innerHTML=available.map(o=>`<article class="orderCard motoOrder"><div class="orderHead"><div><small>PEDIDO</small><b>#${esc(window.orderLabel(o))}</b></div><span class="statusBadge">${esc(o.status)}</span></div><div class="orderBody"><b>${esc(o.customer)}</b><div class="bvOrderItems">${window.orderItemsMarkup(o.items)}</div><div class="motoContactInfo"><div class="motoContactItem"><span>📍 Endereço</span><strong>${esc(o.address?.rua||'Não informado')}${o.address?.bairro?' · '+esc(o.address.bairro):''}</strong></div><div class="motoContactItem"><span>📱 Celular</span><strong>${esc(o.phone||'Não informado')}</strong></div></div></div><div class="motoFeeCard"><span>Taxa de entrega</span><strong>${money(o.deliveryFee)}</strong></div><button class="motoFinishBtn" onclick="motoAction('${esc(o.id)}','${esc(o.rawStatus)}')">${o.rawStatus==='em_preparo'?'📦 Coletar pedido':'✓ Marcar como entregue'}</button></article>`).join('')||'<div class="emptyState"><span>🏍️</span><b>Nenhum pedido disponível</b><small>Os pedidos aparecem aqui quando estiverem disponíveis para coleta ou em entrega.</small></div>';
    }catch(e){console.error('Moto orders',e);b.innerHTML='<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar os pedidos</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoOrders()">Tentar novamente</button></div>'}
  };
  window.motoAction=async(id,stage)=>{
    if(!sb)return;
    const isCollect=String(stage)==='em_preparo';
    const isFinish=String(stage)==='saiu_entrega';
    if(!isCollect&&!isFinish)return toast('Etapa do pedido inválida.');
    const r=await sb.rpc('motoboy_collect_or_deliver',{
      p_order_id:id,
      p_action:isCollect?'coletar':'entregar'
    });
    if(r.error)return toast('Erro: '+r.error.message);
    // Não atualiza a lista geral aqui: ela pode sobrescrever a tela do motoboy
    // durante a transição. A própria lista do motoboy é a fonte da tela.
    await window.renderMotoOrders?.();
    if(isFinish)window.renderMotoFeeOrders?.();
    toast(isCollect?'Pedido coletado. Boa entrega!':'Entrega finalizada.');
  };
  window.motoFinish=async id=>window.motoAction(id,'saiu_entrega');

  window.BV_ADMIN_USERS=async()=>{if(!sb)return{error:'Banco indisponível.'};const r=await sb.functions.invoke('admin-user',{body:{action:'list'}});return r.error||!r.data?.ok?{error:r.error?.message||r.data?.error||'Não foi possível carregar usuários.'}:{users:r.data.users||[]}};
  window.renderUsers=async()=>{
  const b=$('userPermissions');if(!b||!window.admin())return;
  b.innerHTML='<div class="userLoading">Carregando usuários...</div>';
  const r=await window.BV_ADMIN_USERS();
  if(r.error){b.innerHTML='<div class="userError">Não foi possível carregar os usuários: '+esc(r.error)+'</div>';return}
  const a=r.users||[],q=norm($('userSearch')?.value||'');
  const filtered=a.filter(x=>norm(x.name||'').includes(q)||norm(x.email||'').includes(q));
  if($('userCount'))$('userCount').textContent=a.length+' usuários';
  b.innerHTML='<div class="permissionTitle"><div><b>Usuários cadastrados</b><small>Defina a permissão de cada conta abaixo.</small></div><span>PERMISSÕES</span></div>'+
    (filtered.map(x=>`<div class="userPerm">
      <div class="userIdentity"><span class="userAvatar">${esc((x.name||x.email||'U').trim().charAt(0).toUpperCase())}</span><div><b>${esc(x.name||'Usuário')}</b><small>${esc(x.email||'')} · ${esc(x.role==='administrador'?'Administrador':x.role==='motoboy'?'Motoboy':'Usuário')}</small></div></div>
      <div class="permissionField"><label>Permissão</label><select onchange="changeUserRole('${esc(x.id)}',this.value)">
        <option value="usuario" ${x.role==='usuario'?'selected':''}>Usuário</option>
        <option value="motoboy" ${x.role==='motoboy'?'selected':''}>Motoboy</option>
        <option value="administrador" ${x.role==='administrador'?'selected':''}>Administrador</option>
      </select></div>
      <button type="button" class="userDelete" onclick="deleteUser('${esc(x.id)}')">Excluir</button>
    </div>`).join('')||'<div class="emptyState"><span>👤</span><b>Nenhum usuário encontrado.</b><small>Cadastre um usuário ou altere a busca.</small></div>');
};
  window.createAdminUser=async()=>{const n=$('newUserName')?.value.trim(),e=$('newUserEmail')?.value.trim(),p=$('newUserPass')?.value||'',role=$('newUserRole')?.value||'usuario';if(!n||!e||p.length<6)return toast('Preencha nome, e-mail e senha com no mínimo 6 caracteres.');const r=await sb.functions.invoke('admin-user',{body:{action:'create',name:n,email:e,password:p,role}});if(r.error||!r.data?.ok)return toast(r.error?.message||r.data?.error||'Não foi possível cadastrar.');await window.renderUsers();toast('Usuário cadastrado.')};
  window.changeUserRole=async(id,role)=>{const r=await sb.functions.invoke('admin-user',{body:{action:'role',user_id:id,role}});if(r.error||!r.data?.ok)return toast(r.error?.message||r.data?.error||'Não foi possível alterar a permissão.');await window.renderUsers();toast('Permissão atualizada.')};
  window.deleteUser=async id=>{
  if(!id)return toast('Usuário inválido.');
  const {data:{user}}=await sb.auth.getUser();
  if(user?.id===id)return toast('Você não pode excluir a própria conta por este painel.');
  if(!confirm('Excluir este usuário definitivamente?'))return;
  const btns=document.querySelectorAll('#userPermissions button.userDelete');
  btns.forEach(b=>b.disabled=true);
  try{
    const r=await sb.functions.invoke('admin-user',{body:{action:'delete',user_id:id}});
    if(r.error||!r.data?.ok)throw new Error(r.error?.message||r.data?.error||'Não foi possível excluir o usuário.');
    toast('Usuário excluído com sucesso.');
    await window.renderUsers();
  }catch(e){console.error('deleteUser',e);toast(e?.message||'Não foi possível excluir o usuário.')}
  finally{btns.forEach(b=>b.disabled=false)}
};

  window.loadApp=async()=>{
    if(!sb)return;
    if(!firstLoginDone()){ $('login')&&$('login').style.setProperty('display','flex','important'); return; }

    // A função de perfil é sempre validada no Supabase antes de aplicar permissões.
    // Isso evita que o cache de uma conta administradora apareça na conta do motoboy.
    const {data:{user},error:authError}=await sb.auth.getUser();
    if(authError||!user){
      $('login')&&$('login').style.setProperty('display','flex','important');
      return;
    }

    let cachedProducts=null;
    try{cachedProducts=JSON.parse(localStorage.getItem('bv_products')||'null')}catch(e){}
    if(Array.isArray(cachedProducts)&&cachedProducts.length){
      window.products=cachedProducts;
      window.renderProducts();
    }

    const profileRes=await sb.from('profiles').select('name,role').eq('id',user.id).maybeSingle();
    if(profileRes.error||!profileRes.data){
      console.error('[BV PROFILE]',profileRes.error||'Perfil não encontrado');
      toast('Seu perfil não foi encontrado.');
      return;
    }

    window.BV_ROLE=String(profileRes.data.role||'usuario').trim().toLowerCase();
    window.BV_USER_NAME=profileRes.data.name||user.email||'';
    try{
      localStorage.setItem('bv_profile_cache',JSON.stringify({
        name:window.BV_USER_NAME,
        role:window.BV_ROLE,
        userId:user.id
      }));
    }catch(e){}
    window.applyAccess();
    $('login')&&$('login').style.setProperty('display','none','important');

    // Se a conta é motoboy, garante que a interface e a navegação sejam as do motoboy.
    if(window.BV_ROLE==='motoboy'){
      window.applyAccess?.();
      window.applyMotoPageChrome?.();
    }

    if(window.BV_ROLE==='motoboy'){
      // Motoboy entra em Pedidos ou restaura a última tela permitida.
      const saved=getSavedPage();
      const target=['pedidos','taxa-entrega'].includes(saved)?saved:'pedidos';
      window.BV_HAS_NAVIGATED=true;
      window.showPage(target,true);
      window.applyMotoPageChrome?.();
    }else if(!window.BV_HAS_NAVIGATED){
      // Restaura a última tela usada; se não houver uma salva, começa em Início.
      const saved=getSavedPage();
      const allowed=['inicio','cardapio','pedido','acompanhar','dashboard','pedidos','produtos','promocoes','cupons','config','taxa-entrega'];
      const target=allowed.includes(saved)?saved:'inicio';
      window.showPage(target,true);
    }

    // Atualização de dados sem bloquear a abertura do aplicativo.
    Promise.all([
      sb.from('products').select('*').order('created_at'),
      sb.from('settings').select('fee,whatsapp').eq('id',1).maybeSingle()
    ]).then(async([pr,st])=>{
      if(!pr.error){
        window.products=pr.data||[];
        try{localStorage.setItem('bv_products',JSON.stringify(window.products))}catch(e){}
        window.renderProducts();
      }
      window.BV_DEFAULT_FEE=st?.data?Number(st.data.fee)||0:5;
      if($('feeCfg'))$('feeCfg').value=window.BV_DEFAULT_FEE;
      if($('waCfg'))$('waCfg').value=st?.data?.whatsapp||'';
      await Promise.allSettled([window.BV_REFRESH_ORDERS?.(),window.loadProfile?.()]);
    }).catch(e=>console.error('[BV] background sync',e));
  };

  window.addEventListener?.('error',e=>{console.error('BV error',e.error||e.message)});
  document.addEventListener('DOMContentLoaded',async()=>{
    window.applyAccess();window.renderProducts();window.renderCart();
    if(sb&&firstLoginDone()){const s=await sb.auth.getSession();if(s.data.session)await window.loadApp()}else{$('login')&&$('login').style.setProperty('display','flex','important')}
  });
  if(sb)sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){window.BV_ROLE='';window.BV_USER_NAME='';window.applyAccess();$('login')&&($('login').style.display='flex')}else if(event==='SIGNED_IN'&&session&&firstLoginDone()){setTimeout(()=>window.loadApp(),100)}});
})();