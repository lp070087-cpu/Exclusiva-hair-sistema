/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · app.js
   Entrada demonstrativa, casca do painel (trilho, topo, navegação inferior),
   central de notificações e despacho das telas pelo roteador.

   Este arquivo é o único que conhece o HTML da página. As telas se registram
   em window.TELAS e recebem o contêiner pronto.
   ========================================================================== */
(function () {
  'use strict';

  /* As MESMAS funções que a bancada usa para tocar o painel. Ver o bloco
     de exportação no fim deste arquivo. */
  var EH_APP = window.EH_APP = window.EH_APP || {};

  var N = window.EHN;
  var U = window.UI;
  var I = window.Icone;
  var D = window.EH;
  var h = U.h;

  window.TELAS = window.TELAS || {};

  /* Estado de sessão: em memória, de propósito. Não há autenticação real
     nesta etapa — a tela de entrada é a porta de demonstração. */
  var SESSAO = { entrando: false };

  /* =======================================================================
     1. CRÉDITO UNITRIX
     Aparece na entrada e nas configurações. Sem CPF e sem endereço — só o
     nome da desenvolvedora e o CNPJ, como pedido.
     ======================================================================= */
  function creditoUnitrix(claro) {
    var selo = h('span.credito__selo');
    selo.appendChild(U.svg('faisca'));
    return h('div.credito', null,
      selo,
      h('span', null,
        document.createTextNode('Desenvolvido pela '),
        h('strong', { texto: 'Unitrix App' }),
        document.createTextNode(' · CNPJ 66.438.449/0001-44')
      )
    );
  }

  /* =======================================================================
     2. TELA DE ENTRADA
     ======================================================================= */
  function montarEntrada() {
    var campoEmail = U.campo({
      id: 'entrada-email', tipo: 'email', rotulo: 'E-mail',
      placeholder: 'seu@email.com.br', autocomplete: 'username',
      erro: 'Informe um e-mail válido.'
    });
    var campoSenha = U.campo({
      id: 'entrada-senha', tipo: 'password', rotulo: 'Senha',
      placeholder: '••••••••', autocomplete: 'current-password',
      erro: 'Informe a senha.'
    });
    var verSenha = h('button.btn-icone', {
      type: 'button', 'aria-label': 'Mostrar senha', title: 'Mostrar senha',
      ao: {
        click: function () {
          var mostrando = campoSenha.controle.type === 'text';
          campoSenha.controle.type = mostrando ? 'password' : 'text';
          verSenha.setAttribute('aria-label', mostrando ? 'Mostrar senha' : 'Ocultar senha');
          verSenha.replaceChild(U.svg(mostrando ? 'olho' : 'olho-fechado'), verSenha.firstChild);
        }
      }
    });
    verSenha.appendChild(U.svg('olho'));
    campoSenha.el.querySelector('.campo__rotulo').appendChild(
      h('span', { estilo: { float: 'right' } }, verSenha)
    );

    var manter = U.caixaSelecao({ texto: 'Manter conectado', marcado: true, rotulo: 'Manter conectado' });

    var botaoEntrar = h('button.btn.btn--principal.btn--grande.btn--bloco', {
      type: 'button', texto: 'Entrar'
    });

    var formulario = h('form.entrada-form__campos', {
      ao: {
        submit: function (ev) {
          ev.preventDefault();
          var email = campoEmail.valor();
          var senha = campoSenha.valor();
          /* Validação de forma, não de credencial: não existe autenticação
             real nesta etapa. Basta algo digitado para demonstrar o fluxo. */
          var okEmail = /.+@.+\..+/.test(email);
          var okSenha = String(senha).length >= 4;
          campoEmail.marcarErro(okEmail ? false : 'Informe um e-mail válido.');
          campoSenha.marcarErro(okSenha ? false : 'Informe ao menos 4 caracteres.');
          if (!okEmail || !okSenha) {
            U.toast('Confira os campos destacados para entrar.', 'alerta');
            return;
          }
          entrar();
        }
      }
    }, campoEmail.el, campoSenha.el,
      h('div.entrada-form__linha', null, manter,
        h('button.btn-texto', {
          type: 'button', texto: 'Esqueci minha senha',
          ao: {
            click: function () {
              U.confirmar({
                titulo: 'Recuperar acesso',
                texto: 'Nesta demonstração não há envio de e-mail. No sistema em produção, ' +
                       'este botão dispara um link de redefinição para o e-mail cadastrado.',
                ok: 'Entendi', cancelar: false
              });
            }
          }
        })
      ),
      botaoEntrar
    );

    formulario.addEventListener('submit', function (ev) { ev.preventDefault(); });
    botaoEntrar.addEventListener('click', function () {
      formulario.dispatchEvent(new Event('submit', { cancelable: true }));
    });

    var tela = h('div.entrada-tela', { id: 'entrada' },
      /* --- painel da marca --- */
      h('aside.entrada-marca', null,
        h('div.entrada-marca__topo', null,
          h('img.entrada-marca__logo', { src: 'assets/img/logo-branca.png', alt: '', width: '56', height: '56' }),
          h('div', null,
            /* O nome vem do estado, não do HTML: é o MESMO campo que a
               proprietária edita em Configurações → Salão. Escrito duas
               vezes, um dos dois ficaria para trás na primeira troca. */
            h('div.entrada-marca__nome', { texto: N.dados.config.nome }),
            h('div.entrada-marca__papel', { texto: 'Painel de gestão' })
          )
        ),
        h('div.entrada-marca__texto', null,
          h('h1.entrada-marca__titulo', { texto: 'O dia do salão, do primeiro horário ao último.' }),
          h('ul.entrada-marca__lista', null,
            ['Agenda, clientes e serviços em um só lugar',
             'Pedidos do site entram direto na agenda',
             'Horários bloqueados nunca aparecem como livres'
            ].map(function (t) {
              var li = h('li.entrada-marca__item');
              li.appendChild(U.svg('checar'));
              li.appendChild(h('span', { texto: t }));
              return li;
            })
          )
        ),
        h('div.entrada-marca__rodape', null, creditoUnitrix())
      ),
      /* --- formulário --- */
      h('main.entrada-form', null,
        h('div.entrada-form__caixa', null,
          h('h2.entrada-form__titulo', { texto: 'Entrar no painel' }),
          h('p.entrada-form__sub', { texto: 'Acesse para acompanhar a agenda e o movimento do salão.' }),
          formulario,
          h('div.entrada-form__demo', null,
            h('b', { texto: 'Demonstração. ' }),
            document.createTextNode('Qualquer e-mail válido e uma senha de 4 caracteres abrem o painel. ' +
              'Os dados exibidos são demonstrativos.')
          ),
          h('div.entrada-form__rodape', null, creditoUnitrix())
        )
      )
    );
    return tela;
  }

  /* =======================================================================
     3. CASCA DO PAINEL
     ======================================================================= */
  var refs = {};

  function montarTrilho() {
    var lista = h('nav.trilho__lista', { 'aria-label': 'Seções do painel' });

    /* Dois grupos: o dia a dia, e a gestão do salão. */
    var grupo1 = h('div.trilho__grupo', null,
      h('h2.trilho__grupo-titulo', { texto: 'Operação' })
    );
    var grupo2 = h('div.trilho__grupo', null,
      h('h2.trilho__grupo-titulo', { texto: 'Gestão' })
    );

    var ICONES = {
      'visao-geral': 'painel', agenda: 'agenda', agendamentos: 'lista', clientes: 'pessoas',
      servicos: 'tesoura', financeiro: 'dinheiro', relatorios: 'grafico', config: 'ajustes',
      equipe: 'usuario'
    };
    var primeiroGrupo = ['visao-geral', 'agenda', 'agendamentos', 'clientes'];

    N.ROTAS.forEach(function (r) {
      var a = h('a.item-trilho', { href: r.url, dados: { rota: r.id } });
      a.appendChild(U.svg(ICONES[r.id] || 'painel'));
      a.appendChild(h('span.item-trilho__texto', { texto: r.rotulo }));
      if (r.id === 'agendamentos') a.appendChild(h('span.item-trilho__contador', { dados: { contador: 'agendamentos' } }));
      (primeiroGrupo.indexOf(r.id) !== -1 ? grupo1 : grupo2).appendChild(a);
    });

    lista.appendChild(grupo1);
    lista.appendChild(grupo2);

    var alternar = h('button.item-trilho.trilho__alternar', {
      type: 'button', id: 'trilho-alternar',
      ao: {
        click: function () {
          var app = document.getElementById('app');
          var recolhido = app.dataset.recolhido === 'sim';
          app.dataset.recolhido = recolhido ? 'nao' : 'sim';
          alternativa.dataset.recolhido = recolhido ? 'sim' : 'nao';
          var alvo = alternar.querySelector('.item-trilho__texto');
          if (alvo) alvo.textContent = recolhido ? 'Recolher menu' : 'Expandir menu';
          try { sessionStorage.setItem('eh-trilho', recolhido ? 'nao' : 'sim'); } catch (e) {}
        }
      }
    });
    alternar.appendChild(U.svg('recolher'));
    alternar.appendChild(h('span.item-trilho__texto', { texto: 'Recolher menu' }));
    var alternativa = alternar;

    var trilho = h('aside.trilho.tema-trilho', { id: 'trilho' },
      h('div.trilho__marca', null,
        h('img.trilho__logo', { src: 'assets/img/logo-branca.png', alt: '', width: '36', height: '36' }),
        h('div', null,
          h('div.trilho__nome', { texto: N.dados.config.nome }),
          h('div.trilho__papel', { texto: 'Painel de gestão' })
        )
      ),
      lista,
      h('div.trilho__rodape', null,
        h('button.item-trilho', {
          type: 'button', dados: { acao: 'sair' },
          ao: { click: function () { sair(); } }
        }, U.svg('sair'), h('span.item-trilho__texto', { texto: 'Sair do painel' }))
      )
    );
    return trilho;
  }

  function montarTopo() {
    var buscaGlobal = U.busca({
      placeholder: 'Buscar cliente, serviço ou horário…',
      rotulo: 'Buscar em todo o painel',
      bloco: false,
      aoBuscar: function (termo) {
        if (!termo) return;
        estado.buscaGlobal = termo;
        N.roteador.ir('#/agendamentos');
      }
    });
    buscaGlobal.caixa.classList.add('topo__busca');

    /* --- sino de notificações --- */
    var botaoNotif = h('button.btn-icone', {
      type: 'button', id: 'botao-notificacoes',
      'aria-label': 'Notificações', title: 'Notificações'
    });
    botaoNotif.appendChild(U.svg('sino'));
    var ponto = h('span.btn-icone__ponto', { dados: { pontoNotif: 'sim' } });
    botaoNotif.appendChild(ponto);

    var menuNotif = U.menuFlutuante(botaoNotif, montarPainelNotif);

    refs.botaoNotif = botaoNotif;
    refs.pontoNotif = ponto;
    refs.menuNotif = menuNotif;

    /* --- menu do usuário --- */
    var botaoUsuario = h('button.topo__usuario', { type: 'button', 'aria-label': 'Conta e preferências' },
      U.avatar('Exclusiva Painel', 'p'),
      h('span.topo__usuario-nome', { texto: 'Proprietária' }),
      U.svg('chevron-baixo')
    );
    U.menuFlutuante(botaoUsuario, function (fechar) {
      return h('div', null,
        h('div.menu-flutuante__titulo', { texto: 'Sessão' }),
        U.itemMenu(h('div', null,
          h('div', { texto: 'Proprietária', estilo: { fontWeight: '500' } }),
          h('div.miudo', { texto: 'Acesso total · demonstrativo' })
        ), fechar, { icone: 'usuario' }),
        h('div.menu-flutuante__sep'),
        U.itemMenu('Configurações', function () { fechar(); N.roteador.ir('#/config'); }, { icone: 'ajustes' }),
        U.itemMenu('Ajuda e suporte', function () {
          fechar();
          U.confirmar({
            titulo: 'Ajuda e suporte',
            texto: 'Nesta demonstração não há canal de suporte conectado. No sistema real, ' +
                   'esta opção abre o contato direto com a equipe da Unitrix.',
            ok: 'Entendi', cancelar: false
          });
        }, { icone: 'info' }),
        h('div.menu-flutuante__sep'),
        U.itemMenu('Sair do painel', function () { fechar(); sair(); }, { icone: 'sair', perigo: true })
      );
    });

    var botaoMenu = h('button.btn-icone.topo__menu', {
      type: 'button', 'aria-label': 'Abrir menu', 'aria-controls': 'trilho', 'aria-expanded': 'false',
      ao: { click: abrirMenuMobile }
    });
    botaoMenu.appendChild(U.svg('menu'));
    refs.botaoMenu = botaoMenu;

    return h('header.topo', null,
      botaoMenu,
      h('span.topo__espaco'),
      buscaGlobal.caixa,
      h('div.topo__acoes', null, botaoNotif, botaoUsuario)
    );
  }

  function montarPainelNotif(fechar) {
    var lista = h('div.notif-painel__lista');
    var naoLidas = N.naoLidas();

    var botaoTodas = h('button.btn-texto', {
      type: 'button', texto: 'Marcar todas como lidas',
      ao: {
        click: function () {
          N.marcarTodasLidas();
          fechar();
          U.toast('Todas as notificações foram marcadas como lidas.', 'sucesso');
        }
      }
    });
    if (!naoLidas) botaoTodas.setAttribute('disabled', '');

    var itens = N.dados.notificacoes;
    if (!itens.length) {
      lista.appendChild(U.vazio('sino', 'Nada por aqui', 'Quando entrar um agendamento novo, ele aparece aqui.', null, true));
    } else {
      var ICONE_NOTIF = {
        novo: 'mais-circulo', cancelamento: 'x-circulo', reagendamento: 'relogio',
        confirmacao: 'checar-circulo', cliente: 'usuario', bloqueio: 'bloquear'
      };
      itens.slice(0, 20).forEach(function (n) {
        var marca = h('span.notif__marca');
        marca.appendChild(U.svg(ICONE_NOTIF[n.tipo] || 'info'));
        var b = h('button.notif', { type: 'button', dados: { tipo: n.tipo, lida: n.lida ? 'sim' : 'nao' } },
          marca,
          h('span.notif__corpo', null,
            h('span.notif__titulo', { texto: n.titulo }),
            n.texto ? h('span.notif__texto', { texto: n.texto }) : null,
            h('span.notif__quando', { texto: N.haQuanto(n.minutosAtras) })
          )
        );
        b.addEventListener('click', function () {
          N.marcarNotificacaoLida(n.id);
          fechar();
          N.roteador.ir(n.rota || '#/visao-geral');
        });
        lista.appendChild(b);
      });
    }

    var painel = h('div.notif-painel', null,
      h('div.notif-painel__topo', null,
        h('span.notif-painel__titulo', { texto: naoLidas ? naoLidas + ' não lidas' : 'Notificações' }),
        botaoTodas
      ),
      lista
    );
    return painel;
  }

  function montarBarraInferior() {
    var ICONES = { 'visao-geral': 'painel', agenda: 'agenda', agendamentos: 'lista', clientes: 'pessoas', servicos: 'tesoura' };
    var barra = h('nav.barra-inferior', { 'aria-label': 'Navegação principal' });
    ['visao-geral', 'agenda', 'agendamentos', 'clientes', 'servicos'].forEach(function (id) {
      var r = N.ROTAS.filter(function (x) { return x.id === id; })[0];
      var a = h('a.barra-inferior__item', { href: r.url, dados: { rota: id } },
        U.svg(ICONES[id]), h('span', { texto: r.rotulo })
      );
      barra.appendChild(a);
    });
    return barra;
  }

  function abrirMenuMobile() {
    refs.trilho.dataset.aberto = 'sim';
    U.fecharTudo();
    document.body.classList.add('menu-mobile-aberto');
    refs.botaoMenu.setAttribute('aria-expanded', 'true');
    var veu = document.createElement('div');
    veu.className = 'veu';
    veu.dataset.aberto = 'sim';
    veu.dataset.veuMenu = 'sim';
    veu.addEventListener('click', fecharMenuMobile);
    document.body.appendChild(veu);
    refs.veuMenu = veu;
    var primeiro = refs.trilho.querySelector('a.item-trilho');
    if (primeiro) setTimeout(function () { primeiro.focus(); }, 80);
    document.addEventListener('keydown', escMenu);
  }
  function escMenu(ev) { if (ev.key === 'Escape') fecharMenuMobile(); }
  function fecharMenuMobile() {
    refs.trilho.dataset.aberto = 'nao';
    refs.botaoMenu.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', escMenu);
    if (refs.veuMenu && refs.veuMenu.parentNode) refs.veuMenu.parentNode.removeChild(refs.veuMenu);
    refs.veuMenu = null;
    refs.botaoMenu.focus();
  }

  /* =======================================================================
     4. TROCA DE TELA
     ======================================================================= */
  var estado = { tela: 'visao-geral', params: [], buscaGlobal: '' };

  function realcarNavegacao(tela) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-rota]'), function (a) {
      if (a.dataset.rota === tela) a.setAttribute('aria-current', a.classList.contains('barra-inferior__item') ? 'page' : 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* O nome do salão vive no estado (Configurações → Salão). Estas três
     marcas — trilho, login e título da aba — são escritas aqui, no único
     ponto que roda a cada troca de tela, para que a troca apareça nas três
     ao mesmo tempo. Sem isto, o campo "Nome do salão" seria um ajuste que
     não ajusta nada. */
  function atualizarMarca() {
    var nome = N.dados.config.nome || 'Painel';
    Array.prototype.forEach.call(document.querySelectorAll('.trilho__nome'), function (el) {
      el.textContent = nome;
    });
    Array.prototype.forEach.call(document.querySelectorAll('.entrada-marca__nome'), function (el) {
      el.textContent = nome;
    });
  }

  function atualizarContadores() {
    /* Quantos agendamentos de hoje ainda pedem ação (novo/pendente) */
    var chaveHoje = D.chaveDe(new Date());
    var pendentes = N.dados.agendamentos.filter(function (a) {
      return a.dataChave === chaveHoje && (a.status === 'novo' || a.status === 'pendente');
    }).length;
    Array.prototype.forEach.call(document.querySelectorAll('[data-contador="agendamentos"]'), function (el) {
      if (pendentes) { el.textContent = String(pendentes); el.style.display = ''; }
      else el.style.display = 'none';
    });
    /* Ponto do sino */
    if (refs.pontoNotif) {
      refs.pontoNotif.style.display = N.naoLidas() ? '' : 'none';
    }
  }

  /* =======================================================================
     ENTRADA DAS SEÇÕES
     Marca cada seção de primeiro nível com a sua posição (--ordem). O CSS
     usa essa posição para atrasar a animação de entrada em passos curtos.
     É marcação de leitura, não estrutura: quem manda no layout é o CSS.
     ======================================================================= */
  var SELETOR_SECAO = '.bloco, .grade, .cartao, .colunas, .barra-filtros';
  function escalonar(no) {
    if (!no || no.nodeType !== 1) return;
    var filhas = no.children || [];
    var ordem = 0;
    for (var i = 0; i < filhas.length; i++) {
      var f = filhas[i];
      if (f.nodeType !== 1) continue;
      var casa = SELETOR_SECAO.split(', ').some(function (c) {
        return f.classList && f.classList.contains(c.slice(1));
      });
      if (!casa) continue;
      f.style.setProperty('--ordem', String(ordem));
      ordem += 1;
      if (ordem >= 8) ordem = 8;   /* depois da 8ª, todas entram juntas */
    }
  }

  function mostrarTela(tela, params) {
    estado.tela = tela;
    estado.params = params || [];
    var alvo = document.getElementById('tela-atual');
    if (!alvo) return;
    U.limpar(alvo);

    var definicao = window.TELAS[tela];
    if (!definicao) {
      alvo.appendChild(U.vazio('info', 'Tela não encontrada', 'A rota “' + tela + '” não existe nesta demonstração.'));
      return;
    }
    try {
      definicao.aoAbrir && definicao.aoAbrir(estado.params);
      var no = definicao.montar(estado.params, estado);
      /* Ordem de entrada das seções da tela. Fica aqui, num lugar só, para
         o escalonamento valer em TODAS as telas sem repetir regra de CSS
         nem tocar em nove arquivos de tela. */
      escalonar(no);
      alvo.appendChild(no);
    } catch (e) {
      alvo.appendChild(U.vazio('alerta', 'Não foi possível montar esta tela',
        'Ocorreu um erro ao desenhar a tela. Detalhe técnico: ' + e.message));
      throw e;
    }

    realcarNavegacao(tela);
    atualizarContadores();
    atualizarMarca();
    document.title = (definicao.titulo ? definicao.titulo + ' · ' : '') +
      N.dados.config.nome + ' — Painel de gestão';
    /* Volta ao topo ao trocar de tela: o painel não deve começar rolado. */
    window.scrollTo(0, 0);
    alvo.scrollTop = 0;
  }

  /* As telas pedem redesenho quando o estado muda. */
  function redesenhar() {
    if (!SESSAO.entrando && document.getElementById('app')) mostrarTela(estado.tela, estado.params);
  }

  /* =======================================================================
     5. ENTRAR E SAIR
     ======================================================================= */
  function entrar() {
    var entrada = document.getElementById('entrada');
    var painel = document.getElementById('app');
    entrada.hidden = true;
    painel.hidden = false;
    SESSAO.entrando = false;
    if (!window.location.hash) window.location.hash = '#/visao-geral';
    mostrarTela(N.roteador.atual().tela, N.roteador.atual().params);
    U.toast('Bem-vinda ao painel. Este ambiente é uma demonstração.', 'sucesso', { negrito: 'Acesso liberado.' });
    setTimeout(function () {
      var alvo = document.querySelector('#tela-atual .cabecalho h1, #tela-atual h1');
      if (alvo) { alvo.setAttribute('tabindex', '-1'); alvo.focus(); }
    }, 120);
  }

  function sair() {
    U.confirmar({
      titulo: 'Sair do painel',
      texto: 'Você volta para a tela de entrada. Nenhum dado é apagado — a demonstração recomeça do zero ao entrar de novo.',
      ok: 'Sair', perigo: true,
      aoConfirmar: function () {
        var entrada = document.getElementById('entrada');
        var painel = document.getElementById('app');
        painel.hidden = true;
        entrada.hidden = false;
        SESSAO.entrando = true;
        window.location.hash = '';
        document.title = 'Entrar · Exclusiva Hair';
        var campo = document.getElementById('entrada-email');
        if (campo) setTimeout(function () { campo.focus(); }, 80);
        U.toast('Sessão encerrada.', 'info');
      }
    });
  }

  /* =======================================================================
     6. BOOT
     ======================================================================= */
  /* -------------------------------------------------------------------
     RECOLHIMENTO DOS PEDIDOS DO SITE (ponte demonstrativa)

     O site grava um pedido numa chave do localStorage; aqui ele vira
     agendamento de verdade, pelo MESMO `criarAgendamento` que o balcão
     usa — não existe caminho paralelo de criação.

     Três decisões que valem explicação:

     1. Os dois ajustes de Configurações → Agendamento que decidem se algo
        vindo do site entra (`agendamentoOnline`) e com que status
        (`confirmacaoAutomatica`) vivem lá no núcleo. Deixá-los aqui seria
        decorativo. O que é decisão DESTA tela é que um lote recolhido não
        pode ser metade recusado e metade aceito sem ninguém saber: por
        isso o interruptor é lido antes de começar e o lote para inteiro,
        com um toast dizendo por quê.

     2. `criarAgendamento` exige um cliente. O pedido do site traz nome e
        telefone, não uma ficha — então a ficha nasce aqui, com
        `N.salvarCliente`, que é o mesmo caminho do cadastro manual. Antes
        de criar, procura-se a cliente pelo TELEFONE em `N.dados.clientes`:
        quem já é da casa não ganha segunda ficha a cada agendamento.

     3. O agendamento que o núcleo devolve guarda, na primeira linha do
        próprio histórico, o id do recado original. É por esse rastro que
        uma reimportação é reconhecida — não por contador em memória, que
        se perde a cada recarregamento e duplicaria o agendamento no
        segundo F5.
     ------------------------------------------------------------------- */
  function idInternoDeOrigem(registro) {
    var alvo = 'Pedido do site ' + registro.id;
    var achado = null;
    (N.dados.agendamentos || []).forEach(function (a) {
      if (achado) return;
      if ((a.historico || []).some(function (l) { return l.texto === alvo; })) achado = a.id;
    });
    return achado;
  }

  function recolherPedidosDoSite() {
    var P = window.PonteSite;
    if (!P || !P.disponivel || !P.disponivel()) return;

    /* TODOS os recados, e não só os pendentes: a base do painel é remontada
       a cada abertura, então o que já foi importado volta a precisar de
       importação depois de um F5. Quem impede a duplicação não é a
       bandeirinha da ponte, é a marca no histórico do agendamento — é ela
       que sobrevive à recarga e é ela que o laço confere abaixo. */
    var pendentes = P.listarTodos();
    if (!pendentes.length) return;

    var bloqueadoPelaConfig = N.dados.config.agendamentoOnline === false;
    var recolhidos = 0;

    pendentes.forEach(function (r) {
      /* Já existe um agendamento deste pedido: só falta marcar o recado
         como recolhido. É o caso do recarregamento depois de uma falha
         no meio do lote. */
      var jaEntrou = idInternoDeOrigem(r);
      if (jaEntrou) { P.marcarImportado(r.id, jaEntrou); return; }
      if (bloqueadoPelaConfig) return;

      var servico = (N.dados.servicos || []).filter(function (s) { return s.id === r.servicoId; })[0];
      if (!servico) return;   /* serviço que não existe mais: recado fica parado, não é apagado */

      var digitos = String(r.telefone || '').replace(/\D/g, '');
      var ficha = (N.dados.clientes || []).filter(function (c) {
        return String(c.fone || '').replace(/\D/g, '') === digitos && digitos.length >= 10;
      })[0];

      if (!ficha) {
        var novo = N.salvarCliente({ nome: r.cliente, fone: digitos, email: '', nota: '' });
        if (!novo.ok) return;
        ficha = novo.cliente;
      }

      var criado = N.criarAgendamento({
        clienteId: ficha.id,
        servicoId: r.servicoId,
        dataChave: r.data,
        inicio: r.horario,
        origem: 'site',
        observacoes: r.observacoes || ''
      });
      if (!criado.ok) return;

      criado.agendamento.historico.push({
        quando: criado.agendamento.criadoEm,
        texto: 'Pedido do site ' + r.id,
        tipo: 'site'
      });
      P.marcarImportado(r.id, criado.agendamento.id);
      recolhidos++;
    });

    if (!recolhidos) return;
    U.toast(recolhidos === 1
      ? '1 agendamento novo chegou pelo site.'
      : recolhidos + ' agendamentos novos chegaram pelo site.', 'sucesso');
  }

  function iniciar() {
    /* ANTES de montar o painel: o que vier do site precisa já estar na
       agenda quando a primeira tela for desenhada. */
    EH_APP.recolherPedidosDoSite = recolherPedidosDoSite;
    recolherPedidosDoSite();

    var raiz = document.getElementById('raiz');
    U.limpar(raiz);

    var entrada = montarEntrada();
    var trilho = montarTrilho();
    var topo = montarTopo();

    var conteudo = h('div.conteudo', null, h('div#tela-atual'));
    var app = h('div.app', { id: 'app', hidden: true },
      trilho,
      h('div.coluna', null, topo, conteudo),
      montarBarraInferior()
    );

    raiz.appendChild(entrada);
    raiz.appendChild(app);
    refs.trilho = trilho;

    /* Preferência do trilho lembrada entre recarregamentos. */
    try {
      if (sessionStorage.getItem('eh-trilho') === 'sim') {
        app.dataset.recolhido = 'sim';
        var t = trilho.querySelector('#trilho-alternar .item-trilho__texto');
        if (t) t.textContent = 'Expandir menu';
      }
    } catch (e) {}

    /* Fecha o menu mobile ao navegar */
    trilho.addEventListener('click', function (ev) {
      if (ev.target.closest('a.item-trilho')) fecharMenuMobile();
    });

    N.roteador.emMudanca(function (tela, params) {
      if (document.getElementById('app').hidden) return;
      mostrarTela(tela, params);
    });

    N.store.inscrever(function () {
      atualizarContadores();
    });

    /* A sessão começa no login: é o primeiro passo do fluxo de demonstração. */
    SESSAO.entrando = true;
    document.title = 'Entrar · Exclusiva Hair';
    setTimeout(function () {
      var campo = document.getElementById('entrada-email');
      if (campo) campo.focus();
    }, 120);
  }

  Object.assign(EH_APP, {
    iniciar: iniciar, redesenhar: redesenhar, entrar: entrar, sair: sair, estado: estado,
    abrirAgendamento: function (el) { if (el) el.dispatchEvent({ type: 'click', target: el, preventDefault: function () {} }); },
    mudarStatus: function (id, status) { return N.mudarStatus(id, status); },
    abrirNovo: function (semente) { return window.AGENDA.abrirNovo(semente || {}); },
    irPara: function (url) { N.roteador.ir(url); },
    recolherPedidosDoSite: recolherPedidosDoSite
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
