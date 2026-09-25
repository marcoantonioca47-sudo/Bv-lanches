/* BV LANCHES — checkout definitivo v2
   Única rotina de criação de pedidos. Mantém o Supabase como fonte oficial. */
(() => {
  const $ = id => document.getElementById(id);
  const money = v => Number(v || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const norm = v => String(v ?? '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');

  function getSB(){
    if(window.BV_SUPABASE) return window.BV_SUPABASE;
    if(window.supabase && window.BV_SUPABASE_CONFIG){
      window.BV_SUPABASE = window.supabase.createClient(
        window.BV_SUPABASE_CONFIG.url,
        window.BV_SUPABASE_CONFIG.publishableKey
      );
      return window.BV_SUPABASE;
    }
    return null;
  }
  function msg(text){
    if(typeof window.toast === 'function') window.toast(text);
    else alert(text);
  }

  window.BV_ORDER_V2 = '2026.09.25.148';

  window.finish = async function(){
    const sb = getSB();
    const btn = document.querySelector('#page-pedido button.whats');
    if(!sb){ msg('Banco de dados indisponível.'); return; }

    const oldText = btn?.textContent;
    if(btn){ btn.disabled = true; btn.textContent = '⏳ Enviando pedido...'; }

    try {
      const {data:auth,error:authError} = await sb.auth.getUser();
      const user = auth?.user;
      if(authError || !user) throw new Error('Faça login para finalizar o pedido.');

      const cart = Array.isArray(window.cart) ? window.cart : [];
      if(!cart.length) throw new Error('Seu carrinho está vazio.');

      const delivery = window.BV_MODE !== 'retirada' && ($('address')?.style.display || 'block') !== 'none';
      const name = String($('name')?.value || '').trim();
      const phone = String($('phone')?.value || '').trim();
      const street = String($('street')?.value || '').trim();
      const num = String($('num')?.value || '').trim();
      const bairro = String($('bairro')?.value || '').trim();
      const comp = String($('comp')?.value || '').trim();

      if(!name) throw new Error('Informe seu nome.');
      if(!phone) throw new Error('Informe seu WhatsApp.');
      if(delivery && (!street || !num || !bairro)){
        throw new Error('Preencha rua, número e bairro.');
      }

      // Sempre consulta o catálogo atual antes de criar o pedido.
      // Isso elimina IDs antigos/locais guardados no navegador.
      const {data:catalog,error:catalogError} = await sb
        .from('products')
        .select('id,name,price,active')
        .eq('active',true);

      if(catalogError) throw new Error('Não foi possível consultar o cardápio: ' + catalogError.message);
      const products = Array.isArray(catalog) ? catalog : [];

      const items = cart.map(item => {
        const quantity = Math.max(1, Math.floor(Number(item.q) || 0));
        if(item.isPromotion && item.promotionId){
          return { promotion_id: String(item.promotionId), quantity };
        }
        let p = products.find(x => String(x.id) === String(item.id));
        if(!p) p = products.find(x => norm(x.name) === norm(item.name));
        if(!p) throw new Error('O produto "' + String(item.name || item.id) + '" não está mais disponível.');
        return { product_id: String(p.id), quantity };
      });

      // A seleção visível na tela é a fonte oficial. O localStorage serve apenas como fallback.
      const activePay = document.querySelector('#page-pedido .pay button.active');
      const activeText = String(activePay?.textContent || '').toLowerCase();
      const storedPay = String(localStorage.getItem('bv_payment') || '').toLowerCase();
      let payment = activeText.includes('dinheiro') ? 'dinheiro' : activeText.includes('cart') ? 'cartao' : activeText.includes('pix') ? 'pix' :
        (storedPay.includes('dinheiro') ? 'dinheiro' : storedPay.includes('cart') ? 'cartao' : 'pix');
      const paymentLabel = payment === 'dinheiro' ? 'Dinheiro' : payment === 'cartao' ? 'Cartão' : 'Pix';
      localStorage.setItem('bv_payment', paymentLabel);
      const address = delivery
        ? street + ', ' + num + (comp ? ' — ' + comp : '')
        : '';

      const payload = {
        p_customer_name: name,
        p_phone: phone,
        p_address: address,
        p_neighborhood: delivery ? bairro : '',
        p_payment_method: payment,
        p_coupon: String($('coupon')?.value || '').trim().toUpperCase(),
        p_items: items
      };

      const {data:orderId,error:rpcError} = await sb.rpc('create_bv_order', payload);
      if(rpcError) {
        console.error('[BV ORDER V2] RPC error', rpcError, payload);
        const detail = [rpcError.message,rpcError.details,rpcError.hint].filter(Boolean).join(' — ');
        throw new Error(detail || 'O servidor recusou a criação do pedido.');
      }
      if(!orderId) throw new Error('O servidor não retornou o ID do pedido.');

      localStorage.setItem('bv_last_order', JSON.stringify({id:orderId,phone}));
      localStorage.setItem('bv_track_id', orderId);
      localStorage.setItem('bv_cart','[]');
      window.cart = [];

      if(payment==='pix' && typeof sb.functions?.invoke==='function'){
        // O pedido já foi criado. Se a geração do PIX falhar, não transforme
        // isso em "falha ao finalizar": o pedido continua existente e pode ser
        // consultado pelo cliente/admin sem risco de criar duplicata ao tentar de novo.
        const pix = await sb.functions.invoke('criar-pix',{body:{order_id:orderId}});
        if(pix.error || pix.data?.error){
          console.warn('[BV ORDER V2] PIX não gerado após criação do pedido',pix.error||pix.data?.error);
          window.BV_LAST_PIX_ERROR = pix.error?.message || pix.data?.error || 'Não foi possível gerar o PIX.';
        }else{
          window.BV_LAST_PIX = pix.data || null;
          window.BV_LAST_PIX_ERROR = '';
        }
      }

      if(typeof window.BV_REFRESH_ORDERS === 'function'){
        await window.BV_REFRESH_ORDERS();
      }

      if(typeof window.showPage === 'function') window.showPage('acompanhar');
      if(typeof window.renderTracking === 'function'){
        const found = (window.orders || []).find(o => String(o.id) === String(orderId));
        window.renderTracking(found);
      }

      const created=(window.orders || []).find(o=>String(o.id)===String(orderId));
      if(payment==='pix'){
        const pixMsg = window.BV_LAST_PIX_ERROR
          ? ' Pedido criado, mas o PIX não pôde ser gerado agora. Consulte o pedido e tente gerar o PIX novamente.'
          : ' Aguardando confirmação do PIX.';
        msg('Pedido #' + String(created?.orderNumber || '').padStart(3,'0') + ' criado.' + pixMsg);
      }else{
        msg('Pedido #' + String(created?.orderNumber || '').padStart(3,'0') + ' enviado com sucesso!');
      }
    } catch(e) {
      console.error('[BV ORDER V2] Falha ao finalizar',e);
      msg('Não foi possível finalizar: ' + String(e?.message || 'erro desconhecido').slice(0,220));
    } finally {
      if(btn){ btn.disabled = false; btn.textContent = oldText || '✅ Finalizar pedido'; }
      if(typeof window.renderCart === 'function') window.renderCart();
    }
  };
})();
