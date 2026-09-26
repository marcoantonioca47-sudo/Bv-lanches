/* BV LANCHES — atualização instantânea de status dos pedidos
   Supabase Realtime + fallback de segurança a cada 10 segundos. Não substitui as rotinas existentes:
   apenas força a atualização das telas quando a tabela orders muda.
*/
(() => {
  'use strict';

  let channel = null;
  let fallbackTimer = null;
  let lastRefresh = 0;
  let refreshPending = false;

  const sb = () => window.BV_SUPABASE;

  async function refreshNow(reason) {
    const fn = window.BV_REFRESH_ORDERS;
    if (typeof fn !== 'function') return;
    const now = Date.now();
    if (now - lastRefresh < 1200) return;
    if (refreshPending) return;

    refreshPending = true;
    lastRefresh = now;
    try {
      await fn();
      window.renderMotoOrders?.({silent:true});
      // Só atualiza a tela de taxas se ela estiver aberta, e sem apagar o conteúdo atual.
      if (document.getElementById('page-taxa-entrega')?.classList.contains('activePage')) {
        window.renderMotoFeeOrders?.({silent:true});
      }
      window.renderDashboard?.();
      // BV_REFRESH_ORDERS já atualiza a tela de acompanhamento somente quando
      // o conteúdo mudou. Não redesenhar aqui para evitar oscilação.
    } catch (e) {
      console.warn('[BV REALTIME] atualização:', reason, e);
    } finally {
      refreshPending = false;
    }
  }

  function startRealtime() {
    const client = sb();
    if (!client || channel) return;

    channel = client
      .channel('bv-orders-status-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        payload => {
          console.log('[BV REALTIME] pedido atualizado:', payload.eventType, payload.new?.id || payload.old?.id);
          refreshNow('realtime');
        }
      )
      .subscribe(status => {
        console.log('[BV REALTIME] canal:', status);
      });

    // Reserva de segurança caso o Realtime fique indisponível no navegador.
    clearInterval(fallbackTimer);
    fallbackTimer = setInterval(() => {
      if (document.visibilityState === 'visible') refreshNow('fallback');
    }, 30000);
  }

  function boot() {
    if (window.BV_SUPABASE) {
      startRealtime();
      return;
    }
    setTimeout(boot, 500);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && Date.now() - lastRefresh > 3000) refreshNow('visibility');
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }

  window.BV_REALTIME_VERSION = '2026.09.26.505';
})();
