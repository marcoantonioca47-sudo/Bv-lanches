/* BV LANCHES — MOTOBOY — implementação limpa */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const db = () => window.BV_SUPABASE || window.sb;
  const isMoto = () => String(window.BV_ROLE || '').toLowerCase() === 'motoboy';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});

  window.BV_MOTO_SCREEN_VERSION = '2026.09.25.11';
  window.BV_MOTO_ACTIONS = window.BV_MOTO_ACTIONS || new Set();

  const allowed = new Set(['inicio','cardapio','pedido','acompanhar','pedidos','taxa-entrega']);

  function protectNavigation() {
    if (window.BV_MOTO_NAV_READY) return;
    const original = window.showPage;
    if (typeof original !== 'function') return;
    window.BV_MOTO_NAV_READY = true;
    window.BV_MOTO_BASE_SHOW_PAGE = original;
    window.showPage = function(page, internal) {
      if (isMoto() && !allowed.has(String(page))) page = 'pedidos';
      return window.BV_MOTO_BASE_SHOW_PAGE.call(this,page,internal);
    };
  }

  function applyMenu() {
    if (!isMoto()) return;
    document.querySelectorAll('.sideNav [data-page]').forEach(el => {
      const page = el.dataset.page;
      const admin = el.classList.contains('adminOnly') || el.classList.contains('adminDeliveryFeeLink');
      el.style.setProperty('display', allowed.has(page) && !admin ? '' : 'none','important');
    });
    document.querySelectorAll('.sideNav .adminBtn,.sideNav .navTitle,.sideBottom .adminBtn').forEach(el => {
      el.style.setProperty('display','none','important');
    });
  }

  function actionButton(o) {
    const action = o.status === 'saiu_entrega' ? 'entregar' : 'coletar';
    const text = action === 'coletar' ? '📦 Coletar pedido' : '✅ Confirmar entrega';
    const cls = action === 'coletar' ? 'motoCollect' : 'motoDeliver';
    return '<button type="button" class="motoActionBtn '+cls+'" data-order-id="'+esc(o.id)+'" data-action="'+action+'">'+text+'</button>';
  }

  async function getOrders() {
    const client = db();
    if (!client) throw new Error('Banco de dados indisponível.');
    const session = await client.auth.getSession();
    const user = session?.data?.session?.user;
    if (!user) throw new Error('Sessão do motoboy não encontrada.');

    const fields = 'id,order_number,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id';
    const results = await Promise.all([
      client.from('orders').select(fields).eq('status','em_preparo').order('created_at',{ascending:false}),
      client.from('orders').select(fields).eq('status','em_producao').order('created_at',{ascending:false}),
      client.from('orders').select(fields).eq('status','saiu_entrega').eq('motoboy_id',user.id).order('created_at',{ascending:false})
    ]);
    const bad = results.find(x => x.error);
    if (bad) throw bad.error;

    const map = new Map();
    results.flatMap(x => x.data || []).forEach(o => map.set(String(o.id),o));
    const rows = [...map.values()].sort((a,b) => new Date(b.created_at)-new Date(a.created_at));

    const items = {};
    if (rows.length) {
      const ir = await client.from('order_items').select('order_id,product_name,quantity').in('order_id',rows.map(x=>x.id));
      if (!ir.error) (ir.data||[]).forEach(i => (items[i.order_id] ||= []).push(i));
    }
    return {rows,items};
  }

  function card(o,items) {
    const label = o.status === 'saiu_entrega' ? 'Saiu para entrega' : o.status === 'em_producao' ? 'Em produção' : 'Em preparo';
    const list = items.length ? items.map(i => esc(i.quantity)+'x '+esc(i.product_name)).join(', ') : 'Itens do pedido';
    const address = [o.address,o.neighborhood].filter(Boolean).map(esc).join(' · ') || 'Endereço não informado';
    return '<article class="motoSingleCard">'+
      '<div class="motoCardTop"><div><small>PEDIDO</small><strong>#'+esc(o.order_number || String(o.id).slice(0,6))+'</strong></div><span>'+label+'</span></div>'+
      '<div class="motoCardBody"><h3>'+esc(o.customer_name || 'Cliente')+'</h3><p>'+list+'</p>'+
      '<div class="motoInfo"><div><small>📍 Endereço</small><b>'+address+'</b></div><div><small>📱 Celular</small><b>'+esc(o.phone || 'Não informado')+'</b></div></div></div>'+
      '<div class="motoFee"><span>Taxa de entrega</span><strong>'+money(o.delivery_fee)+'</strong></div>'+
      actionButton(o)+'</article>';
  }

  window.renderMotoOrders = async function(options) {
    if (!isMoto()) return;
    const box = $('orders');
    if (!box) return;
    const silent = options?.silent === true;
    const existing = !!box.querySelector('.motoSingleCard,.motoEmpty');
    if (!silent && !existing) box.innerHTML='<div class="motoLoading">⏳ Carregando pedidos...</div>';

    try {
      const {rows,items} = await getOrders();
      if (!rows.length) {
        box.innerHTML='<div class="motoEmpty"><span>🏍️</span><b>Nenhum pedido disponível</b><small>Pedidos em preparo ou produção aparecerão aqui.</small></div>';
        return;
      }
      box.innerHTML=rows.map(o=>card(o,items[o.id]||[])).join('');
    } catch(e) {
      console.error('[MOTO PEDIDOS]',e);
      box.innerHTML='<div class="motoEmpty"><span>⚠️</span><b>Erro ao carregar pedidos</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" id="motoRetry">Tentar novamente</button></div>';
      $('motoRetry')?.addEventListener('click',()=>window.renderMotoOrders());
    }
  };

  async function doAction(id,action,button) {
    if (!isMoto()) return;
    const client=db();
    if (!client) return window.toast?.('Banco de dados indisponível.');

    const key=String(id)+':'+action;
    if (window.BV_MOTO_ACTIONS.has(key)) return;
    window.BV_MOTO_ACTIONS.add(key);

    if (button) {
      button.disabled=true;
      button.dataset.busy='1';
      button.dataset.oldText=button.textContent;
      button.textContent=action==='coletar'?'⏳ Coletando...':'⏳ Confirmando...';
    }

    try {
      const session=await client.auth.getSession();
      const user=session?.data?.session?.user;
      if (!user) throw new Error('Sessão expirada. Entre novamente.');

      const rpc=await client.rpc('motoboy_collect_or_deliver',{
        p_order_id:id,
        p_action:action
      });
      if (rpc.error) throw rpc.error;

      await window.renderMotoOrders({silent:true});
      if ($('page-taxa-entrega')?.classList.contains('activePage')) {
        await window.renderMotoFeeOrders({silent:true});
      }
      window.toast?.(action==='coletar'?'Pedido coletado. Saiu para entrega.':'Entrega confirmada. Pedido marcado como entregue.');
    } catch(e) {
      console.error('[MOTO AÇÃO]',e);
      window.toast?.('Erro ao atualizar pedido: '+String(e?.message||'Tente novamente.').slice(0,180));
      if (button) {
        button.disabled=false;
        button.removeAttribute('data-busy');
        if (button.dataset.oldText) button.textContent=button.dataset.oldText;
      }
    } finally {
      window.BV_MOTO_ACTIONS.delete(key);
    }
  }

  window.motoAction = doAction;
  window.motoFinish = id => doAction(id,'entregar');

  function bindClick() {
    if (window.BV_MOTO_CLICK_READY) return;
    window.BV_MOTO_CLICK_READY=true;
    document.addEventListener('click',e=>{
      const button=e.target?.closest?.('.motoActionBtn');
      if (!button) return;
      e.preventDefault();
      e.stopPropagation();
      if (button.dataset.busy==='1') return;
      doAction(button.dataset.orderId,button.dataset.action,button);
    },true);
  }

  window.renderMotoFeeOrders = async function(options) {
    if (!isMoto()) return;
    const box=$('motoFeeOrders');
    if (!box) return;
    const silent=options?.silent===true;
    const existing=!!box.querySelector('.motoFeeFilter,.motoFeeList,.emptyState');
    if (!silent && !existing) box.innerHTML='<div class="emptyState"><span>⏳</span><b>Carregando taxas...</b></div>';

    try {
      const client=db();
      const session=await client.auth.getSession();
      const user=session?.data?.session?.user;
      if (!user) throw new Error('Sessão expirada.');

      const r=await client.from('orders').select('id,order_number,delivery_fee,created_at,motoboy_id,status')
        .eq('status','entregue').eq('motoboy_id',user.id).order('created_at',{ascending:false});
      if (r.error) throw r.error;

      const filter=window.BV_MOTO_FEE_FILTER||'all';
      const now=new Date();
      let rows=r.data||[];
      let start=null,end=null;
      if(filter==='today') start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      if(filter==='week'){start=new Date(now.getFullYear(),now.getMonth(),now.getDate());const d=start.getDay();start.setDate(start.getDate()-(d===0?6:d-1));}
      if(filter==='month') start=new Date(now.getFullYear(),now.getMonth(),1);
      if(filter.startsWith('specific:')){const [y,m,d]=filter.slice(9).split('-').map(Number);start=new Date(y,m-1,d);end=new Date(y,m-1,d+1);}
      rows=rows.filter(o=>!start || (new Date(o.created_at)>=start && (!end || new Date(o.created_at)<end)));

      const total=rows.reduce((s,o)=>s+Number(o.delivery_fee||0),0);
      box.innerHTML='<div class="motoFeeFilter"><div class="motoFeeQuickFilters">'+
        ['today:Hoje','week:Esta semana','month:Este mês','all:Todas'].map(x=>{const [v,t]=x.split(':');return '<button type="button" class="'+(filter===v?'active':'')+'" onclick="setMotoFeeFilter(\''+v+'\')">'+t+'</button>';}).join('')+
        '</div><label><span>Data específica</span><input type="date" value="'+(filter.startsWith('specific:')?filter.slice(9):'')+'" onchange="setMotoFeeSpecificDate(this.value)"></label></div>'+
        '<div class="motoFeeHeader"><div><small>ENTREGAS REALIZADAS</small><strong>'+rows.length+'</strong></div><div><small>TOTAL A RECEBER</small><strong>'+money(total)+'</strong></div></div>'+
        (rows.length?'<div class="motoFeeList">'+rows.map(o=>'<article class="motoFeeOrder"><div><small>PEDIDO</small><b>#'+esc(String(o.order_number).padStart(3,'0'))+'</b><small>DATA</small><b>'+new Date(o.created_at).toLocaleDateString('pt-BR')+'</b></div><div><small>TAXA</small><strong>'+money(o.delivery_fee)+'</strong></div></article>').join('')+'</div>':'<div class="emptyState"><span>💰</span><b>Nenhuma entrega no período</b></div>');
    } catch(e) {
      console.error('[MOTO TAXAS]',e);
      box.innerHTML='<div class="emptyState"><span>⚠️</span><b>Erro ao carregar taxas</b><small>'+esc(e?.message||'Erro de conexão.')+'</small><button type="button" onclick="renderMotoFeeOrders()">Tentar novamente</button></div>';
    }
  };

  window.setMotoFeeFilter=filter=>{window.BV_MOTO_FEE_FILTER=filter||'all';window.renderMotoFeeOrders();};
  window.setMotoFeeSpecificDate=value=>{window.BV_MOTO_FEE_FILTER=value?'specific:'+value:'all';window.renderMotoFeeOrders();};

  function injectStyle(){
    if($('bvMotoCleanStyle')) return;
    const s=document.createElement('style');
    s.id='bvMotoCleanStyle';
    s.textContent='.motoSingleCard{margin:0 0 14px;padding:18px;border-radius:18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}.motoCardTop,.motoFeeHeader{display:flex;align-items:center;justify-content:space-between;gap:12px}.motoCardTop small,.motoInfo small,.motoFeeHeader small{display:block;opacity:.65;font-size:11px}.motoCardTop strong{display:block;font-size:22px}.motoCardTop span{padding:7px 10px;border-radius:10px;background:rgba(229,9,20,.15);font-weight:800;font-size:12px}.motoCardBody h3{margin:16px 0 5px}.motoCardBody p{margin:0 0 14px}.motoInfo{display:grid;gap:10px}.motoInfo b{display:block;margin-top:3px}.motoFee{display:flex;justify-content:space-between;align-items:center;margin:15px 0;padding:12px;border-radius:12px;background:rgba(0,0,0,.16)}.motoFee strong{font-size:18px}.motoActionBtn{width:100%;min-height:48px;border:0;border-radius:12px;color:#fff;font-weight:900;cursor:pointer;pointer-events:auto;touch-action:manipulation}.motoActionBtn:disabled{opacity:.55}.motoCollect{background:linear-gradient(135deg,#e50914,#900007)}.motoDeliver{background:linear-gradient(135deg,#20a65a,#08783b)}.motoLoading,.motoEmpty{padding:35px 18px;text-align:center}.motoEmpty span{display:block;font-size:32px;margin-bottom:8px}.motoEmpty b,.motoEmpty small{display:block}.motoEmpty small{margin:7px 0 14px}.motoFeeFilter{display:flex;gap:12px;flex-wrap:wrap;align-items:end;margin-bottom:16px;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.03)}.motoFeeQuickFilters{display:flex;gap:8px;flex-wrap:wrap}.motoFeeQuickFilters button{min-height:42px;padding:0 14px;border:1px solid #343a44;border-radius:10px;background:#20242a;color:#fff;font-weight:800}.motoFeeQuickFilters button.active{background:#e50914;border-color:#e50914}.motoFeeFilter label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:800}.motoFeeFilter input{min-height:42px;padding:0 12px;border-radius:10px;border:1px solid #343a44;background:#080a0d;color:#fff}.motoFeeHeader{padding:8px 0 16px}.motoFeeHeader>div{display:flex;flex-direction:column;gap:3px}.motoFeeHeader strong{font-size:22px}.motoFeeOrder{display:flex;justify-content:space-between;gap:15px;padding:14px 0;border-top:1px solid rgba(255,255,255,.1)}.motoFeeOrder small{display:block;opacity:.65;margin-top:3px}.motoFeeOrder b,.motoFeeOrder strong{display:block;margin-bottom:7px}.motoPromoBanner{display:none;margin:0 0 18px}.motoPromoBanner.show{display:block}.motoPromoBanner .homePromoSlide{cursor:default}.motoPromoBanner .homePromoCopy{min-width:0}.motoPromoBanner .homePromoTrack{width:100%}';
    document.head.appendChild(s);
  }

  function boot(){
    protectNavigation();
    applyMenu();
    injectStyle();
    if(!isMoto()) return;
    const active=document.querySelector('.page.activePage')?.id||'';
    if(active==='page-pedidos') window.renderMotoOrders();
    else if(active==='page-taxa-entrega') window.renderMotoFeeOrders();
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,200));
  const oldLoad=window.loadApp;
  if(typeof oldLoad==='function' && !window.BV_MOTO_LOAD_WRAPPED){
    window.BV_MOTO_LOAD_WRAPPED=true;
    window.loadApp=async function(){
      const result=await oldLoad.apply(this,arguments);
      setTimeout(boot,150);
      return result;
    };
  }

  // Reaplica após mudanças de perfil/acesso sem criar novos listeners.
  setTimeout(()=>{protectNavigation();applyMenu();injectStyle();},500);
})();