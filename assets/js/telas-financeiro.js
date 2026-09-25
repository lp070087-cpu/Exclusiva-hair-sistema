/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-financeiro.js

   ATENÇÃO AO CONTRATO DESTA TELA:
   os materiais do salão não trazem preço de serviço, ticket médio, custo
   nem forma de pagamento oficial. Então a tabela de preços continua vazia
   (SERVICOS[].preco === null) e "Consultar" continua onde o preço oficial
   vai entrar quando o salão informar.

   O que o Financeiro soma é OUTRA coisa: o valor que foi LANÇADO em cada
   atendimento — o que a proprietária digitou ao finalizar. É o movimento
   do caixa, não a tabela de preços. Todo número aqui é demonstrativo.

   Três regras que esta tela nunca quebra:
   1. `null` não é `0`. Atendimento sem valor lançado fica FORA do
      faturamento e do ticket médio — não entra como zero, senão o ticket
      despencaria e o número mentiria.
   2. O ticket médio divide por quem TEM valor, não pelo total de registros.
   3. Estornado não entra em "recebido" nem em "a receber" — o dinheiro
      voltou para a cliente.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  var TELAS = (window.TELAS = window.TELAS || {});

  var PERIODO = '30';

  function hojeChave() { return D.chaveDe(new Date()); }

  /* Segunda-feira da semana corrente. O salão atende de terça a sábado, mas
     "esta semana" para quem cuida do caixa começa na segunda — é assim que
     o extrato bancário fecha. Domingo ainda pertence à semana que passou. */
  function inicioDaSemana() {
    var h = new Date();
    var recuo = (h.getDay() + 6) % 7;              // segunda = 0 … domingo = 6
    return D.chaveDe(new Date(h.getFullYear(), h.getMonth(), h.getDate() - recuo));
  }

  function inicioDoMes() {
    var h = new Date();
    return D.chaveDe(new Date(h.getFullYear(), h.getMonth(), 1));
  }

  function faixa(id) {
    var hoje = new Date();
    if (id === 'hoje') return [hojeChave(), hojeChave()];
    if (id === '7') return [D.chaveDe(new Date(hoje.getTime() - 6 * 864e5)), hojeChave()];
    if (id === '30') return [D.chaveDe(new Date(hoje.getTime() - 29 * 864e5)), hojeChave()];
    if (id === 'mes') {
      var d = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return [D.chaveDe(d), hojeChave()];
    }
    return null;
  }


  /* O núcleo expõe servicoDe/clienteDe esperando o OBJETO do agendamento.
     Aqui as telas novas trabalham com ids; estes atalhos leem o store. */
  function servicoPorId(id) {
    return N.dados.servicos.filter(function (s) { return s.id === id; })[0] || null;
  }
  function clientePorId(id) {
    return N.dados.clientes.filter(function (c) { return c.id === id; })[0] || null;
  }

  function dentro(a, f) {
    if (!f) return true;
    return a.dataChave >= f[0] && a.dataChave <= f[1];
  }

  TELAS.financeiro = {
    titulo: 'Financeiro',
    aoAbrir: function () {},
    montar: function () {
      var caixa = h('div');
      var todos = N.dados.agendamentos;
      var f = faixa(PERIODO);
      var noPeriodo = todos.filter(function (a) { return dentro(a, f); });

      caixa.appendChild(h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: 'Financeiro' }),
          h('div.cabecalho__contexto', null,
            h('span', { texto: 'Movimento de ' + rotuloPeriodo(PERIODO) }),
            U.marcaDemo('dados demonstrativos')
          )
        ),
        h('div.cabecalho__acoes', null,
          h('button.btn.btn--secundario', {
            type: 'button',
            ao: {
              click: function () {
                U.toast('A exportação entra quando o sistema real estiver ligado. ' +
                  'Nesta demonstração os números são fictícios e não devem ser levados para fora do painel.', 'info');
              }
            }
          }, U.svg('baixar'), document.createTextNode('Exportar'))
        )
      ));

      /* --- filtro de período --- */
      var chips = h('div.filtros', { role: 'group', 'aria-label': 'Período' });
      var periodos = [
        { id: 'hoje', nome: 'Hoje' }, { id: '7', nome: 'Últimos 7 dias' },
        { id: '30', nome: 'Últimos 30 dias' }, { id: 'mes', nome: 'Este mês' }
      ];
      var corpo = h('div');
      periodos.forEach(function (p) {
        chips.appendChild(U.chip(p.nome, PERIODO === p.id, function () {
          PERIODO = p.id;
          montarCorpo();
          desenharChips();
        }));
      });
      chips.appendChild(h('button.btn.btn--pequeno.btn--secundario', {
        type: 'button', texto: 'Período personalizado',
        ao: { click: function () { abrirPersonalizado(); } }
      }, U.svg('calendario')));
      caixa.appendChild(chips);
      caixa.appendChild(corpo);

      function desenharChips() {
        U.limpar(chips);
        periodos.forEach(function (p) {
          chips.appendChild(U.chip(p.nome, PERIODO === p.id, function () {
            PERIODO = p.id; montarCorpo(); desenharChips();
          }));
        });
        chips.appendChild(h('button.btn.btn--pequeno.btn--secundario', {
          type: 'button', texto: 'Período personalizado',
          ao: { click: function () { abrirPersonalizado(); } }
        }, U.svg('calendario')));
      }

      function abrirPersonalizado() {
        var m;
        var campoDe = U.campo({ tipo: 'date', rotulo: 'De', valor: F.de || '' });
        var campoAte = U.campo({ tipo: 'date', rotulo: 'Até', valor: F.ate || '' });
        m = U.modal({
          titulo: 'Período personalizado',
          acoes: [
            h('button.btn.btn--secundario', { type: 'button', texto: 'Cancelar', ao: { click: function () { m.fechar(); } } }),
            h('button.btn.btn--principal', {
              type: 'button', texto: 'Aplicar',
              ao: {
                click: function () {
                  if (!campoDe.valor() || !campoAte.valor()) {
                    U.toast('Escolha as duas datas.', 'alerta'); return;
                  }
                  if (campoDe.valor() > campoAte.valor()) {
                    U.toast('A data inicial precisa vir antes da final.', 'alerta'); return;
                  }
                  F.de = campoDe.valor(); F.ate = campoAte.valor();
                  PERIODO = 'custom';
                  montarCorpo();
                  desenharChips();
                  m.fechar();
                }
              }
            })
          ],
          corpo: h('div.campo-duplo', null, campoDe.el, campoAte.el)
        });
      }

      var F = { de: '', ate: '' };
      function rotuloPeriodo(id) {
        if (id === 'hoje') return 'hoje';
        if (id === '7') return 'últimos 7 dias';
        if (id === '30') return 'últimos 30 dias';
        if (id === 'mes') return 'este mês';
        return 'período personalizado';
      }
      function faixaAtual() {
        return PERIODO === 'custom' && F.de && F.ate ? [F.de, F.ate] : faixa(PERIODO);
      }

      /* -------------------------------------------------------------------
         O CORPO
         ------------------------------------------------------------------- */
      function montarCorpo() {
        U.limpar(corpo);
        var f = faixaAtual();
        var lista = todos.filter(function (a) { return dentro(a, f); });
        var concluidos = lista.filter(function (a) { return a.status === 'concluido'; });
        var cancelados = lista.filter(function (a) { return a.status === 'cancelado'; });
        var ausentes = lista.filter(function (a) { return a.status === 'ausente'; });
        var atendidos = lista.filter(function (a) {
          return a.status === 'concluido' || a.status === 'atendimento';
        });

        var minutosCadeira = atendidos.reduce(function (s, a) { return s + a.duracao; }, 0);

        corpo.appendChild(h('div', { estilo: { marginBottom: 'var(--e4)' } },
          U.avisoDemo(
            'Os valores desta tela são DEMONSTRATIVOS. O salão não informou a tabela de preços, ' +
            'então o sistema não tem preço de serviço cadastrado — cada valor em reais que aparece ' +
            'aqui é o que foi lançado no atendimento, como amostra de funcionamento, e não ' +
            'corresponde ao que a Exclusiva Hair cobra. A tela mostra apenas o que foi registrado.', false)));

        /* -----------------------------------------------------------------
           DASHBOARD DA PROPRIETÁRIA

           As três primeiras linhas são a pergunta que ela faz todo dia:
           quanto entrou hoje, nesta semana e neste mês. As duas últimas
           seguem o período escolhido nos chips acima.

           Toda soma sai de `resumoFinanceiro`, que IGNORA registro sem
           valor. Atendimento sem valor lançado não entra como zero — se
           entrasse, o ticket médio despencaria e o número mentiria.
           ----------------------------------------------------------------- */
        var hoje = hojeChave();
        var rHoje = N.resumoFinanceiro(todos, hoje, hoje);
        var rSemana = N.resumoFinanceiro(todos, inicioDaSemana(), hoje);
        var rMes = N.resumoFinanceiro(todos, inicioDoMes(), hoje);
        var rPer = N.resumoFinanceiro(lista);

        /* Zero formatado pela MESMA função que formata o resto. Nunca um
           texto em reais digitado à mão — a bancada varre o código atrás
           de valores literais e precisa continuar encontrando zero. */
        function dinheiro(v, fallback) {
          return v == null || v === 0 ? (fallback || N.moeda(0)) : N.moeda(v);
        }

        corpo.appendChild(h('div.grade.grade--metricas', null,
          U.metrica({
            rotulo: 'Faturamento hoje', valor: dinheiro(rHoje.recebido),
            icone: 'dinheiro', demo: true,
            nota: rHoje.comValor
              ? rHoje.comValor + (rHoje.comValor === 1 ? ' atendimento pago' : ' atendimentos pagos')
              : 'nada recebido hoje'
          }),
          U.metrica({
            rotulo: 'Faturamento esta semana', valor: dinheiro(rSemana.recebido),
            icone: 'grafico', demo: true,
            nota: rSemana.comValor + (rSemana.comValor === 1 ? ' atendimento pago' : ' atendimentos pagos')
          }),
          U.metrica({
            rotulo: 'Faturamento este mês', valor: dinheiro(rMes.recebido),
            icone: 'tendencia', demo: true,
            nota: rMes.comValor ? 'ticket de ' + dinheiro(rMes.ticketMedio) : 'sem lançamento no mês'
          }),
          U.metrica({
            rotulo: 'A receber', valor: dinheiro(rPer.aReceber),
            icone: 'relogio', demo: true,
            nota: 'no período selecionado'
          }),
          U.metrica({
            rotulo: 'Ticket médio', valor: rPer.ticketMedio == null ? '—' : N.moeda(rPer.ticketMedio),
            icone: 'estrela', demo: true,
            nota: rPer.comValor
              ? 'sobre ' + rPer.comValor + (rPer.comValor === 1 ? ' atendimento com valor' : ' atendimentos com valor')
              : 'nenhum valor lançado no período'
          })
        ));

        /* O que o número esconde: atendimento encerrado sem valor lançado.
           É a diferença entre "o salão não faturou" e "ninguém lançou". */
        if (rPer.semValor) {
          corpo.appendChild(h('div', { estilo: { marginBottom: 'var(--e4)' } },
            h('div.aviso-demo', null, U.svg('alerta'),
              h('div', null,
                h('b', { texto: rPer.semValor + (rPer.semValor === 1
                  ? ' atendimento concluído neste período está sem valor lançado.'
                  : ' atendimentos concluídos neste período estão sem valor lançado.') }),
                document.createTextNode(' Eles não entram no faturamento nem no ticket médio — ' +
                  'não é o mesmo que valer zero.')))));
        }

        /* --- recebimentos recentes --- */
        var recebiveis = lista.filter(function (a) { return !!N.pagamentoDe(a); })
          .sort(function (a, b) { return a.dataChave < b.dataChave ? 1 : (a.dataChave > b.dataChave ? -1 : b.inicioMin - a.inicioMin); })
          .slice(0, 12);

        var blocoRec = h('div.bloco', null,
          h('div.bloco__cabecalho', null,
            h('h2.bloco__titulo', { texto: 'Recebimentos recentes' }),
            h('span.miudo', { texto: 'últimos ' + recebiveis.length + ' com lançamento' })
          ),
          h('p.miudo', { texto: 'Atendimento, data, forma de pagamento e valor — como foi registrado.' })
        );

        if (!recebiveis.length) {
          blocoRec.appendChild(U.vazio('dinheiro', 'Nenhum lançamento no período',
            'Finalize um atendimento informando o valor para ele aparecer aqui.', null, true));
        } else {
          var tab = U.tabela({
            colunas: [
              {
                chave: 'cliente', rotulo: 'Cliente',
                valor: function (a) {
                  var c = clientePorId(a.clienteId);
                  return h('span.linha-cliente', null, U.avatar(c),
                    h('span', null,
                      h('span.linha-principal__nome', { texto: N.nomeCliente(c) }),
                      h('span.linha-principal__sub.truncar', { texto: N.nomeServico(a.servicoId) })
                    ));
                }
              },
              { chave: 'data', rotulo: 'Data', valor: function (a) { return document.createTextNode(N.dataCurta(a.dataChave)); } },
              {
                chave: 'forma', rotulo: 'Forma',
                valor: function (a) {
                  var p = N.pagamentoDe(a);
                  var nome = N.nomeFormaPagamento(p.forma);
                  return document.createTextNode(nome || 'Não informada');
                }
              },
              {
                chave: 'valor', rotulo: 'Valor',
                valor: function (a) {
                  var v = N.valorLiquidoDe(a);
                  if (v == null) return h('span.miudo', { texto: 'não lançado' });
                  var p = N.pagamentoDe(a);
                  return h('span.num', { texto: N.moeda(v), title: p && p.desconto
                    ? 'Cobrado ' + N.moeda(p.valor) + ' com desconto de ' + N.moeda(p.desconto)
                    : null });
                }
              },
              {
                chave: 'status', rotulo: 'Pagamento',
                valor: function (a) {
                  var p = N.pagamentoDe(a);
                  return h('span.selo-pag.selo-pag--' + p.status, { texto: N.statusPagamento(p.status).nome });
                }
              }
            ],
            itens: recebiveis,
            clicavel: true,
            chaveLinha: function (a) { return a.id; },
            aoClicarLinha: function (a) { window.AGENDA.abrirDetalhe(a); }
          });
          blocoRec.appendChild(tab.el);
        }
        corpo.appendChild(blocoRec);

        /* --- indicadores de movimento (não financeiros) --- */
        var diasComAtendimento = {};
        atendidos.forEach(function (a) { diasComAtendimento[a.dataChave] = true; });
        var nDias = Object.keys(diasComAtendimento).length || 1;

        corpo.appendChild(h('div.grade.grade--metricas', null,
          U.metrica({
            rotulo: 'Atendimentos concluídos', valor: String(concluidos.length),
            icone: 'checar-circulo', demo: true,
            nota: lista.length + ' registros no período'
          }),
          U.metrica({
            rotulo: 'Tempo de cadeira', valor: N.duracaoLegivel(minutosCadeira),
            icone: 'relogio', demo: true, nota: 'soma das durações atendidas'
          }),
          U.metrica({
            rotulo: 'Média por dia com agenda',
            valor: (concluidos.length / nDias).toFixed(1).replace('.', ','),
            icone: 'grafico', demo: true, nota: nDias + (nDias === 1 ? ' dia' : ' dias')
          }),
          U.metrica({
            rotulo: 'Cancelamentos e faltas', valor: String(cancelados.length + ausentes.length),
            icone: 'x-circulo', demo: true,
            nota: cancelados.length + ' cancel. · ' + ausentes.length + ' faltas'
          })
        ));

        /* --- de onde vieram os agendamentos --- */
        var porOrigem = { site: 0, manual: 0 };
        lista.forEach(function (a) { porOrigem[a.origem] = (porOrigem[a.origem] || 0) + 1; });
        var totalOrigem = lista.length || 1;

        var blocoOrigem = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Origem dos agendamentos' }),
          h('p.miudo', { texto: 'Quanto veio do site e quanto foi lançado no balcão.' })
        );
        [['site', 'Agendado pelo site', 'globo'], ['manual', 'Lançado no painel', 'usuario']].forEach(function (par) {
          var n = porOrigem[par[0]] || 0;
          blocoOrigem.appendChild(h('div.barra-forma', null,
            h('span.barra-forma__rotulo', null, U.svg(par[2]), document.createTextNode(par[1])),
            h('span.barra-forma__trilha', null,
              h('span.barra-forma__preenchimento', { estilo: { width: (n / totalOrigem * 100) + '%' } })),
            h('span.barra-forma__valor', { texto: n + '  (' + Math.round(n / totalOrigem * 100) + '%)' })
          ));
        });
        /* Grade 1: origem e situação lado a lado. A grade é `auto-fit`, então
           em tela estreita ela volta a uma coluna sozinha. */
        var grade1 = h('div.grade.grade--2.grade--painel');
        grade1.appendChild(blocoOrigem);

        /* --- situação, em números --- */
        var contagem = {};
        N.ORDEM_ESTADOS.forEach(function (s) { contagem[s] = 0; });
        lista.forEach(function (a) { contagem[a.status] = (contagem[a.status] || 0) + 1; });

        var blocoStatus = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Situação dos agendamentos' }),
          h('p.miudo', { texto: 'Todos os sete estados que o painel acompanha.' })
        );
        var gradeStatus = h('div.grade-status');
        N.ORDEM_ESTADOS.forEach(function (id) {
          gradeStatus.appendChild(h('button.grade-status__item', {
            type: 'button',
            'aria-label': 'Ver ' + N.estado(id).nome + ' na lista de agendamentos',
            ao: {
              click: function () {
                window.EH_APP.irPara('#/agendamentos');
              }
            }
          },
            U.selo(id),
            h('span.grade-status__num', { texto: String(contagem[id] || 0) })
          ));
        });
        blocoStatus.appendChild(gradeStatus);
        grade1.appendChild(blocoStatus);
        corpo.appendChild(grade1);

        /* --- por serviço --- */
        var porServico = {};
        concluidos.forEach(function (a) {
          porServico[a.servicoId] = (porServico[a.servicoId] || 0) + 1;
        });
        var ordem = Object.keys(porServico).sort(function (x, y) { return porServico[y] - porServico[x]; });
        var blocoServ = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Atendimentos concluídos por serviço' })
        );
        if (!ordem.length) {
          blocoServ.appendChild(h('p.miudo', { texto: 'Nenhum atendimento concluído neste período.' }));
        } else {
          var max = porServico[ordem[0]];
          ordem.forEach(function (id) {
            var s = servicoPorId(id);
            blocoServ.appendChild(h('div.barra-forma', null,
              h('span.barra-forma__rotulo', { texto: s.nome }),
              h('span.barra-forma__trilha', null,
                h('span.barra-forma__preenchimento', { estilo: { width: (porServico[id] / max * 100) + '%' } })),
              h('span.barra-forma__valor', { texto: String(porServico[id]) })
            ));
          });
        }
        /* Grade 2: serviços por atendimento e formas de pagamento. */
        var grade2 = h('div.grade.grade--2.grade--painel');
        grade2.appendChild(blocoServ);

        /* --- registro de pagamento, como está no dado --- */
        var comPagamento = lista.filter(function (a) { return !!N.pagamentoDe(a); });
        var blocoPag = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Formas de pagamento registradas' }),
          h('p.miudo', { texto: 'O sistema guarda a forma escolhida em cada atendimento. ' +
            'A barra mostra a divisão por VALOR recebido — registro sem valor lançado ' +
            'aparece na contagem, mas não entra na barra.' })
        );
        if (!comPagamento.length) {
          blocoPag.appendChild(h('p.miudo', {
            texto: 'Nenhum atendimento deste período tem forma de pagamento registrada.'
          }));
        } else {
          /* Duas contagens diferentes de propósito: `contagem` é "quantos
             atendimentos", `soma` é "quanto em reais". Separá-las é o que
             impede um atendimento sem valor de puxar a barra para zero. */
          var contagem = {}, soma = {}, totalSoma = 0;
          comPagamento.forEach(function (a) {
            var p = N.pagamentoDe(a);
            var chave = p.forma || 'nao-informada';
            contagem[chave] = (contagem[chave] || 0) + 1;
            var v = N.valorLiquidoDe(a);
            if (v != null) { soma[chave] = (soma[chave] || 0) + v; totalSoma += v; }
          });
          var nomesForma = {};
          (D.DEMO.formasPagamento || []).forEach(function (f) { nomesForma[f.id] = f.nome; });
          var ordemForma = Object.keys(contagem).sort(function (x, y) { return soma[y] - soma[x]; });
          var maior = soma[ordemForma[0]] || 1;
          ordemForma.forEach(function (id) {
            var n = contagem[id] || 0;
            var v = soma[id] || 0;
            blocoPag.appendChild(h('div.barra-forma', null,
              h('span.barra-forma__rotulo', null, U.svg('cartao'),
                document.createTextNode(' ' + (nomesForma[id] || 'Não informada'))),
              h('span.barra-forma__trilha', null,
                h('span.barra-forma__preenchimento', { estilo: { width: (v / maior * 100) + '%' } })),
              h('span.barra-forma__valor', {
                texto: N.moeda(v),
                title: n + (n === 1 ? ' atendimento' : ' atendimentos')
              })
            ));
          });
          var semForma = contagem['nao-informada'] || 0;
          blocoPag.appendChild(h('p.miudo', {
            estilo: { marginTop: 'var(--e3)' },
            texto: semForma
              ? semForma + (semForma === 1
                  ? ' atendimento foi finalizado sem escolher a forma de pagamento.'
                  : ' atendimentos foram finalizados sem escolher a forma de pagamento.')
              : 'Total registrado no período: ' + N.moeda(totalSoma) + '.'
          }));
        }
        grade2.appendChild(blocoPag);
        corpo.appendChild(grade2);

        /* --- movimento dia a dia --- */
        var blocoDia = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Movimento por dia' }),
          h('p.miudo', { texto: 'Quantidade de atendimentos concluídos em cada dia do período.' })
        );
        var porDia = {};
        concluidos.forEach(function (a) { porDia[a.dataChave] = (porDia[a.dataChave] || 0) + 1; });
        var chaves = Object.keys(porDia).sort();
        if (!chaves.length) {
          blocoDia.appendChild(h('p.miudo', { texto: 'Sem atendimentos concluídos no período.' }));
        } else {
          var maxDia = chaves.reduce(function (m, k) { return Math.max(m, porDia[k]); }, 0);
          var grafico = h('div.grafico', {
            role: 'img', 'aria-label': 'Gráfico de atendimentos concluídos por dia',
            dados: { animar: 'sim' }
          });
          chaves.forEach(function (k, i) {
            var dt = D.dataDeChave(k);
            var n = porDia[k];
            var dia = String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
            grafico.appendChild(h('div.grafico__col', {
              tabindex: 0,
              /* A dica é o que o ponteiro mostra ao passar pela coluna. */
              dados: { dica: dia + ' · ' + n + (n === 1 ? ' atendimento' : ' atendimentos') }
            },
              h('span.grafico__valor', { texto: String(n) }),
              h('span.grafico__barra', {
                estilo: { height: Math.max(6, (n / maxDia) * 100) + '%', '--i': String(i) },
                'aria-hidden': 'true'
              }),
              h('span.grafico__rotulo', { texto: dia })
            ));
          });
          blocoDia.appendChild(h('div.grafico__area', null, grafico));
        }
        /* O movimento por dia ocupa a largura toda: é a leitura principal. */
        corpo.appendChild(blocoDia);

        corpo.appendChild(h('div.bloco', null, U.avisoDemo(
          'Nenhum lançamento desta tela sai do navegador: não há emissão de cobrança, ' +
          'gateway de pagamento nem nota fiscal nesta demonstração.')));
      }

      montarCorpo();
      return caixa;
    }
  };
})();
