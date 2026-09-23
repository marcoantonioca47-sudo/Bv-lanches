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

  async function settingsDB(){
    const {data,error}=await sb.from('settings').select('id,fee,whatsapp').eq('id',1).maybeSingle();
    if(error)return false;
    if(data){
      config.fee=Number(data.fee)||0;
      config.wa=String(data.whatsapp||config.wa||'');
      localStorage.bv_config=JSON.stringify(config);
      return true;
    }
    const fee=Number(config.fee)||0;
    const whatsapp=String(config.wa||'');
    const r=await sb.from('settings').upsert({id:1,fee,whatsapp},{onConflict:'id'});
    return !r.error;
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
      await Promise.all([productsDB(),feesDB(),ordersDB(),settingsDB()]);
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
      .on('postgres_changes',{event:'*',schema:'public',table:'settings'},()=>refreshRealtimeData())
      .subscribe();
  }

  function stopRealtime(){
    if(!realtimeChannel)return;
    sb.removeChannel(realtimeChannel);
    realtimeChannel=null;
  }

  async function login(){
    const email=($('email')?.value||'').trim().toLowerCase();
    const password=$('pass')?.value||'';
    const err=$('err');
    if(!email||!password){
      if(err)err.textContent='Digite o e-mail e a senha.';
      return;
    }

    // LOGIN LOCAL PRIMEIRO: garante que o acesso de demonstração funcione
    // mesmo que o Supabase/RLS esteja com problema ou que exista cadastro antigo
    // no navegador.
    let localUser=null;
    try{
      let list=[];
      if(typeof window.users==='function'){
        list=window.users();
      }else{
        const raw=localStorage.getItem('bv_users');
        list=raw?JSON.parse(raw):[];
      }
      if(!Array.isArray(list))list=[];

      // Reforça os dois acessos padrão, inclusive se um cadastro antigo
      // tiver sido salvo no navegador com senha diferente.
      const defaults=[
        {id:'admin-marco',name:'Administrador',email:'admin@bvlanches.com',pass:'BV123456',role:'administrador'},
        {id:'user-demo',name:'Usuário',email:'cliente@bvlanches.com',pass:'BV123456',role:'usuario'}
      ];
      defaults.forEach(d=>{
        const i=list.findIndex(x=>String(x.email||'').trim().toLowerCase()===d.email);
        if(i<0) list.push({...d});
        else {
          list[i].id=list[i].id||d.id;
          list[i].name=list[i].name||d.name;
          list[i].pass=d.pass;
          list[i].role=list[i].role||d.role;
        }
      });
      localStorage.setItem('bv_users',JSON.stringify(list));

      localUser=list.find(x=>
        String(x.email||'').trim().toLowerCase()===email &&
        String(x.pass??'')===password
      );
    }catch(e){console.error('Erro lendo usuários locais:',e)}

    if(localUser){
      sessionStorage.setItem('bv_user_id',localUser.id||('local-'+Date.now()));
      sessionStorage.setItem('bv_role',localUser.role||'usuario');
      sessionStorage.setItem('bv','0');
      if($('login'))$('login').style.display='none';
      if(err)err.textContent='';
      applyAccess();
      const target=(localUser.role==='administrador'||localUser.role==='admin')?'dashboard':localUser.role==='motoboy'?'pedidos':'inicio';
      showPage(target);
      await syncAllData();startRealtime();
      toast('Login realizado com sucesso!');
      return;
    }

    // Se não houver usuário local, tenta a autenticação do Supabase.
    try{
      const {data,error}=await sb.auth.signInWithPassword({email,password});
      if(!error && data?.user){
        const p=await profile();
        session(data.user,p);
        await Promise.all([productsDB(),feesDB(),ordersDB()]);
        startRealtime();
        if($('login'))$('login').style.display='none';
        if(err)err.textContent='';
        applyAccess();
        showPage(p?.role==='administrador'?'dashboard':p?.role==='motoboy'?'pedidos':'inicio');
        toast('Login realizado com sucesso.');
        return;
      }
    }catch(e){console.error('Supabase login:',e)}

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
    const fee=Number($('feeCfg')?.value)||0;config.fee=fee;config.wa=$('waCfg')?.value||config.wa;
    const localFees=Object.entries(config.bairroFees||{}).map(([name,v])=>({name,fee:Number(v)||0,active:true}));
    if(localFees.length){const r=await sb.from('neighborhood_fees').upsert(localFees,{onConflict:'name'});if(r.error)return toast('Erro ao sincronizar bairros: '+r.error.message);}
    const sr=await sb.from('settings').upsert({id:1,fee,whatsapp:config.wa},{onConflict:'id'});
    if(sr.error)return toast('Bairros salvos, mas as configurações gerais não foram sincronizadas: '+sr.error.message);
    localStorage.bv_config=JSON.stringify(config);await Promise.all([settingsDB(),feesDB()]);toast('Configurações sincronizadas em todos os aparelhos.');
  }

  async function addFeeDB(){
    const name=($('bairroCfg')?.value||'').trim(),fee=Number($('bairroFeeCfg')?.value)||0;
    if(!name)return toast('Informe o bairro.');
    const {error}=await sb.from('neighborhood_fees').upsert({name,fee,active:true},{onConflict:'name'});
    if(error)return toast('Erro ao salvar bairro no servidor: '+error.message);
    config.bairroFees[String(name).toLowerCase()]=fee;localStorage.bv_config=JSON.stringify(config);
    $('bairroCfg').value='';$('bairroFeeCfg').value='';await feesDB();toast('Bairro sincronizado em todos os aparelhos.');
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

  function renderUserList(list,box,q=''){
    if(!box)return;
    const filtered=q?list.filter(u=>String(u.name||'').toLowerCase().includes(q)||String(u.email||'').toLowerCase().includes(q)):list;
    if($('userCount'))$('userCount').textContent=list.length+' usuário'+(list.length===1?'':'s');
    if(!filtered.length){
      box.innerHTML='<div class="emptyUsers"><b>Nenhum usuário cadastrado.</b><small>Cadastre uma conta para ela aparecer nesta lista.</small></div>';
      return;
    }
    box.innerHTML=filtered.map((u,i)=>{
      const role=u.role==='administrador'?'🔐 Administrador':u.role==='motoboy'?'🏍️ Motoboy':'👤 Usuário';
      const id=String(u.id||'').replace(/'/g,"\\'");
      return \`<div class="userPerm"><div class="userIndex">\${i+1}</div><div class="userIdentity"><b>\${String(u.name||'Sem nome').replace(/</g,'&lt;')}</b><small>\${String(u.email||'E-mail não disponível').replace(/</g,'&lt;')}</small><em>\${role}</em></div><select onchange="changeUserRole('\${id}',this.value)" \${u.id==='admin-marco'?'disabled':''}><option value="usuario" \${u.role==='usuario'?'selected':''}>👤 Usuário</option><option value="motoboy" \${u.role==='motoboy'?'selected':''}>🏍️ Motoboy</option><option value="administrador" \${u.role==='administrador'?'selected':''}>🔐 Administrador</option></select><button type="button" class="deleteUserBtn" onclick="deleteUser('\${id}')" \${u.id==='admin-marco'?'disabled':''}>🗑 Excluir</button></div>\`;
    }).join('');
  }

  async function createUserDB(){
    if(typeof admin==='function'&&!admin())return toast('Somente o administrador pode cadastrar usuários.');
    const name=$('newUserName')?.value.trim()||'',email=$('newUserEmail')?.value.trim().toLowerCase()||'',pass=$('newUserPass')?.value||'';
    if(!name||!email||!pass)return toast('Preencha nome, e-mail e senha.');
    if(pass.length<6)return toast('A senha deve ter pelo menos 6 caracteres.');
    let local=[];try{local=typeof window.users==='function'?window.users():JSON.parse(localStorage.getItem('bv_users')||'[]')}catch(e){local=[]}
    if(local.some(u=>String(u.email||'').toLowerCase()===email))return toast('Este e-mail já está cadastrado.');
    const {data:before}=await sb.auth.getSession();const original=before?.session||null;
    const {data,error}=await sb.auth.signUp({email,password:pass,options:{data:{name}}});
    if(error)return toast('Não foi possível cadastrar: '+error.message);
    if(!data?.user)return toast('Não foi possível criar a conta.');
    const id=data.user.id;
    const pr=await sb.from('profiles').upsert({id,name,role:'usuario'});
    if(pr.error)return toast('Conta criada, mas o perfil não foi salvo: '+pr.error.message);
    if(data.session&&original)await sb.auth.setSession({access_token:original.access_token,refresh_token:original.refresh_token});
    local.push({id,name,email,pass,role:'usuario',supabase:true});localStorage.setItem('bv_users',JSON.stringify(local));
    if($('newUserName'))$('newUserName').value='';if($('newUserEmail'))$('newUserEmail').value='';if($('newUserPass'))$('newUserPass').value='';
    await usersDB();toast('Usuário cadastrado e sincronizado em todos os aparelhos.');
  }

  async function syncLocalAccounts(){
    let local=[];try{local=typeof window.users==='function'?window.users():JSON.parse(localStorage.getItem('bv_users')||'[]')}catch(e){local=[]}
    if(!Array.isArray(local)||!local.length)return;
    const {data:current}=await sb.auth.getSession();const original=current?.session||null;
    let changed=false;
    for(const u of local){
      if(!u.email||!u.pass||u.id&&String(u.id).length===36)continue;
      const {data,error}=await sb.auth.signUp({email:u.email,password:u.pass,options:{data:{name:u.name||'Usuário'}}});
      if(!error&&data?.user){
        u.id=data.user.id;changed=true;
        await sb.from('profiles').upsert({id:data.user.id,name:u.name||'Usuário',role:u.role||'usuario'});
        if(data.session){
          if(original)await sb.auth.setSession({access_token:original.access_token,refresh_token:original.refresh_token});
          else await sb.auth.signOut();
        }
      }
    }
    if(changed)localStorage.setItem('bv_users',JSON.stringify(local));
  }

  async function syncLocalProducts(){
    let local=[];try{local=JSON.parse(localStorage.getItem('bv_products')||'[]')}catch(e){local=[]}
    if(!Array.isArray(local)||!local.length)return;
    const {data:remote,error}=await sb.from('products').select('id,name');
    if(error)return;
    const names=new Set((remote||[]).map(x=>String(x.name||'').trim().toLowerCase()));
    for(const p of local){
      const name=String(p.name||'').trim();
      if(!name||names.has(name.toLowerCase()))continue;
      const r=await sb.from('products').insert({name,price:Number(p.price)||0,category:p.category||'Lanches',description:p.desc||'',active:true});
      if(!r.error)names.add(name.toLowerCase());
    }
  }

  async function syncLocalOrders(){
    let local=[];try{local=JSON.parse(localStorage.getItem('bv_orders')||'[]')}catch(e){local=[]}
    if(!Array.isArray(local)||!local.length)return;
    let done=[];try{done=JSON.parse(localStorage.getItem('bv_synced_orders')||'[]')}catch(e){done=[]}
    if(!Array.isArray(done))done=[];
    const doneSet=new Set(done.map(String));
    for(const o of local){
      const legacyId=String(o.id||'');
      if(!legacyId||doneSet.has(legacyId))continue;
      const statusMap={'Aguardando pagamento':'recebido','Novo':'recebido','Confirmado':'recebido','Em preparo':'em_preparo','Pronto':'em_preparo','Saiu para entrega':'saiu_entrega','Entregue':'entregue','Cancelado':'cancelado'};
      const address=o.address&&typeof o.address==='object'?o.address:null;
      const ir=await sb.from('orders').insert({
        customer_name:o.customer||'Cliente',phone:o.phone||'',address:address?(address.rua||'')+(address.numero?', '+address.numero:''):'',
        neighborhood:address?.bairro||'',delivery_fee:address?Number(config?.bairroFees?.[String(address.bairro||'').toLowerCase()])||0:0,
        subtotal:Number(o.total)||0,total:Number(o.total)||0,payment_method:o.payment==='Pix'?'pix':o.payment==='Cartão'?'cartao':'dinheiro',
        payment_status:o.paid?'pago':'pendente',status:statusMap[o.status]||'recebido',notes:'Migração local '+legacyId
      }).select('id').single();
      if(ir.error){console.warn('Pedido local não sincronizado:',legacyId,ir.error.message);continue;}
      if(Array.isArray(o.cart)&&o.cart.length){
        const items=o.cart.map(x=>({order_id:ir.data.id,product_name:x.name,quantity:x.q,unit_price:Number(x.price)||0,total:(Number(x.price)||0)*x.q}));
        await sb.from('order_items').insert(items);
      }
      doneSet.add(legacyId);
    }
    localStorage.setItem('bv_synced_orders',JSON.stringify([...doneSet]));
  }

  async function syncAllData(){
    try{await syncLocalAccounts()}catch(e){console.warn('Contas:',e)}
    try{await syncLocalBairros()}catch(e){console.warn('Bairros:',e)}
    try{await settingsDB()}catch(e){console.warn('Configurações:',e)}
    try{await syncLocalProducts()}catch(e){console.warn('Produtos:',e)}
    try{await syncLocalOrders()}catch(e){console.warn('Pedidos:',e)}
    try{await Promise.all([productsDB(),feesDB(),ordersDB()])}catch(e){console.warn('Leitura Supabase:',e)}
  }

  async function syncLocalBairros(){
    const local=config?.bairroFees||{};const rows=Object.entries(local).map(([name,fee])=>({name,fee:Number(fee)||0,active:true}));
    if(!rows.length)return;
    const r=await sb.from('neighborhood_fees').upsert(rows,{onConflict:'name'});
    if(!r.error)await feesDB();
  }

  async function usersDB(){
    const box=$('userPermissions');if(!box)return;
    try{await syncLocalAccounts();await syncLocalBairros()}catch(e){console.warn('Sincronização inicial:',e)}
    const q=String($('userSearch')?.value||'').trim().toLowerCase();

    // Primeiro mostra imediatamente os usuários locais. Assim a tela nunca fica vazia
    // esperando uma resposta do Supabase.
    let localUsers=[];
    try{
      localUsers=typeof window.users==='function'?window.users():JSON.parse(localStorage.getItem('bv_users')||'[]');
    }catch(e){localUsers=[]}
    if(!Array.isArray(localUsers))localUsers=[];
    renderUserList(localUsers,box,q);

    // Depois tenta complementar a lista com os perfis do Supabase.
    try{
      const res=await sb.from('profiles').select('id,name,role,created_at').order('created_at',{ascending:false});
      if(res.error||!Array.isArray(res.data))return;
      const merged=[...res.data];
      localUsers.forEach(u=>{
        if(!merged.some(x=>String(x.id||'')===String(u.id||'') || (u.email&&x.email&&String(x.email).toLowerCase()===String(u.email).toLowerCase()))){
          merged.push(u);
        }
      });
      renderUserList(merged,box,q);
    }catch(e){
      console.warn('Usuários do Supabase indisponíveis; mantendo lista local.',e);
    }
  }
  window.deleteUser=async(id)=>{\n    const uid=String(id||'');\n    if(!uid)return toast('Usuário inválido.');\n    if(uid==='admin-marco')return toast('O administrador principal não pode ser excluído.');\n    const current=String(sessionStorage.getItem('bv_user_id')||'');\n    if(current===uid)return toast('Você não pode excluir a própria conta por aqui.');\n    let list=[];try{list=typeof window.users==='function'?window.users():JSON.parse(localStorage.getItem('bv_users')||'[]')}catch(e){list=[]}\n    const target=Array.isArray(list)?list.find(u=>String(u.id||'')===uid):null;\n    const label=target?.name||target?.email||'este usuário';\n    if(!confirm('Excluir '+label+'?\\n\\nEsta ação remove o cadastro do site e não pode ser desfeita.'))return;\n    localStorage.setItem('bv_users',JSON.stringify(Array.isArray(list)?list.filter(u=>String(u.id||'')!==uid):[]));\n    try{const res=await sb.from('profiles').delete().eq('id',uid);if(res.error&&!target)return toast('Não foi possível excluir o usuário.')}catch(e){console.warn('Exclusão no Supabase:',e)}\n    usersDB();toast('Usuário excluído.');\n  };\n  window.changeUserRole=async(id,role)=>{const {error}=await sb.from('profiles').update({role}).eq('id',id);if(error)return toast('Não foi possível alterar a permissão.');toast('Permissão atualizada.');usersDB()};
  window.login=login;window.registerUser=register;window.createUser=createUserDB;window.addProduct=addProductDB;window.saveCfg=saveCfgDB;window.addBairroFee=addFeeDB;window.finish=finishDB;window.statusOrder=statusDB;window.confirmPix=pixDB;window.renderUsers=usersDB;window.syncAllData=syncAllData;
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
