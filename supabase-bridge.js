/* BV LANCHES - integração Supabase (carregado depois do app.js) */
(function(){
  if(!window.supabase || !window.BV_SUPABASE_CONFIG) return;
  const sb=window.supabase.createClient(BV_SUPABASE_CONFIG.url,BV_SUPABASE_CONFIG.publishableKey);
  window.BV_SUPABASE=sb;
  const oldLogin=window.login;
  const oldRegister=window.registerUser;
  async function loginSupabase(){
    const email=(document.getElementById('email')?.value||'').trim().toLowerCase();
    const password=document.getElementById('pass')?.value||'';
    const err=document.getElementById('err');
    if(!email||!password){if(err)err.textContent='Informe e-mail e senha.';return;}
    const {data,error}=await sb.auth.signInWithPassword({email,password});
    if(error){
      // Mantém compatibilidade temporária com o administrador/demo local.
      if(typeof oldLogin==='function') return oldLogin();
      if(err)err.textContent='E-mail ou senha incorretos.';return;
    }
    const uid=data.user.id;
    const {data:profile}=await sb.from('profiles').select('name,role').eq('id',uid).maybeSingle();
    const r=profile?.role||'usuario';
    sessionStorage.setItem('bv_user_id',uid);sessionStorage.setItem('bv_role',r);sessionStorage.setItem('bv','0');
    if(document.getElementById('login'))document.getElementById('login').style.display='none';
    if(typeof applyAccess==='function')applyAccess();
    if(typeof showPage==='function')showPage(r==='administrador'?'dashboard':r==='motoboy'?'pedidos':'inicio');
    if(typeof toast==='function')toast('Login realizado com sucesso.');
  }
  async function registerSupabase(e){
    if(e)e.preventDefault();
    const name=(document.getElementById('registerName')?.value||'').trim();
    const email=(document.getElementById('registerEmail')?.value||'').trim().toLowerCase();
    const password=document.getElementById('registerPass')?.value||'';
    const password2=document.getElementById('registerPass2')?.value||'';
    const err=document.getElementById('registerErr');if(err)err.textContent='';
    if(!name||!email||!password||!password2){if(err)err.textContent='Preencha todos os campos.';return false;}
    if(password.length<6){if(err)err.textContent='A senha deve ter pelo menos 6 caracteres.';return false;}
    if(password!==password2){if(err)err.textContent='As senhas não coincidem.';return false;}
    const {data,error}=await sb.auth.signUp({email,password,options:{data:{name}}});
    if(error){if(err)err.textContent=error.message.includes('already registered')?'Este e-mail já está cadastrado.':error.message;return false;}
    // Se confirmação de e-mail estiver desligada, a sessão já fica disponível.
    document.getElementById('registerName').value='';document.getElementById('registerEmail').value='';document.getElementById('registerPass').value='';document.getElementById('registerPass2').value='';
    if(typeof closeRegister==='function')closeRegister();
    const loginEmail=document.getElementById('email');if(loginEmail)loginEmail.value=email;
    const pass=document.getElementById('pass');if(pass)pass.value='';
    if(document.getElementById('err'))document.getElementById('err').textContent=data.session?'Conta criada! Você já pode entrar.':'Conta criada! Verifique seu e-mail para confirmar o cadastro.';
    if(typeof toast==='function')toast('Cadastro salvo no Supabase.');
    return false;
  }
  window.login=loginSupabase;
  window.registerUser=registerSupabase;
  // Reidrata a sessão do Supabase ao recarregar o site.
  sb.auth.getSession().then(async ({data})=>{
    const session=data.session;if(!session)return;
    const {data:profile}=await sb.from('profiles').select('name,role').eq('id',session.user.id).maybeSingle();
    const r=profile?.role||'usuario';
    sessionStorage.setItem('bv_user_id',session.user.id);sessionStorage.setItem('bv_role',r);sessionStorage.setItem('bv','0');
    if(document.getElementById('login'))document.getElementById('login').style.display='none';
    if(typeof applyAccess==='function')applyAccess();
    if(typeof showPage==='function')showPage(r==='administrador'?'dashboard':r==='motoboy'?'pedidos':'inicio');
  });
  // Logout encerra também a sessão online.
  const oldLogout=window.logout;
  window.logout=async function(){try{await sb.auth.signOut()}catch(e){}if(typeof oldLogout==='function')oldLogout();};
})();
