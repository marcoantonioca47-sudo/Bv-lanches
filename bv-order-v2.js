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

  window.BV_ORDER_V2 = '2026.09.25.283';

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
        const productId = String(item.productId || String(item.id).split('::')[0]);
        let p = products.find(x => String(x.id) === productId);
        if(!p) p = products.find(x => norm(x.name) === norm(item.name));
        if(!p) throw new Error('O produto "' + String(item.name || item.id) + '" não está mais disponível.');
        return {
          product_id: String(p.id),
          quantity,
          ...(item.flavor ? { flavor: String(item.flavor) } : {})
        };
      });

      // A seleção visível na tela é a fonte oficial. O localStorage serve apenas como fallback.
      const activePay = document.querySelector('#page-pedido .pay button.active');
      const activeText = String(activePay?.textContent || '').toLowerCase();
      const selectedPay = String(window.BV_PAYMENT || '').toLowerCase();
      const storedPay = String(localStorage.getItem('bv_payment') || '').toLowerCase();
      // A seleção atual da tela tem prioridade absoluta. window.BV_PAYMENT é
      // atualizado pelo botão e fica como segunda fonte; localStorage só é fallback.
      let payment =
        selectedPay.includes('dinheiro') ? 'dinheiro' :
        selectedPay.includes('cart') ? 'cartao' :
        selectedPay.includes('pix') ? 'pix' :
        activeText.includes('dinheiro') ? 'dinheiro' :
        activeText.includes('cart') ? 'cartao' :
        activeText.includes('pix') ? 'pix' :
        storedPay.includes('dinheiro') ? 'dinheiro' :
        storedPay.includes('cart') ? 'cartao' : 'pix';
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

      // Persiste a opção de sabor escolhida para que administrador e motoboy
      // recebam o mesmo nome exibido ao cliente (ex.: Refri 2L — Guaraná).
      const variants = cart
        .filter(item => item?.flavor && !item?.isPromotion)
        .map(item => ({
          product_id: String(item.productId || String(item.id).split('::')[0]),
          flavor: String(item.flavor)
        }));
      if(variants.length && typeof sb.rpc === 'function'){
        const vr = await sb.rpc('set_bv_order_item_variants', {
          p_order_id: orderId,
          p_variants: variants
        });
        if(vr.error) console.warn('[BV ORDER V2] Não foi possível gravar o sabor:', vr.error);
      }

      localStorage.setItem('bv_last_order', JSON.stringify({id:orderId,phone}));
      localStorage.setItem('bv_track_id', orderId);
      localStorage.setItem('bv_cart','[]');
      window.cart = [];

      if(payment==='pix'){
        let pixData=null, pixError=null;
        try{
          if(typeof sb.functions?.invoke==='function'){
            const pix=await sb.functions.invoke('criar-pix',{body:{order_id:orderId}});
            if(!pix.error && !pix.data?.error) pixData=pix.data||null;
            else pixError=pix.error?.message||pix.data?.error||'Falha ao chamar a função PIX.';
          }
        }catch(e){pixError=e?.message||'Falha ao chamar a função PIX.'}
        if(!pixData){
          try{
            const {data:sessionData}=await sb.auth.getSession();
            const token=sessionData?.session?.access_token;
            const key=window.BV_SUPABASE_CONFIG?.publishableKey;
            const base=window.BV_SUPABASE_CONFIG?.url;
            if(!token||!key||!base)throw new Error(pixError||'Sessão do cliente indisponível para gerar o PIX.');
            const resp=await fetch(base+'/functions/v1/criar-pix',{
              method:'POST',
              headers:{'Authorization':'Bearer '+token,'apikey':key,'Content-Type':'application/json'},
              body:JSON.stringify({order_id:orderId})
            });
            const raw=await resp.text();let body={};try{body=raw?JSON.parse(raw):{}}catch{}
            if(!resp.ok||body.error)throw new Error(body.error||('Erro HTTP '+resp.status+' ao gerar PIX.'));
            pixData=body;
          }catch(e){pixError=e?.message||pixError||'Não foi possível gerar o PIX.'}
        }
        if(!pixData){
          console.warn('[BV ORDER V2] PIX não gerado',pixError);
          window.BV_LAST_PIX_ERROR=pixError||'Não foi possível gerar o PIX.';
        }else{
          window.BV_LAST_PIX=pixData;window.BV_LAST_PIX_ERROR='';
          const current=(window.orders||[]).find(o=>String(o.id)===String(orderId));
          if(current){
            current.payment='Pix';current.paymentStatus='pendente';
            current.pixPaymentId=pixData.mercado_pago_order_id||pixData.pix_payment_id||null;
            current.pixQrCode=pixData.qr_code||'';current.pixQrCodeBase64=pixData.qr_code_base64||'';
            current.pixExpiresAt=pixData.expires_at||null;
          }
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
        if(window.BV_LAST_PIX_ERROR){
          window.bvModal?.({
            type:'info',icon:'PIX',kicker:'PEDIDO CRIADO',
            title:'Pedido enviado',
            message:'Pedido <strong>#'+String(created?.orderNumber || '').padStart(3,'0')+'</strong> foi criado. O código PIX ainda não pôde ser gerado. Você pode tentar novamente pelo acompanhamento.',
            button:'Entendi'
          }) || msg('Pedido #' + String(created?.orderNumber || '').padStart(3,'0') + ' criado, mas o PIX ainda não pôde ser gerado.');
        }
      }else{
        window.bvModal?.({
          type:'success',icon:'✓',kicker:'BV LANCHES',
          title:'Pedido enviado!',
          message:'Seu pedido <strong>#'+String(created?.orderNumber || '').padStart(3,'0')+'</strong> foi enviado com sucesso. Agora você pode acompanhar o preparo e a entrega em tempo real.',
          button:'Acompanhar pedido'
        },()=>window.showPage?.('acompanhar')) || msg('Pedido #' + String(created?.orderNumber || '').padStart(3,'0') + ' enviado com sucesso!');
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
