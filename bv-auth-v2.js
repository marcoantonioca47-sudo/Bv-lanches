/* BV LANCHES — autenticação definitiva v2 */
(() => {
  const $ = id => document.getElementById(id);
  const URL = 'https://eaqngkiegrkmhopaztgz.supabase.co';
  const KEY = 'sb_publishable_QOlPlN2yFxLxGsHvUpZebg_MIty1Xbh';

  let client;
  try {
    client = window.supabase?.createClient(URL, KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    window.BV_SUPABASE = client;
  } catch (e) {
    console.error('[BV AUTH] client error', e);
  }

  const errorText = e => {
    const m = String(e?.message || e || 'Erro de autenticação.');
    if (/invalid login credentials/i.test(m)) return 'E-mail ou senha incorretos.';
    if (/email not confirmed/i.test(m)) return 'Confirme o e-mail da conta antes de entrar.';
    if (/too many requests/i.test(m)) return 'Muitas tentativas. Aguarde alguns minutos.';
    if (/failed to fetch|network/i.test(m)) return 'Sem conexão com o servidor. Verifique sua internet.';
    return m;
  };

  window.BV_LOGIN = async (email, password) => {
    if (!client) return { error: 'Supabase não carregou. Recarregue a página.' };
    email = String(email || '').trim().toLowerCase();
    password = String(password || '');
    if (!email || !password) return { error: 'Informe e-mail e senha.' };

    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) return { error: errorText(error) };
    if (!data?.user) return { error: 'O servidor não retornou o usuário.' };

    const { data: profile, error: profileError } = await client
      .from('profiles')
      .select('id,name,role')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) return { error: 'Login realizado, mas não foi possível carregar seu perfil: ' + profileError.message };
    if (!profile) return { error: 'Sua conta existe, mas não possui um perfil cadastrado.' };

    window.BV_ROLE = profile.role || 'usuario';
    window.BV_USER_NAME = profile.name || data.user.email || '';
    window.applyAccess?.();
    $('login')?.style.setProperty('display','none','important');

    try {
      await window.loadApp?.();
    } catch (e) {
      console.error('[BV AUTH] loadApp', e);
    }
    return {};
  };

  window.login = async () => {
    const err = $('err');
    if (err) err.textContent = '';
    const button = document.querySelector('#login button:not(.registerLoginBtn)');
    const old = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Entrando...'; }

    try {
      const r = await window.BV_LOGIN($('email')?.value, $('pass')?.value);
      if (r?.error) {
        if (err) err.textContent = r.error;
        return;
      }
      if (err) err.textContent = '';
      $('login')?.style.setProperty('display','none','important');
    } catch (e) {
      console.error('[BV AUTH] login', e);
      if (err) err.textContent = errorText(e);
    } finally {
      if (button) { button.disabled = false; button.textContent = old || 'Entrar'; }
    }
  };

  window.logout = async () => {
    try { await client?.auth.signOut(); } catch(e) { console.error(e); }
    window.BV_ROLE = '';
    window.BV_USER_NAME = '';
    window.applyAccess?.();
    $('login')?.style.setProperty('display','flex','important');
    window.showPage?.('inicio');
  };

  window.BV_REGISTER = async (name,email,password) => {
    if (!client) return { error:'Supabase não carregou.' };
    const { data, error } = await client.auth.signUp({
      email: String(email||'').trim().toLowerCase(),
      password: String(password||''),
      options: { data: { name: String(name||'').trim() } }
    });
    if (error) return { error:errorText(error) };
    if (!data?.user) return { error:'Não foi possível criar a conta.' };
    const p = await client.from('profiles').upsert({
      id:data.user.id, name:String(name||'').trim(), role:'usuario'
    }, {onConflict:'id'});
    if (p.error) return { error:p.error.message };
    return {};
  };

  window.resetBVPassword = async () => {
    const email = String($('email')?.value || '').trim().toLowerCase();
    if (!email) return window.toast?.('Digite seu e-mail primeiro.');
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) return window.toast?.(errorText(error));
    window.toast?.('Link de recuperação enviado para o e-mail.');
  };

  document.addEventListener('DOMContentLoaded', async () => {
    if (!client) return;
    const { data } = await client.auth.getSession();
    if (data?.session) {
      try {
        const p = await client.from('profiles').select('name,role').eq('id',data.session.user.id).maybeSingle();
        if (p.data) {
          window.BV_ROLE = p.data.role || 'usuario';
          window.BV_USER_NAME = p.data.name || data.session.user.email || '';
          window.applyAccess?.();
          $('login')?.style.setProperty('display','none','important');
          await window.loadApp?.();
        }
      } catch(e) { console.error('[BV AUTH] restore',e); }
    }
  });
})();