/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-servicos.js
   Catálogo de serviços: lista, ficha, novo/editar e o interruptor que
   coloca (ou tira) o serviço da agenda on-line do site.

   PREÇO: os materiais do salão NÃO trazem os valores. O painel mostra
   "Consultar" e explica por quê — nunca um número inventado.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  var TELAS = (window.TELAS = window.TELAS || {});

  var CAT = null;

  /* ---------------------------------------------------------------------
     Quantos atendimentos cada serviço já teve na demonstração — dá vida à
     lista sem inventar faturamento.
     --------------------------------------------------------------------- */
  function usoPorServico() {
    var c = {};
    N.dados.agendamentos.forEach(function (a) {
      c[a.servicoId] = (c[a.servicoId] || 0) + 1;
    });
    return c;
  }

  function nomeCategoria(id) {
    var c = D.CATEGORIAS.filter(function (x) { return x.id === id; })[0];
    return c ? c.nome : id;
  }

  TELAS.servicos = {
    titulo: 'Serviços',
    aoAbrir: function () {},
    montar: function () {
      var caixa = h('div');
      var uso = usoPorServico();
      var lista = N.dados.servicos;
      var ativos = lista.filter(function (s) { return s.ativo; }).length;
      var online = lista.filter(function (s) { return s.online; }).length;

      caixa.appendChild(h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: 'Serviços' }),
          h('div.cabecalho__contexto', null,
            h('span', { texto: lista.length + ' serviços cadastrados · ' + online + ' disponíveis no site' }),
            U.marcaDemo('catálogo demonstrativo')
          )
        ),
        h('div.cabecalho__acoes', null,
          h('button.btn.btn--principal', {
            type: 'button',
            ao: { click: function () { abrirEditor(null); } }
          }, U.svg('mais'), document.createTextNode('Novo serviço'))
        )
      ));

      caixa.appendChild(h('div.grade.grade--metricas', null,
        U.metrica({ rotulo: 'Serviços ativos', valor: ativos + ' de ' + lista.length, icone: 'tesoura', demo: true }),
        U.metrica({ rotulo: 'Disponíveis no site', valor: String(online), icone: 'globo', demo: true,
          nota: 'agendamento on-line' }),
        U.metrica({
          rotulo: 'Atendimentos na agenda', valor: String(N.dados.agendamentos.length),
          icone: 'lista', demo: true
        }),
        U.metrica({
          rotulo: 'Duração média',
          valor: N.duracaoLegivel(Math.round(lista.reduce(function (s, x) {
            return s + x.duracao;
          }, 0) / lista.length)),
          icone: 'relogio', demo: true
        })
      ));

      /* --- aviso de preço: dito uma vez, no lugar certo --- */
      caixa.appendChild(U.avisoDemo(
        'Os valores dos serviços não constam nos materiais do salão. Por isso o painel exibe ' +
        '“Consultar” no lugar do preço — nenhum valor foi estimado ou inventado.', false));

      /* --- categorias: filtro por chips --- */
      CAT = CAT || 'todas';
      var chips = h('div.filtros', { role: 'group', 'aria-label': 'Categoria' });
      chips.appendChild(U.chip('Todas', CAT === 'todas', function () { CAT = 'todas'; redesenhar(); }));
      D.CATEGORIAS.forEach(function (c) {
        chips.appendChild(U.chip(c.nome, CAT === c.id, function () { CAT = c.id; redesenhar(); }));
      });
      var area = h('div');
      caixa.appendChild(chips);
      caixa.appendChild(area);

      function visiveis() {
        return CAT === 'todas' ? lista : lista.filter(function (s) { return s.categoria === CAT; });
      }

      function redesenhar() {
        U.limpar(chips);
        chips.appendChild(U.chip('Todas', CAT === 'todas', function () { CAT = 'todas'; redesenhar(); }));
        D.CATEGORIAS.forEach(function (c) {
          chips.appendChild(U.chip(c.nome, CAT === c.id, function () { CAT = c.id; redesenhar(); }));
        });
        U.limpar(area);
        var itens = visiveis();
        if (!itens.length) {
          area.appendChild(U.vazio('tesoura', 'Nenhum serviço nesta categoria', null, null, true));
          return;
        }
        var grade = h('div.grade-servicos');
        itens.forEach(function (s) { grade.appendChild(cartao(s)); });
        area.appendChild(grade);
      }

      function cartao(s) {
        var n = uso[s.id] || 0;
        var card = h('article.servico-cartao', {
          dados: { inativo: s.ativo ? 'nao' : 'sim' }
        },
          h('header.servico-cartao__topo', null,
            h('div', null,
              h('h3.servico-cartao__nome', { texto: s.nome }),
              h('span.servico-cartao__categoria', { texto: nomeCategoria(s.categoria) })
            ),
            h('span.pill-duracao', null, U.svg('relogio'),
              document.createTextNode(N.duracaoLegivel(s.duracao)))
          ),
          h('p.servico-cartao__resumo', { texto: s.resumo }),
          h('div.servico-cartao__dados', null,
            h('span.linha-dado', null,
              h('span.linha-dado__rotulo', { texto: 'Valor' }),
              h('span.traco', { texto: 'Consultar' })),
            h('span.linha-dado', null,
              h('span.linha-dado__rotulo', { texto: 'Na agenda' }),
              h('span.linha-dado__valor', { texto: n + (n === 1 ? ' atendimento' : ' atendimentos') }))
          ),
          h('footer.servico-cartao__rodape', null,
            h('span.etiquetas', null,
              s.online
                ? h('span.selo.selo--confirmado', null, U.svg('globo'), document.createTextNode('No site'))
                : h('span.selo', null, U.svg('bloquear'), document.createTextNode('Só no painel')),
              s.ativo ? null : h('span.selo.selo--cancelado', { texto: 'Inativo' })
            ),
            h('div.servico-cartao__acoes', null,
              h('button.btn-icone', {
                type: 'button', 'aria-label': 'Editar ' + s.nome,
                ao: { click: function () { abrirEditor(s); } }
              }, U.svg('editar')),
              U.interruptor({
                ligado: s.online,
                rotulo: 'Permitir agendamento on-line de ' + s.nome,
                aoMudar: function (ligado) {
                  /* O núcleo alterna sozinho a partir do estado atual;
                     só é chamado quando o valor muda de verdade. */
                  var r = N.alternarOnlineServico(s.id);
                  if (r.ok) U.toast(r.mensagem, 'sucesso');
                  else { U.toast(r.mensagem, 'erro'); window.EH_APP.redesenhar(); }
                }
              }).el
            )
          )
        );
        card.appendChild(h('div.servico-cartao__demo', null, U.marcaDemo('demo')));
        return card;
      }

      redesenhar();
      return caixa;
    }
  };

  /* ---------------------------------------------------------------------
     EDITOR — novo e editar usam a mesma tela
     --------------------------------------------------------------------- */
  function abrirEditor(servico) {
    var novo = !servico;
    var m;
    var campoNome = U.campo({
      tipo: 'text', rotulo: 'Nome do serviço', max: 48,
      valor: servico ? servico.nome : '', placeholder: 'Ex.: Corte e finalização'
    });
    var campoCategoria = U.campo({
      tipo: 'selecao', rotulo: 'Categoria',
      valor: servico ? servico.categoria : (D.CATEGORIAS[0] && D.CATEGORIAS[0].id),
      opcoes: D.CATEGORIAS.map(function (c) { return { valor: c.id, nome: c.nome }; }),
      vazio: 'Selecione a categoria…'
    });
    var campoDuracao = U.campo({
      tipo: 'selecao', rotulo: 'Duração',
      valor: servico ? String(servico.duracao) : '60',
      opcoes: [30, 45, 60, 90, 120, 150, 180].map(function (min) {
        return { valor: String(min), nome: N.duracaoLegivel(min) + '  (' + min + ' min)' };
      }),
      dica: 'A duração define quanto tempo fica reservado na agenda.'
    });
    var campoResumo = U.campo({
      tipo: 'area', rotulo: 'Descrição', linhas: 3, max: 160,
      valor: servico ? servico.resumo : '',
      placeholder: 'Uma frase sobre o serviço'
    });
    var campoOnline = U.campo({
      tipo: 'interruptor', rotulo: 'Disponível para agendamento no site',
      valor: servico ? servico.online : false,
      textoInterruptor: 'Aparece na agenda on-line'
    });
    var campoAtivo = U.campo({
      tipo: 'interruptor', rotulo: 'Serviço ativo',
      valor: servico ? servico.ativo : true,
      textoInterruptor: 'Aceita novos agendamentos'
    });

    var botaoOk = h('button.btn.btn--principal', {
      type: 'button', texto: novo ? 'Criar serviço' : 'Salvar alterações',
      ao: {
        click: function () {
          var nome = campoNome.valor().trim();
          campoNome.marcarErro(null);
          if (nome.length < 3) { campoNome.marcarErro('Escreva pelo menos 3 letras.'); return; }
          if (!campoCategoria.valor()) { U.toast('Escolha a categoria.', 'alerta'); return; }
          var r = N.salvarServico({
            id: servico ? servico.id : null,
            nome: nome,
            categoria: campoCategoria.valor(),
            duracao: parseInt(campoDuracao.valor(), 10),
            resumo: campoResumo.valor().trim(),
            online: campoOnline.valor(),
            ativo: campoAtivo.valor()
          });
          if (r.ok) {
            m.fechar();
            U.toast(novo ? 'Serviço criado no catálogo demonstrativo.'
                         : 'Serviço atualizado.', 'sucesso');
            window.EH_APP.redesenhar();
          } else U.toast(r.mensagem, 'erro');
        }
      }
    });

    m = U.modal({
      titulo: novo ? 'Novo serviço' : 'Editar serviço',
      texto: novo
        ? 'Este cadastro vive só nesta sessão do navegador — é uma demonstração.'
        : servico.nome,
      largo: true,
      acoes: [
        h('button.btn.btn--secundario', {
          type: 'button', texto: 'Cancelar', ao: { click: function () { m.fechar(); } }
        }),
        botaoOk
      ],
      corpo: h('div', null,
        h('div.campo-duplo', null, campoNome.el, campoCategoria.el),
        h('div', { estilo: { marginTop: 'var(--e4)' } }, campoDuracao.el),
        h('div', { estilo: { marginTop: 'var(--e4)' } }, campoResumo.el),
        h('div.bloco', { estilo: { marginTop: 'var(--e4)' } },
          h('h4.bloco__titulo', { texto: 'Disponibilidade' }),
          h('div.linha-opcao', null, campoOnline.el, campoAtivo.el)
        ),
        h('div.bloco', null,
          h('h4.bloco__titulo', { texto: 'Valor' }),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Preço' }),
            h('span.traco', { texto: 'Consultar' })),
          h('p.miudo', { estilo: { marginTop: 'var(--e2)' },
            texto: 'Os materiais do salão não trazem os preços dos serviços. ' +
              'O campo fica como “Consultar” até que a lista oficial de valores seja informada — ' +
              'nenhum número foi estimado.' })
        )
      )
    });
    return m;
  }
})();
