/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · componentes.js
   Construção de DOM e componentes de interface reutilizáveis.

   Sem framework, sem template literal gigante: as telas são montadas com
   `h()` e `frag()`. Isso mantém o código legível e, principalmente, impede o
   defeito clássico de HTML montado por concatenação — texto de cliente
   entrando como marcação.

   Todo texto vindo de dado passa por `h()` (que usa textContent) ou por
   `escapar()`. Nunca por innerHTML direto.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var I = window.Icone;

  /* =======================================================================
     1. CONSTRUÇÃO DE DOM
     ======================================================================= */

  /* h('div.classe', {attrs}, filhos...) */
  function h(sel, attrs) {
    var filhos = Array.prototype.slice.call(arguments, 2);
    if (attrs && (attrs.nodeType || typeof attrs === 'string' || Array.isArray(attrs))) {
      filhos.unshift(attrs);
      attrs = null;
    }
    /* Aceita "div", "div.classe", "div#id" e "div#id.classe". Sem tratar o
       "#", o trecho vira nome de classe e o navegador lança
       InvalidCharacterError ao criar o elemento. */
    var seletor = String(sel);
    var id = null;
    var corte = seletor.indexOf('#');
    if (corte !== -1) {
      var depois = seletor.slice(corte + 1);
      var fimId = depois.search(/[.#]/);
      id = fimId === -1 ? depois : depois.slice(0, fimId);
      seletor = seletor.slice(0, corte) + (fimId === -1 ? '' : depois.slice(fimId));
    }
    var partes = seletor.split('.');
    var el = document.createElement(partes[0] || 'div');
    if (id) el.id = id;
    for (var i = 1; i < partes.length; i += 1) {
      if (partes[i]) el.classList.add(partes[i]);
    }
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'texto') { el.textContent = String(v); return; }
        if (k === 'html') { el.innerHTML = v; return; }   // só para SVG nosso
        if (k === 'classe') { el.className += (el.className ? ' ' : '') + v; return; }
        if (k === 'estilo') {
          if (typeof v === 'string') el.style.cssText = v;
          else Object.keys(v).forEach(function (p) { el.style.setProperty(p, v[p]); });
          return;
        }
        if (k === 'dados') {
          Object.keys(v).forEach(function (p) { el.dataset[p] = v[p]; });
          return;
        }
        if (k === 'ao') {
          Object.keys(v).forEach(function (ev) { el.addEventListener(ev, v[ev]); });
          return;
        }
        if (v === true) { el.setAttribute(k, ''); return; }
        el.setAttribute(k, String(v));
      });
    }
    juntar(el, filhos);
    return el;
  }

  function juntar(el, filhos) {
    filhos.forEach(function (f) {
      if (f === null || f === undefined || f === false || f === true) return;
      if (Array.isArray(f)) { juntar(el, f); return; }
      el.appendChild(f.nodeType ? f : document.createTextNode(String(f)));
    });
  }

  function frag() {
    var f = document.createDocumentFragment();
    juntar(f, Array.prototype.slice.call(arguments));
    return f;
  }

  function limpar(el) { while (el && el.firstChild) el.removeChild(el.firstChild); return el; }

  function escapar(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* Ícone como elemento, não string — evita innerHTML para desenhar. */
  function icone(nome, classe) {
    var span = document.createElement('span');
    span.className = 'ic' + (classe ? ' ' + classe : '');
    span.innerHTML = I.d(nome);   // conteúdo fixo, nosso, sem dado de usuário
    span.style.display = 'contents';
    return span.firstChild ? span.firstChild : span;
  }
  /* Um nome de ícone que não existe devolve SVG vazio, e o `<div>` fica sem
     filho. Devolver esse `null` para quem chama derrubava a tela inteira no
     `appendChild` — um erro de digitação em UM ícone apagava uma aba
     completa. O erro fica do tamanho dele: sem ícone, tela de pé.

     Mas um ícone que some em silêncio também é um defeito que ninguém acha
     depois. Por isso o nome errado é REGISTRADO em `Icone.faltando`, e a
     bancada cobra que essa lista esteja vazia. Some do desenho, nunca da
     conta. */
  function svgIcone(nome, tamanho) {
    var d = document.createElement('div');
    d.innerHTML = I.d(nome, tamanho);
    if (!d.firstChild && I.faltando.indexOf(nome) === -1) I.faltando.push(nome);
    return d.firstChild || document.createElement('span');
  }

  /* =======================================================================
     2. PEÇAS DE CONTEÚDO
     ======================================================================= */

  /* A classe sai do MESMO id que entra. Antes ela era remontada a partir do
     registro (`e.id`) — que não existia — e o resultado era
     "selo--undefined": texto certo, cor nenhuma. Passou despercebido porque
     o defeito não quebra, só não pinta; e nenhuma bancada olhava classe
     composta. Agora o id vem do próprio argumento e a conta não depende de
     o lookup ter ou não o campo. */
  function selo(statusId) {
    var e = N.estado(statusId);
    return h('span.selo.selo--' + statusId, { texto: e.nome });
  }

  function origem(origemId) {
    var o = N.origem(origemId);
    var e = h('span.origem.origem--' + origemId, { title: o.longa || o.nome });
    e.appendChild(svgIcone(origemId === 'site' ? 'globo' : 'editar'));
    e.appendChild(document.createTextNode(o.nome));
    return e;
  }

  function avatar(cliente, tamanho) {
    var nome = typeof cliente === 'string' ? cliente : N.nomeCliente(cliente);
    return h('span.avatar' + (tamanho ? '.avatar--' + tamanho : ''), {
      dados: { matiz: String(N.matizDe(nome)) },
      'aria-hidden': 'true',
      texto: N.iniciais(nome)
    });
  }

  function rotulo(texto) { return h('span.rotulo', { texto: texto }); }

  /* =======================================================================
     2b. ESTADO TEMPORAL — o cronômetro, desenhado
     A conta NÃO mora aqui: vem inteira de N.estadoTemporal. Este componente
     só veste o resultado, para todos os lugares que mostram "faltam X min"
     dizerem a mesma coisa com a mesma cor.
     `minuto` (opcional) só muda a cadência: no cartão em linha a contagem
     é viva e pisca uma vez por minuto; na lista de leitura é estática.
     ======================================================================= */
  function estadoTemporal(ag, opcoes) {
    opcoes = opcoes || {};
    var e = N.estadoTemporal(ag, opcoes.agora);
    if (!e.rotulo) return null;
    var el = h('span.temporal.temporal--' + e.nivel, {
      dados: { nivel: e.nivel },
      title: opcoes.titulo || e.rotulo,
      'aria-hidden': opcoes.decorativo ? 'true' : null
    });
    if (e.nivel === 'em-curso') el.appendChild(h('span.temporal__pulso', { 'aria-hidden': 'true' }));
    el.appendChild(h('span.temporal__texto', { texto: e.rotulo }));
    return el;
  }

  /* Selo de pagamento. Nunca diz "Pago" quando o valor não foi lançado:
     nesse caso o que existe é um registro PENDENTE sem valor, e é isso que
     a proprietária precisa ver. */
  function seloPagamento(ag) {
    var p = N.pagamentoDe(ag);
    if (!p) return null;
    var st = N.statusPagamento(p.status);
    var v = N.valorLiquido(p);
    var rotulo = v == null ? st.nome : st.nome + ' · ' + N.moeda(v);
    return h('span.selo-pag.selo-pag--' + p.status, {
      title: 'Pagamento: ' + rotulo,
      texto: rotulo
    });
  }

  function vazio(iconeNome, titulo, texto, acao, compacto) {
    return h('div.vazio' + (compacto ? '.vazio--compacto' : ''), null,
      h('div.vazio__marca', null, svgIcone(iconeNome)),
      h('p.vazio__titulo', { texto: titulo }),
      texto ? h('p.vazio__texto', { texto: texto }) : null,
      acao || null
    );
  }

  /* Faixa de aviso de dado demonstrativo. Sempre que a tela mostra número
     inventado, esta faixa aparece — é o contrato com a cliente. */
  function avisoDemo(texto, curto) {
    if (curto) {
      return h('span.aviso-demo.aviso-demo--linha', null,
        svgIcone('info'), h('b', { texto: 'Dados demonstrativos' }));
    }
    return h('div.aviso-demo', null,
      svgIcone('alerta'),
      h('div', null,
        h('b', { texto: 'Dados demonstrativos. ' }),
        document.createTextNode(texto || 'Os valores desta tela foram criados para a apresentação e não representam o resultado real do salão.')
      )
    );
  }

  function marcaDemo(texto) { return h('span.marca-demo', { texto: texto || 'demonstrativo' }); }

  function esqueleto(linhas) {
    var e = h('div', { 'aria-hidden': 'true' });
    for (var i = 0; i < (linhas || 3); i += 1) e.appendChild(h('div.esqueleto.esqueleto--linha'));
    return e;
  }

  function linhaDado(rotuloTexto, valor) {
    return h('div.linha-dado', null,
      h('span.miudo', { texto: rotuloTexto }),
      h('span.linha-dado__valor', null, valor)
    );
  }

  function metrica(opcoes) {
    var delta = null;
    if (opcoes.delta) {
      var sobe = opcoes.delta.tendencia === 'sobe';
      var desce = opcoes.delta.tendencia === 'desce';
      delta = h('span.metrica__delta', {
        classe: 'metrica__delta--' + (sobe ? 'sobe' : desce ? 'desce' : 'neutro')
      }, svgIcone(sobe ? 'tendencia' : desce ? 'tendencia-baixo' : 'menos'),
        document.createTextNode(opcoes.delta.texto));
    }
    return h('div.metrica' + (opcoes.destaque ? '.metrica--destaque' : ''), null,
      h('div.metrica__topo', null,
        h('span.rotulo', { texto: opcoes.rotulo }),
        opcoes.icone ? h('span.metrica__icone', null, svgIcone(opcoes.icone)) : null
      ),
      h('div.metrica__valor', null,
        typeof opcoes.valor === 'string' ? h('span.num-grande', { texto: opcoes.valor }) : opcoes.valor,
        delta
      ),
      opcoes.nota ? h('p.metrica__nota', { texto: opcoes.nota }) : null
    );
  }

  /* =======================================================================
     3. ÍCONE DE AÇÃO — botão acessível com dica e rótulo para leitor
     ======================================================================= */
  function acao(iconeNome, rotuloTexto, aoClicar, variante) {
    var b = h('button.btn-icone' + (variante ? '.btn-icone--' + variante : ''), {
      type: 'button', title: rotuloTexto, 'aria-label': rotuloTexto,
      ao: { click: aoClicar }
    });
    b.appendChild(svgIcone(iconeNome));
    return b;
  }

  /* =======================================================================
     4. TOASTS
     ======================================================================= */
  var pilhaToasts = null;
  function garantirPilha() {
    if (!pilhaToasts) {
      pilhaToasts = h('div.toasts', { role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(pilhaToasts);
    }
    return pilhaToasts;
  }

  function toast(texto, tipo, opcoes) {
    opcoes = opcoes || {};
    var icones = { sucesso: 'checar-circulo', erro: 'x-circulo', alerta: 'alerta', info: 'info' };
    var t = h('div.toast' + (tipo ? '.toast--' + tipo : ''), null,
      (function () { var s = h('span.toast__icone'); s.appendChild(svgIcone(icones[tipo] || 'info')); return s; })(),
      h('div.toast__texto', null, opcoes.negrito ? h('b', { texto: opcoes.negrito + ' ' }) : null, document.createTextNode(texto)),
      opcoes.acao ? h('button.toast__acao', { type: 'button', texto: opcoes.acao.texto, ao: { click: function () { opcoes.acao.ao(); fechar(); } } }) : null
    );
    var fechar = function () {
      if (!t.parentNode) return;
      t.dataset.saindo = 'sim';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 220);
    };
    var x = h('button.toast__fechar', { type: 'button', 'aria-label': 'Fechar aviso', ao: { click: fechar } });
    x.appendChild(svgIcone('fechar'));
    t.appendChild(x);
    garantirPilha().appendChild(t);
    var ms = opcoes.duracao || (opcoes.acao ? 7000 : 4200);
    setTimeout(fechar, ms);
    return fechar;
  }

  /* =======================================================================
     5. GAVETA E MODAL — um par de funções que devolve controle
     Ambos compartilham a mesma disciplina: foco preso, Esc fecha, clique no
     véu fecha, e o foco volta para o elemento que abriu.
     ======================================================================= */
  var veu = null;
  function garantirVeu() {
    if (!veu) {
      veu = h('div.veu', { ao: { click: function () { fecharTudo(); } } });
      document.body.appendChild(veu);
    }
    return veu;
  }

  var abertos = [];
  var ultimoFoco = null;

  function travarRolagem(sim) {
    document.documentElement.style.overflow = sim ? 'hidden' : '';
  }

  function prenderFoco(container, ev) {
    var focaveis = container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focaveis.length) return;
    var primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
    if (ev.shiftKey && document.activeElement === primeiro) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && document.activeElement === ultimo) { ev.preventDefault(); primeiro.focus(); }
  }

  document.addEventListener('keydown', function (ev) {
    if (!abertos.length) return;
    var topo = abertos[abertos.length - 1];
    if (ev.key === 'Escape') { ev.preventDefault(); topo.fechar(); return; }
    if (ev.key === 'Tab') prenderFoco(topo.el, ev);
  });

  function registrar(el, fechar, focoInicial) {
    if (!abertos.length) {
      ultimoFoco = document.activeElement;
      travarRolagem(true);
      garantirVeu().dataset.aberto = 'sim';
    }
    el.dataset.aberto = 'sim';
    abertos.push({ el: el, fechar: fechar });
    setTimeout(function () {
      var alvo = (focoInicial && el.querySelector(focoInicial)) ||
                 el.querySelector('[data-foco], .btn--principal, button, a[href]');
      if (alvo) alvo.focus();
    }, 60);
  }

  function desregistrar(el) {
    abertos = abertos.filter(function (a) { return a.el !== el; });
    el.dataset.aberto = 'nao';
    if (!abertos.length) {
      travarRolagem(false);
      if (veu) veu.dataset.aberto = 'nao';
      if (ultimoFoco && ultimoFoco.focus) { try { ultimoFoco.focus(); } catch (e) {} }
      ultimoFoco = null;
    }
    if (el.parentNode && el.dataset.descartavel === 'sim') el.parentNode.removeChild(el);
  }

  function fecharTudo() {
    abertos.slice().reverse().forEach(function (a) { a.fechar(); });
  }

  /* --- gaveta --------------------------------------------------------- */
  function gaveta(opcoes) {
    var corpo = h('div.gaveta__corpo');
    var rodape = h('div.gaveta__rodape');
    var caixa = h('aside.gaveta' + (opcoes.larga === false ? '.gaveta--filtros' : ''), {
      role: 'dialog', 'aria-modal': 'true', 'aria-label': opcoes.titulo || 'Detalhe',
      dados: { descartavel: 'sim' }
    });
    var botaoFechar = h('button.btn-icone.gaveta__fechar', {
      type: 'button', 'aria-label': 'Fechar', ao: { click: function () { fechar(); } }
    });
    botaoFechar.appendChild(svgIcone('fechar'));

    var cabecalho = h('div.gaveta__topo', null,
      h('div', null,
        opcoes.sobreTitulo ? h('span.rotulo', { texto: opcoes.sobreTitulo }) : null,
        h('h2.gaveta__titulo', { texto: opcoes.titulo || '' })
      ),
      botaoFechar
    );

    caixa.appendChild(cabecalho);
    caixa.appendChild(corpo);
    if (opcoes.acoes && opcoes.acoes.length) {
      opcoes.acoes.forEach(function (b) { rodape.appendChild(b); });
      caixa.appendChild(rodape);
    }
    if (opcoes.aoFechar) caixa.addEventListener('eh:fechar', opcoes.aoFechar);

    document.body.appendChild(caixa);
    var fechar = function () {
      if (caixa.dataset.aberto !== 'sim') return;
      desregistrar(caixa);
      caixa.dispatchEvent(new CustomEvent('eh:fechar'));
    };
    registrar(caixa, fechar, opcoes.foco);
    return { el: caixa, corpo: corpo, rodape: rodape, fechar: fechar };
  }

  /* --- modal ---------------------------------------------------------- */
  function modal(opcoes) {
    var corpo = h('div.modal__corpo');
    var rodape = h('div.modal__rodape');
    var caixa = h('div.modal' + (opcoes.largo ? '.modal--largo' : ''), {
      role: 'dialog', 'aria-modal': 'true', 'aria-label': opcoes.titulo || 'Janela',
      dados: { descartavel: 'sim' }
    });
    var fechar = function () {
      if (caixa.dataset.aberto !== 'sim') return;
      desregistrar(caixa);
      if (opcoes.aoFechar) opcoes.aoFechar();
    };
    var botaoFechar = h('button.btn-icone.modal__fechar', {
      type: 'button', 'aria-label': 'Fechar', ao: { click: fechar }
    });
    botaoFechar.appendChild(svgIcone('fechar'));

    caixa.appendChild(h('div.modal__topo', null,
      h('div', null,
        h('h2.modal__titulo', { texto: opcoes.titulo || '' }),
        opcoes.texto ? h('p.modal__texto', { texto: opcoes.texto }) : null
      ),
      botaoFechar
    ));
    /* CORPO: sem isto, `opcoes.corpo` era descartado em silêncio e todo modal
       abria com o corpo vazio (foi o defeito do "Editar serviço"). Aceita um
       nó único ou uma lista. */
    if (opcoes.corpo) {
      if (Array.isArray(opcoes.corpo)) opcoes.corpo.forEach(function (c) { if (c) corpo.appendChild(c); });
      else corpo.appendChild(opcoes.corpo);
    }
    caixa.appendChild(corpo);
    if (opcoes.acoes && opcoes.acoes.length) {
      opcoes.acoes.forEach(function (b) { rodape.appendChild(b); });
      caixa.appendChild(rodape);
    }
    document.body.appendChild(caixa);
    registrar(caixa, fechar, opcoes.foco);
    return { el: caixa, corpo: corpo, rodape: rodape, fechar: fechar };
  }

  /* Confirmação — o diálogo mais repetido do painel. Devolve o modal para o
     chamador poder fechar no callback. */
  function confirmar(opcoes) {
    var m;
    var botaoOk = h('button.btn' + (opcoes.perigo ? '.btn--perigo' : '.btn--principal'), {
      type: 'button', texto: opcoes.ok || 'Confirmar',
      ao: { click: function () { m.fechar(); if (opcoes.aoConfirmar) opcoes.aoConfirmar(); } }
    });
    var acoes = [];
    if (opcoes.cancelar !== false) {
      acoes.push(h('button.btn.btn--secundario', {
        type: 'button', texto: opcoes.cancelarTexto || 'Cancelar',
        ao: { click: function () { m.fechar(); } }
      }));
    }
    acoes.push(botaoOk);
    m = modal({ titulo: opcoes.titulo, texto: opcoes.texto, acoes: acoes });
    if (opcoes.corpo) m.corpo.appendChild(opcoes.corpo);
    return m;
  }

  /* =======================================================================
     6. MENU FLUTUANTE
     Posiciona-se ancorado ao gatilho e se reposiciona para nunca sair da
     tela — inclusive no celular, onde a âncora costuma estar perto da borda.
     ======================================================================= */
  function menuFlutuante(gatilho, construir, opcoes) {
    opcoes = opcoes || {};
    var aberto = false, el = null, foraClique = null;

    function posicionar() {
      if (!el) return;
      var r = gatilho.getBoundingClientRect();
      var margem = 8;
      var m = el.getBoundingClientRect();
      el.style.position = 'fixed';
      var topo = r.bottom + 6;
      var esq = opcoes.alinhar === 'esquerda' ? r.left : r.right - m.width;
      if (topo + m.height > window.innerHeight - margem) {
        topo = Math.max(margem, r.top - m.height - 6);
      }
      esq = Math.max(margem, Math.min(esq, window.innerWidth - m.width - margem));
      el.style.top = topo + 'px';
      el.style.left = esq + 'px';
    }

    function abrir() {
      if (aberto) return;
      el = h('div.menu-flutuante', { role: 'menu' });
      juntar(el, [construir(fechar)]);
      document.body.appendChild(el);
      aberto = true;
      gatilho.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(function () { posicionar(); el.dataset.aberto = 'sim'; });
      foraClique = function (ev) {
        if (el && (el.contains(ev.target) || gatilho.contains(ev.target))) return;
        fechar();
      };
      setTimeout(function () { document.addEventListener('click', foraClique); }, 0);
      window.addEventListener('resize', posicionar);
      window.addEventListener('scroll', posicionar, true);
      document.addEventListener('keydown', escapar);
    }
    function escapar(ev) { if (ev.key === 'Escape') fechar(); }
    function fechar() {
      if (!aberto) return;
      aberto = false;
      gatilho.setAttribute('aria-expanded', 'false');
      if (foraClique) document.removeEventListener('click', foraClique);
      window.removeEventListener('resize', posicionar);
      window.removeEventListener('scroll', posicionar, true);
      document.removeEventListener('keydown', escapar);
      if (el && el.parentNode) el.parentNode.removeChild(el);
      el = null;
    }
    gatilho.setAttribute('aria-haspopup', 'true');
    gatilho.setAttribute('aria-expanded', 'false');
    gatilho.addEventListener('click', function (ev) { ev.stopPropagation(); aberto ? fechar() : abrir(); });
    return { abrir: abrir, fechar: fechar, estaAberto: function () { return aberto; } };
  }

  function itemMenu(construir, aoClicar, opcoes) {
    opcoes = opcoes || {};
    var b = h('button.menu-flutuante__item' + (opcoes.perigo ? '.menu-flutuante__item--perigo' : ''), {
      type: 'button', role: 'menuitem', ao: { click: function () { aoClicar(); } }
    });
    if (opcoes.icone) b.appendChild(svgIcone(opcoes.icone));
    b.appendChild(typeof construir === 'string' ? h('span', { texto: construir }) : construir);
    return b;
  }

  /* =======================================================================
     7. TABELA ADAPTATIVA
     `colunas` = [{ chave, rotulo, bloco?, classe?, ordenavel?, valor(item) }]
     Vira cartão no celular por CSS — a marcação é uma só.
     ======================================================================= */
  function tabela(opcoes) {
    var colunas = opcoes.colunas;
    var corpo = h('tbody');
    var tabelaEl = h('table.tabela' + (opcoes.clicavel ? '.tabela--clicavel' : ''), null,
      h('thead', null, h('tr', null, colunas.map(function (c) {
        var th = h('th' + (c.classe ? '.' + c.classe : ''), {
          scope: 'col', texto: c.rotulo,
          dados: c.ordenavel ? { ordenar: c.chave } : {}
        });
        return th;
      }))),
      corpo
    );

    function linha(item) {
      var tr = h('tr', { dados: opcoes.chaveLinha ? { id: opcoes.chaveLinha(item) } : {} });
      colunas.forEach(function (c) {
        var td = h('td' + (c.classe ? '.' + c.classe : ''), {
          dados: c.bloco ? { rotulo: '', bloco: 'sim' } : { rotulo: c.rotulo }
        });
        var conteudo = c.valor(item, tr);
        if (conteudo && conteudo.nodeType) td.appendChild(conteudo);
        else if (Array.isArray(conteudo)) juntar(td, conteudo);
        else td.textContent = conteudo == null ? '—' : String(conteudo);
        tr.appendChild(td);
      });
      if (opcoes.aoClicarLinha) {
        tr.addEventListener('click', function (ev) {
          if (ev.target.closest('button, a, input, select, label')) return;
          opcoes.aoClicarLinha(item);
        });
      }
      return tr;
    }

    var api = {
      el: tabelaEl,
      corpo: corpo,
      preencher: function (itens) {
        limpar(corpo);
        itens.forEach(function (i) { corpo.appendChild(linha(i)); });
        return api;
      }
    };
    if (opcoes.itens) api.preencher(opcoes.itens);
    return api;
  }

  /* Paginação: devolve controle e informa a fatia visível. */
  function paginacao(total, pagina, porPagina, aoMudar) {
    var paginas = Math.max(1, Math.ceil(total / porPagina));
    pagina = Math.min(Math.max(1, pagina), paginas);
    var de = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
    var ate = Math.min(total, pagina * porPagina);

    var numeros = [];
    var janeiro = [];
    for (var p = 1; p <= paginas; p += 1) {
      if (p === 1 || p === paginas || Math.abs(p - pagina) <= 1) janeiro.push(p);
      else if (janeiro[janeiro.length - 1] !== '…') janeiro.push('…');
    }
    janeiro.forEach(function (p) {
      if (p === '…') { numeros.push(h('span.paginacao__botao', { texto: '…' })); return; }
      numeros.push(h('button.paginacao__botao', {
        type: 'button', texto: String(p),
        'aria-current': p === pagina ? 'page' : null,
        'aria-label': 'Página ' + p,
        ao: { click: function () { if (p !== pagina) aoMudar(p); } }
      }));
    });

    return h('div.paginacao', null,
      h('span', { texto: total === 0 ? 'Nenhum registro' : 'Mostrando ' + de + '–' + ate + ' de ' + total }),
      h('div.paginacao__paginas', null,
        h('button.paginacao__botao', {
          type: 'button', 'aria-label': 'Página anterior', disabled: pagina === 1,
          ao: { click: function () { aoMudar(pagina - 1); } }
        }, svgIcone('chevron-esq')),
        numeros,
        h('button.paginacao__botao', {
          type: 'button', 'aria-label': 'Próxima página', disabled: pagina === paginas,
          ao: { click: function () { aoMudar(pagina + 1); } }
        }, svgIcone('chevron-dir'))
      )
    );
  }

  /* =======================================================================
     8. CAMPO DE BUSCA
     ======================================================================= */
  function busca(opcoes) {
    opcoes = opcoes || {};
    var entrada = h('input.entrada', {
      type: 'search', placeholder: opcoes.placeholder || 'Buscar…',
      'aria-label': opcoes.rotulo || opcoes.placeholder || 'Buscar',
      autocomplete: 'off'
    });
    var limparBtn = h('button.busca__limpar', { type: 'button', 'aria-label': 'Limpar busca' });
    limparBtn.appendChild(svgIcone('fechar'));
    var caixa = h('div.busca', { dados: { tamanho: opcoes.tamanho || 'normal' } },
      svgIcone('busca'), entrada, limparBtn);

    function sincronizar() {
      if (entrada.value) caixa.dataset.preenchido = 'sim';
      else delete caixa.dataset.preenchido;
    }
    var tempo;
    entrada.addEventListener('input', function () {
      sincronizar();
      clearTimeout(tempo);
      tempo = setTimeout(function () { if (opcoes.aoBuscar) opcoes.aoBuscar(entrada.value.trim()); }, 180);
    });
    limparBtn.addEventListener('click', function () {
      entrada.value = ''; sincronizar(); entrada.focus();
      if (opcoes.aoBuscar) opcoes.aoBuscar('');
    });
    sincronizar();

    var el = opcoes.bloco === false ? caixa : h('div.campo', null, caixa);
    return { el: el, caixa: caixa, entrada: entrada, valor: function () { return entrada.value.trim(); } };
  }

  /* =======================================================================
     9. SEGMENTADO E ABAS
     ======================================================================= */
  function segmentado(opcoes, aoEscolher) {
    var el = h('div.segmentado', { role: 'group', 'aria-label': opcoes.rotulo || 'Visão' });
    opcoes.itens.forEach(function (o) {
      var b = h('button.segmentado__opcao' + (o.classe ? '.' + o.classe : ''), {
        type: 'button', 'aria-pressed': o.id === opcoes.atual ? 'true' : 'false',
        ao: { click: function () { aoEscolher(o.id); } }
      });
      if (o.icone) b.appendChild(svgIcone(o.icone));
      b.appendChild(h('span', { texto: o.nome }));
      if (o.contador != null && o.contador !== '') {
        b.appendChild(h('span.aba__contador', { texto: String(o.contador) }));
      }
      el.appendChild(b);
    });
    return el;
  }

  function abas(itens, atual, aoEscolher, rotuloGrupo) {
    var el = h('div.abas', { role: 'tablist', 'aria-label': rotuloGrupo || 'Seções' });
    itens.forEach(function (o) {
      var selecionada = o.id === atual;
      var b = h('button.aba', {
        type: 'button', role: 'tab',
        'aria-selected': selecionada ? 'true' : 'false',
        tabindex: selecionada ? '0' : '-1',
        ao: { click: function () { aoEscolher(o.id); } }
      });
      b.appendChild(document.createTextNode(o.nome));
      if (o.contador != null) b.appendChild(h('span.aba__contador', { texto: String(o.contador) }));
      el.appendChild(b);
    });
    return el;
  }

  /* Chips de filtro: usados para status, origem e período. */
  function chip(rotuloTexto, ativo, aoClicar, extra) {
    var b = h('button.chip', {
      type: 'button', 'aria-pressed': ativo ? 'true' : 'false',
      ao: { click: aoClicar }
    });
    if (extra && extra.icone) b.appendChild(svgIcone(extra.icone));
    b.appendChild(document.createTextNode(rotuloTexto));
    if (extra && extra.contador != null) b.appendChild(h('span.chip__n', { texto: String(extra.contador) }));
    if (extra && extra.aoRemover) {
      var x = h('span.chip__x', { 'aria-hidden': 'true' });
      x.appendChild(svgIcone('fechar'));
      b.appendChild(x);
    }
    return b;
  }

  /* =======================================================================
     10. INTERRUPTOR E CAIXA
     ======================================================================= */
  function interruptor(opcoes) {
    var input = h('input', {
      type: 'checkbox', checked: opcoes.ligado ? true : null,
      'aria-label': opcoes.rotulo || opcoes.texto || 'Alternar'
    });
    if (opcoes.aoMudar) input.addEventListener('change', function () { opcoes.aoMudar(input.checked); });
    var el = h('label.interruptor', null, input, h('span.interruptor__trilho'),
      opcoes.texto ? h('span.interruptor__texto', { texto: opcoes.texto }) : null);
    return { el: el, entrada: input, ligado: function () { return input.checked; } };
  }

  function caixaSelecao(opcoes) {
    var input = h('input', {
      type: 'checkbox', checked: opcoes.marcado ? true : null,
      'aria-label': opcoes.rotulo || opcoes.texto
    });
    if (opcoes.aoMudar) input.addEventListener('change', function () { opcoes.aoMudar(input.checked); });
    return h('label.caixa', null, input, h('span', { texto: opcoes.texto }));
  }

  /* Campo de formulário rotulado, com dica e erro */
  function campo(opcoes) {
    var controle;
    var attrs = {
      id: opcoes.id || ('campo-' + Math.random().toString(36).slice(2, 8)),
      name: opcoes.nome || opcoes.id || '',
      'aria-label': opcoes.rotulo || opcoes.nome || '',
      disabled: opcoes.desabilitado ? true : null
    };
    if (opcoes.tipo === 'selecao') {
      controle = h('select.selecao', attrs);
      controle.appendChild(h('option', { value: '', texto: opcoes.vazio || 'Selecione…' }));
      (opcoes.opcoes || []).forEach(function (o) {
        controle.appendChild(h('option', {
          value: o.valor, texto: o.nome,
          selected: String(o.valor) === String(opcoes.valor) ? true : null
        }));
      });
    } else if (opcoes.tipo === 'area') {
      controle = h('textarea.area', Object.assign({ rows: opcoes.linhas || 3 }, attrs));
      controle.value = opcoes.valor || '';
    } else if (opcoes.tipo === 'interruptor') {
      var i = interruptor({ ligado: opcoes.valor, texto: opcoes.textoInterruptor });
      controle = i.el;
      controle.dataset.controle = 'sim';
    } else {
      controle = h('input.entrada', Object.assign({
        type: opcoes.tipo || 'text',
        placeholder: opcoes.placeholder || '',
        inputmode: opcoes.inputmode || null,
        maxlength: opcoes.max ? String(opcoes.max) : null,
        min: opcoes.min != null ? String(opcoes.min) : null,
        step: opcoes.passo != null ? String(opcoes.passo) : null,
        autocomplete: opcoes.autocomplete || null
      }, attrs));
      if (opcoes.valor != null) controle.value = opcoes.valor;
    }
    var erro = h('span.campo__erro', { texto: opcoes.erro || 'Verifique este campo.' });
    /* `curto`: rótulo AO LADO do controle, para o campo caber numa régua de
       barra de filtros sem descer abaixo dela. */
    var el = h(opcoes.curto ? 'div.campo.campo--curto' : 'div.campo',
      { dados: { campo: opcoes.nome || opcoes.id || '' } },
      opcoes.rotulo ? h('label.campo__rotulo', { for: controle.id, texto: opcoes.rotulo }) : null,
      controle,
      opcoes.dica ? h('span.campo__dica', { texto: opcoes.dica }) : null,
      erro
    );
    return {
      el: el, controle: controle,
      valor: function () { return controle.dataset.controle ? controle.querySelector('input').checked : controle.value; },
      marcarErro: function (m) {
        if (m) { el.dataset.invalido = 'sim'; if (typeof m === 'string') erro.textContent = m; }
        else delete el.dataset.invalido;
        return !m;
      }
    };
  }

  /* =======================================================================
     11. LINHA DE AGENDAMENTO — a peça mais reutilizada do painel
     Aparece na lista, nos resultados de busca, no perfil do cliente e na
     agenda. Uma só definição evita que as telas divirjam.
     ======================================================================= */
  function linhaAgendamento(a, opcoes) {
    opcoes = opcoes || {};
    var cliente = N.clienteDe(a.clienteId);
    var servico = N.servicoDe(a.servicoId);
    var horario = N.horaCheia(a.inicioMin) + '–' + N.horaCheia(N.minutosDe(a.fim));

    /* O estado temporal entra AQUI, no rodapé da linha, e não substitui o
       selo de situação: são duas leituras diferentes — em que ponto do
       fluxo está, e quanto falta para a hora. */
    var temporal = opcoes.semTemporal ? null : estadoTemporal(a, { agora: opcoes.agora });
    var pag = opcoes.semPagamento ? null : seloPagamento(a);

    return h('button.linha-cartao.linha-cartao--clicavel', {
      type: 'button',
      dados: { status: a.status },
      'aria-label': N.nomeCliente(cliente) + ', ' + servico.nome + ', ' + horario +
        (temporal ? ', ' + temporal.textContent : '') + ', ' + N.estado(a.status).nome,
      ao: { click: function () { if (opcoes.aoAbrir) opcoes.aoAbrir(a); } }
    },
      h('span.linha-cartao__hora.num', { texto: horario }),
      avatar(cliente),
      h('span.linha-cartao__corpo', null,
        h('span.linha-principal__nome', { texto: N.nomeCliente(cliente) }),
        h('span.linha-principal__sub.truncar', { texto: servico.nome + ' · ' + N.duracaoLegivel(a.duracao) })
      ),
      h('span.linha-cartao__fim', null,
        temporal,
        opcoes.semStatus ? null : selo(a.status),
        pag,
        opcoes.semOrigem ? null : origem(a.origem)
      )
    );
  }

  window.UI = {
    h: h, frag: frag, limpar: limpar, juntar: juntar, escapar: escapar,
    icone: icone, svg: svgIcone,
    selo: selo, origem: origem, avatar: avatar, rotulo: rotulo,
    estadoTemporal: estadoTemporal, seloPagamento: seloPagamento,
    vazio: vazio, avisoDemo: avisoDemo, marcaDemo: marcaDemo, esqueleto: esqueleto,
    linhaDado: linhaDado, metrica: metrica, acao: acao,
    toast: toast, gaveta: gaveta, modal: modal, confirmar: confirmar, fecharTudo: fecharTudo,
    menuFlutuante: menuFlutuante, itemMenu: itemMenu,
    tabela: tabela, paginacao: paginacao,
    busca: busca, segmentado: segmentado, abas: abas, chip: chip,
    interruptor: interruptor, caixaSelecao: caixaSelecao, campo: campo,
    linhaAgendamento: linhaAgendamento
  };
})();
