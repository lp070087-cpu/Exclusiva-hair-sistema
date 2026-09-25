/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-visao.js

   VISÃO GERAL — a primeira tela depois do login.

   Ela responde três perguntas, nesta ordem: o que está acontecendo AGORA,
   o que vem depois, e como o dia está fechando. Nenhum número é inventado:
   tudo sai do mesmo núcleo que alimenta a agenda.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  var TELAS = (window.TELAS = window.TELAS || {});

  function hojeChave() { return D.chaveDe(new Date()); }

  /* O núcleo é puro: sempre pede a coleção. Estes dois atalhos leem do store
     para a tela não repetir a mesma lista em cada chamada. */
  function resumo(chave) {
    return N.resumoDoDia(chave, N.dados.agendamentos, N.dados.bloqueios);
  }
  function livres(chave, minutos) {
    return N.horariosDisponiveis({ duracao: minutos }, chave,
      N.dados.agendamentos, N.dados.bloqueios);
  }


  /* O núcleo expõe servicoDe/clienteDe esperando o OBJETO do agendamento.
     Aqui as telas novas trabalham com ids; estes atalhos leem o store. */
  function servicoPorId(id) {
    return N.dados.servicos.filter(function (s) { return s.id === id; })[0] || null;
  }
  function clientePorId(id) {
    return N.dados.clientes.filter(function (c) { return c.id === id; })[0] || null;
  }

  function minutosAgora() {
    var a = new Date();
    return a.getHours() * 60 + a.getMinutes();
  }

  TELAS['visao-geral'] = {
    titulo: 'Visão geral',
    aoAbrir: function () {},
    montar: function () {
      var caixa = h('div');
      var agora = minutosAgora();
      var hoje = hojeChave();
      var r = resumo(hoje);
      var emCurso = N.emAndamento(N.dados.agendamentos, new Date());
      var proximo = N.proximoAtendimento(N.dados.agendamentos, new Date());

      /* ------------------------------------------------------------------
         TOPO — saudação e a hora de agora
         ------------------------------------------------------------------ */
      caixa.appendChild(h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: N.saudacao() + ', tudo certo por aqui?' }),
          h('div.cabecalho__contexto', null,
            h('span', { texto: N.dataLonga(hoje) + ' · ' + N.horaCheia(agora) }),
            U.marcaDemo('demonstrativo')
          )
        ),
        h('div.cabecalho__acoes', null,
          h('button.btn.btn--secundario', {
            type: 'button',
            ao: { click: function () { window.EH_APP.irPara('#/agenda'); } }
          }, U.svg('agenda'), document.createTextNode('Ver agenda')),
          h('button.btn.btn--principal', {
            type: 'button',
            ao: { click: function () { window.AGENDA.abrirNovo({ dataChave: hoje }); } }
          }, U.svg('mais'), document.createTextNode('Novo agendamento'))
        )
      ));

      if (!r.aberto) {
        caixa.appendChild(h('div.bloco', null,
          U.vazio('calendario-x', 'Hoje o salão está fechado',
            'A grade demonstrativa marca ' + N.rotuloDia(hoje, new Date()) +
            ' como dia sem atendimento. Se não for o caso, ajuste em Configurações → Funcionamento.',
            h('button.btn.btn--secundario', {
              type: 'button', texto: 'Abrir configurações',
              ao: { click: function () { window.EH_APP.irPara('#/config'); } }
            }), true)));
      }

      /* ------------------------------------------------------------------
         AO VIVO — o atendimento em curso, se houver
         ------------------------------------------------------------------ */
      if (emCurso) {
        var cliAtual = clientePorId(emCurso.clienteId);
        var srvAtual = servicoPorId(emCurso.servicoId);
        var faltam = D.minutosDe(emCurso.fim) - agora;
        caixa.appendChild(h('section.ao-vivo', null,
          h('div.ao-vivo__marca', null,
            h('span.pulso', { 'aria-hidden': 'true' }),
            h('span.rotulo', { texto: 'Acontecendo agora' })),
          h('button.ao-vivo__item', {
            type: 'button',
            'aria-label': 'Abrir o atendimento de ' + N.nomeCliente(cliAtual),
            ao: { click: function () { window.AGENDA.abrirDetalhe(emCurso); } }
          },
            U.avatar(cliAtual),
            h('span.ao-vivo__corpo', null,
              h('span.linha-principal__nome', { texto: N.nomeCliente(cliAtual) }),
              h('span.linha-principal__sub', { texto: srvAtual.nome + ' · ' +
                N.intervalo(emCurso.inicio, emCurso.fim) })),
            h('span.ao-vivo__resto', null,
              h('span.num', { texto: String(Math.max(0, faltam)) }),
              h('span.miudo', { texto: 'min restantes' }))
          )));
      }

      /* ------------------------------------------------------------------
         O DIA EM NÚMEROS
         ------------------------------------------------------------------ */
      var porVir = r.agendamentos.filter(function (a) {
        return N.estaAtivo(a) && a.inicioMin >= agora;
      });
      var confluidos = r.contagem.concluido || 0;

      caixa.appendChild(h('div.grade.grade--metricas', null,
        U.metrica({
          rotulo: 'Agendamentos hoje', valor: String(r.total),
          icone: 'calendario', demo: true,
          nota: r.porOrigem.site + ' pelo site · ' + r.porOrigem.manual + ' no painel'
        }),
        U.metrica({
          rotulo: 'Ainda hoje', valor: String(porVir.length),
          icone: 'relogio', demo: true,
          nota: porVir.length
            ? 'próximo às ' + N.horaCheia(porVir[0].inicioMin)
            : 'dia encerrado no horário de agora'
        }),
        U.metrica({
          rotulo: 'Concluídos', valor: String(confluidos),
          icone: 'checar-circulo', demo: true,
          nota: (r.contagem.cancelado || 0) + ' cancelados · ' +
            (r.contagem.ausente || 0) + ' faltas'
        }),
        U.metrica({
          rotulo: 'Agenda ocupada', valor: N.percentual(r.ocupacao),
          icone: 'grafico', demo: true,
          nota: N.duracaoLegivel(r.minutosLivres) + ' ainda livres'
        })
      ));

      /* ------------------------------------------------------------------
         PRÓXIMO ATENDIMENTO — cartão de destaque
         ------------------------------------------------------------------ */
      var coluna = h('div.colunas');

      var blocoProx = h('div.bloco', null,
        h('h2.bloco__titulo', { texto: 'A seguir na agenda' })
      );
      if (!proximo) {
        blocoProx.appendChild(h('p.miudo', {
          texto: r.total && !porVir.length
            ? 'Os atendimentos de hoje já passaram. O próximo está em outro dia.'
            : 'Nada mais marcado para hoje.'
        }));
        var seguinte = N.dados.agendamentos.filter(function (a) {
          return a.dataChave > hoje && N.estaAtivo(a);
        })[0];
        if (seguinte) {
          blocoProx.appendChild(h('p.miudo', { texto: 'Próximo compromisso: ' +
            N.rotuloDia(seguinte.dataChave, new Date()) + ', ' + N.intervalo(seguinte.inicio, seguinte.fim) + '.' }));
          blocoProx.appendChild(U.linhaAgendamento(seguinte, { aoAbrir: window.AGENDA.abrirDetalhe }));
        }
      } else {
        blocoProx.appendChild(destacar(proximo));
      }
      coluna.appendChild(blocoProx);

      /* ------------------------------------------------------------------
         COMO O DIA ESTÁ DISTRIBUÍDO
         A barra sozinha diz a proporção; não diz QUANTO. Por isso os três
         números abaixo dela — e eles vêm todos do resumo do dia, nenhum é
         estimado para preencher espaço.
         ------------------------------------------------------------------ */
      var blocoDist = h('div.bloco', null,
        h('h2.bloco__titulo', { texto: 'Ocupação do dia' }),
        h('p.miudo', { texto: 'Tempo de cadeira, pausa e o que ainda dá para encaixar.' })
      );
      var totalBase = r.minutosTotais || 1;
      [['Atendido', r.minutosOcupados, 'ocupado'],
       ['Bloqueado', r.minutosBloqueados, 'bloqueio'],
       ['Livre', r.minutosLivres, 'livre']
      ].forEach(function (trio) {
        blocoDist.appendChild(h('div.barra-forma', null,
          h('span.barra-forma__rotulo', { texto: trio[0] }),
          h('span.barra-forma__trilha', null,
            h('span.barra-forma__preenchimento.barra-forma__preenchimento--' + trio[2], {
              estilo: { width: Math.round(trio[1] / totalBase * 100) + '%' }
            })),
          h('span.barra-forma__valor', { texto: N.duracaoLegivel(trio[1]) })
        ));
      });

      /* Números de apoio: quantos atendimentos o dia tem, quantas horas de
         cadeira e quantas horas ainda sobram. */
      blocoDist.appendChild(h('div.mini-numeros', null,
        miniNumero('Atendimentos', String(r.total)),
        miniNumero('Horas ocupadas', horas(r.minutosOcupados)),
        miniNumero('Horas livres', horas(r.minutosLivres))
      ));

      var vagas60 = livres(hoje, 60);
      blocoDist.appendChild(h('p.miudo', { estilo: { marginTop: 'var(--e3)' }, texto: vagas60.length
        ? vagas60.length + (vagas60.length === 1
            ? ' janela de 1 hora livre para encaixe.'
            : ' janelas de 1 hora livres para encaixe.')
        : 'Sem janela de 1 hora livre hoje — dia fechado ou cheio.' }));
      coluna.appendChild(blocoDist);

      caixa.appendChild(coluna);

      /* ------------------------------------------------------------------
         EQUIPE HOJE (§14)
         Um bloco pequeno: quem trabalha hoje, quanto cada posto carrega e
         quantas vagas sobram. Os números saem TODOS de `equipeDoDia` — a
         mesma função que alimenta a aba Equipe — para que as duas telas
         não possam discordar uma da outra.
         ------------------------------------------------------------------ */
      var eq = N.equipeDoDia(hoje, N.dados.agendamentos, N.dados.bloqueios, new Date());
      var blocoEquipe = h('div.bloco', null,
        h('div.bloco__cabecalho', null,
          h('h2.bloco__titulo', { texto: 'Equipe hoje' }),
          U.marcaDemo('dados de exemplo')
        ),
        h('p.miudo', {
          texto: eq.trabalhando + (eq.trabalhando === 1 ? ' posto trabalhando' : ' postos trabalhando') +
            ' de ' + eq.total + ' \u00b7 ' + eq.ocupadasAgora + ' de ' + eq.capacidade +
            ' vagas em uso agora \u00b7 ' + eq.vagasLivres +
            (eq.vagasLivres === 1 ? ' livre' : ' livres')
        })
      );
      blocoEquipe.appendChild(h('div.equipe-hoje', null,
        eq.profissionais.map(function (l) {
          var ocupadas = l.vagas.trabalha ? Math.min(l.vagas.pico, l.vagas.capacidade) : 0;
          return h('button.equipe-hoje__linha', {
            type: 'button',
            dados: { trabalhando: l.vagas.trabalha ? 'sim' : 'nao' },
            'aria-label': l.profissional.nome + ', ' + l.situacao.nome + '. ' +
              (l.vagas.trabalha
                ? ocupadas + ' de ' + l.vagas.capacidade + ' vagas ocupadas no pico do dia'
                : 'n\u00e3o trabalha hoje') +
              '. Abrir a ficha.',
            ao: {
              click: function () {
                window.EH_APP.irPara('#/equipe/' + l.profissional.id);
              }
            }
          },
            h('span.equipe-hoje__sigla', { texto: l.profissional.curto || l.profissional.nome }),
            h('span.equipe-hoje__nome', { texto: l.profissional.nome }),
            h('span.equipe-hoje__sit', { texto: l.situacao.nome }),
            l.vagas.trabalha
              ? h('span.equipe-hoje__barra', {
                  role: 'img',
                  'aria-label': ocupadas + ' de ' + l.vagas.capacidade +
                    ' vagas ocupadas no pico do dia'
                }, h('i.equipe-hoje__preenchimento', {
                  estilo: { width: Math.round(l.vagas.fracao * 100) + '%' }
                }))
              : h('span.equipe-hoje__barra', { dados: { vazia: 'sim' }, 'aria-hidden': 'true' }),
            h('span.equipe-hoje__num', {
              texto: l.vagas.trabalha
                ? ocupadas + ' / ' + l.vagas.capacidade
                : '\u2014'
            }),
            h('span.equipe-hoje__livres', {
              texto: l.vagas.trabalha
                ? l.vagas.vagas + (l.vagas.vagas === 1 ? ' livre' : ' livres')
                : 'fora hoje'
            })
          );
        })
      ));
      caixa.appendChild(blocoEquipe);

      /* ------------------------------------------------------------------
         ATALHOS
         ------------------------------------------------------------------ */
      caixa.appendChild(h('div.bloco', null,
        h('h2.bloco__titulo', { texto: 'Atalhos do dia' }),
        h('div.atalhos', null,
          atalho('mais', 'Novo agendamento', function () { window.AGENDA.abrirNovo({ dataChave: hoje }); }),
          atalho('bloquear', 'Bloquear horário', function () {
          window.AGENDA.abrirBloqueioNovo(D.dataDeChave(hoje));
        }),
          atalho('pessoas', 'Cadastrar cliente', function () { window.EH_APP.irPara('#/clientes'); }),
          atalho('tesoura', 'Ver serviços', function () { window.EH_APP.irPara('#/servicos'); }),
          atalho('grafico', 'Abrir relatórios', function () { window.EH_APP.irPara('#/relatorios'); }),
          atalho('ajustes', 'Configurações', function () { window.EH_APP.irPara('#/config'); })
        )
      ));
      var blocoStatus = h('div.bloco', null,
        h('h2.bloco__titulo', { texto: 'Situação dos agendamentos de hoje' })
      );
      var grade = h('div.grade-status');
      N.ORDEM_ESTADOS.forEach(function (id) {
        var n = r.contagem[id] || 0;
        grade.appendChild(h('button.grade-status__item', {
          type: 'button',
          dados: { vazio: n ? 'nao' : 'sim' },
          'aria-label': 'Ver ' + n + ' agendamentos com situação ' + N.estado(id).nome,
          ao: {
            click: function () {
              window.EH_APP.irPara('#/agendamentos');
            }
          }
        },
          U.selo(id),
          h('span.grade-status__num', { texto: String(n) })
        ));
      });
      blocoStatus.appendChild(grade);

      /* ------------------------------------------------------------------
         MOVIMENTO DOS PRÓXIMOS DIAS
         ------------------------------------------------------------------ */
      var blocoSemana = h('div.bloco', null,
        h('h2.bloco__titulo', { texto: 'Próximos dias' }),
        h('p.miudo', { texto: 'Toque em um dia para abrir a agenda dele.' })
      );
      var fileira = h('div.fileira-dias');
      for (var i = 1; i <= 7; i += 1) {
        (function (i) {
          var k = D.chaveDe(new Date(new Date().getFullYear(), new Date().getMonth(),
            new Date().getDate() + i));
          var rr = resumo(k);
          var ativos = rr.agendamentos.filter(function (a) { return N.estaAtivo(a); }).length;
          fileira.appendChild(h('button.dia-resumo', {
            type: 'button',
            dados: { fechado: rr.aberto ? 'nao' : 'sim' },
            'aria-label': N.rotuloDia(k, new Date()) + ', ' + ativos + ' agendamentos',
            ao: { click: function () { window.EH_APP.irPara('#/agenda/' + k); } }
          },
            h('span.dia-resumo__semana', { texto: N.rotuloDia(k, new Date()) }),
            h('span.dia-resumo__num', { texto: String(D.dataDeChave(k).getDate()) }),
            h('span.dia-resumo__mes', { texto: D.MESES_CURTO[D.dataDeChave(k).getMonth()] }),
            rr.aberto
              ? h('span.dia-resumo__contagem', { texto: ativos + (ativos === 1 ? ' atend.' : ' atend.') })
              : h('span.dia-resumo__fechado', { texto: 'fechado' }),
            rr.aberto ? h('span.dia-resumo__barra', { 'aria-hidden': 'true' },
              h('span.dia-resumo__cheio', { estilo: { height: Math.round(rr.ocupacao * 100) + '%' } })) : null
          ));
        })(i);
      }
      blocoSemana.appendChild(fileira);

      /* ------------------------------------------------------------------
         SITUAÇÃO e PRÓXIMOS DIAS — lado a lado
         Os dois blocos são curtos e antes ocupavam, cada um, uma faixa
         inteira: a tela virava uma pilha vertical justamente onde sobra
         largura. Aqui eles dividem a mesma grade de painel. Ela quebra
         sozinha para uma coluna quando a tela estreita, e o desenho de
         cada bloco continua igual — o espaço lateral serve para ORGANIZAR,
         não para esticar número nem inflar componente.
         ------------------------------------------------------------------ */
      caixa.appendChild(h('div.grade.grade--painel', null,
        blocoStatus, blocoSemana));

      /* ------------------------------------------------------------------
         O AVISO — o contrato da apresentação, dito sem rodeio
         ------------------------------------------------------------------ */
      caixa.appendChild(U.avisoDemo(
        'A agenda, os nomes de clientes, os telefones e todos os números desta tela são ' +
        'demonstrativos: existem para mostrar como o painel funciona e não representam o ' +
        'movimento real da Exclusiva Hair. Preços, telefone, e-mail, endereço e horário ' +
        'oficial do salão não constam nos materiais e por isso não foram preenchidos.', false));

      return caixa;

      function destacar(a) {
        var cliente = clientePorId(a.clienteId);
        var servico = servicoPorId(a.servicoId);
        /* O estado temporal vem do núcleo — a Visão Geral não recalcula
           "faltam X min" por conta própria, senão os dois números
           divergiriam assim que uma das telas fosse ajustada. */
        var t = N.estadoTemporal(a, new Date());
        return h('button.destaque', {
          type: 'button',
          'aria-label': 'Abrir o agendamento de ' + N.nomeCliente(cliente),
          ao: { click: function () { window.AGENDA.abrirDetalhe(a); } }
        },
          h('div.destaque__topo', null,
            h('span.destaque__hora.num', { texto: N.horaCheia(a.inicioMin) }),
            h('span.destaque__ate', { texto: 'até ' + N.horaCheia(D.minutosDe(a.fim)) }),
            U.selo(a.status)),
          h('div.destaque__quem', null,
            U.avatar(cliente, 'grande'),
            h('div', null,
              h('span.destaque__nome', { texto: N.nomeCliente(cliente) }),
              h('span.miudo', { texto: servico.nome + ' · ' + N.duracaoLegivel(a.duracao) }))),
          /* Rodapé com as três leituras que a proprietária procura antes
             de a cliente chegar: quanto falta, de onde veio e quem é. */
          h('div.destaque__rodape', null,
            t && t.rotulo
              ? (function () {
                  var el = U.estadoTemporal(a, { agora: new Date() });
                  el.classList.add('temporal--destaque');
                  return el;
                })()
              : h('span.miudo', { texto: N.rotuloDia(a.dataChave, new Date()) }),
            U.origem(a.origem))
        );
      }

      /* Horas de relógio, não duração de serviço: 270 min vira "4h30". */
      function horas(min) {
        var h = Math.floor(min / 60), m = min % 60;
        return m === 0 ? h + 'h' : h + 'h' + (m < 10 ? '0' : '') + m;
      }

      function miniNumero(rotulo, valor) {
        return h('span.mini-numero', null,
          h('span.mini-numero__valor.num', { texto: valor }),
          h('span.mini-numero__rotulo', { texto: rotulo })
        );
      }

      function atalho(icone, texto, aoClicar) {
        return h('button.atalho', {
          type: 'button', 'aria-label': texto, ao: { click: aoClicar }
        }, U.svg(icone), h('span.atalho__texto', { texto: texto }));
      }
    }
  };
})();
