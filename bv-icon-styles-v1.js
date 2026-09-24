/* BV LANCHES — Seletor visual de 10 estilos para todos os ícones */
(function(){
  const STORAGE='bv_icon_style';
  const styles=[
    ['1','Original','Padrão'],
    ['2','Vermelho','Sólido'],
    ['3','Branco','Clean'],
    ['4','Vermelho Glass','Vitrificado'],
    ['5','Red Neon','Brilho'],
    ['6','Outline','Contorno'],
    ['7','3D Red','Profundidade'],
    ['8','Dark Glass','Grafite'],
    ['9','Red Circle','Circular'],
    ['10','Red Square','Quadrado']
  ];
  const icons=['🍔','🥤','🏍️','🛡️','📋','📦','🏷️','⚙','🛒','🔔','🚚','💳','💵','🔎','🏪','🔐','🎟','💰','🍴','😊','⌂','▦','↪'];
  function apply(n){n=String(n||'1');if(!styles.some(s=>s[0]===n))n='1';document.documentElement.dataset.bvIconStyle=n;try{localStorage.setItem(STORAGE,n)}catch(e){}document.querySelectorAll('.bvIconStyleOption').forEach(x=>x.classList.toggle('selected',x.dataset.style===n));}
  function open(){document.getElementById('bvIconStyleOverlay')?.classList.add('show')}
  function close(){document.getElementById('bvIconStyleOverlay')?.classList.remove('show')}
  function build(){
    if(document.getElementById('bvIconStyleLauncher'))return;
    let saved='1';try{saved=localStorage.getItem(STORAGE)||'1'}catch(e){}
    apply(saved);
    const launcher=document.createElement('button');launcher.id='bvIconStyleLauncher';launcher.type='button';launcher.textContent='🎨 Estilos de ícones';launcher.onclick=open;
    const overlay=document.createElement('div');overlay.id='bvIconStyleOverlay';overlay.innerHTML='<div id="bvIconStylePanel"><div class="bvIconStyleHead"><div><h3>Escolha o estilo dos ícones</h3><p>10 estilos × todos os ícones do BV Lanches. Clique em qualquer opção para aplicar ao site.</p></div><button class="bvIconStyleClose" type="button" aria-label="Fechar">×</button></div><div class="bvIconStyleGrid"></div><div class="bvIconStyleLegend">A escolha fica salva neste navegador. Nenhuma função, botão ou integração do sistema é alterada.</div></div>';
    document.body.appendChild(launcher);document.body.appendChild(overlay);
    overlay.querySelector('.bvIconStyleClose').onclick=close;overlay.addEventListener('click',e=>{if(e.target===overlay)close()});
    const grid=overlay.querySelector('.bvIconStyleGrid');
    const live=document.querySelectorAll('.bv-real-icon');const sampleByKey={};
    live.forEach(el=>{if(!sampleByKey[el.dataset.icon])sampleByKey[el.dataset.icon]=el.cloneNode(true)});
    icons.forEach(key=>{
      const row=document.createElement('div');row.className='bvIconStyleRow';
      const name=document.createElement('div');name.className='bvIconStyleName';name.innerHTML='<span>'+key+'</span><span><b>'+labelFor(key)+'</b><small>10 estilos</small></span>';row.appendChild(name);
      styles.forEach(s=>{
        const opt=document.createElement('button');opt.type='button';opt.className='bvIconStyleOption';opt.dataset.style=s[0];
        const preview=document.createElement('span');preview.className='bvIconStylePreview';
        const clone=sampleByKey[key]?sampleByKey[key].cloneNode(true):null;
        if(clone)preview.appendChild(clone);else preview.textContent=key;
        opt.appendChild(preview);const b=document.createElement('b');b.textContent=s[1];opt.appendChild(b);opt.title=s[1]+' — '+s[2];
        opt.onclick=()=>apply(s[0]);row.appendChild(opt);
      });grid.appendChild(row);
    });
    apply(saved);
  }
  function labelFor(k){const m={'🍔':'Hambúrguer','🥤':'Bebida','🏍️':'Motocicleta','🛡️':'Seguro','📋':'Pedido','📦':'Pacote','🏷️':'Etiqueta','⚙':'Configurações','🛒':'Carrinho','🔔':'Notificação','🚚':'Entrega','💳':'Cartão','💵':'Dinheiro','🔎':'Busca','🏪':'Loja','🔐':'Segurança','🎟':'Cupom','💰':'Pagamento','🍴':'Talheres','😊':'Satisfação','⌂':'Início','▦':'Menu','↪':'Sair'};return m[k]||k}
  function start(){build()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();