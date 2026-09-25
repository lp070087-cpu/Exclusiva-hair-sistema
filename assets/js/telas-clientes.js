/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-clientes.js
   CRM: lista de clientes e a FICHA individual com histórico de atendimentos,
   preferências registradas e indicadores.

   Os clientes são fictícios e estão marcados como tal — nenhum nome real de
   cliente do salão foi inventado ou copiado dos materiais.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  var TELAS = (window.TELAS = window.TELAS || {});

  var BUSCA = '';
  var ORDEM = 'recentes';
  var POR_PAGINA = 15;

  function todos() {
    return N.dados.clientes.filter(function (c) { return !c.semCadastro; });
  }

  /* O núcleo devolve a ficha crua; a leitura de tela (comparecimento,
     serviço mais frequente, última visita) é derivada aqui — assim a mesma
     ficha serve a lista, ao perfil e ao seletor de novo agendamento. */
  function comFicha() {
    return todos().map(function (c) {
      var f = N.fichaCliente(c, N.dados.agendamentos);
      var esperados = f.historico.todos.filter(function (a) { return a.status !== 'cancelado'; }).length;
      var compareceram = f.historico.todos.filter(function (a) {
        return a.status === 'concluido' || a.status === 'atendimento';
      }).length;
      var servicoFrequente = f.servicosFeitos.length
        ? N.servicoDe({ servicoId: f.servicosFeitos[0].servicoId }) : null;

      /* Total gasto: soma SÓ o que foi efetivamente lançado e não voltou.
         `semValor` conta os atendimentos que ficaram sem lançamento — sem
         esse número a cliente com histórico incompleto pareceria ter gasto
         menos do que gastou, e a proprietária não teria como saber por quê. */
      var totalGasto = 0, comValor = 0, semValor = 0;
      f.historico.todos.forEach(function (a) {
        if (a.status !== 'concluido' && a.status !== 'atendimento') return;
        var p = N.pagamentoDe(a);
        var v = N.valorLiquido(p);
        if (v == null) { semValor += 1; return; }
        if (p.status === 'estornado') return;   // devolvido não é gasto
        comValor += 1;
        if (p.status === 'pago' || p.status === 'parcial') totalGasto += v;
      });

      return {
        cliente: c,
        ficha: {
          visitas: f.visitas,
          ultimaVisita: f.ultima,
          proximo: f.proximo,
          servicosFeitos: f.servicosFeitos,
          cancelamentos: f.cancelamentos,
          ausencias: f.ausencias,
          esperados: esperados,
          compareceram: compareceram,
          taxaComparecimento: esperados ? compareceram / esperados : 0,
          servicoFrequente: servicoFrequente,
          totalGasto: totalGasto,
          lancamentos: comValor,
          semValor: semValor,
          preferencias: montarPreferencias(c, f)
        }
      };
    });
  }

  /* Preferências: o que os materiais do salão registram sobre a cliente.
     Nada é inventado — o campo `nota` é a anotação do cadastro. */
  function montarPreferencias(c, f) {
    var p = [];
    if (c.nota) p.push({ rotulo: 'Anotação do cadastro', valor: c.nota });
    if (c.fone) p.push({ rotulo: 'Telefone', valor: N.telefoneLegivel(c.fone) });
    if (c.email) p.push({ rotulo: 'E-mail', valor: c.email });
    p.push({ rotulo: 'Cliente desde', valor: N.dataCompleta(c.desde) });
    if (f.cancelamentos) {
      p.push({
        rotulo: 'Cancelamentos',
        valor: f.cancelamentos + (f.cancelamentos === 1 ? ' registro' : ' registros')
      });
    }
    if (f.ausencias) {
      p.push({ rotulo: 'Faltas', valor: f.ausencias + (f.ausencias === 1 ? ' registro' : ' registros') });
    }
    return p;
  }

  /* ---------------------------------------------------------------------
     LISTA / CRM
     --------------------------------------------------------------------- */
  TELAS.clientes = {
    titulo: 'Clientes',
    aoAbrir: function () {},
    montar: function (params, estado) {
      /* "#/clientes/c01" chega aqui com o id em params[0]. O roteador resolve
         a primeira parte do hash, então a ficha vive dentro desta mesma rota. */
      if (params && params[0]) {
        var alvo = N.dados.clientes.filter(function (c) { return c.id === params[0]; })[0];
        if (alvo) return TELAS.cliente.montar(params, estado);
      }
      var caixa = h('div');
      var todosCom = comFicha();
      var cadastrados = todos().length;
      var semCadastro = N.dados.clientes.length - cadastrados;
      var comRetorno = todosCom.filter(function (x) { return x.ficha.visitas > 1; }).length;

      caixa.appendChild(h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: 'Clientes' }),
          h('div.cabecalho__contexto', null,
            h('span', { texto: cadastrados + ' clientes fictícios na demonstração' }),
            U.marcaDemo('fictícios')
          )
        ),
        h('div.cabecalho__acoes', null,
          h('button.btn.btn--secundario', {
            type: 'button',
            ao: {
              click: function () {
                U.toast('O cadastro de novos clientes entra quando o sistema real estiver ligado. ' +
                  'Nesta demonstração os clientes são fictícios e não podem ser criados.', 'info');
              }
            }
          }, U.svg('mais'), document.createTextNode('Novo cliente'))
        )
      ));

      /* --- indicadores do CRM --- */
      caixa.appendChild(h('div.grade.grade--metricas', null,
        U.metrica({ rotulo: 'Clientes cadastrados', valor: String(cadastrados), icone: 'pessoas', demo: true }),
        U.metrica({ rotulo: 'Com mais de uma visita', valor: String(comRetorno), icone: 'tendencia', demo: true }),
        U.metrica({ rotulo: 'Atendimentos no período', valor: String(N.dados.agendamentos.length), icone: 'lista', demo: true }),
        U.metrica({
          rotulo: 'Sem cadastro (balcão)', valor: String(semCadastro), icone: 'usuario', demo: true,
          nota: 'registros de demonstração'
        })
      ));

      var barra = h('div.filtros');
      var buscaEl = U.busca({
        placeholder: 'Buscar por nome, telefone ou e-mail…', bloco: false,
        aoBuscar: function (t) { BUSCA = t.toLowerCase(); VAR.pagina = 1; listar(); }
      });
      if (BUSCA) buscaEl.entrada.value = BUSCA;
      barra.appendChild(h('div.filtros__busca', null, buscaEl.el));

      var botaoOrdem = h('button.btn.btn--secundario', {
        type: 'button',
        ao: {
          click: function () {
            U.menuFlutuante(botaoOrdem, function (fechar) {
              return [
                U.itemMenu(function () { return document.createTextNode('Visita mais recente'); }, function () { setOrdem('recentes', 'Mais recentes', fechar); }),
                U.itemMenu(function () { return document.createTextNode('Mais visitas'); }, function () { setOrdem('visitas', 'Mais visitas', fechar); }),
                U.itemMenu(function () { return document.createTextNode('Nome (A–Z)'); }, function () { setOrdem('nome', 'Nome A–Z', fechar); })
              ];
            }, { alinhar: 'fim' });
          }
        }
      }, U.svg('setas'), document.createTextNode('Mais recentes'));
      barra.appendChild(botaoOrdem);
      caixa.appendChild(barra);

      function setOrdem(id, rotulo, fechar) {
        ORDEM = id; VAR.pagina = 1;
        botaoOrdem.lastChild.textContent = rotulo;
        if (fechar) fechar();
        listar();
      }

      var resultado = h('div');
      caixa.appendChild(resultado);
      var VAR = { pagina: 1 };

      function selecionarComFicha() {
        var lista = comFicha();
        if (BUSCA) {
          lista = lista.filter(function (x) {
            var c = x.cliente;
            return (c.nome + ' ' + (c.fone || '') + ' ' + (c.email || '')).toLowerCase().indexOf(BUSCA) !== -1;
          });
        }
        if (ORDEM === 'visitas') {
          lista.sort(function (a, b) {
            if (b.ficha.visitas !== a.ficha.visitas) return b.ficha.visitas - a.ficha.visitas;
            return a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR');
          });
        } else if (ORDEM === 'nome') {
          lista.sort(function (a, b) { return a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR'); });
        } else {
          lista.sort(function (a, b) {
            var da = a.ficha.ultimaVisita ? a.ficha.ultimaVisita.dataChave : '';
            var db = b.ficha.ultimaVisita ? b.ficha.ultimaVisita.dataChave : '';
            if (da !== db) return da < db ? 1 : -1;
            return a.cliente.nome.localeCompare(b.cliente.nome, 'pt-BR');
          });
        }
        return lista;
      }

      function listar() {
        U.limpar(resultado);
        var lista = selecionarComFicha();
        var totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
        if (VAR.pagina > totalPaginas) VAR.pagina = totalPaginas;
        var fatia = lista.slice((VAR.pagina - 1) * POR_PAGINA, VAR.pagina * POR_PAGINA);

        resultado.appendChild(h('div.lista-topo', null,
          h('span', { texto: lista.length === 1 ? '1 cliente' : lista.length + ' clientes' })
        ));

        if (!fatia.length) {
          resultado.appendChild(U.vazio('pessoas', 'Nenhum cliente encontrado',
            'Tente outro nome, telefone ou e-mail.', null, true));
          return;
        }

        /* Tabela no desktop, cartões no celular — o mesmo componente cuida
           da troca via data-rotulo.
           ATENÇÃO: U.tabela() devolve { el, corpo, preencher }, não o nó.
           Sem o .el, o appendChild recebe um objeto e estoura com
           "parameter 1 is not of type 'Node'". */
        resultado.appendChild(U.tabela({
          colunas: [
            {
              chave: 'nome', rotulo: 'Cliente', ordenavel: false,
              valor: function (x) {
                return h('span.linha-cliente', null, U.avatar(x.cliente),
                  h('span', null,
                    h('span.linha-principal__nome', { texto: x.cliente.nome }),
                    h('span.linha-principal__sub.truncar', {
                      texto: x.cliente.fone ? N.telefoneLegivel(x.cliente.fone) : 'sem telefone'
                    })
                  ));
              }
            },
            {
              chave: 'visitas', rotulo: 'Atendimentos',
              valor: function (x) { return document.createTextNode(String(x.ficha.visitas)); }
            },
            {
              chave: 'ultima', rotulo: 'Última visita',
              valor: function (x) {
                return document.createTextNode(x.ficha.ultimaVisita
                  ? N.rotuloDia(x.ficha.ultimaVisita.dataChave, new Date()) + ' · ' + N.dataCurta(x.ficha.ultimaVisita.dataChave)
                  : 'nunca atendida');
              }
            },
            {
              chave: 'proximo', rotulo: 'Próximo atendimento',
              valor: function (x) {
                if (!x.ficha.proximo) return h('span.miudo', { texto: 'sem retorno marcado' });
                return h('span', null,
                  h('span', { texto: N.rotuloDia(x.ficha.proximo.dataChave, new Date()) }),
                  h('span.miudo', { texto: ' · ' + N.horaCheia(x.ficha.proximo.inicio) }));
              }
            },
            {
              chave: 'preferencia', rotulo: 'Serviço mais frequente',
              valor: function (x) {
                var p = x.ficha.servicoFrequente;
                return document.createTextNode(p ? p.nome : '—');
              }
            },
            {
              chave: 'gasto', rotulo: 'Total gasto',
              valor: function (x) {
                /* Nenhum lançamento é DIFERENTE de gastar zero. Quando não
                   há valor nenhum, a célula diz isso em palavras. */
                if (!x.ficha.lancamentos) {
                  return h('span.miudo', { texto: x.ficha.semValor ? 'não lançado' : '—' });
                }
                return h('span.num', {
                  texto: N.moeda(x.ficha.totalGasto),
                  title: x.ficha.semValor
                    ? x.ficha.lancamentos + ' lançamentos · ' + x.ficha.semValor + ' sem valor'
                    : x.ficha.lancamentos + (x.ficha.lancamentos === 1 ? ' lançamento' : ' lançamentos')
                });
              }
            },
            {
              chave: 'status', rotulo: 'Retorno',
              valor: function (x) {
                if (!x.ficha.visitas) return h('span.selo', { texto: 'Primeira visita' });
                if (x.ficha.visitas > 3) return h('span.selo.selo--confirmado', { texto: 'Recorrente' });
                return h('span.selo', { texto: 'Em retorno' });
              }
            }
          ],
          itens: fatia,
          clicavel: true,
          chaveLinha: function (x) { return x.cliente.id; },
          aoClicarLinha: function (x) { N.roteador.ir('#/clientes/' + x.cliente.id); }
        }).el);

        if (totalPaginas > 1) {
          resultado.appendChild(U.paginacao(lista.length, VAR.pagina, POR_PAGINA, function (p) {
            VAR.pagina = p; listar();
          }));
        }
      }

      listar();
      return caixa;
    }
  };

  /* ---------------------------------------------------------------------
     FICHA DO CLIENTE
     --------------------------------------------------------------------- */
  TELAS.cliente = {
    titulo: 'Ficha do cliente',
    aoAbrir: function () {},
    montar: function (params) {
      var id = params && params[0];
      var cliente = N.dados.clientes.filter(function (c) { return c.id === id; })[0];
      if (!cliente) {
        return h('div.cabecalho', null, U.vazio('pessoas', 'Cliente não encontrado',
          'Este cliente não existe na demonstração.',
          h('button.btn.btn--secundario', {
            type: 'button', texto: 'Voltar para Clientes',
            ao: { click: function () { N.roteador.ir('#/clientes'); } }
          })));
      }

      var ficha = comFicha().filter(function (x) { return x.cliente.id === cliente.id; })[0].ficha;
      var caixa = h('div');

      /* --- voltar --- */
      caixa.appendChild(h('button.voltar', {
        type: 'button',
        ao: { click: function () { N.roteador.ir('#/clientes'); } }
      }, U.svg('chevron-esq'), document.createTextNode('Clientes')));

      /* --- topo da ficha --- */
      var acoes = h('div.perfil-topo__acoes');
      if (cliente.fone) {
        acoes.appendChild(h('button.btn.btn--secundario.btn--pequeno', {
          type: 'button', texto: 'Ligar',
          ao: {
            click: function () {
              U.toast('Discar para ' + cliente.nome + ' — ' + N.telefoneLegivel(cliente.fone) +
                '. A discagem não está ligada nesta demonstração.', 'info');
            }
          }
        }, U.svg('telefone')));
      }
      acoes.appendChild(h('button.btn.btn--principal.btn--pequeno', {
        type: 'button', texto: 'Novo agendamento',
        ao: { click: function () { window.AGENDA.abrirNovo({ dataChave: D.chaveDe(new Date()) }); } }
      }, U.svg('mais')));

      caixa.appendChild(h('div.perfil-topo', null,
        U.avatar(cliente, 'gg'),
        h('div.perfil-topo__texto', null,
          h('h1.perfil-topo__nome', { texto: cliente.nome }),
          h('div.etiquetas', null,
            cliente.fone ? h('span.etiqueta', null, U.svg('telefone'), document.createTextNode(N.telefoneLegivel(cliente.fone))) : null,
            cliente.email ? h('span.etiqueta', null, U.svg('email'), document.createTextNode(cliente.email)) : null,
            h('span.etiqueta', null, U.svg('usuario'), document.createTextNode('Desde ' + N.dataCurta(cliente.desde))),
            U.marcaDemo('cliente fictício')
          )
        ),
        acoes
      ));

      /* --- indicadores --- */
      caixa.appendChild(h('div.grade.grade--metricas', null,
        U.metrica({ rotulo: 'Atendimentos', valor: String(ficha.visitas), icone: 'lista', demo: true }),
        U.metrica({
          rotulo: 'Comparecimento', icone: 'checar-circulo', demo: true,
          valor: ficha.esperados ? N.percentual(ficha.taxaComparecimento) : '—'
        }),
        U.metrica({
          rotulo: 'Última visita', icone: 'calendario', demo: true,
          valor: ficha.ultimaVisita ? N.dataCurta(ficha.ultimaVisita.dataChave) : '—',
          nota: ficha.ultimaVisita ? N.rotuloDia(ficha.ultimaVisita.dataChave, new Date()) : 'sem histórico'
        }),
        U.metrica({
          rotulo: 'Serviço mais frequente', icone: 'estrela', demo: true,
          valor: ficha.servicoFrequente ? ficha.servicoFrequente.nome : '—'
        })
      ));

      /* ------------------------------------------------------------------
         A ficha em cinco blocos nomeados — DADOS, HISTÓRICO, AGENDAMENTOS,
         FINANCEIRO, OBSERVAÇÕES. A ordem é a ordem das perguntas: quem é,
         o que já fez, o que vem, quanto já gastou, e o que anotar.
         ------------------------------------------------------------------ */

      /* --- DADOS --- */
      caixa.appendChild(h('div.bloco', null,
        h('h2.bloco__titulo', { texto: 'Dados' }),
        h('div.grade.grade--compacta', null,
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', null, U.svg('usuario'), document.createTextNode('Nome')),
            h('span.linha-dado__valor', { texto: cliente.nome })),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', null, U.svg('telefone'), document.createTextNode('Telefone')),
            h('span.linha-dado__valor', cliente.fone
              ? document.createTextNode(N.telefoneLegivel(cliente.fone))
              : h('span.miudo', { texto: 'não informado' }))),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', null, U.svg('email'), document.createTextNode('E-mail')),
            h('span.linha-dado__valor', cliente.email
              ? document.createTextNode(cliente.email)
              : h('span.miudo', { texto: 'não informado' }))),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', null, U.svg('calendario'), document.createTextNode('Cliente desde')),
            h('span.linha-dado__valor', { texto: N.dataCompleta(cliente.desde) }))
        )
      ));

      /* --- qual histórico é passado e qual é futuro ---
         O núcleo já devolve os dois cortes prontos e ordenados
         (`historicoDoCliente`); a ficha não reclassifica por conta própria,
         senão a data de corte poderia divergir da que a lista usa. */
      var historico = N.historicoDoCliente(cliente.id, N.dados.agendamentos);
      var passados = historico.passados;
      var futuros = historico.futuros;

      /* --- AGENDAMENTOS (o que vem) --- */
      var blocoAg = h('div.bloco', null,
        h('div.bloco__cabecalho', null,
          h('h2.bloco__titulo', { texto: 'Agendamentos' }),
          h('span.miudo', { texto: futuros.length
            ? futuros.length + (futuros.length === 1 ? ' marcado' : ' marcados')
            : 'nada marcado' })
        )
      );
      if (!futuros.length) {
        blocoAg.appendChild(U.vazio('calendario', 'Sem retorno marcado',
          'Esta cliente não tem atendimento futuro na agenda.', null, true));
      } else {
        var pilhaAg = h('div.pilha');
        futuros.forEach(function (a) {
          pilhaAg.appendChild(U.linhaAgendamento(a, {
            aoAbrir: window.AGENDA.abrirDetalhe,
            agora: new Date()
          }));
        });
        blocoAg.appendChild(pilhaAg);
      }
      caixa.appendChild(blocoAg);

      /* --- FINANCEIRO ---
         Só aparece o que foi LANÇADO. Nada aqui é derivado de tabela de
         preço — o salão não tem preço cadastrado, então toda cifra desta
         seção veio de um lançamento feito na finalização. */
      var pagaveis = historico.todos.filter(function (a) {
        return a.status === 'concluido' || a.status === 'atendimento';
      });
      var blocoFin = h('div.bloco', null,
        h('h2.bloco__titulo', { texto: 'Financeiro' })
      );
      if (!pagaveis.length) {
        blocoFin.appendChild(U.vazio('dinheiro', 'Nada lançado ainda',
          'Quando um atendimento desta cliente for finalizado com valor, ele aparece aqui.', null, true));
      } else {
        var linhasFin = [];
        if (ficha.lancamentos) {
          linhasFin.push(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Total gasto (lançado)' }),
            h('span.linha-dado__valor.num', { texto: N.moeda(ficha.totalGasto) })));
          linhasFin.push(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Atendimentos com valor' }),
            h('span.linha-dado__valor', { texto: String(ficha.lancamentos) })));
          linhasFin.push(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Ticket médio' }),
            h('span.linha-dado__valor.num',
              { texto: N.moeda(ficha.totalGasto / ficha.lancamentos) })));
        }
        if (ficha.semValor) {
          linhasFin.push(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Sem valor lançado' }),
            h('span.linha-dado__valor', { texto: ficha.semValor + (ficha.semValor === 1
              ? ' atendimento' : ' atendimentos') })));
        }
        blocoFin.appendChild(h('div.grade.grade--compacta', null, linhasFin));

        /* Últimos lançamentos, com forma e situação — a mesma leitura da
           tabela do Financeiro, recortada para esta cliente. */
        var lancados = pagaveis.filter(function (a) { return !!N.pagamentoDe(a); })
          .sort(function (a, b) { return a.dataChave < b.dataChave ? 1 : -1; }).slice(0, 6);
        if (lancados.length) {
          var listaFin = h('div.lista-simples', { estilo: { marginTop: 'var(--e4)' } });
          lancados.forEach(function (a) {
            var p = N.pagamentoDe(a);
            var v = N.valorLiquido(p);
            listaFin.appendChild(h('div.lista-simples__item', null,
              h('span', null,
                h('span', { texto: N.dataCurta(a.dataChave) }),
                h('span.miudo', { texto: ' · ' + N.nomeServico(a.servicoId) })),
              h('span.etiquetas', null,
                h('span.miudo', { texto: N.nomeFormaPagamento(p.forma) || 'forma não informada' }),
                h('span.selo-pag.selo-pag--' + p.status, { texto: N.statusPagamento(p.status).nome }),
                h('span.num', { texto: v == null ? '—' : N.moeda(v) }))
            ));
          });
          blocoFin.appendChild(listaFin);
        }
        blocoFin.appendChild(h('p.miudo', { estilo: { marginTop: 'var(--e3)' },
          texto: 'Valores demonstrativos, lançados no atendimento. Não é a tabela de preços do salão.' }));
      }
      caixa.appendChild(blocoFin);

      /* --- HISTÓRICO (o que já passou) --- */
      var blocoHist = h('div.bloco', null,
        h('div.bloco__cabecalho', null,
          h('h2.bloco__titulo', { texto: 'Histórico de atendimentos' }),
          h('span.miudo', { texto: passados.length + (passados.length === 1 ? ' registro' : ' registros') })
        )
      );

      if (!passados.length) {
        blocoHist.appendChild(U.vazio('calendario', 'Ainda sem atendimentos',
          'Quando esta cliente tiver atendimentos, eles aparecem aqui.', null, true));
      } else {
        var linha = h('div.linha-tempo');
        passados.forEach(function (a) {
          var servico = N.servicoDe(a);
          var texto = a.liberouHorario
            ? (a.status === 'ausente' ? 'Não compareceu' : 'Cancelado')
            : (a.status === 'concluido' ? 'Concluído' : N.estado(a.status).nome);
          linha.appendChild(h('button.linha-tempo__item.linha-tempo__item--clicavel', {
            type: 'button',
            ao: { click: function () { window.AGENDA.abrirDetalhe(a); } }
          },
            h('span.linha-tempo__quando', { texto: N.rotuloDia(a.dataChave, new Date()) + ' · ' + N.horaCurta(a.inicio) }),
            h('span.linha-tempo__texto', null,
              h('span', { texto: servico.nome + ' · ' + N.duracaoLegivel(a.duracao) }),
              h('span.miudo', { texto: texto })
            ),
            h('span.linha-tempo__fim', null, U.origem(a.origem), U.seloPagamento(a))
          ));
        });
        blocoHist.appendChild(linha);
      }
      caixa.appendChild(blocoHist);

      /* --- OBSERVAÇÕES --- */
      var blocoObs = h('div.bloco', null,
        h('h2.bloco__titulo', { texto: 'Observações' }),
        h('p.miudo', { texto: 'Anotações do cadastro e preferências registradas.' })
      );
      blocoObs.appendChild(cliente.nota
        ? h('div.nota', null, document.createTextNode(cliente.nota))
        : h('p.miudo', { texto: 'Nenhuma anotação no cadastro desta cliente.' }));
      if (ficha.preferencias && ficha.preferencias.length) {
        blocoObs.appendChild(h('div.grade.grade--compacta', { estilo: { marginTop: 'var(--e4)' } },
          ficha.preferencias.map(function (p) {
            return h('div.linha-dado', null,
              h('span.linha-dado__rotulo', { texto: p.rotulo }),
              h('span.linha-dado__valor', { texto: p.valor }));
          })));
      }

      /* Auditoria dentro de OBSERVAÇÕES: é registro do que foi mexido, não
         atendimento — pertence ao mesmo bloco de "o que anotar". */
      var eventos = [];
      var doCliente = N.dados.agendamentos.filter(function (a) { return a.clienteId === cliente.id; });
      doCliente.forEach(function (a) {
        (a.historico || []).forEach(function (ev) { eventos.push({ quando: ev.quando, texto: ev.texto, agendamento: a }); });
      });
      eventos.sort(function (x, y) { return String(x.quando) < String(y.quando) ? 1 : -1; });
      if (eventos.length) {
        blocoObs.appendChild(h('h3.bloco__titulo', { estilo: { marginTop: 'var(--e5)' },
          texto: 'Alterações registradas' }));
        var l2 = h('div.linha-tempo');
        eventos.slice(0, 14).forEach(function (ev) {
          l2.appendChild(h('div.linha-tempo__item', null,
            h('span.linha-tempo__quando', { texto: N.dataCompleta(new Date(ev.quando)) }),
            h('span.linha-tempo__texto', { texto: ev.texto }),
            h('span.linha-tempo__fim.miudo', { texto: N.dataCurta(ev.agendamento.dataChave) })
          ));
        });
        blocoObs.appendChild(l2);
      }
      caixa.appendChild(blocoObs);

      caixa.appendChild(h('div.bloco', null, U.avisoDemo(
        'Esta ficha é demonstrativa. Nome, telefone, e-mail e histórico são fictícios — ' +
        'nenhum dado real de cliente do salão está nesta apresentação.')));

      return caixa;
    }
  };
})();
