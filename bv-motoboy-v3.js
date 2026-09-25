/* BV LANCHES — MOTOBOY v3 — telas únicas e fluxo único */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const isMoto = () => ['motoboy'].includes(String(window.BV_ROLE || '').toLowerCase());
  const db = () => window.BV_SUPABASE;

  window.BV_MOTO_SCREEN_VERSION = '2026.09.25.9';

  function motoAllowedPage(p) {
    return ['inicio','cardapio','pedido','acompanhar','pedidos','taxa-entrega'].includes(p);
  }

  /* Uma única camada de navegação para o motoboy. */
  const baseShowPage = window.showPage;
  window.showPage = function(page, internal) {
    if (isMoto() && !motoAllowedPage(page)) page = 'pedidos';
    return typeof baseShowPage === 'function'
      ? baseShowPage.call(this,page,internal)
      : undefined;
  };

  function hideMotoAdminUi() {
    if (!isMoto()) return;
    document.querySelectorAll('.sideNav [data-page]').forEach(el => {
      const allowed = ['inicio','cardapio','pedido','acompanhar','pedidos','taxa-entrega'].includes(el.dataset.page);
      const isAdminDuplicate = el.classList.contains('adminOnly') || el.classList.contains('adminDeliveryFeeLink');
      el.style.setProperty('display', allowed && !isAdminDuplicate ? '' : 'none','important');
    });
    document.querySelectorAll('.navTitle,.sideBottom .adminBtn,.homeNotificationBar').forEach(el => {
      el.style.setProperty('display','none','important');
    });
  }

  function orderCard(o,items) {
    const status = String(o.status);
    const inRoute = status === 'saiu_entrega';
    const label = inRoute ? 'Saiu para entrega' : status === 'em_producao' ? 'Em produção' : 'Em preparo';
    const action = inRoute
      ? '<button type="button" class="motoActionBtn motoDeliver" data-action="entregar" data-order="'+esc(o.id)+'" onclick="event.preventDefault();event.stopPropagation();window.motoAction(\''+esc(o.id)+'\',\'entregar\');">✅ Confirmar entrega</button>'
      : '<button type="button" class="motoActionBtn motoCollect" data-action="coletar" data-order="'+esc(o.id)+'" onclick="event.preventDefault();event.stopPropagation();window.motoAction(\''+esc(o.id)+'\',\'coletar\');">📦 Coletar pedido</button>';
    const itemsText = items.length
      ? items.map(i => esc(i.quantity)+'x '+esc(i.product_name)).join(', ')
      : 'Itens do pedido';
    const address = [o.address,o.neighborhood].filter(Boolean).map(esc).join(' · ') || 'Endereço não informado';
    return '<article class="motoSingleCard">'+
      '<div class="motoCardTop"><div><small>PEDIDO</small><strong>#'+esc(o.order_number || String(o.id).slice(0,6))+'</strong></div><span>'+esc(label)+'</span></div>'+
      '<div class="motoCardBody"><h3>'+esc(o.customer_name || 'Cliente')+'</h3><p>'+itemsText+'</p>'+
      '<div class="motoInfo"><div><small>📍 Endereço</small><b>'+address+'</b></div><div><small>📱 Celular</small><b>'+esc(o.phone || 'Não informado')+'</b></div></div></div>'+
      '<div class="motoFee"><span>Taxa de entrega</span><strong>'+money(o.delivery_fee)+'</strong></div>'+
      action+
    '</article>';
  }

  async function queryMotoOrders() {
    const client = db();
    if (!client) throw new Error('Banco de dados indisponível.');
    const {data:{user},error:uerr} = await client.auth.getUser();
    if (uerr || !user) throw new Error('Sessão do motoboy não encontrada.');

    const fields = 'id,order_number,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id';
    const [prep,prod,route] = await Promise.all([
      // Todos os pedidos em preparo ficam visíveis para todos os motoboys.
      client.from('orders').select(fields).eq('status','em_preparo')
        .order('created_at',{ascending:false}),
      // Todos os pedidos em produção também ficam disponíveis para coleta.
      client.from('orders').select(fields).eq('status','em_producao')
        .order('created_at',{ascending:false}),
      client.from('orders').select(fields).eq('status','saiu_entrega')
        .eq('motoboy_id',user.id).order('created_at',{ascending:false})
    ]);
    const err = prep.error || prod.error || route.error;
    if (err) throw err;

    const map = new Map();
    [...(prep.data||[]),...(prod.data||[]),...(route.data||[])].forEach(o => map.set(String(o.id),o));
    const rows = [...map.values()].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));

    const items = {};
    if (rows.length) {
      const ir = await client.from('order_items').select('order_id,product_name,quantity').in('order_id',rows.map(o=>o.id));
      if (!ir.error) (ir.data||[]).forEach(i => (items[i.order_id] ||= []).push(i));
    }
    return {rows,items};
  }

  window.renderMotoOrders = async function(options) {
    if (!isMoto()) return;
    const box = $('orders');
    if (!box) return;
    const silent = options === false || options?.silent === true;
    const filters = $('adminOrderFilters');
    if (filters) filters.style.display='none';

    // Não apaga a lista atual durante atualizações automáticas.
    // A mensagem de carregamento aparece somente quando a tela ainda está vazia.
    const hasContent = !!box.querySelector('.motoSingleCard,.motoEmpty');
    if (!silent && !hasContent) box.innerHTML='<div class="motoLoading">⏳ Carregando pedidos...</div>';

    try {
      const {rows,items} = await queryMotoOrders();
      if (!rows.length) {
        box.innerHTML='<div class="motoEmpty"><span>🏍️</span><b>Nenhum pedido disponível</b><small>Pedidos em preparo ou produção aparecerão aqui. Após coletado, o pedido permanece aqui até a entrega.</small></div>';
        return;
      }
      box.innerHTML=rows.map(o=>orderCard(o,items[o.id]||[])).join('');
    } catch(e) {
      console.error('[BV MOTO v3]',e);
      box.innerHTML='<div class="motoEmpty"><span>⚠️</span><b>Erro ao carregar pedidos</b><small>'+esc(e?.message||'Erro de conexão.')+'</small><button type="button" id="motoRetry">Tentar novamente</button></div>';
      $('motoRetry')?.addEventListener('click',window.renderMotoOrders);
    }
  };

  const motoActionsInFlight = new Set();

  async function motoAction(id,action) {
    if (!isMoto()) return;
    const client=db();
    if (!client) return;

    const key = String(id) + ':' + String(action);
    if (motoActionsInFlight.has(key)) return;
    motoActionsInFlight.add(key);

    // Bloqueia somente o botão deste pedido. Outros pedidos continuam disponíveis
    // para coleta/entrega simultânea.
    const buttons = [...document.querySelectorAll('.motoActionBtn')]
      .filter(b => String(b.dataset.order) === String(id));
    buttons.forEach(b => {
      b.disabled = true;
      b.dataset.processing = '1';
    });

    try {
      const r=await client.rpc('motoboy_collect_or_deliver',{p_order_id:id,p_action:action});
      if (r.error) throw r.error;

      // Atualiza a lista depois da confirmação sem bloquear ações de outros pedidos.
      await window.renderMotoOrders({silent:true});
      await window.renderMotoFeeOrders({silent:true});
      window.toast?.(action==='coletar'?'Pedido coletado. Saiu para entrega.':'Entrega confirmada. Pedido marcado como entregue.');
    } catch(e) {
      console.error('[BV MOTO ACTION v3]',e);
      window.toast?.('Não foi possível atualizar o pedido: '+String(e?.message||'Erro').slice(0,180));
    } finally {
      motoActionsInFlight.delete(key);
      buttons.forEach(b => {
        b.disabled = false;
        delete b.dataset.processing;
      });
    }
  }
  window.motoAction = motoAction;
  window.motoFinish = id => motoAction(id,'entregar');

  window.renderMotoFeeOrders = async function(options) {
    if (!isMoto()) return;
    const box = $('motoFeeOrders');
    if (!box) return;
    const silent = options === false || options?.silent === true;
    const hasContent = !!box.querySelector('.motoFeeFilter,.motoFeeHeader,.motoFeeList,.emptyState');

    // Atualizações automáticas não apagam a tela atual nem mostram "Carregando taxas".
    // O carregamento só aparece quando a tela ainda não tem conteúdo.
    if (!silent && !hasContent) {
      box.innerHTML = '<div class="emptyState"><span>⏳</span><b>Carregando taxas...</b></div>';
    }

    try {
      const client = db();
      if (!client) throw new Error('Banco de dados indisponível.');

      const {data:{user},error:uerr} = await client.auth.getUser();
      if (uerr || !user) throw new Error('Sessão do motoboy não encontrada.');

      const r = await client.from('orders')
        .select('id,order_number,delivery_fee,created_at,motoboy_id')
        .eq('status','entregue')
        .eq('motoboy_id',user.id)
        .order('created_at',{ascending:false});

      if (r.error) throw r.error;

      // Segurança adicional: a tela de taxas do motoboy deve considerar
      // somente pedidos que ESTE usuário efetivamente recebeu como entregador.
      // O filtro é aplicado no banco e novamente no cliente para evitar qualquer
      // registro de outro motoboy aparecer por engano.
      const rows = (r.data || []).filter(o =>
        String(o.motoboy_id || '') === String(user.id) &&
        String(o.status || '').toLowerCase() === 'entregue'
      );
      const filter = window.BV_MOTO_FEE_FILTER || 'all';
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(),now.getMonth(),now.getDate());
      let startDate = null, endDate = null, specific = null;

      if (filter === 'today') startDate = startOfDay;
      if (filter === 'week') {
        const day = startOfDay.getDay();
        startDate = new Date(startOfDay);
        startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));
      }
      if (filter === 'month') startDate = new Date(now.getFullYear(),now.getMonth(),1);
      if (filter.startsWith('specific:')) specific = filter.slice(9);

      if (specific) {
        const parts = specific.split('-').map(Number);
        startDate = new Date(parts[0],parts[1]-1,parts[2]);
        endDate = new Date(parts[0],parts[1]-1,parts[2]+1);
      }

      const filtered = specific
        ? rows.filter(o => {
            const d = new Date(o.created_at);
            return d >= startDate && d < endDate;
          })
        : startDate
          ? rows.filter(o => new Date(o.created_at) >= startDate)
          : rows;

      const totalFees = filtered.reduce((sum,o) => sum + Number(o.delivery_fee || 0),0);
      const fmtDate = v => {
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? 'Data não disponível' : d.toLocaleDateString('pt-BR');
      };

      if ($('deliveryFeeEyebrow')) $('deliveryFeeEyebrow').textContent = 'MOTOBOY';
      if ($('deliveryFeeDescription')) $('deliveryFeeDescription').textContent =
        'Consulte o total das suas taxas das entregas realizadas.';

      box.innerHTML =
        '<div class="motoFeeFilter">'+
          '<div class="motoFeeQuickFilters">'+
            '<button type="button" class="'+(filter==='today'?'active':'')+'" onclick="setMotoFeeFilter(\'today\')">Hoje</button>'+
            '<button type="button" class="'+(filter==='week'?'active':'')+'" onclick="setMotoFeeFilter(\'week\')">Esta semana</button>'+
            '<button type="button" class="'+(filter==='month'?'active':'')+'" onclick="setMotoFeeFilter(\'month\')">Este mês</button>'+
            '<button type="button" class="'+(filter==='all'?'active':'')+'" onclick="setMotoFeeFilter(\'all\')">Todas</button>'+
          '</div>'+
          '<label><span>Data específica</span><input id="motoFeeDate" type="date" value="'+(specific||'')+'" onchange="setMotoFeeSpecificDate(this.value)"></label>'+
        '</div>'+
        '<div class="motoFeeHeader">'+
          '<div><small>ENTREGAS REALIZADAS</small><strong>'+filtered.length+'</strong></div>'+
          '<div><small>TOTAL A RECEBER</small><strong>'+money(totalFees)+'</strong></div>'+
        '</div>'+
        (filtered.length
          ? '<div class="motoFeeList">'+filtered.map(o =>
              '<article class="motoFeeOrder">'+
                '<div class="motoFeeOrderNumber">'+
                  '<small>PEDIDO</small><b>#'+esc(String(o.order_number).padStart(3,'0'))+'</b>'+
                  '<small>DATA</small><b>'+fmtDate(o.created_at)+'</b>'+
                '</div>'+
                '<div class="motoFeeValue">'+
                  '<small>TAXA DE ENTREGA</small><strong>'+money(o.delivery_fee)+'</strong>'+
                '</div>'+
              '</article>'
            ).join('')+'</div>'
          : '<div class="emptyState"><span>💰</span><b>Nenhuma entrega no período</b><small>Escolha outro filtro para consultar suas taxas.</small></div>');
    } catch(e) {
      console.error('[BV MOTO FEES v3]',e);
      box.innerHTML = '<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar as taxas</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoFeeOrders()">Tentar novamente</button></div>';
    }
  };

  window.setMotoFeeFilter = filter => {
    window.BV_MOTO_FEE_FILTER = filter || 'all';
    window.renderMotoFeeOrders();
  };

  window.setMotoFeeSpecificDate = value => {
    window.BV_MOTO_FEE_FILTER = value ? 'specific:'+value : 'all';
    window.renderMotoFeeOrders();
  };

  function bindActions() {
    document.querySelectorAll('.motoActionBtn').forEach(btn=>{
      if (btn.dataset.bound) return;
      btn.dataset.bound='1';
      btn.addEventListener('click',e=>{
        if (e.defaultPrevented) return;
        motoAction(btn.dataset.order,btn.dataset.action);
      });
    });
  }

  // Fallback global em caso de outro script substituir os listeners do botão.
  // Usa a fase normal (bubble), nunca capture, para não bloquear o clique.
  if (!window.BV_MOTO_CLICK_FALLBACK) {
    window.BV_MOTO_CLICK_FALLBACK = true;
    document.addEventListener('click', e => {
      const btn = e.target?.closest?.('.motoActionBtn');
      if (!btn || e.defaultPrevented) return;
      if (btn.dataset.processing === '1') return;
      e.preventDefault();
      motoAction(btn.dataset.order, btn.dataset.action);
    });
  }

  const observer=new MutationObserver(()=>bindActions());
  observer.observe(document.body,{subtree:true,childList:true});

  function showMoto(page) {
    hideMotoAdminUi();
    window.showPage(page,true);
    if (page==='pedidos') window.renderMotoOrders();
    if (page==='taxa-entrega') window.renderMotoFeeOrders();
  }

  const oldShow=window.showPage;
  window.showPage=function(page,internal) {
    if (isMoto() && !motoAllowedPage(page)) page='pedidos';
    return oldShow.call(this,page,internal);
  };

  // Os botões possuem listeners próprios em bindActions().
  // Não bloquear o evento no capture, pois isso impediria o click de chegar ao botão.
  const style=document.createElement('style');
  style.textContent=
    '.motoSingleCard{margin:0 0 14px;padding:18px;border-radius:18px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12)}'+
    '.motoCardTop,.motoFeeHead,.motoFeeRow{display:flex;align-items:center;justify-content:space-between;gap:12px}'+
    '.motoCardTop small,.motoFeeHead small,.motoInfo small{display:block;opacity:.65;font-size:11px}'+
    '.motoCardTop strong{display:block;font-size:22px;margin-top:3px}'+
    '.motoCardTop span{padding:7px 10px;border-radius:10px;background:rgba(229,9,20,.15);font-weight:800;font-size:12px}'+
    '.motoCardBody h3{margin:16px 0 5px}.motoCardBody p{margin:0 0 14px;opacity:.85}'+
    '.motoInfo{display:grid;gap:10px}.motoInfo b{display:block;margin-top:3px}'+
    '.motoFee{display:flex;justify-content:space-between;align-items:center;margin:15px 0;padding:12px;border-radius:12px;background:rgba(0,0,0,.16)}'+
    '.motoFee strong{font-size:18px}'+
    '.motoActionBtn{width:100%;min-height:48px;border:0;border-radius:12px;color:#fff;font-weight:900;cursor:pointer}.motoCollect{background:linear-gradient(135deg,#e50914,#900007)}.motoDeliver{background:linear-gradient(135deg,#20a65a,#08783b)}.motoActionBtn:disabled{opacity:.55}'+
    '.motoLoading,.motoEmpty{padding:35px 18px;text-align:center}.motoEmpty span{display:block;font-size:32px;margin-bottom:8px}.motoEmpty b,.motoEmpty small{display:block}.motoEmpty small{margin:7px 0 14px;opacity:.7}'+
    '.motoFeeHead{padding:5px 0 14px}.motoFeeHead h3{margin:4px 0}.motoFeeHead>strong{font-size:22px}.motoFeeCount{margin-bottom:12px;opacity:.7}.motoFeeRow{padding:14px 0;border-top:1px solid rgba(255,255,255,.1)}.motoFeeRow small{display:block;opacity:.65;margin-top:3px}';
  document.head.appendChild(style);

  function boot() {
    hideMotoAdminUi();
    if (isMoto()) {
      const active=document.querySelector('.page.activePage')?.id;
      if (!['page-inicio','page-cardapio','page-pedido','page-acompanhar','page-pedidos','page-taxa-entrega'].includes(active)) {
        window.showPage('pedidos',true);
      } else if (active==='page-pedidos') {
        window.renderMotoOrders();
      } else if (active==='page-taxa-entrega') {
        window.renderMotoFeeOrders();
      }
      if (active==='page-inicio') window.renderHomePromoBanner?.();
    }
  }

  document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,150));
  const originalLoadApp=window.loadApp;
  if (typeof originalLoadApp==='function') {
    window.loadApp=async function() {
      const r=await originalLoadApp.apply(this,arguments);
      setTimeout(boot,100);
      return r;
    };
  }
})();
