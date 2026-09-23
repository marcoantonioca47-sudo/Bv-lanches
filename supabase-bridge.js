/* BV LANCHES - integração completa com Supabase + sincronização em tempo real */
(function(){
  if(!window.supabase || !window.BV_SUPABASE_CONFIG) return;
  const sb=window.supabase.createClient(BV_SUPABASE_CONFIG.url,BV_SUPABASE_CONFIG.publishableKey);
  window.BV_SUPABASE=sb;
  const $=id=>document.getElementById(id);
  let syncing=false;
  let realtimeChannel=null;

  async function user(){const {data}=await sb.auth.getUser();return data?.user||null}
  async function profile(){const u=await user();if(!u)return null;const {data}=await sb.from('profiles').select('id,name,role').eq('id',u.id).maybeSingle();return data||null}
  function session(u,p){if(!u)return;sessionStorage.setItem('bv_user_id',u.id);sessionStorage.setItem('bv_role',p?.role||'usuario');sessionStorage.setItem('bv','0')}

  async function productsDB(){
    const {data,error}=await sb.from('products').select('*').order('created_at',{ascending:true});
    if(error||!Array.isArray(data))return false;
    products=data.filter(x=>x.active!==false).map(x=>({id:x.id,name:x.name,price:Number(x.price)||0,emoji:'🍔',desc:x.description||'',category:x.category||'Lanches'}));
    localStorage.bv_products=JSON.stringify(products);
    if($('products') && typeof renderProducts==='function') renderProducts();
    if($('manage') && typeof renderManage==='function') renderManage();
    return true;
  }

  async function feesDB(){
    const {data}=await sb.from('neighborhood_fees').select('name,fee,active').eq('active',true).order('name');
    if(!Array.isArray(data))return;
    config.bairroFees={};
    data.forEach(x=>config.bairroFees[String(x.name).trim().toLowerCase()]=Number(x.fee)||0);
    localStorage.bv_config=JSON.stringify(config);
    const box=$('bairroFees');
    if(box)box.innerHTML=data.map(x=>`<div class="line"><span>${x.name}</span><b>${brl(x.fee)}</b></div>`).join('')||'<p class="muted">Nenhum bairro cadastrado.</p>';
  }

  async function ordersDB(){
    const u=await user();if(!u)return false;
    const p=await profile();
    let q=sb.from('orders').select('*,order_items(*)').order('created_at',{ascending:false});
    if(!(p&&['administrador','motoboy'].includes(p.role)))q=q.eq('user_id',u.id);
    const {data,error}=await q;
    if(error||!Array.isArray(data))return false;
    orders=data.map(o=>({
      id:o.id,customer:o.customer_name,phone:o.phone,
      items:(o.order_items||[]).map(i=>`${i.quantity}x ${i.product_name}`).join(', '),
      total:Number(o.total)||0,
      payment:o.payment_method==='pix'?'Pix':o.payment_method==='cartao'?'Cartão':'Dinheiro',
      delivery:o.address?'Entrega':'Retirada',
      address:o.address?{rua:o.address,numero:'',bairro:o.neighborhood,cep:'',complemento:''}:null,
      status:({recebido:'Novo',em_preparo:'Em preparo',saiu_entrega:'Saiu para entrega',entregue:'Entregue',cancelado:'Cancelado'}[o.status]||o.status),
      paid:o.payment_status==='pago',time:new Date(o.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})
    }));
    localStorage.bv_orders=JSON.stringify(orders);
    return true;
  }

  async function refreshRealtimeData(){
    if(syncing)return;
    syncing=true;
    try{
      const u=await user();
      if(!u)return;
      await Promise.all([productsDB(),feesDB(),ordersDB()]);
      if(typeof renderAdmin==='function' && (admin()||moto())) renderAdmin();
      if(typeof renderTracking==='function') renderTracking();
      if(typeof applyAccess==='function') applyAccess();
    }finally{syncing=false}
  }

  function startRealtime(){
    if(realtimeChannel) return;
    realtimeChannel=sb.channel('bv-lanches-realtime')
      .on('postgres_changes',{event:'*',schema:'public',table:'orders'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'order_items'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'products'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'neighborhood_fees'},()=>refreshRealtimeData())
      .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>refreshRealtimeData())
      .subscribe();
  }

  function stopRealtime(){
    if(!realtimeChannel)return;
    sb.removeChannel(realtimeChannel);
    realtimeChannel=null;
  }

  async function login(){
    const email=($('email')?.value||'').trim().toLowerCase(),password=$('pass')?.value||'',err=$('err');
    if(!email||!password){if(err)err.textContent='Digite e-mail e senha.';return}

    // Primeiro tenta o Supabase. Se a conta ainda não estiver cadastrada lá,
    // usa os usuários locais de demonstração/cadastro para não bloquear o acesso.
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(!error && data?.user){
      const p=await profile();session(data.user,p);
      await Promise.all([productsDB(),feesDB(),ordersDB()]);
      startRealtime();
      $('login').style.display='none';applyAccess();
      showPage(p?.role==='administrador'?'dashboard':p?.role==='motoboy'?'pedidos':'inicio');
      toast('Login realizado com sucesso.');
      return;
    }

    try{
      const raw=localStorage.getItem('bv_users');
      const list=raw?JSON.parse(raw):[];
      const u=Array.isArray(list)?list.find(x=>String(x.email||'').trim().toLowerCase()===email&&String(x.pass||'')===password):null;
      if(u){
        sessionStorage.setItem('bv_user_id',u.id||'local-'+Date.now());
        sessionStorage.setItem('bv_role',u.role||'usuario');
        sessionStorage.setItem('bv','0');
        $('login').style.display='none';
        applyAccess();
        showPage((u.role==='administrador'||u.role==='admin')?'dashboard':u.role==='motoboy'?'pedidos':'inicio');
        toast('Login realizado com sucesso.');
        return;
      }
    }catch(e){console.warn('Fallback local de login:',e)}

    if(err)err.textContent='E-mail ou senha incorretos.';
  }

  async function register(e){
    if(e)e.preventDefault();
    const name=($('registerName')?.value||'').trim(),email=($('registerEmail')?.value||'').trim().toLowerCase(),password=$('registerPass')?.value||'',password2=$('registerPass2')?.value||'',err=$('registerErr');
    if(!name||!email||!password||!password2)return err.textContent='Preencha todos os campos.';
    if(password.length<6)return err.textContent='A senha deve ter pelo menos 6 caracteres.';
    if(password!==password2)return err.textContent='As senhas não coincidem.';
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{name}}});
    if(error)return err.textContent=error.message;
    closeRegister();
    if(data.session){const p=await profile();session(data.user,p);startRealtime();$('login').style.display='none';applyAccess();showPage('inicio')}
    else{$('email').value=email;err.textContent='Conta criada. Faça login.'}
    toast('Cadastro salvo no Supabase.');return false;
  }

  async function addProductDB(e){
    if(e)e.preventDefault();
    const name=($('productName')?.value||'').trim(),price=Number($('productPrice')?.value)||0,category=$('productCategory')?.value||'Lanches',description=($('productDesc')?.value||'').trim();
    if(!name||!description)return toast('Preencha nome, valor e descrição.');
    const {error}=await sb.from('products').insert({name,price,category,description,active:true});
    if(error)return toast('Erro: '+error.message);
    await productsDB();closeProductForm();toast('Produto cadastrado no Supabase.');
  }

  async function saveCfgDB(){
    const fee=Number($('feeCfg')?.value)||0;config.fee=fee;config.wa=$('waCfg')?.value||config.wa;localStorage.bv_config=JSON.stringify(config);await feesDB();toast('Configurações sincronizadas.');
  }

  async function addFeeDB(){
    const name=($('bairroCfg')?.value||'').trim(),fee=Number($('bairroFeeCfg')?.value)||0;
    if(!name)return toast('Informe o bairro.');
    const {error}=await sb.from('neighborhood_fees').upsert({name,fee,active:true},{onConflict:'name'});
    if(error)return toast('Erro: '+error.message);
    $('bairroCfg').value='';$('bairroFeeCfg').value='';await feesDB();toast('Bairro salvo no Supabase.');
  }

  async function finishDB(){
    if(!cart.length)return toast('Adicione um produto.');
    const u=await user();if(!u)return toast('Faça login para finalizar o pedido.');
    const delivery=$('address')?.style.display!=='none',payment=localStorage.bv_payment||'Pix';
    if(delivery&&(!$('name')?.value||!$('street')?.value||!$('num')?.value||!$('bairro')?.value))return toast('Preencha nome e endereço.');
    if(!delivery&&!$('name')?.value)return toast('Informe seu nome.');
    const sub=subtotal(),f=delivery?fee():0,c=($('coupon')?.value||'').toUpperCase(),disc=c==='BV10'?sub*.1:c==='PRIMEIRA'?5:0,total=Math.max(0,sub+f-disc),pm=payment==='Pix'?'pix':payment==='Cartão'?'cartao':'dinheiro';
    const address=delivery?`${$('street').value}, ${$('num').value}${$('comp').value?' — '+$('comp').value:''}`:'';
    const {data:o,error}=await sb.from('orders').insert({user_id:u.id,customer_name:$('name').value,phone:$('phone').value||'',address,neighborhood:delivery?$('bairro').value:'',delivery_fee:f,subtotal:sub,total,payment_method:pm,payment_status:payment==='Pix'?'pendente':'pago',status:'recebido',notes:$('coupon')?.value||''}).select().single();
    if(error)return toast('Erro ao criar pedido: '+error.message);
    const ir=await sb.from('order_items').insert(cart.map(x=>({order_id:o.id,product_id:x.id,product_name:x.name,quantity:x.q,unit_price:Number(x.price)||0,total:(Number(x.price)||0)*x.q})));
    if(ir.error){await sb.from('orders').delete().eq('id',o.id);return toast('Erro ao salvar itens.')}
    localStorage.bv_last_order=JSON.stringify({id:o.id,phone:$('phone').value});cart=[];localStorage.bv_cart='[]';
    await ordersDB();
    if($('trackId'))$('trackId').value=o.id;if($('trackPhone'))$('trackPhone').value=$('phone').value;
    showPage('acompanhar');renderTracking(orders[0]);toast('Pedido salvo no Supabase!');
  }

  async function statusDB(id,s){
    const map={'Novo':'recebido','Aguardando pagamento':'recebido','Confirmado':'recebido','Em preparo':'em_preparo','Pronto':'em_preparo','Saiu para entrega':'saiu_entrega','Entregue':'entregue','Cancelado':'cancelado'};
    const o=orders.find(x=>x.id===id);if(!o)return;
    if(o.payment==='Pix'&&!o.paid&&s!=='Aguardando pagamento')return toast('Confirme o pagamento Pix primeiro.');
    const {error}=await sb.from('orders').update({status:map[s]||s}).eq('id',id);if(error)return toast('Erro ao atualizar pedido.');
    await ordersDB();renderAdmin();toast('Status atualizado.');
  }

  async function pixDB(id){
    const {error}=await sb.from('orders').update({payment_status:'pago',status:'recebido'}).eq('id',id);if(error)return toast('Erro ao confirmar Pix.');
    await ordersDB();renderAdmin();toast('Pix confirmado.');
  }

  async function usersDB(){
    const box=$('userPermissions');if(!box)return;
    const {data,error}=await sb.from('profiles').select('id,name,role,created_at').order('created_at',{ascending:false});
    if(error){box.innerHTML='<p class="muted">Não foi possível carregar usuários. Execute a atualização do RLS no Supabase.</p>';return}
    box.innerHTML=(data||[]).map(u=>`<div class="line"><span><b>${u.name||'Sem nome'}</b></span><select onchange="changeUserRole('${u.id}',this.value)"><option value="usuario" ${u.role==='usuario'?'selected':''}>Usuário</option><option value="motoboy" ${u.role==='motoboy'?'selected':''}>Motoboy</option><option value="administrador" ${u.role==='administrador'?'selected':''}>Administrador</option></select></div>`).join('')||'<p class="muted">Nenhum usuário cadastrado.</p>';
  }

  window.changeUserRole=async(id,role)=>{const {error}=await sb.from('profiles').update({role}).eq('id',id);if(error)return toast('Não foi possível alterar a permissão.');toast('Permissão atualizada.');usersDB()};
  window.login=login;window.registerUser=register;window.addProduct=addProductDB;window.saveCfg=saveCfgDB;window.addBairroFee=addFeeDB;window.finish=finishDB;window.statusOrder=statusDB;window.confirmPix=pixDB;window.renderUsers=usersDB;
  const oldLogout=window.logout;
  window.logout=async()=>{stopRealtime();try{await sb.auth.signOut()}catch(e){}if(oldLogout)oldLogout()};

  sb.auth.getSession().then(async({data})=>{
    if(!data.session)return;
    const p=await profile();session(data.session.user,p);
    await Promise.all([productsDB(),feesDB(),ordersDB()]);
    startRealtime();$('login').style.display='none';applyAccess();showPage(p?.role==='administrador'?'dashboard':p?.role==='motoboy'?'pedidos':'inicio');
  });

  sb.auth.onAuthStateChange(async(ev,s)=>{
    if(ev==='SIGNED_OUT'||!s||syncing)return;
    syncing=true;
    try{const p=await profile();session(s.user,p);await Promise.all([productsDB(),feesDB(),ordersDB()]);startRealtime()}
    finally{syncing=false}
  });
})();
