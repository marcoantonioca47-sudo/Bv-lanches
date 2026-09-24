/* BV LANCHES — estabilidade geral v1
   Camada final independente: navegação, auth, cardápio, carrinho, checkout,
   pedidos, dashboard, taxas, produtos e usuários. */
(()=>{ 
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const money=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const norm=v=>String(v??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  const toast=m=>{const x=$('toast');if(x){x.textContent=String(m);x.classList.add('show');setTimeout(()=>x.classList.remove('show'),3000)}};
  window.BV_STABILITY_VERSION='2026.09.24.25';
  window.BV_HAS_NAVIGATED=false;
  // Ao recarregar o site, a tela inicial é sempre a primeira tela exibida.
  // Não persistimos a aba atual para evitar que o usuário retorne a uma tela administrativa/checkout após F5.
  try{window.cart=Array.isArray(window.cart)?window.cart:(JSON.parse(localStorage.getItem('bv_cart')||'[]')||[])}catch{window.cart=[]}
  try{window.products=Array.isArray(window.products)?window.products:(JSON.parse(localStorage.getItem('bv_products')||'[]')||[])}catch{window.products=[]}
  if(!Array.isArray(window.orders))window.orders=[];
  const sb=window.BV_SUPABASE||(window.supabase&&window.BV_SUPABASE_CONFIG?supabase.createClient(window.BV_SUPABASE_CONFIG.url,window.BV_SUPABASE_CONFIG.publishableKey):null);
  if(sb)window.BV_SUPABASE=sb;

  const labels={inicio:'Início',cardapio:'Cardápio',pedido:'Meu pedido',acompanhar:'Acompanhar pedido',dashboard:'Dashboard',pedidos:'Pedidos',produtos:'Produtos',cupons:'Cupons',config:'Configurações','taxa-entrega':'Taxa de entrega'};
  const status={recebido:'Novo',em_preparo:'Em preparo',em_producao:'Em produção',saiu_entrega:'Saiu para entrega',entregue:'Entregue',cancelado:'Cancelado'};
  const payLabel={pix:'Pix',dinheiro:'Dinheiro',cartao:'Cartão'};

  window.admin=()=>['administrador','admin'].includes(window.BV_ROLE);
  window.applyAccess=()=>{
    const role=window.BV_ROLE||'usuario';
    document.querySelectorAll('.adminOnly').forEach(x=>x.style.display=role==='administrador'?'':'none');
    document.querySelectorAll('.adminHide').forEach(x=>x.style.display=role==='administrador'?'none':'');
    document.querySelectorAll('[data-role="motoboyOnly"]').forEach(x=>x.style.display=role==='motoboy'?'':'none');
    if(role==='motoboy'){
      document.querySelectorAll('.sideNav [data-page]').forEach(x=>{
        const allowed=x.dataset.role==='motoboyOnly';
        x.style.display=allowed?'':'none';
      });
      document.querySelectorAll('.sideNav .navTitle').forEach(x=>x.style.display='none');
      document.querySelectorAll('.sideBottom .adminOnly').forEach(x=>x.style.display='none');
      document.querySelector('.cartTop')?.style.setProperty('display','none','important');
    }
    if($('loggedUserName'))$('loggedUserName').textContent=window.BV_USER_NAME||'';
  };
  window.toggleSidebar=()=>{$('sidebar')?.classList.toggle('open')};
  window.openAdmin=p=>{if(!window.admin())return toast('Acesso restrito ao administrador.');window.showPage(p||'dashboard')};
  window.showPage=(p,internal=false)=>{
    if(!internal)window.BV_HAS_NAVIGATED=true;
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('activePage'));
    $('page-'+p)?.classList.add('activePage');
    if($('pageTitle'))$('pageTitle').textContent=labels[p]||p;
    document.querySelectorAll('.sideNav [data-page]').forEach(b=>b.classList.toggle('active',b.dataset.page===p));
    if(innerWidth<=850)$('sidebar')?.classList.remove('open');
    if(p==='cardapio')window.renderProducts();
    if(p==='pedido'){window.renderCart();setTimeout(window.loadProfile,50)}
    if(p==='acompanhar')window.renderTracking();
    if(p==='dashboard')window.renderDashboard();
    if(p==='pedidos'){if(window.BV_ROLE==='motoboy')window.renderMotoOrders?.();else window.renderAdmin()}
    if(p==='taxa-entrega')window.renderMotoFeeOrders?.()
    if(p==='produtos')window.renderProductsAdmin?.();
    if(p==='config'){window.refreshDeliveryFees();window.renderUsers?.()}
  };

  window.renderMotoFeeOrders=async()=>{
    if(window.BV_ROLE!=='motoboy')return;
    const b=$('motoFeeOrders');if(!b||!sb)return;
    b.innerHTML='<div class="emptyState"><span>⏳</span><b>Carregando taxas...</b></div>';
    try{
      const {data:{user}}=await sb.auth.getUser();if(!user)return;
      const r=await sb.from('orders').select('id,order_number,delivery_fee,created_at').eq('motoboy_id',user.id).eq('status','entregue').order('created_at',{ascending:false});
      if(r.error)throw r.error;
      const rows=r.data||[];
      const filter=window.BV_MOTO_FEE_FILTER||'all';
      const now=new Date();const startOfDay=new Date(now.getFullYear(),now.getMonth(),now.getDate());
      let start=null,endDate=null,specific=null;
      if(filter==='today')start=startOfDay;
      if(filter==='week'){const day=startOfDay.getDay();start=new Date(startOfDay);start.setDate(start.getDate()-(day===0?6:day-1));}
      if(filter==='month')start=new Date(now.getFullYear(),now.getMonth(),1);
      if(filter.startsWith('specific:'))specific=filter.slice(9);
      if(specific){const parts=specific.split('-').map(Number);start=new Date(parts[0],parts[1]-1,parts[2]);endDate=new Date(parts[0],parts[1]-1,parts[2]+1);}
      const filtered=specific?rows.filter(o=>{const d=new Date(o.created_at);return d>=start&&d<endDate}):start?rows.filter(o=>new Date(o.created_at)>=start):rows;
      const totalFees=filtered.reduce((s,o)=>s+Number(o.delivery_fee||0),0);
      const fmtDate=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')};
      b.innerHTML='<div class="motoFeeFilter"><div class="motoFeeQuickFilters"><button type="button" class="'+(filter==='today'?'active':'')+'" onclick="setMotoFeeFilter(\'today\')">Hoje</button><button type="button" class="'+(filter==='week'?'active':'')+'" onclick="setMotoFeeFilter(\'week\')">Esta semana</button><button type="button" class="'+(filter==='month'?'active':'')+'" onclick="setMotoFeeFilter(\'month\')">Este mês</button><button type="button" class="'+(filter==='all'?'active':'')+'" onclick="setMotoFeeFilter(\'all\')">Todas</button></div><label><span>Data específica</span><input id="motoFeeDate" type="date" value="" onchange="setMotoFeeSpecificDate(this.value)"></label></div>'+
        '<div class="motoFeeHeader"><div><small>ENTREGAS REALIZADAS</small><strong>'+filtered.length+'</strong></div><div><small>TOTAL A RECEBER</small><strong>'+money(totalFees)+'</strong></div></div>'+
        (filtered.length?'<div class="motoFeeList">'+filtered.map(o=>'<article class="motoFeeOrder"><div class="motoFeeOrderNumber"><small>PEDIDO</small><b>#'+esc(String(o.order_number).padStart(3,'0'))+'</b><small>DATA</small><b>'+fmtDate(o.created_at)+'</b></div><div class="motoFeeValue"><small>TAXA DE ENTREGA</small><strong>'+money(o.delivery_fee)+'</strong></div></article>').join('')+'</div>':'<div class="emptyState"><span>💰</span><b>Nenhuma entrega no período</b><small>Escolha outro filtro para consultar suas taxas.</small></div>');
    }catch(e){console.error('Moto fee orders',e);b.innerHTML='<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar as taxas</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoFeeOrders()">Tentar novamente</button></div>'}
  };
  window.setMotoFeeFilter=filter=>{window.BV_MOTO_FEE_FILTER=filter||'all';window.renderMotoFeeOrders()};
  window.setMotoFeeSpecificDate=value=>{window.BV_MOTO_FEE_FILTER=value?'specific:'+value:'all';window.renderMotoFeeOrders()};

  window.setMenuCategory=(c,b)=>{document.querySelectorAll('[data-menu-category]').forEach(x=>x.classList.remove('active'));b?.classList.add('active');window.BV_CAT=c;window.renderProducts()};
  window.renderProducts=()=>{
    const b=$('products');if(!b)return;
    const cat=window.BV_CAT||'Lanches';
    const a=(window.products||[]).filter(p=>p.active!==false&&String(p.category||'Lanches')===cat);
    b.innerHTML=a.length?a.map(p=>`<article class="productCard product"><div class="productImage"><span>🍔</span></div><div class="productInfo"><h3>${esc(p.name)}</h3><p>${esc(p.description||'')}</p><div class="productBottom"><b>${money(p.price)}</b><button type="button" onclick="addToCart('${esc(p.id)}')">+ Adicionar</button></div></div></article>`).join(''):'<div class="panel"><p class="muted">Nenhum produto disponível nesta categoria.</p></div>';
  };
  const saveCart=()=>{localStorage.setItem('bv_cart',JSON.stringify(window.cart||[]));const n=(window.cart||[]).reduce((s,x)=>s+(Number(x.q)||0),0);if($('count'))$('count').textContent=n;if($('sideCount'))$('sideCount').textContent=n;window.renderCart()};
  window.addToCart=id=>{const p=(window.products||[]).find(x=>String(x.id)===String(id));if(!p)return toast('Produto não encontrado.');const r=window.cart.find(x=>String(x.id)===String(id));if(r)r.q=(Number(r.q)||0)+1;else window.cart.push({id:p.id,name:p.name,price:Number(p.price)||0,q:1});saveCart();toast('Produto adicionado ao pedido.')};
  window.change=(id,d)=>{const r=window.cart.find(x=>String(x.id)===String(id));if(!r)return;r.q=(Number(r.q)||0)+Number(d||0);if(r.q<=0)window.cart=window.cart.filter(x=>String(x.id)!==String(id));saveCart()};
  window.removeFromCart=id=>{window.cart=window.cart.filter(x=>String(x.id)!==String(id));saveCart()};
  window.renderCart=()=>{
    const b=$('cart');if(!b)return;
    const c=window.cart||[],sub=c.reduce((s,x)=>s+(Number(x.price)||0)*(Number(x.q)||0),0),fee=Number($('fee')?.dataset.value||0);
    b.innerHTML=c.length?c.map(x=>`<div class="cartRow"><div class="cartInfo"><b>${esc(x.name)}</b><small>${money(x.price)} cada</small></div><div class="cartQty"><button type="button" onclick="change('${esc(x.id)}',-1)">−</button><strong>${Number(x.q)||0}</strong><button type="button" onclick="change('${esc(x.id)}',1)">+</button><button type="button" class="remove" onclick="removeFromCart('${esc(x.id)}')">×</button></div></div>`).join(''):'<div class="emptyCart"><span>🛒</span><b>Seu carrinho está vazio</b><small>Escolha seus lanches no cardápio.</small><button type="button" onclick="showPage(\'cardapio\')">Ver cardápio</button></div>';
    if($('sub'))$('sub').textContent=money(sub);if($('fee'))$('fee').textContent=money(fee);if($('total'))$('total').textContent=money(sub+fee);
    const n=c.reduce((s,x)=>s+(Number(x.q)||0),0);if($('count'))$('count').textContent=n;if($('sideCount'))$('sideCount').textContent=n;
  };
  window.mode=(m,b)=>{document.querySelectorAll('#page-pedido .tabs button').forEach(x=>x.classList.remove('active'));b?.classList.add('active');window.BV_MODE=m;$('address')&&($('address').style.display=m==='entrega'?'block':'none');window.refreshNeighborhoodFee()};
  window.pay=(p,b)=>{localStorage.setItem('bv_payment',p);document.querySelectorAll('#page-pedido .pay button').forEach(x=>x.classList.remove('active'));b?.classList.add('active');$('troco')?.classList.toggle('hide',p!=='Dinheiro')};

  window.refreshNeighborhoodFee=async()=>{
    const f=$('fee');if(!f)return;
    if(window.BV_MODE==='retirada'){f.dataset.value='0';f.textContent=money(0);window.renderCart();return}
    let v=Number(window.BV_DEFAULT_FEE||0);
    if(sb){try{const r=await sb.from('neighborhood_fees').select('name,fee').eq('active',true);if(!r.error){const hit=(r.data||[]).find(x=>norm(x.name)===norm($('bairro')?.value||''));if(hit)v=Number(hit.fee)||0}}catch{}}
    f.dataset.value=String(v);f.textContent=money(v);window.renderCart();
  };
  window.openProductForm=()=>{$('productFormPanel')?.classList.add('show','open')};
  window.closeProductForm=()=>{$('productFormPanel')?.classList.remove('show','open')};

  window.login=async()=>{
    $('err')&&($('err').textContent='');
    if(!sb)return $('err').textContent='Conexão com o banco indisponível. Recarregue a página.';
    const email=$('email')?.value.trim(),pass=$('pass')?.value||'';
    if(!email||!pass)return $('err').textContent='Informe e-mail e senha.';
    const r=await sb.auth.signInWithPassword({email,password:pass});
    if(r.error)return $('err').textContent=r.error.message;
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
  window.logout=async()=>{if(sb)await sb.auth.signOut();window.BV_ROLE='';window.BV_USER_NAME='';window.applyAccess();$('login')&&($('login').style.display='flex');window.showPage('inicio')};

  window.loadProfile=async()=>{
    if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;
    const r=await sb.from('profiles').select('name,phone,street,number,neighborhood,cep,complement').eq('id',user.id).maybeSingle();const d=r.data;if(!d)return;
    [['name',d.name],['phone',d.phone],['street',d.street],['num',d.number],['bairro',d.neighborhood],['cep',d.cep],['comp',d.complement]].forEach(([id,v])=>{if($(id)&&v!=null)$(id).value=v||''});
  };
  const saveProfile=async()=>{if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;await sb.from('profiles').update({name:$('name')?.value.trim()||'',phone:$('phone')?.value.trim()||'',street:$('street')?.value.trim()||'',number:$('num')?.value.trim()||'',neighborhood:$('bairro')?.value.trim()||'',cep:$('cep')?.value.trim()||'',complement:$('comp')?.value.trim()||''}).eq('id',user.id)};

  window.finish=async()=>{
    try{
      if(!sb)return toast('Banco de dados indisponível.');
      const {data:{user}}=await sb.auth.getUser();if(!user)return toast('Faça login para finalizar o pedido.');
      const c=window.cart||[];if(!c.length)return toast('Seu carrinho está vazio.');
      const delivery=window.BV_MODE!=='retirada'&&$('address')?.style.display!=='none';
      const name=$('name')?.value.trim(),phone=$('phone')?.value.trim(),bairro=$('bairro')?.value.trim(),street=$('street')?.value.trim(),num=$('num')?.value.trim();
      if(!name||!phone)return toast('Preencha nome e WhatsApp.');
      if(delivery&&(!street||!num||!bairro))return toast('Preencha rua, número e bairro.');
      const items=c.map(x=>{const p=(window.products||[]).find(y=>String(y.id)===String(x.id));if(!p)throw Error('Produto não encontrado: '+x.name);return{product_id:p.id,quantity:Math.max(1,Number(x.q)||1)}});
      const payment=localStorage.getItem('bv_payment')==='Dinheiro'?'dinheiro':localStorage.getItem('bv_payment')==='Cartão'?'cartao':'pix';
      const address=delivery?street+', '+num+(($('comp')?.value||'').trim()?' — '+$('comp').value.trim():''):'';
      const r=await sb.rpc('create_bv_order',{p_customer_name:name,p_phone:phone,p_address:address,p_neighborhood:delivery?bairro:'',p_payment_method:payment,p_coupon:(($('coupon')?.value)||'').trim().toUpperCase(),p_items:items});
      if(r.error)throw Error(r.error.message||'Erro ao criar pedido.');if(!r.data)throw Error('O servidor não retornou o número do pedido.');
      await saveProfile();localStorage.setItem('bv_last_order',JSON.stringify({id:r.data,phone}));localStorage.setItem('bv_track_id',r.data);window.cart=[];localStorage.setItem('bv_cart','[]');await window.BV_REFRESH_ORDERS?.();const o=(window.orders||[]).find(x=>x.id===r.data);window.showPage('acompanhar');window.renderTracking(o);toast('Pedido finalizado com sucesso.');
    }catch(e){console.error(e);toast('Não foi possível finalizar: '+(e?.message||'erro desconhecido'))}
  };

  window.orderLabel=o=>Number(o?.orderNumber)>0?String(Math.trunc(o.orderNumber)).padStart(3,'0'):String(o?.id||'').slice(-5);
  window.renderAdmin=()=>{
    const b=$('orders');if(!b)return;
    const q=norm($('orderSearch')?.value||''),sf=$('orderStatusFilter')?.value||'',pf=$('orderPaymentFilter')?.value||'',df=$('orderDateFilter')?.value||'',now=Date.now();
    const a=(window.orders||[]).filter(o=>{
      if(o.rawStatus==='entregue')return false;
      const text=norm([o.customer,o.phone,o.address?.rua,o.address?.bairro,window.orderLabel(o),o.id].join(' '));
      if(q&&!text.includes(q))return false;if(sf&&o.status!==sf)return false;if(pf&&o.payment!==pf)return false;
      if(df){const t=new Date(o.created_at).getTime();if(df==='today'){const d=new Date();d.setHours(0,0,0,0);if(t<d.getTime())return false}else if(now-t>Number(df)*86400000)return false}return true;
    });
    b.innerHTML=a.length?a.map(o=>`<article class="orderCard"><div class="orderHead"><div><small>PEDIDO</small><b>#${esc(window.orderLabel(o))}</b></div><span class="statusBadge">${esc(o.status)}</span></div><div class="orderBody"><b>${esc(o.customer||'Cliente')}</b><p>${esc(o.items||'')}</p><small>${esc(o.phone||'')}${o.address?' · '+esc(o.address.rua||'')+(o.address.bairro?' · '+esc(o.address.bairro):''):''}</small></div><div class="orderFoot"><strong>${money(o.total)}</strong><select onchange="statusOrder('${esc(o.id)}',this.value)"><option value="">Alterar status</option><option value="recebido">Novo</option><option value="em_preparo">Em preparo</option><option value="saiu_entrega">Saiu para entrega</option><option value="entregue">Entregue</option><option value="cancelado">Cancelado</option></select></div></article>`).join(''):'<div class="emptyState"><span>📋</span><b>Nenhum pedido encontrado</b><small>Altere os filtros ou aguarde novos pedidos.</small></div>';
  };
  window.statusOrder=async(id,s)=>{
    if(!sb||!window.admin())return toast('Acesso restrito ao administrador.');
    const r=await sb.from('orders').update({status:s,updated_at:new Date().toISOString()}).eq('id',id);
    if(r.error)return toast('Erro ao atualizar status: '+r.error.message);
    await window.BV_REFRESH_ORDERS?.();toast('Status atualizado.');
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
    const rev=delivered.reduce((s,o)=>s+Number(o.total||0),0);
    if($('sOrders'))$('sOrders').textContent=delivered.length;
    if($('sRevenue'))$('sRevenue').textContent=money(rev);
    if($('sAvg'))$('sAvg').textContent=money(delivered.length?rev/delivered.length:0);
    if($('sNew'))$('sNew').textContent=pending.length;
    const chart=$('dashboardChart');
    if(chart){
      const statusMap=[
        ['recebido','Novo'],['em_preparo','Em preparo'],['em_producao','Em produção'],
        ['saiu_entrega','Saiu para entrega'],['entregue','Entregue'],['cancelado','Cancelado']
      ];
      const cs=statusMap.map(([raw])=>filtered.filter(o=>String(o.rawStatus||'')===raw).length);
      const mx=Math.max(1,...cs);
      chart.innerHTML=statusMap.map(([raw,label],i)=>'<div class="chartBar"><div class="chartTrack"><div class="chartFill" style="height:'+Math.max(5,cs[i]/mx*100)+'%"></div></div><b>'+cs[i]+'</b><small>'+label+'</small></div>').join('');
      const title=chart.closest('.analyticsPanel')?.querySelector('.panelTitle small');
      if(title)title.textContent=selected?'Distribuição dos pedidos em '+selected.split('-').reverse().join('/'):'Distribuição dos pedidos por status';
    }
    const nc=$('notificationCenter'),badge=$('notificationBadge');
    if(badge)badge.textContent=pending.length;
    if(nc)nc.innerHTML=pending.slice(0,10).map(o=>'<div class="notificationItem"><b>Pedido #'+esc(window.orderLabel(o))+'</b><small>'+esc(o.customer||'Cliente')+' · '+esc(o.status)+'</small></div>').join('')||'<div class="notificationItem">Nenhuma pendência.</div>';
    const list=$('dashboardOrders');
    if(list){
      const fmtDate=o=>{const d=new Date(o.created_at);return Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')+' · '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})};
      list.innerHTML=delivered.length?delivered.slice(0,20).map(o=>'<div class="line dashboardOrderLine"><span class="dashboardOrderMain"><b>Pedido #'+esc(window.orderLabel(o))+' · '+esc(o.customer||'Cliente')+'</b><small>'+esc(o.items||'Nenhum item informado')+'</small><small class="dashboardOrderDate">📅 <strong>'+esc(fmtDate(o))+'</strong></small></span><strong class="dashboardOrderValue">'+money(o.total)+'</strong><button type="button" class="dashboardOrderDetailsBtn" onclick="showDashboardOrderDetails(this.__order)">Ver detalhes</button></div>').join(''):'<div class="emptyState"><span>📋</span><b>Nenhum pedido entregue'+(selected?' nesta data':' ainda')+'</b><small>'+(selected?'Escolha outra data ou clique em Todos.':'Os pedidos entregues aparecerão aqui.')+'</small></div>';
      list.querySelectorAll('.dashboardOrderDetailsBtn').forEach((btn,i)=>btn.__order=delivered.slice(0,20)[i]);
    }
  };
  window.showDashboardOrderDetails=o=>{
    if(!o)return;
    let m=$('dashboardOrderDetails');
    if(!m){m=document.createElement('div');m.id='dashboardOrderDetails';m.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:18px;background:rgba(0,0,0,.78);backdrop-filter:blur(7px)';document.body.appendChild(m)}
    const d=new Date(o.created_at);const date=Number.isNaN(d.getTime())?'Data não disponível':d.toLocaleDateString('pt-BR')+' às '+d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
    const address=o.address?((o.address.rua||'')+(o.address.bairro?' — '+o.address.bairro:'')):'Retirada no local';
    m.innerHTML='<div style="width:min(620px,100%);max-height:90vh;overflow:auto;background:#111419;color:#fff;border:1px solid #343a44;border-radius:18px;box-shadow:0 25px 80px rgba(0,0,0,.7);padding:22px;box-sizing:border-box"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:15px"><div><small style="color:#e50914;font-weight:900;letter-spacing:1px">DETALHES DO PEDIDO</small><h2 style="margin:6px 0">#'+esc(window.orderLabel(o))+'</h2></div><button type="button" onclick="closeDashboardOrderDetails()" style="width:40px;height:40px;border:1px solid #343a44;border-radius:10px;background:#20242a;color:#fff;font-size:24px;cursor:pointer">×</button></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:15px"><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>CLIENTE</small><br><b>'+esc(o.customer||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>STATUS</small><br><b>'+esc(o.status||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>WHATSAPP</small><br><b>'+esc(o.phone||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>DATA E HORA</small><br><b>'+esc(date)+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>PAGAMENTO</small><br><b>'+esc(o.payment||'Não informado')+'</b></div><div style="background:#1a1e24;padding:12px;border-radius:10px"><small>TAXA DE ENTREGA</small><br><b>'+money(o.deliveryFee)+'</b></div></div><div style="margin-top:12px;background:#1a1e24;padding:14px;border-radius:10px"><small>ENDEREÇO</small><p style="margin:6px 0 0">'+esc(address)+'</p></div><div style="margin-top:12px;background:#1a1e24;padding:14px;border-radius:10px"><small>ITENS DO PEDIDO</small><p style="margin:6px 0 0;line-height:1.7">'+esc(o.items||'Nenhum item informado')+'</p></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:16px;padding-top:15px;border-top:1px solid #343a44"><span style="font-weight:800">TOTAL DO PEDIDO</span><strong style="font-size:24px;color:#e50914">'+money(o.total)+'</strong></div></div>';
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

  window.renderProductsAdmin=()=>{const b=$('manage');if(!b)return;b.innerHTML=(window.products||[]).filter(x=>x.active!==false).map(x=>`<article class="productCard product adminProductCard"><div class="productImage"><span>${x.category==='Bebidas'?'🥤':'🍔'}</span></div><div class="productInfo"><small class="eyebrow">${esc(x.category||'Lanches')}</small><h3>${esc(x.name)}</h3><p>${esc(x.description||'')}</p><div class="productBottom"><b>${money(x.price)}</b><button type="button" onclick="removeProduct('${esc(x.id)}')">Excluir produto</button></div></div></article>`).join('')||'<div class="emptyState"><span>📦</span><b>Nenhum produto cadastrado.</b><small>Cadastre um produto para começar seu cardápio.</small></div>'};
  window.addProduct=async e=>{e.preventDefault();const n=$('productName')?.value.trim(),p=Number($('productPrice')?.value),c=$('productCategory')?.value,d=$('productDesc')?.value.trim();if(!n||!Number.isFinite(p)||p<0||!c)return toast('Preencha nome, valor e categoria.');const r=await sb.from('products').insert({name:n,price:p,category:c,description:d||'',active:true});if(r.error)return toast('Erro ao cadastrar produto: '+r.error.message);e.target.reset();window.closeProductForm();await window.BV_REFRESH_PRODUCTS();toast('Produto cadastrado.')};
  window.removeProduct=async id=>{if(!confirm('Excluir este produto do cardápio?'))return;const r=await sb.from('products').update({active:false}).eq('id',id);if(r.error)return toast('Erro ao excluir: '+r.error.message);await window.BV_REFRESH_PRODUCTS();toast('Produto removido.')};
  window.BV_REFRESH_PRODUCTS=async()=>{if(!sb)return;const r=await sb.from('products').select('*').order('created_at');if(r.error)return toast('Erro ao carregar cardápio: '+r.error.message);window.products=r.data||[];localStorage.setItem('bv_products',JSON.stringify(window.products));window.renderProducts();window.renderProductsAdmin?.()};
  window.BV_REFRESH_ORDERS=async()=>{
    if(!sb)return;const {data:{user}}=await sb.auth.getUser();if(!user)return;const pr=await sb.from('profiles').select('role').eq('id',user.id).maybeSingle();const role=pr.data?.role||window.BV_ROLE||'usuario';
    let q=sb.from('orders').select('id,order_number,user_id,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id').order('created_at',{ascending:false});
    if(role==='motoboy')q=q.or('motoboy_id.is.null,motoboy_id.eq.'+user.id).eq('status','em_preparo');else if(role!=='administrador')q=q.eq('user_id',user.id);
    const r=await q;if(r.error)return toast('Erro ao carregar pedidos: '+r.error.message);
    const ids=(r.data||[]).map(x=>x.id);let its=[];if(ids.length){const z=await sb.from('order_items').select('order_id,product_name,quantity').in('order_id',ids);if(!z.error)its=z.data||[]}
    const g={};its.forEach(i=>(g[i.order_id]??=[]).push(i));
    window.orders=(r.data||[]).map(o=>({id:o.id,orderNumber:o.order_number,created_at:o.created_at,customer:o.customer_name,phone:o.phone,total:Number(o.total)||0,payment:payLabel[o.payment_method]||o.payment_method,status:status[o.status]||o.status,rawStatus:o.status,address:o.address?{rua:o.address,bairro:o.neighborhood}:null,deliveryFee:Number(o.delivery_fee)||0,motoboyId:o.motoboy_id,items:(g[o.id]||[]).map(i=>i.quantity+'x '+i.product_name).join(', ')}));
    if(role==='motoboy'){window.renderMotoOrders?.();return;} window.renderAdmin();window.renderDashboard();window.renderTracking();
  };
  window.renderTracking=o=>{const b=$('trackingResult');if(!b)return;o=o||(window.orders||[]).find(x=>String(x.id)===String(localStorage.getItem('bv_track_id')));b.innerHTML=o?`<div class="trackingCard"><small>PEDIDO</small><h3>#${esc(window.orderLabel(o))}</h3><b>${esc(o.status)}</b><p>${esc(o.items||'')}</p><strong>${money(o.total)}</strong></div>`:'<p class="muted">Nenhum pedido selecionado.</p>'};
  window.trackLastOrder=async()=>{try{const x=JSON.parse(localStorage.getItem('bv_last_order')||'null');if(!x)return toast('Nenhum pedido recente.');localStorage.setItem('bv_track_id',x.id);await window.BV_REFRESH_ORDERS();window.renderTracking()}catch{toast('Não foi possível consultar o último pedido.')}};
  window.trackOrder=async()=>{const v=($('trackId')?.value||'').replace(/^#/,'').trim();let o=(window.orders||[]).find(x=>window.orderLabel(x)===v.padStart(3,'0')||String(x.orderNumber)===v||String(x.id)===v);if(!o&&sb&&/^\d+$/.test(v)){const r=await sb.from('orders').select('id').eq('order_number',Number(v)).maybeSingle();if(r.data){localStorage.setItem('bv_track_id',r.data.id);await window.BV_REFRESH_ORDERS();o=(window.orders||[]).find(x=>x.id===r.data.id)}}if(!o)return toast('Pedido não encontrado.');localStorage.setItem('bv_track_id',o.id);window.renderTracking(o)};
  window.renderMotoOrders=async()=>{
    if(window.BV_ROLE!=='motoboy')return;
    const b=$('orders');if(!b)return;
    const filters=$('adminOrderFilters');if(filters)filters.style.display='none';
    const deliveryPanel=$('motoDeliveryPanel');if(deliveryPanel)deliveryPanel.style.display='none';
    if(!sb)return;
    b.innerHTML='<div class="emptyState"><span>⏳</span><b>Buscando pedidos...</b><small>Atualizando pedidos em preparo.</small></div>';
    try{
      const {data:{user}}=await sb.auth.getUser();if(!user)return;
      const r=await sb.from('orders').select('id,order_number,customer_name,phone,address,neighborhood,delivery_fee,total,payment_method,payment_status,status,created_at,motoboy_id').eq('status','em_preparo').or('motoboy_id.is.null,motoboy_id.eq.'+user.id).order('created_at',{ascending:false});
      if(r.error)throw r.error;
      const ids=(r.data||[]).map(x=>x.id);let its=[];
      if(ids.length){const z=await sb.from('order_items').select('order_id,product_name,quantity').in('order_id',ids);if(z.error)throw z.error;its=z.data||[]}
      const g={};its.forEach(i=>(g[i.order_id]??=[]).push(i));
      const available=(r.data||[]).map(o=>({id:o.id,orderNumber:o.order_number,customer:o.customer_name,phone:o.phone,total:Number(o.total)||0,payment:payLabel[o.payment_method]||o.payment_method,status:status[o.status]||o.status,rawStatus:o.status,address:o.address?{rua:o.address,bairro:o.neighborhood}:null,deliveryFee:Number(o.delivery_fee)||0,motoboyId:o.motoboy_id,created_at:o.created_at,items:(g[o.id]||[]).map(i=>i.quantity+'x '+i.product_name).join(', ')}));
      window.orders=available;
      b.innerHTML=available.map(o=>`<article class="orderCard motoOrder"><div class="orderHead"><div><small>PEDIDO</small><b>#${esc(window.orderLabel(o))}</b></div><span class="statusBadge">${esc(o.status)}</span></div><div class="orderBody"><b>${esc(o.customer)}</b><p>${esc(o.items||'')}</p><div class="motoContactInfo"><div class="motoContactItem"><span>📍 Endereço</span><strong>${esc(o.address?.rua||'Não informado')}${o.address?.bairro?' · '+esc(o.address.bairro):''}</strong></div><div class="motoContactItem"><span>📱 Celular</span><strong>${esc(o.phone||'Não informado')}</strong></div></div></div><div class="motoFeeCard"><span>Taxa de entrega</span><strong>${money(o.deliveryFee)}</strong></div><button class="motoFinishBtn" onclick="motoFinish('${esc(o.id)}')">✓ Marcar como entregue</button></article>`).join('')||'<div class="emptyState"><span>🏍️</span><b>Nenhum pedido em preparo</b><small>Os pedidos aparecem aqui quando o administrador marcar "Em preparo".</small></div>';
    }catch(e){console.error('Moto orders',e);b.innerHTML='<div class="emptyState"><span>⚠️</span><b>Não foi possível carregar os pedidos</b><small>'+esc(e?.message||'Erro de conexão com o banco.')+'</small><button type="button" onclick="renderMotoOrders()">Tentar novamente</button></div>'}
  };
  window.motoFinish=async id=>{if(!sb)return;const r=await sb.rpc('motoboy_update_delivery',{p_order_id:id,p_fee_collected:true,p_mark_delivered:true});if(r.error)return toast('Erro: '+r.error.message);await window.BV_REFRESH_ORDERS();window.renderMotoFeeOrders?.();toast('Entrega finalizada.')};

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
    const {data:{user},error}=await sb.auth.getUser();if(error||!user){$('login')&&($('login').style.display='flex');return}
    const p=await sb.from('profiles').select('name,role').eq('id',user.id).maybeSingle();if(p.error||!p.data){toast('Seu perfil não foi encontrado.');return}
    window.BV_ROLE=p.data.role||'usuario';window.BV_USER_NAME=p.data.name||user.email;window.applyAccess();
    $('login')&&($('login').style.display='none');
    const [pr,st]=await Promise.all([sb.from('products').select('*').order('created_at'),sb.from('settings').select('fee,whatsapp').eq('id',1).maybeSingle()]);
    if(!pr.error){window.products=pr.data||[];localStorage.setItem('bv_products',JSON.stringify(window.products))}
    window.BV_DEFAULT_FEE=st.data?Number(st.data.fee)||0:5;if($('feeCfg'))$('feeCfg').value=window.BV_DEFAULT_FEE;if($('waCfg'))$('waCfg').value=st.data?.whatsapp||'';
    window.renderProducts();await window.BV_REFRESH_ORDERS();await window.loadProfile();
    // A restauração da sessão é assíncrona. Se o usuário já clicou em outra aba,
    // nunca sobrescreva a navegação dele com Dashboard/Pedidos.
    if(!window.BV_HAS_NAVIGATED)window.showPage('inicio',true);
  };

  window.addEventListener?.('error',e=>{console.error('BV error',e.error||e.message)});
  document.addEventListener('DOMContentLoaded',async()=>{
    window.applyAccess();window.renderProducts();window.renderCart();
    if(sb){const s=await sb.auth.getSession();if(s.data.session)await window.loadApp()}
  });
  if(sb)sb.auth.onAuthStateChange((event,session)=>{if(event==='SIGNED_OUT'){window.BV_ROLE='';window.BV_USER_NAME='';window.applyAccess();$('login')&&($('login').style.display='flex')}else if(event==='SIGNED_IN'&&session){setTimeout(()=>window.loadApp(),100)}});
})();
