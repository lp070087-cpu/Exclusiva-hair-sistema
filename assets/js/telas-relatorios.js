/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-relatorios.js

   Relatórios de operação — não de dinheiro.
   Os materiais do salão não trazem preço, custo nem meta. Todo relatório
   aqui mede o que o dado sustenta: quantidade, tempo, ocupação, origem e
   comparecimento. Cada número aparece marcado como demonstrativo.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  var TELAS = (window.TELAS = window.TELAS || {});

  /* Estado do relatório, preservado entre visitas. */
  var R = { relatorio: 'movimento', periodo: '30', de: '', ate: '' };

  function hojeChave() { return D.chaveDe(new Date()); }


  /* O núcleo expõe servicoDe/clienteDe esperando o OBJETO do agendamento.
     Aqui as telas novas trabalham com ids; estes atalhos leem o store. */
  function servicoPorId(id) {
    return N.dados.servicos.filter(function (s) { return s.id === id; })[0] || null;
  }
  function clientePorId(id) {
    return N.dados.clientes.filter(function (c) { return c.id === id; })[0] || null;
  }

  function deslocar(dias) {
    var d = new Date();
    return D.chaveDe(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias));
  }

  function faixa() {
    if (R.periodo === 'hoje') return [hojeChave(), hojeChave()];
    if (R.periodo === '7') return [deslocar(-6), hojeChave()];
    if (R.periodo === '30') return [deslocar(-29), hojeChave()];
    if (R.periodo === '90') return [deslocar(-89), hojeChave()];
    if (R.periodo === 'tudo') return null;
    if (R.periodo === 'personalizado' && R.de && R.ate) return [R.de, R.ate];
    return [deslocar(-29), hojeChave()];
  }

  function rotuloPeriodo() {
    var nomes = {
      hoje: 'hoje', '7': 'últimos 7 dias', '30': 'últimos 30 dias',
      '90': 'últimos 90 dias', tudo: 'todo o histórico demonstrativo'
    };
    if (R.periodo === 'personalizado') return R.de + ' a ' + R.ate;
    return nomes[R.periodo] || 'período';
  }

  function selecionar() {
    var f = faixa();
    return N.dados.agendamentos.filter(function (a) {
      if (!f) return true;
      return a.dataChave >= f[0] && a.dataChave <= f[1];
    });
  }

  /* Cartão de métrica com a marca de dado demonstrativo sempre visível. */
  function metricaDemo(opcoes) {
    var m = U.metrica(opcoes);
    m.appendChild(h('div', { estilo: { marginTop: 'var(--e2)' } }, U.marcaDemo('demonstrativo')));
    return m;
  }

  function barra(rotuloEl, valor, max, textoValor) {
    return h('div.barra-forma', null,
      rotuloEl,
      h('span.barra-forma__trilha', null,
        h('span.barra-forma__preenchimento', {
          estilo: { width: (max ? Math.round(valor / max * 100) : 0) + '%' }
        })),
      h('span.barra-forma__valor', { texto: textoValor })
    );
  }

  var RELATORIOS = [
    { id: 'movimento', nome: 'Movimento', icone: 'grafico' },
    { id: 'ocupacao', nome: 'Ocupação', icone: 'relogio' },
    { id: 'servicos', nome: 'Serviços', icone: 'tesoura' },
    { id: 'clientes', nome: 'Clientes', icone: 'pessoas' },
    { id: 'origem', nome: 'Origem e situação', icone: 'globo' }
  ];

  TELAS.relatorios = {
    titulo: 'Relatórios',
    aoAbrir: function () {},
    montar: function () {
      var caixa = h('div');
      var corpo = h('div');
      var areaPeriodo = h('div');

      caixa.appendChild(h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: 'Relatórios' }),
          h('div.cabecalho__contexto', null,
            h('span', { texto: 'Sobre ' + rotuloPeriodo() }),
            U.marcaDemo('dados demonstrativos')
          )
        ),
        h('div.cabecalho__acoes', null,
          h('button.btn.btn--secundario', {
            type: 'button',
            ao: {
              click: function () {
                U.toast('Impressão e exportação existem no sistema ligado. ' +
                  'Aqui os números são fictícios — não leve esta tela para fora do painel.', 'info');
              }
            }
          }, U.svg('imprimir'), document.createTextNode('Exportar'))
        )
      ));

      caixa.appendChild(U.avisoDemo(
        'Os números desta tela saem da base demonstrativa: contagens de atendimento, tempo ' +
        'de cadeira, ocupação e — no relatório de Movimento — o que foi LANÇADO em cada ' +
        'atendimento. O salão não informou tabela de preços, custo nem meta, então nada aqui ' +
        'é a receita real da Exclusiva Hair, e nenhum valor foi estimado para preencher a tela.', false));

      /* --- escolha do relatório --- */
      caixa.appendChild(U.segmentado({
        rotulo: 'Relatório', atual: R.relatorio,
        itens: RELATORIOS.map(function (r) {
          return { id: r.id, nome: r.nome, icone: r.icone };
        })
      }, function (id) { R.relatorio = id; desenharPeriodo(); montarCorpo(); }));

      caixa.appendChild(areaPeriodo);
      caixa.appendChild(corpo);

      function desenharPeriodo() {
        U.limpar(areaPeriodo);
        var barraP = h('div.filtros', { role: 'group', 'aria-label': 'Período do relatório' });
        [['hoje', 'Hoje'], ['7', '7 dias'], ['30', '30 dias'], ['90', '90 dias'], ['tudo', 'Tudo']]
          .forEach(function (par) {
            barraP.appendChild(U.chip(par[1], R.periodo === par[0], function () {
              R.periodo = par[0]; desenharPeriodo(); montarCorpo();
            }));
          });
        barraP.appendChild(U.chip('Personalizado', R.periodo === 'personalizado', function () {
          abrirDatas();
        }, { icone: 'calendario' }));
        areaPeriodo.appendChild(barraP);

        if (R.periodo === 'personalizado' && R.de && R.ate) {
          areaPeriodo.appendChild(h('p.miudo', { texto: 'Recorte: ' + R.de + ' a ' + R.ate + '  ' },
            h('button.btn.btn--pequeno.btn--secundario', {
              type: 'button', texto: 'Trocar datas', ao: { click: abrirDatas }
            })));
        }
      }

      function abrirDatas() {
        var m;
        var campoDe = U.campo({ tipo: 'date', rotulo: 'De', valor: R.de || '' });
        var campoAte = U.campo({ tipo: 'date', rotulo: 'Até', valor: R.ate || '' });
        m = U.modal({
          titulo: 'Recorte de datas',
          texto: 'Escolha o intervalo que o relatório deve cobrir.',
          acoes: [
            h('button.btn.btn--secundario', {
              type: 'button', texto: 'Cancelar', ao: { click: function () { m.fechar(); } }
            }),
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
                  R.de = campoDe.valor(); R.ate = campoAte.valor();
                  R.periodo = 'personalizado';
                  desenharPeriodo(); montarCorpo(); m.fechar();
                }
              }
            })
          ],
          corpo: h('div.campo-duplo', null, campoDe.el, campoAte.el)
        });
      }

      /* -------------------------------------------------------------------
         CADA RELATÓRIO
         ------------------------------------------------------------------- */
      function montarCorpo() {
        U.limpar(corpo);
        var lista = selecionar();
        if (!lista.length) {
          corpo.appendChild(U.vazio('grafico', 'Nada para relatar neste recorte',
            'Não há agendamento registrado no período escolhido. Tente ampliar as datas.',
            h('button.btn.btn--secundario', {
              type: 'button', texto: 'Voltar para 30 dias',
              ao: {
                click: function () {
                  R.periodo = '30'; desenharPeriodo(); montarCorpo();
                }
              }
            })));
          return;
        }
        if (R.relatorio === 'ocupacao') return relOcupacao(lista);
        if (R.relatorio === 'servicos') return relServicos(lista);
        if (R.relatorio === 'clientes') return relClientes(lista);
        if (R.relatorio === 'origem') return relOrigem(lista);
        return relMovimento(lista);
      }

      /* --- 1. Movimento -------------------------------------------------- */
      function relMovimento(lista) {
        var concluidos = lista.filter(function (a) { return a.status === 'concluido'; });
        var atendidos = lista.filter(function (a) {
          return a.status === 'concluido' || a.status === 'atendimento';
        });
        var minutos = atendidos.reduce(function (s, a) { return s + a.duracao; }, 0);
        var dias = {};
        atendidos.forEach(function (a) { dias[a.dataChave] = (dias[a.dataChave] || 0) + 1; });
        var nDias = Object.keys(dias).length;

        /* Faturamento e ticket médio saem do mesmo resumo que o Financeiro
           usa — e obedecem às mesmas três regras: sem valor lançado não é
           zero; o ticket divide por quem TEM valor; estornado não conta. */
        var fin = N.resumoFinanceiro(lista);

        corpo.appendChild(h('div.grade.grade--metricas', null,
          metricaDemo({ rotulo: 'Agendamentos no recorte', valor: String(lista.length),
            icone: 'calendario', nota: rotuloPeriodo() }),
          metricaDemo({ rotulo: 'Concluídos', valor: String(concluidos.length),
            icone: 'checar-circulo',
            nota: lista.length ? Math.round(concluidos.length / lista.length * 100) + '% dos registros' : '—' }),
          metricaDemo({ rotulo: 'Tempo de cadeira', valor: N.duracaoLegivel(minutos),
            icone: 'relogio', nota: 'soma das durações atendidas' }),
          metricaDemo({ rotulo: 'Dias com movimento', valor: String(nDias),
            icone: 'grafico', nota: nDias ? 'média de ' + (atendidos.length / nDias).toFixed(1).replace('.', ',') + ' por dia' : '—' })
        ));

        corpo.appendChild(h('div.grade.grade--metricas', null,
          metricaDemo({ rotulo: 'Faturamento no recorte',
            valor: N.moeda(fin.recebido),
            icone: 'dinheiro',
            nota: fin.comValor
              ? fin.comValor + (fin.comValor === 1 ? ' atendimento com valor' : ' atendimentos com valor')
              : 'nenhum valor lançado' }),
          metricaDemo({ rotulo: 'Ticket médio',
            valor: fin.ticketMedio == null ? '—' : N.moeda(fin.ticketMedio),
            icone: 'estrela',
            nota: fin.ticketMedio == null
              ? 'sem lançamento para calcular'
              : 'por atendimento com valor lançado' }),
          metricaDemo({ rotulo: 'A receber', valor: N.moeda(fin.aReceber),
            icone: 'relogio', nota: 'pendente ou parcial' }),
          metricaDemo({ rotulo: 'Sem valor lançado', valor: String(fin.semValor),
            icone: 'alerta',
            nota: fin.semValor ? 'concluídos fora do faturamento' : 'tudo lançado' })
        ));

        /* --- por semana, para o gráfico não virar um borrão de 90 barras -- */
        var porSemana = {};
        lista.forEach(function (a) {
          var dt = D.dataDeChave(a.dataChave);
          var recuo = dt.getDay() === 0 ? 6 : dt.getDay() - 1;
          var seg = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate() - recuo);
          var k = D.chaveDe(seg);
          porSemana[k] = (porSemana[k] || 0) + 1;
        });
        var semanas = Object.keys(porSemana).sort();
        var chavesDia = {};
        lista.forEach(function (a) { chavesDia[a.dataChave] = true; });
        var mostrarPorDia = Object.keys(chavesDia).length <= 62;

        var bloco = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: mostrarPorDia ? 'Agendamentos por dia' : 'Agendamentos por semana' }),
          h('p.miudo', { texto: mostrarPorDia
            ? 'Cada barra é um dia com pelo menos um agendamento.'
            : 'O recorte é longo, então o movimento aparece agrupado por semana.' })
        );

        var dados = mostrarPorDia ? (function () {
          var m = {};
          lista.forEach(function (a) {
            var k = a.dataChave + '|' + a.status;
            m[k] = (m[k] || 0) + 1;
          });
          var porDia = {};
          lista.forEach(function (a) { porDia[a.dataChave] = (porDia[a.dataChave] || 0) + 1; });
          return { valores: porDia, chaves: Object.keys(porDia).sort() };
        })() : { valores: porSemana, chaves: semanas };

        var max = dados.chaves.reduce(function (m, k) {
          return Math.max(m, dados.valores[k]);
        }, 0);
        var grafico = h('div.grafico', { role: 'img',
          'aria-label': 'Gráfico de agendamentos no período',
          dados: { animar: 'sim' } });
        dados.chaves.forEach(function (k, i) {
          var dt = D.dataDeChave(k);
          var rotulo = mostrarPorDia
            ? String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0')
            : String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0');
          var col = h('div.grafico__col', {
            tabindex: 0,
            dados: { dica: dt.getDate() + '/' + (dt.getMonth() + 1) + ' · ' +
              dados.valores[k] + ' agendamento(s)' }
          },
            h('span.grafico__valor', { texto: String(dados.valores[k]) }),
            h('span.grafico__barra', {
              'aria-hidden': 'true',
              estilo: { height: Math.max(6, dados.valores[k] / max * 100) + '%', '--i': String(i) }
            }),
            h('span.grafico__rotulo', { texto: rotulo })
          );
          grafico.appendChild(col);
        });
        bloco.appendChild(h('div.grafico__area', null, grafico));
        /* Dia da semana e hora do dia são a mesma leitura em dois cortes:
           vão lado a lado, e o movimento por dia ocupa a largura toda. */
        var gradeMov = h('div.grade.grade--2.grade--painel');
        corpo.appendChild(bloco);
        corpo.appendChild(gradeMov);

        /* --- dia da semana --- */
        var porDiaSemana = [0, 0, 0, 0, 0, 0, 0];
        lista.forEach(function (a) {
          porDiaSemana[D.dataDeChave(a.dataChave).getDay()] += 1;
        });
        var maxDW = Math.max.apply(null, porDiaSemana);
        var blocoDW = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Como a semana se distribui' }),
          h('p.miudo', { texto: 'Ajuda a decidir em que dia vale reforçar a equipe.' })
        );
        D.DIAS.forEach(function (nome, i) {
          var valor = porDiaSemana[i];
          blocoDW.appendChild(barra(
            h('span.barra-forma__rotulo', { texto: nome }),
            valor, maxDW || 1,
            valor + (valor === 1 ? ' agendamento' : ' agendamentos')));
        });
        gradeMov.appendChild(blocoDW);

        /* --- hora do dia --- */
        var porHora = {};
        lista.forEach(function (a) {
          var hora = Math.floor(a.inicioMin / 60);
          porHora[hora] = (porHora[hora] || 0) + 1;
        });
        var horas = Object.keys(porHora).map(Number).sort(function (x, y) { return x - y; });
        var maxH = horas.reduce(function (m, k) { return Math.max(m, porHora[k]); }, 0);
        var blocoH = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Horários mais procurados' }),
          h('p.miudo', { texto: 'Distribuição dos agendamentos ao longo do dia.' })
        );
        if (!horas.length) {
          blocoH.appendChild(h('p.miudo', { texto: 'Sem dados de horário neste recorte.' }));
        } else {
          horas.forEach(function (hr) {
            blocoH.appendChild(barra(
              h('span.barra-forma__rotulo.num', { texto: String(hr).padStart(2, '0') + 'h' }),
              porHora[hr], maxH,
              String(porHora[hr])));
          });
        }
        gradeMov.appendChild(blocoH);

        corpo.appendChild(h('div.bloco', null, U.avisoDemo(
          'Totais contados sobre a base demonstrativa do painel. Não representam o ' +
          'movimento real do salão.')));
      }

      /* --- 2. Ocupação --------------------------------------------------- */
      function relOcupacao(lista) {
        var porDia = {};
        lista.forEach(function (a) {
          if (!porDia[a.dataChave]) porDia[a.dataChave] = { ocupados: 0, bloqueados: 0, total: 0 };
          porDia[a.dataChave].ocupados += N.ocupaAgenda(a) ? a.duracao : 0;
        });
        var chaves = Object.keys(porDia).sort();
        var somaOcup = 0, somaTotal = 0, somaBloq = 0, n = 0;

        chaves.forEach(function (k) {
          var r = N.resumoDoDia(k, N.dados.agendamentos, N.dados.bloqueios);
          if (!r.aberto) { delete porDia[k]; return; }
          porDia[k].total = r.minutosTotais;
          porDia[k].bloqueados = r.minutosBloqueados;
          porDia[k].livres = r.minutosLivres;
          porDia[k].taxa = r.ocupacao;
          somaOcup += r.minutosOcupados;
          somaBloq += r.minutosBloqueados;
          somaTotal += r.minutosTotais;
          n += 1;
        });

        var media = n ? somaOcup / n : 0;
        var aproveitavel = chaves.reduce(function (s, k) {
          return s + (porDia[k] ? (porDia[k].total - porDia[k].bloqueados) : 0);
        }, 0);
        var taxa = aproveitavel ? somaOcup / aproveitavel : 0;

        corpo.appendChild(h('div.grade.grade--metricas', null,
          metricaDemo({ rotulo: 'Dias abertos no recorte', valor: String(n),
            icone: 'calendario', nota: 'dias em que o salão abre' }),
          metricaDemo({ rotulo: 'Ocupação da agenda', valor: N.percentual(taxa),
            icone: 'grafico', nota: 'tempo atendido sobre o tempo disponível' }),
          metricaDemo({ rotulo: 'Média de cadeira por dia', valor: N.duracaoLegivel(Math.round(media)),
            icone: 'relogio', nota: 'nos dias abertos' }),
          metricaDemo({ rotulo: 'Tempo bloqueado', valor: N.duracaoLegivel(somaBloq),
            icone: 'bloquear', nota: 'almoço, evento, manutenção e afins' })
        ));

        var ordenado = chaves.filter(function (k) { return !!porDia[k]; })
          .map(function (k) { return { chave: k, d: porDia[k] }; })
          .sort(function (a, b) { return b.d.taxa - a.d.taxa; });

        var bloco = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Dias mais cheios' }),
          h('p.miudo', { texto: 'Percentual do tempo disponível que virou atendimento. ' +
            'O tempo bloqueado não entra na conta.' })
        );
        ordenado.slice(0, 12).forEach(function (o) {
          bloco.appendChild(barra(
            h('span.barra-forma__rotulo', { texto: N.rotuloDia(o.chave, new Date()) + ' · ' + N.dataCurta(o.chave) }),
            o.d.taxa, 1, N.percentual(o.d.taxa)));
        });
        if (!ordenado.length) {
          bloco.appendChild(h('p.miudo', { texto: 'Nenhum dia com agenda neste recorte.' }));
        }
        /* Ocupação por dia (largura toda) + o retrato de hoje ao lado. */
        var gradeOcup = h('div.grade.grade--2.grade--painel');
        corpo.appendChild(bloco);
        corpo.appendChild(gradeOcup);

        /* --- quanto ainda dá para vender --- */
        var hoje = N.resumoDoDia(hojeChave(), N.dados.agendamentos, N.dados.bloqueios);
        var blocoAgora = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Ainda hoje' }),
          h('p.miudo', { texto: 'Quanto tempo de agenda ainda está livre hoje.' })
        );
        if (!hoje.aberto) {
          blocoAgora.appendChild(h('p.miudo', { texto: 'Hoje o salão está fechado no calendário demonstrativo.' }));
        } else {
          blocoAgora.appendChild(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Tempo livre' }),
            h('span.linha-dado__valor', { texto: N.duracaoLegivel(hoje.minutosLivres) })));
          blocoAgora.appendChild(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Ocupado' }),
            h('span.linha-dado__valor', { texto: N.duracaoLegivel(hoje.minutosOcupados) })));
          blocoAgora.appendChild(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Bloqueado' }),
            h('span.linha-dado__valor', { texto: N.duracaoLegivel(hoje.minutosBloqueados) })));
          var vagas = N.horariosDisponiveis({ duracao: 60 }, hojeChave(), N.dados.agendamentos, N.dados.bloqueios);
          blocoAgora.appendChild(h('p.miudo', { estilo: { marginTop: 'var(--e3)' },
            texto: vagas.length
              ? vagas.length + (vagas.length === 1
                  ? ' janela de 1 hora ainda comporta um encaixe hoje.'
                  : ' janelas de 1 hora ainda comportam encaixe hoje.')
              : 'Não há janela de 1 hora livre hoje.' }));
        }
        gradeOcup.appendChild(blocoAgora);

        corpo.appendChild(h('div.bloco', null, U.avisoDemo(
          'A ocupação é calculada sobre a grade demonstrativa de funcionamento. ' +
          'O horário de funcionamento real do salão não foi informado.', false)));
      }

      /* --- 3. Serviços --------------------------------------------------- */
      function relServicos(lista) {
        var conta = {};
        lista.forEach(function (a) {
          if (a.status === 'cancelado' || a.status === 'ausente') return;
          if (!conta[a.servicoId]) conta[a.servicoId] = { n: 0, minutos: 0, cancelados: 0 };
          conta[a.servicoId].n += 1;
          conta[a.servicoId].minutos += a.duracao;
        });
        lista.forEach(function (a) {
          if (a.status !== 'cancelado' && a.status !== 'ausente') return;
          if (!conta[a.servicoId]) conta[a.servicoId] = { n: 0, minutos: 0, cancelados: 0 };
          conta[a.servicoId].cancelados += 1;
        });

        var ids = Object.keys(conta).sort(function (x, y) { return conta[y].n - conta[x].n; });
        var soma = ids.reduce(function (s, id) { return s + conta[id].n; }, 0);
        var max = ids.length ? conta[ids[0]].n : 0;

        corpo.appendChild(h('div.grade.grade--metricas', null,
          metricaDemo({ rotulo: 'Serviços com movimento', valor: ids.length + ' de ' + N.dados.servicos.length,
            icone: 'tesoura', nota: 'no recorte escolhido' }),
          metricaDemo({ rotulo: 'Atendimentos válidos', valor: String(soma),
            icone: 'checar-circulo', nota: 'fora cancelamentos e faltas' }),
          metricaDemo({ rotulo: 'Tempo de cadeira', valor: N.duracaoLegivel(ids.reduce(function (s, id) {
              return s + conta[id].minutos;
            }, 0)),
            icone: 'relogio', nota: 'soma das durações' }),
          metricaDemo({ rotulo: 'Serviço mais pedido',
            valor: ids.length ? servicoPorId(ids[0]).nome : '—',
            icone: 'estrela', nota: ids.length ? conta[ids[0]].n + ' atendimentos' : 'sem dados' })
        ));

        var bloco = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Ranking por quantidade' }),
          h('p.miudo', { texto: 'Ordenado por número de atendimentos, não por valor — ' +
            'os preços dos serviços não constam nos materiais do salão.' })
        );
        ids.forEach(function (id) {
          var s = servicoPorId(id);
          var c = conta[id];
          bloco.appendChild(h('div.barra-forma', null,
            h('span.barra-forma__rotulo', null,
              document.createTextNode(s.nome + ' '),
              c.cancelados ? h('span.miudo', { texto: '(' + c.cancelados + ' cancelado' +
                (c.cancelados === 1 ? '' : 's') + ')' }) : null),
            h('span.barra-forma__trilha', null,
              h('span.barra-forma__preenchimento', { estilo: { width: (c.n / max * 100) + '%' } })),
            h('span.barra-forma__valor', { texto: String(c.n) })
          ));
        });
        /* Ranking de serviços (largura toda) + quem não teve movimento. */
        var gradeServ = h('div.grade.grade--2.grade--painel');
        corpo.appendChild(bloco);
        corpo.appendChild(gradeServ);

        /* --- quem some: serviços ativos sem nenhum atendimento --- */
        var semMovimento = N.dados.servicos.filter(function (s) {
          return s.ativo && !conta[s.id];
        });
        var blocoSem = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Ativos sem atendimento no recorte' })
        );
        if (!semMovimento.length) {
          blocoSem.appendChild(h('p.miudo', { texto: 'Todos os serviços ativos tiveram movimento.' }));
        } else {
          semMovimento.forEach(function (s) {
            blocoSem.appendChild(h('div.linha-dado', null,
              h('span.linha-dado__rotulo', { texto: s.nome }),
              h('span.miudo', null,
                U.svg('relogio'),
                document.createTextNode(' ' + N.duracaoLegivel(s.duracao) +
                  (s.online ? ' · no site' : ' · só no painel')))));
          });
        }
        gradeServ.appendChild(blocoSem);
      }

      /* --- 4. Clientes --------------------------------------------------- */
      function relClientes(lista) {
        var porCliente = {};
        lista.forEach(function (a) {
          if (!porCliente[a.clienteId]) porCliente[a.clienteId] = { n: 0, cancel: 0, falta: 0, minutos: 0 };
          if (a.status === 'cancelado') porCliente[a.clienteId].cancel += 1;
          else if (a.status === 'ausente') porCliente[a.clienteId].falta += 1;
          else {
            porCliente[a.clienteId].n += 1;
            porCliente[a.clienteId].minutos += a.duracao;
          }
        });

        var ids = Object.keys(porCliente);
        var compareceram = ids.reduce(function (s, id) { return s + porCliente[id].n; }, 0);
        var faltas = ids.reduce(function (s, id) { return s + porCliente[id].cancel + porCliente[id].falta; }, 0);
        var esperados = compareceram + faltas;
        var novos = ids.filter(function (id) {
          var c = porCliente[id];
          return c.n === 1 && !c.cancel && !c.falta;
        }).length;
        var recorrentes = ids.filter(function (id) { return porCliente[id].n > 1; }).length;

        corpo.appendChild(h('div.grade.grade--metricas', null,
          metricaDemo({ rotulo: 'Clientes com registro', valor: String(ids.length),
            icone: 'pessoas', nota: 'no recorte escolhido' }),
          metricaDemo({ rotulo: 'Comparecimento',
            valor: esperados ? N.percentual(compareceram / esperados) : '—',
            icone: 'checar-circulo', nota: compareceram + ' de ' + esperados + ' esperados' }),
          metricaDemo({ rotulo: 'Voltaram mais de uma vez', valor: String(recorrentes),
            icone: 'estrela', nota: 'duas visitas ou mais no recorte' }),
          metricaDemo({ rotulo: 'Primeira visita', valor: String(novos),
            icone: 'usuario', nota: 'um único atendimento no recorte' })
        ));

        var ordenado = ids.map(function (id) {
          return { id: id, c: porCliente[id] };
        }).sort(function (a, b) { return b.c.n - a.c.n; });
        var max = ordenado.length ? ordenado[0].c.n : 0;

        var bloco = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Quem mais aparece' }),
          h('p.miudo', { texto: 'Ordenado por atendimentos no recorte. Toque para abrir a ficha.' })
        );
        ordenado.slice(0, 12).forEach(function (o) {
          var cliente = clientePorId(o.id);
          var linha = h('button.barra-forma.barra-forma--clicavel', {
            type: 'button',
            'aria-label': 'Abrir a ficha de ' + N.nomeCliente(cliente),
            ao: { click: function () { window.EH_APP.irPara('#/clientes/' + o.id); } }
          },
            h('span.barra-forma__rotulo', null,
              U.avatar(cliente, 'mini'),
              document.createTextNode(' ' + N.nomeCliente(cliente))),
            h('span.barra-forma__trilha', null,
              h('span.barra-forma__preenchimento', { estilo: { width: (o.c.n / max * 100) + '%' } })),
            h('span.barra-forma__valor', { texto: String(o.c.n) })
          );
          bloco.appendChild(linha);
        });
        /* Carteira (largura toda) + quem cancelou ou faltou. */
        var gradeCli = h('div.grade.grade--2.grade--painel');
        corpo.appendChild(bloco);
        corpo.appendChild(gradeCli);

        /* --- quem faltou --- */
        var faltosos = ids.map(function (id) {
          return { id: id, c: porCliente[id] };
        }).filter(function (o) { return o.c.cancel + o.c.falta > 0; })
          .sort(function (a, b) {
            return (b.c.cancel + b.c.falta) - (a.c.cancel + a.c.falta);
          });

        var blocoFalta = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Cancelamentos e faltas por cliente' }),
          h('p.miudo', { texto: 'Cancela e o horário volta para a agenda — vale um ' +
            'lembrete antes do próximo.' })
        );
        if (!faltosos.length) {
          blocoFalta.appendChild(h('p.miudo', { texto: 'Nenhum cancelamento ou falta no recorte.' }));
        } else {
          faltosos.slice(0, 10).forEach(function (o) {
            var cliente = clientePorId(o.id);
            blocoFalta.appendChild(h('div.linha-dado', null,
              h('span.linha-dado__rotulo', null,
                U.avatar(cliente, 'mini'),
                document.createTextNode(' ' + N.nomeCliente(cliente))),
              h('span.linha-dado__valor', { texto:
                o.c.cancel + (o.c.cancel === 1 ? ' cancelamento' : ' cancelamentos') + ' · ' +
                o.c.falta + (o.c.falta === 1 ? ' falta' : ' faltas') })
            ));
          });
        }
        gradeCli.appendChild(blocoFalta);

        corpo.appendChild(h('div.bloco', null, U.avisoDemo(
          'A carteira de clientes exibida é fictícia, criada para a apresentação. ' +
          'Não é a base real do salão.')));
      }

      /* --- 5. Origem e situação ------------------------------------------ */
      function relOrigem(lista) {
        var origemC = { site: 0, manual: 0 };
        lista.forEach(function (a) { origemC[a.origem] = (origemC[a.origem] || 0) + 1; });
        var total = lista.length;

        var statusC = {};
        N.ORDEM_ESTADOS.forEach(function (s) { statusC[s] = 0; });
        lista.forEach(function (a) { statusC[a.status] += 1; });

        var concluidos = statusC.concluido;
        var perdas = statusC.cancelado + statusC.ausente;

        corpo.appendChild(h('div.grade.grade--metricas', null,
          metricaDemo({ rotulo: 'Recebidos pelo site', valor: String(origemC.site || 0),
            icone: 'globo', nota: total ? Math.round((origemC.site || 0) / total * 100) + '% do total' : '—' }),
          metricaDemo({ rotulo: 'Lançados no painel', valor: String(origemC.manual || 0),
            icone: 'usuario', nota: total ? Math.round((origemC.manual || 0) / total * 100) + '% do total' : '—' }),
          metricaDemo({ rotulo: 'Concluídos', valor: String(concluidos),
            icone: 'checar-circulo', nota: total ? Math.round(concluidos / total * 100) + '% do total' : '—' }),
          metricaDemo({ rotulo: 'Cancelados e faltas', valor: String(perdas),
            icone: 'x-circulo', nota: total ? Math.round(perdas / total * 100) + '% do total' : '—' })
        ));

        var blocoOrigem = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'De onde vem a agenda' }),
          h('p.miudo', { texto: 'A distinção Site × Manual é a mesma que aparece ' +
            'em cada linha de agendamento do painel.' })
        );
        blocoOrigem.appendChild(barra(
          h('span.barra-forma__rotulo', null, U.svg('globo'), document.createTextNode(' Recebido pelo site')),
          origemC.site || 0, total || 1, String(origemC.site || 0)));
        blocoOrigem.appendChild(barra(
          h('span.barra-forma__rotulo', null, U.svg('usuario'), document.createTextNode(' Lançado no painel')),
          origemC.manual || 0, total || 1, String(origemC.manual || 0)));
        /* Origem e situação lado a lado — as duas leem o mesmo recorte. */
        var gradeOS = h('div.grade.grade--2.grade--painel');
        gradeOS.appendChild(blocoOrigem);

        var blocoStatus = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Situação de cada agendamento' }),
          h('p.miudo', { texto: 'Cancelado e Não compareceu liberam o horário de volta na agenda.' })
        );
        var maxS = N.ORDEM_ESTADOS.reduce(function (m, s) { return Math.max(m, statusC[s]); }, 0);
        N.ORDEM_ESTADOS.forEach(function (s) {
          blocoStatus.appendChild(h('div.barra-forma', null,
            h('span.barra-forma__rotulo', null, U.selo(s)),
            h('span.barra-forma__trilha', null,
              h('span.barra-forma__preenchimento', {
                estilo: { width: (maxS ? statusC[s] / maxS * 100 : 0) + '%' }
              })),
            h('span.barra-forma__valor', { texto: String(statusC[s]) })
          ));
        });
        gradeOS.appendChild(blocoStatus);
        corpo.appendChild(gradeOS);

        /* --- por profissional --- */
        var porProf = {};
        lista.forEach(function (a) {
          porProf[a.profissionalId] = (porProf[a.profissionalId] || 0) + 1;
        });
        var blocoProf = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Distribuição por profissional' }),
          h('p.miudo', { texto: 'O salão não informou os nomes da equipe — por isso a ' +
            'base demonstrativa usa um único responsável, exibido como “Profissional a definir”.' })
        );
        Object.keys(porProf).forEach(function (id) {
          var p = D.PROFISSIONAIS.filter(function (x) { return x.id === id; })[0];
          blocoProf.appendChild(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: p ? p.nome : 'Profissional a definir' }),
            h('span.linha-dado__valor', { texto: String(porProf[id]) })));
        });
        corpo.appendChild(blocoProf);
      }

      desenharPeriodo();
      montarCorpo();
      return caixa;
    }
  };
})();
