/* BV LANCHES - sincronização Supabase */
(function(){
  const cfg=window.BV_SUPABASE_CONFIG;
  if(!cfg||!cfg.url||!cfg.publishableKey)return;
  function load(){
    if(window.supabase){window.BV_DB=window.supabase.createClient(cfg.url,cfg.publishableKey);init();return;}
    const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=function(){window.BV_DB=window.supabase.createClient(cfg.url,cfg.publishableKey);init()};s.onerror=function(){console.error('Não foi possível carregar o Supabase')};document.head.appendChild(s);
  }
  async function init(){
    const db=window.BV_DB;
    try{
      const {data:{session}}=await db.auth.getSession();
      if(session){await applySession(session)}
      db.auth.onAuthStateChange(async function(_event,session){if(session)await applySession(session);else{sessionStorage.removeItem('bv_user_id');sessionStorage.removeItem('bv_role');sessionStorage.removeItem('bv')}});
    }catch(e){console.error('Supabase Auth:',e)}
    window.BV_DB_READY=true;
    window.dispatchEvent(new Event('bv-supabase-ready'));
  }
  async function applySession(session){
    const id=session.user.id;let {data:p}=await window.BV_DB.from('profiles').select('id,name,role').eq('id',id).maybeSingle();
    if(!p){await window.BV_DB.from('profiles').insert({id,name:session.user.user_metadata?.name||'',role:'usuario'});p={id,name:session.user.user_metadata?.name||'',role:'usuario'}}
    sessionStorage.setItem('bv_user_id',id);sessionStorage.setItem('bv_role',p.role||'usuario');sessionStorage.setItem('bv',p.role==='administrador'?'1':'0');
    if(typeof applyAccess==='function')applyAccess();
  }
  async function registerSupabase(name,email,password){
    const {data,error}=await window.BV_DB.auth.signUp({email,password,options:{data:{name}}});
    if(error)throw error;return data;
  }
  async function loginSupabase(email,password){
    const {data,error}=await window.BV_DB.auth.signInWithPassword({email,password});if(error)throw error;return data;
  }
  window.BV_registerSupabase=registerSupabase;window.BV_loginSupabase=loginSupabase;
  window.BV_logoutSupabase=async function(){if(window.BV_DB)await window.BV_DB.auth.signOut()};
  window.BV_loadProducts=async function(){const {data,error}=await window.BV_DB.from('products').select('*').order('created_at',{ascending:true});if(error)throw error;return (data||[]).map(p=>({id:p.id,name:p.name,price:Number(p.price),desc:p.description,category:p.category,emoji:'🍔',active:p.active}))};
  window.BV_saveProduct=async function(p){const row={name:p.name,description:p.desc||p.description||'',price:Number(p.price)||0,category:p.category||'Lanches',active:p.active!==false};const q=p.id?window.BV_DB.from('products').update(row).eq('id',p.id):window.BV_DB.from('products').insert(row);const {data,error}=await q.select().single();if(error)throw error;return data};
  window.BV_deleteProduct=async function(id){const {error}=await window.BV_DB.from('products').delete().eq('id',id);if(error)throw error};
  window.BV_loadFees=async function(){const {data,error}=await window.BV_DB.from('neighborhood_fees').select('*').eq('active',true).order('name');if(error)throw error;return data||[]};
  window.BV_saveFee=async function(name,fee){const {data,error}=await window.BV_DB.from('neighborhood_fees').upsert({name,fee:Number(fee)||0,active:true},{onConflict:'name'}).select().single();if(error)throw error;return data};
  window.BV_deleteFee=async function(id){const {error}=await window.BV_DB.from('neighborhood_fees').delete().eq('id',id);if(error)throw error};
  window.BV_loadUsers=async function(){const {data,error}=await window.BV_DB.from('profiles').select('id,name,role,created_at').order('created_at',{ascending:false});if(error)throw error;return data||[]};
  window.BV_setRole=async function(id,role){const {data,error}=await window.BV_DB.from('profiles').update({role}).eq('id',id).select().single();if(error)throw error;return data};
  window.BV_createOrder=async function(o){const uid=sessionStorage.getItem('bv_user_id');if(!uid)throw new Error('Faça login para criar o pedido.');const {data,error}=await window.BV_DB.from('orders').insert({user_id:uid,customer_name:o.customer,phone:o.phone||'',address:o.address?`${o.address.rua}, ${o.address.numero}`:'',neighborhood:o.address?.bairro||'',delivery_fee:o.deliveryFee||0,subtotal:o.subtotal||o.total||0,total:o.total||0,payment_method:(o.payment||'Pix').toLowerCase()==='pix'?'pix':(o.payment||'').toLowerCase()==='dinheiro'?'dinheiro':'cartao',payment_status:o.paid?'pago':'pendente',status:o.status==='Aguardando pagamento'?'recebido':'recebido',notes:o.items||''}).select().single();if(error)throw error;return data};
  window.BV_loadOrders=async function(){const {data,error}=await window.BV_DB.from('orders').select('*').order('created_at',{ascending:false});if(error)throw error;return data||[]};
  window.BV_updateOrder=async function(id,status,paymentStatus){const patch={};if(status)patch.status=status;if(paymentStatus)patch.payment_status=paymentStatus;const {data,error}=await window.BV_DB.from('orders').update(patch).eq('id',id).select().single();if(error)throw error;return data};
  load();
})();
