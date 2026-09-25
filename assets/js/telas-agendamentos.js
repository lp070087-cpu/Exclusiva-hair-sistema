/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-agendamentos.js
   Lista completa de agendamentos: busca, filtros, ordenação, paginação e
   as ações de situação. Cada linha mostra a ORIGEM (Site × Manual) — o
   briefing pede essa distinção explícita.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  var TELAS = (window.TELAS = window.TELAS || {});

  var POR_PAGINA = 12;

  /* Estado da tela, preservado enquanto o painel viver. */
  var F = {
    busca: '', status: [], origem: [], periodo: 'todos',
    de: '', ate: '', ordem: 'data-desc', pagina: 1
  };

  function hojeChave() { return D.chaveDe(new Date()); }

  function janela(chave) {
    var hoje = hojeChave();
    if (chave === 'todos') return null;
    if (chave === 'hoje') return [hoje, hoje];
    if (chave === 'semana') {
      var d = new Date();
      var recuo = d.getDay() === 0 ? 6 : d.getDay() - 1;
      var ini = new Date(d.getFullYear(), d.getMonth(), d.getDate() - recuo);
      var fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
      return [D.chaveDe(ini), D.chaveDe(fim)];
    }
    if (chave === '7') {
      var a = new Date();
      var b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7);
      return [hoje, D.chaveDe(b)];
    }
    if (chave === '30') {
      var a2 = new Date();
      var b2 = new Date(a2.getFullYear(), a2.getMonth(), a2.getDate() + 30);
      return [hoje, D.chaveDe(b2)];
    }
    if (chave === 'passado') return ['', hoje];
    if (chave === 'personalizado' && F.de && F.ate) return [F.de, F.ate];
    return null;
  }

  function selecionar() {
    var lista = N.dados.agendamentos.slice();
    var faixa = janela(F.periodo);
    if (faixa) {
      lista = lista.filter(function (a) {
        if (faixa[0] && a.dataChave < faixa[0]) return false;
        if (faixa[1] && a.dataChave > faixa[1]) return false;
        return true;
      });
    }
    if (F.status.length) lista = lista.filter(function (a) { return F.status.indexOf(a.status) !== -1; });
    if (F.origem.length) lista = lista.filter(function (a) { return F.origem.indexOf(a.origem) !== -1; });
    if (F.busca) {
      var t = F.busca.toLowerCase();
      lista = lista.filter(function (a) { return N.textoBusca(a).indexOf(t) !== -1; });
    }
    var sinal = F.ordem === 'data-asc' ? 1 : -1;
    lista.sort(function (a, b) {
      if (a.dataChave !== b.dataChave) return (a.dataChave < b.dataChave ? -1 : 1) * sinal;
      return (a.inicioMin - b.inicioMin) * sinal;
    });
    return lista;
  }

  function contagemPorStatus(lista) {
    var c = {};
    N.ORDEM_ESTADOS.forEach(function (s) { c[s] = 0; });
    lista.forEach(function (a) { c[a.status] = (c[a.status] || 0) + 1; });
    return c;
  }

  TELAS.agendamentos = {
    titulo: 'Agendamentos',
    aoAbrir: function (params) {
      if (params && params[0]) F.busca = params[0];
    },
    montar: function (params, estado) {
      /* A busca global do topo chega por aqui. */
      if (estado && estado.buscaGlobal) { F.busca = estado.buscaGlobal; estado.buscaGlobal = ''; }
      F.pagina = 1;

      var todos = N.dados.agendamentos.slice();
      var lista = selecionar();
      var contagem = contagemPorStatus(todos);

      var caixa = h('div');

      caixa.appendChild(h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: 'Agendamentos' }),
          h('div.cabecalho__contexto', null,
            h('span', { texto: todos.length + ' registros na demonstração' }),
            U.marcaDemo('fictícios')
          )
        ),
        h('div.cabecalho__acoes', null,
          h('button.btn.btn--principal', {
            type: 'button',
            ao: { click: function () { window.AGENDA.abrirNovo({ dataChave: hojeChave() }); } }
          }, U.svg('mais'), document.createTextNode('Novo agendamento'))
        )
      ));

      /* --- barra de filtros: duas réguas ---
         Régua 1: busca + filtros + ordenação.
         Régua 2: períodos + De/Até (o "Personalizado" abre as datas ali
         mesmo, sem tirar nada do lugar).
         Todos os controles têm a MESMA altura (--controle-alt). */
      var barra = h('div.barra-filtros');

      var buscaEl = U.busca({
        placeholder: 'Buscar por cliente, serviço ou telefone…',
        bloco: false, tamanho: 'compacta',
        aoBuscar: function (t) { F.busca = t; F.pagina = 1; redesenharLista(); }
      });
      if (F.busca) buscaEl.entrada.value = F.busca;

      /* Painel de status e origem — gaveta lateral, para não empilhar chips */
      var botaoFiltros = h('button.btn.btn--secundario', {
        type: 'button',
        ao: { click: function () { abrirFiltros(); } }
      }, U.svg('filtro'), document.createTextNode('Filtros'));
      var aplicados = h('span.contador-filtros');
      botaoFiltros.appendChild(aplicados);

      var rotuloOrdem = function () { return F.ordem === 'data-asc' ? 'Mais antigos' : 'Mais recentes'; };
      var botaoOrdem = h('button.btn.btn--secundario', {
        type: 'button',
        ao: { click: function () { abrirOrdem(); } }
      }, U.svg('setas'), document.createTextNode(rotuloOrdem()));

      barra.appendChild(h('div.barra-filtros__linha', null,
        h('div.filtros__busca', null, buscaEl.el),
        botaoFiltros,
        h('div.barra-filtros__espaco'),
        botaoOrdem
      ));

      /* --- régua 2: períodos --- */
      var periodos = [
        { id: 'todos', nome: 'Todos' }, { id: 'hoje', nome: 'Hoje' },
        { id: 'semana', nome: 'Esta semana' }, { id: '7', nome: 'Próximos 7 dias' },
        { id: '30', nome: 'Próximos 30 dias' }, { id: 'passado', nome: 'Até hoje' }
      ];
      var grupoPeriodo = h('div.filtros__grupo', { role: 'group', 'aria-label': 'Período' });
      /* Mapa chip → id. Antes a marcação usava o ÍNDICE do chip dentro do
         grupo (periodos[i]), mas o grupo recebe um chip a mais (Personalizado):
         ao clicar em qualquer período, periodos[6] era undefined e o laço
         estourava ANTES de redesenhar a lista. O filtro simplesmente não
         mudava nada e o erro ia para o console. */
      var chipDoPeriodo = {};

      function marcarPeriodo(id) {
        Object.keys(chipDoPeriodo).forEach(function (k) {
          chipDoPeriodo[k].setAttribute('aria-pressed', k === id ? 'true' : 'false');
        });
      }

      periodos.forEach(function (p) {
        var c = U.chip(p.nome, F.periodo === p.id, function () {
          F.periodo = p.id; F.pagina = 1;
          datasCustom.hidden = (F.periodo !== 'personalizado');
          marcarPeriodo(F.periodo);
          redesenharLista();
        });
        chipDoPeriodo[p.id] = c;
        grupoPeriodo.appendChild(c);
      });

      /* Personalizado: o chip abre as datas ao lado, na mesma régua. */
      var datasCustom = h('div.filtros__datas');
      var campoDe = U.campo({ tipo: 'date', rotulo: 'De', valor: F.de, id: 'f-de', curto: true });
      var campoAte = U.campo({ tipo: 'date', rotulo: 'Até', valor: F.ate, id: 'f-ate', curto: true });
      [campoDe, campoAte].forEach(function (c) {
        c.controle.addEventListener('change', function () {
          F.de = campoDe.valor(); F.ate = campoAte.valor();
          if (F.de && F.ate) { F.periodo = 'personalizado'; F.pagina = 1; redesenharLista(); }
        });
      });
      datasCustom.appendChild(campoDe.el);
      datasCustom.appendChild(campoAte.el);
      datasCustom.hidden = F.periodo !== 'personalizado';

      var chipPersonalizado = U.chip('Personalizado', F.periodo === 'personalizado', function () {
        F.periodo = 'personalizado';
        datasCustom.hidden = false;
        marcarPeriodo('personalizado');
        if (F.de && F.ate) redesenharLista();
      }, { icone: 'calendario' });
      chipDoPeriodo.personalizado = chipPersonalizado;
      grupoPeriodo.appendChild(chipPersonalizado);

      barra.appendChild(h('div.barra-filtros__linha.barra-filtros__linha--rolavel', null,
        grupoPeriodo, datasCustom
      ));

      function temFiltro() { return F.status.length + F.origem.length > 0; }
      function sincronizarContador() {
        var n = F.status.length + F.origem.length;
        aplicados.textContent = n ? String(n) : '';
        aplicados.hidden = !n;
        botaoFiltros.dataset.ativo = n ? 'sim' : 'nao';
      }

      function abrirFiltros() {
        var g = U.gaveta({
          titulo: 'Filtros', sobreTitulo: 'Agendamentos', larga: false,
          acoes: [
            h('button.btn.btn--secundario.btn--empurrar', {
              type: 'button', texto: 'Limpar',
              ao: {
                click: function () {
                  F.status = []; F.origem = []; F.pagina = 1;
                  sincronizarContador(); redesenharLista(); g.fechar();
                  U.toast('Filtros limpos.', 'info');
                }
              }
            }),
            h('button.btn.btn--principal', {
              type: 'button', texto: 'Ver resultados',
              ao: { click: function () { g.fechar(); redesenharLista(); } }
            })
          ]
        });
        g.corpo.appendChild(h('div.bloco', null,
          h('h3.bloco__titulo', { texto: 'Situação' }),
          (function () {
            var grade = h('div.grade-opcoes');
            N.ORDEM_ESTADOS.forEach(function (id) {
              var n = contagem[id] || 0;
              grade.appendChild(h('label.marcador', null,
                h('input', {
                  type: 'checkbox',
                  checked: F.status.indexOf(id) !== -1,
                  ao: {
                    change: function () {
                      var i = F.status.indexOf(id);
                      if (i === -1) F.status.push(id); else F.status.splice(i, 1);
                      F.pagina = 1; sincronizarContador();
                    }
                  }
                }),
                U.selo(id),
                h('span.miudo', { texto: '(' + n + ')' })
              ));
            });
            return grade;
          })()
        ));
        g.corpo.appendChild(h('div.bloco', null,
          h('h3.bloco__titulo', { texto: 'Origem' }),
          (function () {
            var grade = h('div.grade-opcoes');
            [['site', 'Recebido pelo site'], ['manual', 'Lançado no painel']].forEach(function (par) {
              grade.appendChild(h('label.marcador', null,
                h('input', {
                  type: 'checkbox', checked: F.origem.indexOf(par[0]) !== -1,
                  ao: {
                    change: function () {
                      var i = F.origem.indexOf(par[0]);
                      if (i === -1) F.origem.push(par[0]); else F.origem.splice(i, 1);
                      F.pagina = 1; sincronizarContador();
                    }
                  }
                }),
                U.origem(par[0]),
                h('span.miudo', { texto: par[1] })
              ));
            });
            return grade;
          })()
        ));
        g.corpo.appendChild(h('div.bloco', null, U.avisoDemo(
          'Todos os registros desta lista são fictícios e servem para demonstrar o painel.')));
      }

      function abrirOrdem() {
        U.menuFlutuante(botaoOrdem, function (fechar) {
          return [
            U.itemMenu(function () { return document.createTextNode('Mais recentes primeiro'); }, function () { F.ordem = 'data-desc'; F.pagina = 1; botaoOrdem.lastChild.textContent = 'Mais recentes'; fechar(); redesenharLista(); }),
            U.itemMenu(function () { return document.createTextNode('Mais antigos primeiro'); }, function () { F.ordem = 'data-asc'; F.pagina = 1; botaoOrdem.lastChild.textContent = 'Mais antigos'; fechar(); redesenharLista(); })
          ];
        }, { alinhar: 'fim' });
      }

      /* --- resultado --- */
      var resultado = h('div');
      caixa.appendChild(barra);
      caixa.appendChild(resultado);

      function redesenharLista() {
        U.limpar(resultado);
        var itens = selecionar();
        var totalPaginas = Math.max(1, Math.ceil(itens.length / POR_PAGINA));
        if (F.pagina > totalPaginas) F.pagina = totalPaginas;
        var fatia = itens.slice((F.pagina - 1) * POR_PAGINA, F.pagina * POR_PAGINA);

        resultado.appendChild(h('div.lista-topo', null,
          h('span', {
            texto: itens.length === 1 ? '1 agendamento' : itens.length + ' agendamentos' +
              (itens.length !== todos.length ? ' (de ' + todos.length + ')' : '')
          }),
          F.busca ? h('span.miudo', { texto: 'busca: “' + F.busca + '”' }) : null
        ));

        if (!fatia.length) {
          resultado.appendChild(U.vazio('calendario', 'Nenhum agendamento encontrado',
            'Ajuste a busca, o período ou os filtros de situação.',
            h('button.btn.btn--secundario', {
              type: 'button', texto: 'Limpar filtros',
              ao: {
                click: function () {
                  F.busca = ''; F.status = []; F.origem = []; F.periodo = 'todos';
                  F.de = ''; F.ate = ''; F.pagina = 1;
                  buscaEl.entrada.value = '';
                  sincronizarContador();
                  TELAS.agendamentos.montar([], estado);
                }
              }
            })));
          return;
        }

        /* Agrupado por dia: a data vira um cabeçalho discreto e os cartões
           do mesmo dia ficam juntos. Antes a data se repetia acima de CADA
           item, o que poluía a lista e dobrava a altura dela. */
        var lista_el = h('div.pilha-dias');
        var diaAtual = null;
        fatia.forEach(function (a) {
          if (a.dataChave !== diaAtual) {
            diaAtual = a.dataChave;
            lista_el.appendChild(h('div.dia-cabeca', null,
              h('span.dia-cabeca__nome', { texto: N.rotuloDia(a.dataChave, new Date()) }),
              h('span.miudo', { texto: N.dataCurta(a.dataChave) })
            ));
          }
          lista_el.appendChild(U.linhaAgendamento(a, { aoAbrir: window.AGENDA.abrirDetalhe }));
        });
        resultado.appendChild(lista_el);

        if (totalPaginas > 1) {
          resultado.appendChild(U.paginacao(itens.length, F.pagina, POR_PAGINA, function (p) {
            F.pagina = p; redesenharLista();
            var topo = caixa.querySelector('.lista-topo');
            if (topo) topo.scrollIntoView({ block: 'start' });
          }));
        }
      }

      sincronizarContador();
      redesenharLista();
      return caixa;
    }
  };
})();
