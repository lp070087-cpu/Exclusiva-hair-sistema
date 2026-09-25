/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-agenda.js
   A AGENDA em dia, semana e mês.

   Regras que a tela respeita, e que vêm do briefing:
   • horário OCUPADO nunca aparece como livre;
   • horário BLOQUEADO (almoço, evento, manutenção, compromisso, indisponível)
     nunca aparece como livre;
   • cancelar libera o horário — porque cancelado não ocupa, quem decide isso
     é o núcleo (`ocupaAgenda`), e a tela só reflete;
   • no celular não existe semana de 7 colunas apertadas: a semana e o mês
     viram lista vertical por dia, com a faixa de datas na horizontal.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  /* Cada arquivo de tela se registra sozinho. O registro NÃO mora no app.js:
     os módulos de tela carregam antes dele, então depender do app.js para
     criar esta caixa quebraria todos eles na primeira linha. */
  var TELAS = (window.TELAS = window.TELAS || {});

  var ICONE_MOTIVO = {
    almoco: 'utensilios', evento: 'faisca', manutencao: 'ferramenta',
    compromisso: 'maleta', indisponivel: 'bloquear'
  };

  function dois(n) { return n < 10 ? '0' + n : String(n); }

  /* Uma tela só no celular, outra no desktop. Fonte única da verdade para
     todas as decisões de layout da agenda. */
  function estreito() {
    return window.matchMedia('(max-width: 60rem)').matches;
  }

  /* "#/agenda/2026-09-24" chega como params = ['2026-09-24'] */
  function dataDoParam(params) {
    var alvo = params && params[0];
    if (alvo && /^\d{4}-\d{2}-\d{2}$/.test(alvo)) return D.dataDeChave(alvo);
    return new Date();
  }

  /* ---------------------------------------------------------------------
     INTERVALOS LIVRES
     A agenda mostra o dia como uma fita: o que está tomado (atendimento que
     ocupa + bloqueio) e o que sobrou. Trabalhar com os VÃOS, e não com os
     horários da grade, é o que permite dizer "2h livres" em vez de repetir
     "09:00, 09:30, 10:00…".
     --------------------------------------------------------------------- */
  function intervalosTomados(agendamentos, bloqueios) {
    var faixas = [];
    agendamentos.forEach(function (a) {
      if (!N.ocupaAgenda(a)) return;   // cancelado e ausente liberam
      faixas.push({ inicio: a.inicioMin, fim: a.inicioMin + a.duracao, tipo: 'atendimento', ref: a });
    });
    bloqueios.forEach(function (b) {
      faixas.push({ inicio: b.inicioMin, fim: b.fimMin, tipo: 'bloqueio', ref: b });
    });
    faixas.sort(function (x, y) { return x.inicio - y.inicio; });
    /* Junta faixas que se tocam: um bloqueio colado a um atendimento vira
       um vão só — visualmente é uma faixa contínua indisponível. */
    var juntas = [];
    faixas.forEach(function (f) {
      var ultimo = juntas[juntas.length - 1];
      if (ultimo && f.inicio <= ultimo.fim) {
        ultimo.fim = Math.max(ultimo.fim, f.fim);
        ultimo.partes.push(f);
      } else {
        juntas.push({ inicio: f.inicio, fim: f.fim, partes: [f] });
      }
    });
    return juntas;
  }

  function vaosLivres(tomados, inicioDia, fimDia, minimo) {
    var min = minimo || 30;
    var vaos = [];
    var cursor = inicioDia;
    tomados.forEach(function (t) {
      if (t.inicio - cursor >= min) vaos.push({ inicio: cursor, fim: t.inicio });
      cursor = Math.max(cursor, t.fim);
    });
    if (fimDia - cursor >= min) vaos.push({ inicio: cursor, fim: fimDia });
    return vaos;
  }

  /* ---------------------------------------------------------------------
     VISÃO DIA
     --------------------------------------------------------------------- */
  function montarVisaoDia(data, opcoes) {
    opcoes = opcoes || {};
    var chave = D.chaveDe(data);
    var cfg = N.dados.funcionamento[data.getDay()];
    /* O filtro por profissional (§8) entra AQUI, e não escondendo blocos:
       tudo o que a tela afirma — o resumo, os vãos livres, os blocos — sai
       da mesma lista já filtrada, então não há como uma parte dizer uma
       coisa e outra dizer o contrário. */
    var filtro = opcoes.posto && opcoes.posto !== 'todas' ? opcoes.posto : null;
    var doDia = N.doDia(N.dados.agendamentos, chave);
    var bloqueios = N.bloqueiosDoDia(N.dados.bloqueios, chave);
    if (filtro) {
      doDia = doDia.filter(function (a) { return profissionalDe(a).id === filtro; });
      bloqueios = bloqueios.filter(function (b) {
        var dono = postoDoBloqueio(b);
        return !dono || dono.id === filtro;
      });
      /* Numa agenda já filtrada, repetir a sigla em cada faixa é ruído. */
      opcoes.semPosto = true;
    }
    var resumo = N.resumoDoDia(chave, doDia, bloqueios);

    if (!cfg.aberto) {
      return h('div.agenda-dia', null,
        h('div.agenda-fechado', null,
          U.svg('bloquear'),
          h('p.titulo-secao', { texto: 'Salão fechado neste dia' }),
          h('p.miudo', { texto: 'Os horários de funcionamento são dados de exemplo desta demonstração.' })
        )
      );
    }

    var inicioDia = D.minutosDe(cfg.inicio);
    var fimDia = D.minutosDe(cfg.fim);
    var grade = h('div.agenda-dia__grade', {
      estilo: { '--minutos-dia': String(fimDia - inicioDia) }
    });

    /* -- linhas de hora -- */
    for (var m = inicioDia; m < fimDia; m += 60) {
      var hora = h('div.agenda-hora', {
        estilo: { top: 'calc(' + (m - inicioDia) + ' * var(--minuto-altura))' }
      }, h('span.agenda-hora__rotulo', { texto: N.horaCheia(D.hhmmDe(m)) }));
      grade.appendChild(hora);
      if (m + 30 < fimDia) {
        grade.appendChild(h('div.agenda-hora--meia', {
          estilo: { top: 'calc(' + (m + 30 - inicioDia) + ' * var(--minuto-altura))' }
        }));
      }
    }

    var tomados = intervalosTomados(doDia, bloqueios);

    function posicionar(el, inicio, fim) {
      el.style.top = 'calc(' + (inicio - inicioDia) + ' * var(--minuto-altura))';
      el.style.height = 'calc(' + (fim - inicio) + ' * var(--minuto-altura) - 2px)';
      return el;
    }

    /* -- vãos livres: são o alvo para agendar -- */
    vaosLivres(tomados, inicioDia, fimDia, 30).forEach(function (v) {
      var dur = v.fim - v.inicio;
      var b = h('button.agenda-vago', {
        type: 'button',
        'aria-label': 'Horário livre ' + N.intervalo(D.hhmmDe(v.inicio), D.hhmmDe(v.fim)) + '. Agendar aqui.',
        ao: { click: function () { abrirNovo({ dataChave: chave, inicio: D.hhmmDe(v.inicio) }); } }
      }, U.svg('mais'),
        h('span.agenda-vago__texto', {
          texto: (dur >= 60 ? N.duracaoLegivel(dur) + ' livres' : N.duracaoLegivel(dur) + ' livre') + ' · agendar'
        })
      );
      grade.appendChild(posicionar(b, v.inicio, v.fim));
    });

    /* -- blocos ocupados --
       Cada faixa contínua é desenhada atendimento por atendimento. Quando a
       faixa é larga, os blocos ficam lado a lado (ocuparam o salão ao mesmo
       tempo); quando é estreita, empilham. Um atendimento maior que a
       própria faixa é cortado — nunca invade o bloco de baixo. */
    tomados.forEach(function (t) {
      if (t.partes.length === 1) {
        var unico = t.partes[0];
        if (unico.tipo === 'bloqueio') grade.appendChild(posicionar(blocoBloqueio(unico.ref, opcoes), t.inicio, t.fim));
        else grade.appendChild(posicionar(blocoAjustado(unico.ref, t.fim - t.inicio, opcoes), t.inicio, t.fim));
        return;
      }
      var larga = (t.fim - t.inicio) >= 60;
      var camada = h('div.agenda-grupo', {
        dados: { lado: larga ? 'sim' : 'nao' },
        estilo: {
          top: 'calc(' + (t.inicio - inicioDia) + ' * var(--minuto-altura))',
          height: 'calc(' + (t.fim - t.inicio) + ' * var(--minuto-altura) - 2px)'
        }
      });
      var n = t.partes.length;
      t.partes.forEach(function (p, i) {
        var topo = 'calc(' + (p.inicio - t.inicio) + ' * var(--minuto-altura))';
        var altura = 'calc(' + (p.fim - p.inicio) + ' * var(--minuto-altura) - 2px)';
        var el;
        if (p.tipo === 'bloqueio') {
          el = blocoBloqueio(p.ref, opcoes);
        } else {
          el = blocoAjustado(p.ref, t.fim - p.inicio, opcoes);
        }
        el.style.top = topo;
        if (el.dataset.ajustado !== 'sim') el.style.height = altura;
        if (larga) {
          /* lado a lado: divide a largura da faixa em colunas iguais */
          var de = (i * 100) / n, ate = ((i + 1) * 100) / n;
          el.style.left = 'calc(' + de.toFixed(4) + '% + 0.125rem)';
          el.style.right = 'calc(' + (100 - ate).toFixed(4) + '% + 0.125rem)';
        }
        camada.appendChild(el);
      });
      grade.appendChild(camada);
    });

    /* -- marca da hora atual -- */
    var agora = new Date();
    if (D.chaveDe(agora) === chave) {
      var agoraMin = agora.getHours() * 60 + agora.getMinutes();
      if (agoraMin >= inicioDia && agoraMin <= fimDia) {
        grade.appendChild(h('div.agenda-agora', {
          estilo: { top: 'calc(' + (agoraMin - inicioDia) + ' * var(--minuto-altura))' }
        }, h('span.agenda-agora__rotulo', { texto: 'agora' })));
      }
    }

    var corpo = h('div.agenda-dia__corpo', null, grade);
    var caixa = h('div.agenda-dia', null, corpo);

    if (!resumo.agendamentos.length && !bloqueios.length) {
      caixa.appendChild(h('div', { estilo: { padding: '0 var(--e4) var(--e4)' } },
        U.vazio('calendario', 'Nenhum atendimento neste dia',
          'Clique em um horário livre na grade para agendar.', null, true)
      ));
    } else {
      caixa.insertBefore(montarResumoDia(resumo), corpo);
    }
    return caixa;
  }

  /* Um bloco da grade. A altura vem da duração; `curto` só decide se cabe
     cabeçalho, nome e rodapé, ou se o bloco vira uma linha corrida. */
  function nomeMotivo(id) {
    var mot = D.MOTIVOS_BLOQUEIO.filter(function (x) { return x.id === id; })[0];
    return mot ? mot.nome : 'Indisponível';
  }

  function blocoBloqueio(b, opcoes) {
    var nome = nomeMotivo(b.motivo);
    var dono = postoDoBloqueio(b);
    return h('button.agenda-bloqueio', {
      type: 'button',
      dados: { motivo: b.motivo, posto: dono ? dono.id : '--' },
      'aria-label': 'Bloqueado: ' + nome + '. ' + N.intervalo(b.inicio, b.fim) + '. Toque para liberar.',
      ao: { click: function () { (opcoes.aoBloqueio || abrirBloqueio)(b); } }
    }, U.svg(ICONE_MOTIVO[b.motivo] || 'bloquear'),
      h('span.agenda-bloqueio__texto', null,
        h('span.agenda-bloqueio__motivo', { texto: nome }),
        b.observacao ? h('span.agenda-bloqueio__obs', { texto: b.observacao }) : null
      )
    );
  }

  /* ---------------------------------------------------------------------
     DE QUEM É O ATENDIMENTO
     Cada atendimento pertence a uma profissional. Os mais antigos (e os
     que o núcleo gravou no posto padrão) não trazem o campo: tratá-los
     como "sem dono" e sumir com eles ao filtrar esconderia atendimento
     real. Sem campo = posto padrão, que é quem o núcleo escolheu ao
     gravá-los.
     --------------------------------------------------------------------- */
  /* CUIDADO: `N.profissional(id)` NUNCA devolve nulo — para um id que nao
     existe ele FABRICA um posto ("Profissional a definir", curto "—").
     Entao testar `if (N.profissional(x))` nao valida nada: e sempre verdade.
     Para saber se uma profissional existe mesmo, a lista e a unica fonte. */
  function postoExiste(id) {
    return (N.dados.profissionais || []).some(function (p) { return p.id === id; });
  }
  function postoPadrao() {
    return N.profissional(N.PROFISSIONAL_PADRAO) ||
           (N.dados.profissionais && N.dados.profissionais[0]) || null;
  }
  function profissionalDe(a) {
    var id = a && a.profissionalId;
    return (id && postoExiste(id) ? N.profissional(id) : null) || postoPadrao();
  }
  /* Num bloco estreito o nome por extenso não cabe; a sigla cabe. */
  function postoCurto(a) {
    var p = profissionalDe(a);
    return p ? (p.curto || p.nome) : '';
  }
  /* Bloqueio da AGENDA não pertence a posto — o salão fecha para todos.
     Mas se um dia tiver dono, o filtro respeita. */
  function postoDoBloqueio(b) {
    var id = b && b.profissionalId;
    return id && postoExiste(id) ? N.profissional(id) : null;
  }

  function montarBloco(a, opcoes) {
    opcoes = opcoes || {};
    var cliente = N.clienteDe(a);
    var posto = profissionalDe(a);
    var semPosto = opcoes.semPosto === true;
    var servico = N.servicoDe(a);
    var curto = a.duracao <= 30;
    /* 30 min é a menor duração da grade e o bloco fica com 36px — cabe o
       horário e o nome, e mais nada. */
    var medio = a.duracao <= 60;
    var b = h('button.agenda-bloco' + (opcoes.classe ? '.' + opcoes.classe : ''), {
      type: 'button',
      dados: {
        status: a.status,
        curto: curto ? 'sim' : 'nao',
        /* O posto vem SEMPRE, mesmo quando a agenda ja esta filtrada.
           `semPosto` decide apenas se a SIGLA deve ser impressa — sao duas
           coisas diferentes. Amarrar as duas fazia o bloco perder a
           identidade justamente na tela filtrada, que e onde ela mais
           importa (a bancada, o CSS e qualquer regra futura leem daqui). */
        posto: posto ? posto.id : '--'
      },
      'aria-label': N.nomeCliente(cliente) + ', ' + servico.nome + ', ' +
        N.intervalo(a.inicio, a.fim) + ', ' + N.estado(a.status).nome,
      ao: { click: function () { (opcoes.aoAbrir || abrirDetalhe)(a); } }
    },
      h('span.agenda-bloco__hora', { texto: N.horaCurta(a.inicio) + '–' + N.horaCurta(a.fim) }),
      h('span.agenda-bloco__nome', { texto: N.nomeCliente(cliente) }),
      h('span.agenda-bloco__servico', { texto: servico.nome }),
      /* Quem atende. Some no bloco de 30 min (ali não cabe nada além do
         essencial) e some quando a agenda JÁ está filtrada por ela —
         repetir a mesma sigla em toda faixa é ruído, não informação. */
      !curto && !semPosto && posto
        ? h('span.agenda-bloco__posto', { texto: posto.curto || posto.nome })
        : null
    );
    /* O rodapé é a única parte que depende de espaço, e cabe a partir de
       1h. Abaixo disso o bloco não tem altura: forçar faria o conteúdo
       vazar por cima do bloco seguinte. */
    if (!medio) {
      var rodape = h('span.agenda-bloco__rodape', null, U.selo(a.status), U.origem(a.origem));
      /* O cronômetro só aparece quando há algo a dizer — concluído e
         cancelado não têm contagem, e um espaço vazio no bloco é pior do
         que nenhum. */
      var t = U.estadoTemporal(a, { agora: opcoes.agora, decorativo: true });
      if (t) {
        t.classList.add('temporal--bloco');
        rodape.appendChild(t);
      }
      b.appendChild(rodape);
    }
    return b;
  }

  /* O mesmo bloco, ajustado a um vão que pode ser mais curto que o
     atendimento. Sem isto, um serviço de 2h dentro de uma janela de 1h
     transbordaria por cima do bloco seguinte. */
  function blocoAjustado(a, minutosDisponiveis, opcoes) {
    var b = montarBloco(a, opcoes);
    var cabeInteiro = minutosDisponiveis >= a.duracao;
    b.dataset.ajustado = cabeInteiro ? 'nao' : 'sim';
    if (!cabeInteiro) {
      b.style.height = 'calc(' + minutosDisponiveis + ' * var(--minuto-altura) - 2px)';
      b.style.zIndex = '3';
    }
    return b;
  }

  function montarResumoDia(resumo) {
    var itens = [
      ['atendimentos', String(resumo.total)],
      ['ocupados', N.duracaoLegivel(resumo.minutosOcupados)],
      ['livres', N.duracaoLegivel(resumo.minutosLivres)],
      ['site', String(resumo.porOrigem.site || 0)],
      ['manual', String(resumo.porOrigem.manual || 0)]
    ];
    var tira = h('div.agenda-resumo');
    itens.forEach(function (par) {
      tira.appendChild(h('span.agenda-resumo__item', null,
        h('span', { texto: par[0] + ':' }), h('b', { texto: par[1] })));
    });
    tira.appendChild(h('span.agenda-resumo__item', { estilo: { marginLeft: 'auto' } },
      U.marcaDemo('ocupação ' + Math.round(resumo.ocupacao * 100) + '% — demonstrativa')));
    return tira;
  }

  /* ---------------------------------------------------------------------
     VISÃO SEMANA e VISÃO MÊS (desktop)
     --------------------------------------------------------------------- */
  function inicioDaSemana(data) {
    var d = new Date(data.getFullYear(), data.getMonth(), data.getDate());
    var dia = d.getDay();                       // 0=dom
    var recuo = dia === 0 ? 6 : dia - 1;         // semana começa na segunda
    d.setDate(d.getDate() - recuo);
    return d;
  }

  function montarVisaoSemana(data) {
    var inicio = inicioDaSemana(data);
    var colunas = [];
    for (var i = 0; i < 6; i += 1) {              // seg a sáb
      var d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      colunas.push(d);
    }
    var grade = h('div.agenda-semana', null);
    var hojeChave = D.chaveDe(new Date());

    colunas.forEach(function (d) {
      var chave = D.chaveDe(d);
      var cfg = N.dados.funcionamento[d.getDay()];
      var ags = N.doDia(N.dados.agendamentos, chave).filter(function (a) { return a.status !== 'cancelado'; });
      ags.sort(function (a, b) { return a.inicioMin - b.inicioMin; });
      var bloqs = N.bloqueiosDoDia(N.dados.bloqueios, chave);

      var lista = h('div.agenda-semana__lista');
      /* Junta atendimentos e bloqueios na ordem do relógio: a coluna do dia
         lê-se de cima para baixo, como o dia acontece. */
      var tudo = [];
      ags.forEach(function (a) { tudo.push({ t: a.inicioMin, tipo: 'ag', ref: a }); });
      bloqs.forEach(function (b) { tudo.push({ t: b.inicioMin, tipo: 'bl', ref: b }); });
      tudo.sort(function (x, y) { return x.t - y.t; });

      if (!tudo.length) {
        lista.appendChild(h('div.agenda-semana__vazio', { texto: cfg.aberto ? 'Dia livre' : 'Fechado' }));
      } else {
        tudo.forEach(function (x) {
          if (x.tipo === 'bl') {
            var mot = D.MOTIVOS_BLOQUEIO.filter(function (m) { return m.id === x.ref.motivo; })[0] || {};
            lista.appendChild(h('button.mini-bloqueio', {
              type: 'button',
              'aria-label': 'Bloqueado: ' + (mot.nome || '') + ' ' + N.intervalo(x.ref.inicio, x.ref.fim),
              ao: { click: function () { abrirBloqueio(x.ref); } }
            }, document.createTextNode(N.horaCurta(x.ref.inicio) + ' ' + (mot.nome || 'Bloqueado'))));
          } else {
            var a = x.ref, c = N.clienteDe(a);
            lista.appendChild(h('button.mini-ag', {
              type: 'button', dados: { status: a.status },
              'aria-label': N.nomeCliente(c) + ', ' + N.nomeServico(a.servicoId) + ', ' + N.horaCheia(a.inicio),
              ao: { click: function () { abrirDetalhe(a); } }
            },
              h('span.mini-ag__hora', { texto: N.horaCurta(a.inicio) }),
              h('span.mini-ag__nome.truncar', { texto: N.nomeCurto(a.clienteId) }),
              h('span.mini-ag__servico.truncar', { texto: N.nomeServico(a.servicoId) })
            ));
          }
        });
      }

      grade.appendChild(h('div.agenda-semana__col', {
        dados: { hoje: chave === hojeChave ? 'sim' : 'nao', fechado: cfg.aberto ? 'nao' : 'sim' }
      },
        h('div.agenda-semana__topo', null,
          h('div.agenda-semana__dia', { texto: D.DIAS_CURTO[d.getDay()] }),
          h('div.agenda-semana__num', { texto: dois(d.getDate()) })
        ),
        lista
      ));
    });
    return grade;
  }

  function montarVisaoMes(data) {
    var ano = data.getFullYear(), mes = data.getMonth();
    var primeiro = new Date(ano, mes, 1);
    var inicio = inicioDaSemana(primeiro);
    var hojeChave = D.chaveDe(new Date());
    var hojeMes = data.getMonth();

    var caixa = h('div.agenda-mes');
    var cabecalho = h('div.agenda-mes__cabecalho');
    /* Segunda a domingo: a semana do salão começa na segunda, e domingo está
       fechado — a coluna dele aparece, mas esmaecida. */
    ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].forEach(function (d) {
      cabecalho.appendChild(h('span', { texto: d }));
    });
    caixa.appendChild(cabecalho);

    var grade = h('div.agenda-mes__grade');
    var total = 0;
    var cursor = new Date(inicio);
    while (total < 42) {
      var chave = D.chaveDe(cursor);
      var cfg = N.dados.funcionamento[cursor.getDay()];
      var resumo = N.resumoDoDia(chave, N.dados.agendamentos, N.dados.bloqueios);
      var bloqueios = N.bloqueiosDoDia(N.dados.bloqueios, chave);
      var fora = cursor.getMonth() !== hojeMes;

      var cel = h('button.agenda-mes__dia', {
        type: 'button',
        dados: {
          fora: fora ? 'sim' : 'nao',
          hoje: chave === hojeChave ? 'sim' : 'nao',
          fechado: cfg.aberto ? 'nao' : 'sim'
        },
        'aria-label': cursor.getDate() + ' de ' + D.MESES[cursor.getMonth()] + ', ' +
          (cfg.aberto ? resumo.total + ' atendimentos' : 'fechado'),
        disabled: cfg.aberto ? null : true,
        ao: { click: function () { N.roteador.ir('#/agenda/' + chave); } }
      },
        h('span.agenda-mes__num', { texto: dois(cursor.getDate()) })
      );

      if (cfg.aberto) {
        if (resumo.total) {
          cel.appendChild(h('span.agenda-mes__contagem', {
            texto: resumo.total === 1 ? '1 atendimento' : resumo.total + ' atendimentos'
          }));
        }
        bloqueios.forEach(function (b) {
          var mot = D.MOTIVOS_BLOQUEIO.filter(function (m) { return m.id === b.motivo; })[0] || {};
          cel.appendChild(h('span.agenda-mes__bloqueio', null, U.svg('bloquear'),
            document.createTextNode(mot.nome || 'Bloqueado')));
        });
        if (resumo.total) {
          var barras = h('span.agenda-mes__barras');
          resumo.agendamentos.forEach(function (a) {
            barras.appendChild(h('span.agenda-mes__barra', { dados: { status: a.status } }));
          });
          cel.appendChild(barras);
        }
        cel.appendChild(h('span.agenda-mes__ocupacao', null,
          h('i', { estilo: { width: Math.round(resumo.ocupacao * 100) + '%' } })));
      }

      grade.appendChild(cel);
      cursor.setDate(cursor.getDate() + 1);
      total += 1;
    }
    caixa.appendChild(grade);
    return caixa;
  }

  /* ---------------------------------------------------------------------
     VISÃO LISTA — semana e mês no celular.
     Blocos por dia, em ordem de relógio, com a faixa de datas por cima.
     Zero colunas apertadas, zero rolagem horizontal.
     --------------------------------------------------------------------- */
  function montarListaDias(datas, opcoes) {
    opcoes = opcoes || {};
    var caixa = h('div', null);

    datas.forEach(function (d) {
      var chave = D.chaveDe(d);
      var cfg = N.dados.funcionamento[d.getDay()];
      var ags = N.doDia(N.dados.agendamentos, chave).slice();
      ags.sort(function (a, b) { return a.inicioMin - b.inicioMin; });
      var bloqs = N.bloqueiosDoDia(N.dados.bloqueios, chave);
      var resumo = N.resumoDoDia(chave, N.dados.agendamentos, N.dados.bloqueios);

      var bloco = h('section.agenda-lista__dia');

      if (!ags.length && !bloqs.length && !cfg.aberto) {
        /* Dia fechado e vazio não merece uma seção inteira. */
        if (!opcoes.mostrarFechados) return;
      }

      bloco.appendChild(h('header.agenda-lista__cabecalho', null,
        h('div', null,
          h('span.agenda-lista__titulo', { texto: N.rotuloDia(chave, new Date()) }),
          document.createTextNode(' '),
          h('span.agenda-lista__meta', { texto: '· ' + N.dataLonga(d) })
        ),
        h('span.agenda-lista__meta', {
          texto: !cfg.aberto ? 'fechado'
            : (resumo.total ? resumo.total + ' atend. · ' + N.duracaoLegivel(resumo.minutosLivres) + ' livres'
                            : 'dia livre')
        })
      ));

      if (!cfg.aberto) {
        bloco.appendChild(h('p.miudo', { texto: 'Salão fechado (horário de exemplo da demonstração).' }));
      } else if (!ags.length && !bloqs.length) {
        bloco.appendChild(U.vazio('calendario', 'Dia livre',
          'Nenhum atendimento marcado. Toque para agendar.', null, true));
      } else {
        var lista = h('div.pilha');
        var tudo = [];
        ags.forEach(function (a) { tudo.push({ t: a.inicioMin, tipo: 'ag', ref: a }); });
        bloqs.forEach(function (b) { tudo.push({ t: b.inicioMin, tipo: 'bl', ref: b }); });
        tudo.sort(function (x, y) { return x.t - y.t; });
        tudo.forEach(function (x) {
          if (x.tipo === 'bl') {
            var mot = D.MOTIVOS_BLOQUEIO.filter(function (m) { return m.id === x.ref.motivo; })[0] || {};
            lista.appendChild(h('button.linha-cartao', {
              type: 'button',
              'aria-label': 'Bloqueado: ' + (mot.nome || '') + ', ' + N.intervalo(x.ref.inicio, x.ref.fim),
              ao: { click: function () { abrirBloqueio(x.ref); } }
            },
              h('span.linha-cartao__hora', { texto: N.horaCheia(x.ref.inicio) }),
              h('span.avatar', { estilo: { background: 'var(--marfim-2)', color: 'var(--texto-3)' } },
                U.svg('bloquear')),
              h('span.linha-cartao__corpo', null,
                h('span.linha-principal__nome', { texto: mot.nome || 'Indisponível' }),
                h('span.linha-principal__sub.truncar', {
                  texto: N.intervalo(x.ref.inicio, x.ref.fim) + (x.ref.observacao ? ' · ' + x.ref.observacao : '')
                })
              )
            ));
          } else {
            lista.appendChild(U.linhaAgendamento(x.ref, { aoAbrir: abrirDetalhe }));
          }
        });
        bloco.appendChild(lista);
      }
      caixa.appendChild(bloco);
    });
    return caixa;
  }

  function datasDaSemana(data) {
    var inicio = inicioDaSemana(data);
    var out = [];
    for (var i = 0; i < 7; i += 1) out.push(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
    return out;
  }

  /* ---------------------------------------------------------------------
     FAIXA DE DATAS — seletor horizontal. É a peça de navegação no celular.
     --------------------------------------------------------------------- */
  function montarFaixaDatas(dataAtual, aoEscolher, dias) {
    var faixa = h('div.faixa-datas', { role: 'group', 'aria-label': 'Escolher dia' });
    var hoje = new Date();
    var centro = dataAtual;
    var janela = dias || 14;
    for (var i = 0; i < janela; i += 1) {
      var d = new Date(centro.getFullYear(), centro.getMonth(), centro.getDate() + i);
      var chave = D.chaveDe(d);
      var cfg = N.dados.funcionamento[d.getDay()];
      var temAgenda = N.doDia(N.dados.agendamentos, chave).length > 0;
      var b = h('button.faixa-datas__item', {
        type: 'button',
        'aria-current': chave === D.chaveDe(dataAtual) ? 'date' : null,
        'aria-label': N.rotuloDia(chave, hoje) + ' — ' + (cfg.aberto ? 'aberto' : 'fechado'),
        dados: cfg.aberto ? {} : { fechado: 'sim' }
      },
        h('span.faixa-datas__dia', { texto: i === 0 ? 'Hoje' : D.DIAS_CURTO[d.getDay()] }),
        h('span.faixa-datas__num', { texto: dois(d.getDate()) }),
        (cfg.aberto && temAgenda) ? h('span.faixa-datas__ponto') : null
      );
      (function (dd) {
        b.addEventListener('click', function () { aoEscolher(dd); });
      })(d);
      faixa.appendChild(b);
    }
    return faixa;
  }

  /* =======================================================================
     TELA: AGENDA
     ======================================================================= */
  /* ---------------------------------------------------------------------
     FILTRO POR PROFISSIONAL (§8) — linha discreta, não um painel.
     --------------------------------------------------------------------- */
  function montarSeletorPosto() {
    var linha = h('div.filtro-posto', {
      role: 'group', 'aria-label': 'Filtrar a agenda por profissional'
    });
    var opcoes = [{ id: 'todas', nome: 'Todas' }];
    N.dados.profissionais.forEach(function (p) {
      if (p.ativo === false) return;
      opcoes.push({ id: p.id, nome: p.curto || p.nome, cheio: p.nome });
    });
    opcoes.forEach(function (o) {
      linha.appendChild(h('button.filtro-posto__opcao', {
        type: 'button',
        dados: { escolhido: o.id === POSTO ? 'sim' : 'nao' },
        'aria-pressed': o.id === POSTO ? 'true' : 'false',
        title: o.cheio || o.nome,
        'aria-label': o.cheio ? ('Ver s\u00f3 ' + o.cheio) : 'Ver todas as profissionais',
        ao: {
          click: function () {
            POSTO = o.id;
            N.roteador.ir(urlDaAgenda());
          }
        },
        texto: o.nome
      }));
    });
    return linha;
  }

  function urlDaAgenda() {
    return '#/agenda/' + D.chaveDe(dataRef) + (POSTO !== 'todas' ? '/' + POSTO : '');
  }

  /* ---------------------------------------------------------------------
     OCUPAÇÃO DA EQUIPE (§15) — leitura, não um segundo painel.
     Uma linha por posto que trabalha hoje: vagas ocupadas no pico sobre o
     teto, quantas sobram, e a situação. Clicar numa linha é um atalho para
     ver aquela profissional sozinha — o mesmo filtro de cima, sem
     duplicar controle.
     --------------------------------------------------------------------- */
  function ocupacaoDaEquipe() {
    var chave = D.chaveDe(dataRef);
    var eq = N.equipeDoDia(chave, N.dados.agendamentos, N.dados.bloqueios, new Date());
    var linhas = eq.profissionais.filter(function (l) { return l.vagas.trabalha; });
    if (!linhas.length) return null;
    return h('div.ocupacao', { 'aria-label': 'Ocupação da equipe neste dia' },
      h('div.ocupacao__topo', null,
        h('span.ocupacao__titulo', { texto: 'Ocupa\u00e7\u00e3o da equipe' }),
        h('span.ocupacao__resumo', {
          texto: eq.ocupadasAgora + ' de ' + eq.capacidade + ' vagas em uso agora \u00b7 ' +
            eq.vagasLivres + (eq.vagasLivres === 1 ? ' livre' : ' livres')
        })
      ),
      h('div.ocupacao__linhas', null, linhas.map(function (l) {
        var ocupadas = Math.min(l.vagas.pico, l.vagas.capacidade);
        var escolhida = l.profissional.id === POSTO;
        return h('button.ocupacao__linha', {
          type: 'button',
          dados: { escolhido: escolhida ? 'sim' : 'nao' },
          'aria-pressed': escolhida ? 'true' : 'false',
          title: escolhida
            ? 'Voltar a ver todas as profissionais'
            : ('Ver s\u00f3 ' + l.profissional.nome),
          ao: {
            click: function () {
              POSTO = escolhida ? 'todas' : l.profissional.id;
              N.roteador.ir(urlDaAgenda());
            }
          }
        },
          h('span.ocupacao__sigla', { texto: l.profissional.curto || l.profissional.nome }),
          h('span.ocupacao__sit', { texto: l.situacao.nome }),
          h('span.ocupacao__barra', {
            role: 'img',
            'aria-label': ocupadas + ' de ' + l.vagas.capacidade + ' vagas ocupadas no pico do dia'
          }, h('i.ocupacao__preenchimento', {
            estilo: { width: Math.round(l.vagas.fracao * 100) + '%' }
          })),
          h('span.ocupacao__num', { texto: ocupadas + ' / ' + l.vagas.capacidade }),
          h('span.ocupacao__livres', {
            texto: l.vagas.vagas + (l.vagas.vagas === 1 ? ' livre' : ' livres')
          })
        );
      }))
    );
  }

  var vista = 'dia';
  var dataRef = new Date();
  /* 'todas' é o padrão e tem de continuar sendo: a leitura limpa do dia
     inteiro é justamente o que o §8 protege. */
  var POSTO = 'todas';

  TELAS.agenda = {
    titulo: 'Agenda',
    aoAbrir: function (params) {
      dataRef = dataDoParam(params);
      /* A escolha viaja na rota (#/agenda/2026-09-26/p2): assim trocar de
         dia mantém o filtro, e o botão voltar do navegador desfaz a
         escolha em vez de sair da agenda. */
      var posData = params && params[0] && /^\d{4}-\d{2}-\d{2}$/.test(params[0]) ? 1 : 0;
      var escolhido = params && params[posData];
      POSTO = escolhido && postoExiste(escolhido) ? escolhido : 'todas';
    },
    montar: function () {
      var cfg = N.dados.funcionamento[dataRef.getDay()];
      var estreita = estreito();

      /* --- barra: navegação + visão --- */
      function irPara(deltaDias) {
        var d = new Date(dataRef.getFullYear(), dataRef.getMonth(), dataRef.getDate() + deltaDias);
        dataRef = d;
        N.roteador.ir(urlDaAgenda());
      }
      function irParaData(d) {
        dataRef = d;
        N.roteador.ir(urlDaAgenda());
      }

      var tituloPeriodo;
      if (vista === 'dia') {
        tituloPeriodo = N.rotuloDia(D.chaveDe(dataRef), new Date()) + ' · ' + N.dataLonga(dataRef);
      } else if (vista === 'semana') {
        var ds = datasDaSemana(dataRef);
        tituloPeriodo = N.dataCurta(ds[0]) + ' – ' + N.dataCurta(ds[6]);
      } else {
        tituloPeriodo = D.MESES[dataRef.getMonth()] + ' de ' + dataRef.getFullYear();
      }

      var barra = h('div.agenda-barra', null,
        h('div.agenda-barra__nav', null,
          h('button.btn-icone', {
            type: 'button', 'aria-label': 'Período anterior',
            ao: { click: function () { irPara(vista === 'dia' ? -1 : vista === 'semana' ? -7 : -30); } }
          }, U.svg('chevron-esq')),
          h('button.btn.btn--pequeno.btn--secundario', {
            type: 'button', texto: 'Hoje',
            ao: { click: function () { irParaData(new Date()); } }
          }),
          h('button.btn-icone', {
            type: 'button', 'aria-label': 'Próximo período',
            ao: { click: function () { irPara(vista === 'dia' ? 1 : vista === 'semana' ? 7 : 30); } }
          })
        ),
        h('span.agenda-barra__titulo', { texto: tituloPeriodo }),
        h('span.agenda-barra__espaco'),
        U.segmentado({
          atual: vista, rotulo: 'Visão da agenda',
          itens: [{ id: 'dia', nome: 'Dia' }, { id: 'semana', nome: 'Semana' }, { id: 'mes', nome: 'Mês' }]
        }, function (id) {
          vista = id;
          N.roteador.ir(urlDaAgenda());
        }),
        /* Só na visão DIA: semana e mês não desenham bloco por posto, e um
           controle ali prometeria algo que a tela não cumpre. */
        vista === 'dia' ? montarSeletorPosto() : null
      );

      var corpo = h('div');

      if (!cfg.aberto && vista === 'dia' && !estreita) {
        /* orientação para o dia fechado, sem tela morta */
      }

      if (vista === 'dia') {
        if (estreita) {
          /* No celular: faixa de datas + a agenda do dia escolhido, e também
             os próximos dias logo abaixo — o dia de hoje primeiro. */
          corpo.appendChild(montarFaixaDatas(dataRef, irParaData, 14));
          corpo.appendChild(h('div', { estilo: { height: 'var(--e4)' } }));
          corpo.appendChild(montarVisaoDia(dataRef, { posto: POSTO }));
        } else {
          corpo.appendChild(h('div.agenda-lateral', null, montarVisaoDia(dataRef, { posto: POSTO })));
        }
      } else if (vista === 'semana') {
        if (estreita) {
          corpo.appendChild(montarFaixaDatas(dataRef, irParaData, 7));
          corpo.appendChild(h('div', { estilo: { height: 'var(--e4)' } }));
          corpo.appendChild(montarListaDias(datasDaSemana(dataRef), { mostrarFechados: true }));
        } else {
          corpo.appendChild(montarVisaoSemana(dataRef));
        }
      } else {
        if (estreita) {
          /* Mês no celular: a lista dos dias do mês, em ordem. Sem 7 colunas. */
          var ano = dataRef.getFullYear(), mes = dataRef.getMonth();
          var ultimo = new Date(ano, mes + 1, 0).getDate();
          var datas = [];
          for (var dia = 1; dia <= ultimo; dia += 1) datas.push(new Date(ano, mes, dia));
          corpo.appendChild(montarFaixaDatas(dataRef, irParaData, 30));
          corpo.appendChild(h('div', { estilo: { height: 'var(--e4)' } }));
          corpo.appendChild(montarListaDias(datas.filter(function (d) {
            return N.doDia(N.dados.agendamentos, D.chaveDe(d)).length ||
                   N.bloqueiosDoDia(N.dados.bloqueios, D.chaveDe(d)).length;
          }), { mostrarFechados: false }));
        } else {
          corpo.appendChild(montarVisaoMes(dataRef));
        }
      }

      var cabecalho = h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: 'Agenda' }),
          h('div.cabecalho__contexto', null,
            h('span', { texto: 'Horário de funcionamento demonstrativo: ' + (cfg.aberto ? N.horaCurta(cfg.inicio) + ' às ' + N.horaCurta(cfg.fim) : 'fechado') }),
            U.marcaDemo('dados de exemplo')
          )
        ),
        h('div.cabecalho__acoes', null,
          h('button.btn.btn--secundario', {
            type: 'button',
            ao: { click: function () { abrirBloqueioNovo(dataRef); } }
          }, U.svg('bloquear'), document.createTextNode('Bloquear horário')),
          h('button.btn.btn--principal', {
            type: 'button',
            ao: { click: function () { abrirNovo({ dataChave: D.chaveDe(dataRef) }); } }
          }, U.svg('mais'), document.createTextNode('Novo agendamento'))
        )
      );

      var legenda = h('div.legenda', { estilo: { marginTop: 'var(--e4)' } },
        h('span.legenda__item', null, h('span.legenda__cor', { estilo: { background: 'var(--rosa-lavado)' } }),
          h('span', { texto: 'horário livre (clique para agendar)' })),
        h('span.legenda__item', null, h('span.legenda__cor', { estilo: { background: 'var(--marfim-2)', border: '1px dashed var(--linha-2)' } }),
          h('span', { texto: 'bloqueio (não aparece como livre)' })),
        h('span.legenda__item', null, h('span.legenda__cor', { estilo: { background: 'var(--confirmado-fundo)' } }),
          h('span', { texto: 'atendimento' }))
      );

      /* A ocupação da equipe (§15) fecha o dia. Fica fora da grade de
         propósito: dentro dela passaria a ser mais um bloco disputando
         altura com os atendimentos. */
      var rodape = vista === 'dia' && cfg.aberto ? ocupacaoDaEquipe() : null;

      return h('div', null, cabecalho, barra, corpo, rodape, legenda);
    }
  };

  /* =======================================================================
     DIÁLOGOS COMPARTILHADOS — detalhe, bloqueio, novo agendamento
     Ficam aqui porque a agenda, os agendamentos e o perfil do cliente abrem
     os mesmos três. Uma definição só evita que as telas divirjam.
     ======================================================================= */
  var ORDEM_ACOES = {
    novo:        ['confirmar', 'cancelar'],
    pendente:    ['confirmar', 'cancelar'],
    confirmado:  ['iniciar', 'reagendar', 'cancelar'],
    atendimento: ['concluir', 'ausente'],
    concluido:   [],
    cancelado:   ['reativar'],
    ausente:     ['reagendar']
  };

  function rotuloAcao(id) {
    return {
      confirmar: 'Confirmar', cancelar: 'Cancelar', iniciar: 'Iniciar atendimento',
      concluir: 'Finalizar atendimento', ausente: 'Marcar ausência',
      reagendar: 'Reagendar', reativar: 'Reativar'
    }[id];
  }

  function abrirDetalhe(a) {
    var cliente = N.clienteDe(a);
    var servico = N.servicoDe(a);
    var g = U.gaveta({
      sobreTitulo: N.rotuloDia(a.dataChave, new Date()) + ' · ' + N.dataLonga(a.dataChave),
      titulo: N.horaCheia(a.inicio) + ' – ' + N.horaCheia(a.fim),
      acoes: montarAcoes(a)
    });

    var corpo = g.corpo;

    /* O cronômetro vem ANTES de qualquer outro dado: é a informação que a
       proprietária procura ao abrir o atendimento. */
    var temporal = U.estadoTemporal(a, { agora: new Date() });
    if (temporal) {
      temporal.classList.add('temporal--gaveta');
      corpo.appendChild(h('div.bloco', null, temporal));
    }

    corpo.appendChild(h('div.bloco', null,
      h('div.descricao', null,
        h('div.descricao__item', null,
          h('span.rotulo', { texto: 'Situação' }),
          h('div.descricao__valor', null,
            h('div.etiquetas', null, U.selo(a.status), U.origem(a.origem)))
        ),
        h('div.descricao__item', null,
          h('span.rotulo', { texto: 'Duração' }),
          h('div.descricao__valor', { texto: N.duracaoLegivel(a.duracao) })
        ),
        h('div.descricao__item', null,
          h('span.rotulo', { texto: 'Profissional' }),
          h('div.descricao__valor', { texto: 'A definir' })
        ),
        /* Início real só existe depois que o atendimento começou. Antes
           disso não há o que mostrar — e mostrar o horário marcado aqui
           seria confundir as duas coisas. */
        a.inicioReal ? h('div.descricao__item', null,
          h('span.rotulo', { texto: 'Iniciado às' }),
          h('div.descricao__valor', { texto: N.horaCheia(new Date(a.inicioReal).getHours() * 60 +
            new Date(a.inicioReal).getMinutes()) })
        ) : null
      )
    ));

    /* --- cliente --- */
    var infoCliente = h('div.bloco', null, h('h3.bloco__titulo', { texto: 'Cliente' }));
    infoCliente.appendChild(h('div.perfil-topo', { estilo: { border: '0', padding: '0', margin: '0 0 var(--e3)' } },
      U.avatar(cliente, 'g'),
      h('div.perfil-topo__texto', null,
        h('div', { estilo: { fontWeight: '500', color: 'var(--texto)' }, texto: N.nomeCliente(cliente) }),
        h('div.miudo', { texto: cliente && cliente.fone ? N.telefoneLegivel(cliente.fone) : 'Sem telefone cadastrado' })
      )
    ));
    var acoesCliente = h('div', { estilo: { display: 'flex', gap: 'var(--e2)', flexWrap: 'wrap' } });
    if (cliente && cliente.fone) {
      acoesCliente.appendChild(h('button.btn.btn--pequeno.btn--secundario', {
        type: 'button', texto: 'Ligar',
        ao: {
          click: function () {
            U.toast('Ligar para ' + N.nomeCliente(cliente) + ' (' + N.telefoneLegivel(cliente.fone) + '). ' +
              'A discagem não está conectada nesta demonstração.', 'info');
          }
        }
      }, U.svg('telefone')));
    }
    acoesCliente.appendChild(h('button.btn.btn--pequeno.btn--secundario', {
      type: 'button', texto: 'Ver ficha',
      ao: { click: function () { g.fechar(); N.roteador.ir('#/clientes/' + a.clienteId); } }
    }, U.svg('pessoa')));
    infoCliente.appendChild(acoesCliente);
    corpo.appendChild(infoCliente);

    /* --- serviço, valor e pagamento ---
       Três leituras separadas de propósito:
         VALOR DO SERVIÇO ....... o preço da tabela. Como nenhum dos oito
                                  serviços tem preço cadastrado, aqui é
                                  sempre "Consultar" — é onde o preço
                                  oficial vai aparecer quando o salão
                                  cadastrar.
         VALOR COBRADO .......... o que foi lançado NESTE atendimento.
                                  Pode não existir, e não existir é
                                  diferente de valer zero.
         PAGAMENTO / FORMA ...... como e quando foi (ou não) pago. */
    var pag = N.pagamentoDe(a);
    var bruto = pag ? pag.valor : null;
    var liquido = N.valorLiquido(pag);
    var comValor = liquido != null;

    var comanda = h('div.comanda', null,
      h('div.comanda__linha', null,
        h('span', { texto: servico.nome }),
        h('span.num', { texto: N.duracaoLegivel(a.duracao) })
      ),
      h('div.comanda__linha', null,
        h('span.miudo', { texto: 'Valor do serviço' }),
        h('span', null, h('span.traco', { texto: 'Consultar' }))
      )
    );

    if (comValor) {
      comanda.appendChild(h('div.comanda__linha', null,
        h('span.miudo', { texto: 'Valor cobrado' }),
        h('span.num.valor', { texto: N.moeda(bruto) })
      ));
      if (pag.desconto) {
        comanda.appendChild(h('div.comanda__linha', null,
          h('span.miudo', { texto: 'Desconto' }),
          h('span.num.valor.valor-negativo', { texto: '− ' + N.moeda(pag.desconto) })
        ));
        comanda.appendChild(h('div.comanda__linha.comanda__linha--total', null,
          h('span', { texto: 'Total' }),
          h('span.num.valor', { texto: N.moeda(liquido) })
        ));
      }
    } else {
      comanda.appendChild(h('div.comanda__linha', null,
        h('span.miudo', { texto: 'Valor cobrado' }),
        h('span.miudo.marca-demo', {
          texto: a.status === 'concluido' ? 'não lançado' : 'Informado na finalização'
        })
      ));
    }

    comanda.appendChild(h('div.comanda__linha', null,
      h('span.miudo', { texto: 'Pagamento' }),
      h('span', null, pag
        ? U.seloPagamento(a)
        : h('span.miudo', { texto: a.status === 'concluido' ? 'Pendente' : 'Ainda não registrado' }))
    ));
    comanda.appendChild(h('div.comanda__linha', null,
      h('span.miudo', { texto: 'Forma' }),
      h('span', null, pag && N.nomeFormaPagamento(pag.forma)
        ? document.createTextNode(N.nomeFormaPagamento(pag.forma))
        : h('span.miudo', { texto: 'Não informada' }))
    ));

    corpo.appendChild(h('div.bloco', null,
      h('h3.bloco__titulo', { texto: 'Serviço' }),
      comanda,
      h('p.miudo', { estilo: { marginTop: 'var(--e2)' },
        texto: 'O preço oficial dos serviços não consta nos materiais do salão — por isso ' +
          '"Consultar". O valor cobrado é o que foi lançado neste atendimento e, quando ' +
          'existe, é demonstrativo.' })
    ));

    /* --- observações --- */
    if (a.observacoes) {
      corpo.appendChild(h('div.bloco', null,
        h('h3.bloco__titulo', { texto: 'Observações' }),
        h('div.nota', null, document.createTextNode(a.observacoes))
      ));
    }

    /* --- histórico --- */
    if (a.historico && a.historico.length) {
      var lt = h('div.bloco', null, h('h3.bloco__titulo', { texto: 'Histórico' }));
      var linha = h('div.linha-tempo');
      a.historico.slice().reverse().forEach(function (ev) {
        linha.appendChild(h('div.linha-tempo__item', null,
          h('div.linha-tempo__quando', { texto: N.dataCompleta(new Date(ev.quando)) }),
          h('div.linha-tempo__texto', { texto: ev.texto })
        ));
      });
      lt.appendChild(linha);
      corpo.appendChild(lt);
    }

    /* --- aviso de demonstração --- */
    corpo.appendChild(h('div.bloco', null, U.avisoDemo(
      'Este agendamento é um registro fictício criado para a apresentação do painel.'
    )));
    return g;
  }

  function montarAcoes(a) {
    var botoes = [];
    var permitidas = ORDEM_ACOES[a.status] || [];

    permitidas.forEach(function (id) {
      var variante = id === 'concluir' ? 'btn--principal'
        : (id === 'cancelar' || id === 'ausente') ? 'btn--perigo' : 'btn--secundario';
      botoes.push(h('button.btn.btn--pequeno' + (variante === 'btn--principal' ? '.btn--principal' : variante === 'btn--perigo' ? '.btn--perigo' : '.btn--secundario'), {
        type: 'button', texto: rotuloAcao(id),
        ao: { click: function () { executarAcao(id, a); } }
      }));
    });

    if (N.ocupaAgenda(a)) {
      botoes.push(h('button.btn.btn--pequeno.btn--secundario', {
        type: 'button', texto: 'Editar',
        ao: {
          click: function () {
            U.toast('A edição de dados do agendamento entra junto com o sistema real. ' +
              'Aqui é possível reagendar, mudar situação e cancelar.', 'info');
          }
        }
      }, U.svg('editar')));
    }
    return botoes;
  }

  function executarAcao(id, a) {
    var acoes = {
      confirmar: { status: 'confirmado', texto: 'marcado como confirmado', tipo: 'sucesso' },
      ausente:   { status: 'ausente', texto: 'marcado como ausente', tipo: 'alerta' },
      reativar:  { status: 'confirmado', texto: 'reativado e confirmado', tipo: 'sucesso' },
      cancelar:  { status: 'cancelado', texto: 'cancelado e o horário liberado', tipo: 'info' }
    };
    if (id === 'cancelar') {
      U.confirmar({
        titulo: 'Cancelar este agendamento?',
        texto: 'O horário volta a ficar livre na agenda imediatamente.',
        ok: 'Cancelar agendamento', perigo: true,
        aoConfirmar: function () {
          var r = N.mudarStatus(a.id, 'cancelado', 'Cancelado no painel');
          if (r.ok) U.toast('Agendamento cancelado e o horário foi liberado.', 'info');
          else U.toast(r.mensagem, 'erro');
          U.fecharTudo();
        }
      });
      return;
    }
    if (id === 'reagendar') { U.fecharTudo(); abrirReagendar(a); return; }

    /* Iniciar: marca o horário REAL de entrada. Se o botão for tocado
       depois da hora marcada, o atraso fica registrado no histórico — é o
       dado que a proprietária usa para entender a manhã que atrasou. */
    if (id === 'iniciar') {
      var r = N.iniciarAtendimento(a.id, new Date());
      if (r.ok) U.toast('Atendimento iniciado às ' + N.horaCheia(new Date().getHours() * 60 + new Date().getMinutes()) + '.', 'sucesso');
      else U.toast(r.mensagem, 'erro');
      U.fecharTudo();
      return;
    }

    /* Finalizar: antes de concluir, o valor. Não é obrigatório — um
       atendimento pode ser encerrado sem lançamento e continuar PENDENTE. */
    if (id === 'concluir') { U.fecharTudo(); abrirFinalizar(a); return; }

    var cfg = acoes[id];
    if (!cfg) return;
    var res = N.mudarStatus(a.id, cfg.status, 'Situação alterada no painel');
    if (res.ok) U.toast('Agendamento ' + cfg.texto + '.', cfg.tipo);
    else U.toast(res.mensagem, 'erro');
    U.fecharTudo();
  }

  /* --- finalizar atendimento --------------------------------------------
     O diálogo que fecha o ciclo do dia. A regra que governa tudo aqui:
     valor NÃO é obrigatório. O salão que ainda não cadastrou preço nenhum
     precisa conseguir encerrar o atendimento sem inventar quantia, e nesse
     caso o registro fica PENDENTE sem valor — que é a verdade. */
  function abrirFinalizar(a) {
    var servico = N.servicoDe(a);
    var pag = N.pagamentoDe(a);
    var m;

    var campoValor = U.campo({
      tipo: 'number', rotulo: 'Valor cobrado (opcional)',
      valor: pag && pag.valor != null ? pag.valor : '',
      placeholder: '0,00', inputmode: 'decimal', passo: '0.01', min: '0',
      dica: 'Deixe em branco para encerrar sem lançar valor.'
    });
    var campoDesconto = U.campo({
      tipo: 'number', rotulo: 'Desconto (opcional)', valor: '', placeholder: '0,00',
      inputmode: 'decimal', passo: '0.01', min: '0'
    });

    var linhaTotal = h('div.finalizar__total', null,
      h('span', { texto: 'Valor final' }),
      h('b.num', { texto: '—' })
    );
    function numero(campo) {
      var v = parseFloat(String(campo.valor()).replace(',', '.'));
      return isNaN(v) || v < 0 ? 0 : v;
    }
    function atualizarTotal() {
      var bruto = numero(campoValor);
      var desconto = numero(campoDesconto);
      if (!campoValor.valor() && !campoDesconto.valor()) {
        linhaTotal.lastChild.textContent = '—';
        linhaTotal.dataset.vazio = 'sim';
        return;
      }
      delete linhaTotal.dataset.vazio;
      linhaTotal.lastChild.textContent = N.moeda(Math.max(0, bruto - desconto));
    }

    var cfg = N.dados.config || {};

    /* Teto de desconto de Configurações → Financeiro. Zero significa "sem
       teto" — o padrão, porque o salão ainda não decidiu uma política. */
    function descontoExcedido(bruto, desconto) {
      var teto = Number(cfg.descontoMaximo) || 0;
      if (!teto || !bruto) return false;
      return desconto > bruto * teto / 100;
    }
    campoValor.controle.addEventListener('input', atualizarTotal);
    campoDesconto.controle.addEventListener('input', atualizarTotal);

    /* Forma de pagamento: botões, não select — são poucas opções fixas e a
       escolha precisa ser de um toque. A lista vem de Configurações →
       Financeiro: uma forma desligada lá não aparece aqui. */
    var formasAtivas = (cfg.formasAtivas || []).length
      ? (D.DEMO.formasPagamento || []).filter(function (f) {
          return cfg.formasAtivas.indexOf(f.id) !== -1;
        })
      : (D.DEMO.formasPagamento || []);
    var formaEscolhida = pag && pag.forma ? pag.forma : null;
    /* Se a forma registrada foi desligada depois, ela continua marcada —
       apagar a escolha de um atendimento já lançado seria reescrever o
       passado. Só não é oferecida a novos registros. */
    var botoesForma = h('div.grade-opcoes.grade-opcoes--formas');
    formasAtivas.forEach(function (f) {
      var b = h('button.chip', {
        type: 'button', 'aria-pressed': formaEscolhida === f.id ? 'true' : 'false',
        texto: f.nome,
        ao: {
          click: function () {
            formaEscolhida = formaEscolhida === f.id ? null : f.id;
            Array.prototype.forEach.call(botoesForma.children, function (c) {
              c.setAttribute('aria-pressed', c === b && formaEscolhida === f.id ? 'true' : 'false');
            });
          }
        }
      });
      botoesForma.appendChild(b);
    });

    var statusEscolhido = 'pago';
    var grupoStatus = h('div.segmentado');
    [['pago', 'Pago'], ['pendente', 'Pendente']].forEach(function (par) {
      var b = h('button.segmentado__opcao', {
        type: 'button', 'aria-pressed': statusEscolhido === par[0] ? 'true' : 'false',
        ao: {
          click: function () {
            statusEscolhido = par[0];
            Array.prototype.forEach.call(grupoStatus.children, function (c) {
              c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
            });
          }
        }
      }, h('span', { texto: par[1] }));
      grupoStatus.appendChild(b);
    });

    m = U.modal({
      titulo: 'Finalizar atendimento',
      texto: N.nomeCliente(N.clienteDe(a)) + ' · ' + servico.nome + ' · ' + N.duracaoLegivel(a.duracao),
      largo: true,
      acoes: [
        h('button.btn.btn--secundario', {
          type: 'button', texto: 'Voltar',
          ao: { click: function () { m.fechar(); } }
        }),
        h('button.btn.btn--principal', {
          type: 'button', texto: 'Confirmar finalização',
          ao: {
            click: function () {
              var temValor = !!campoValor.valor();
              var bruto = numero(campoValor);
              var desconto = numero(campoDesconto);
              if (desconto > bruto && temValor) {
                U.toast('O desconto não pode passar do valor cobrado.', 'alerta');
                return;
              }
              if (temValor && descontoExcedido(bruto, desconto)) {
                U.toast('O desconto passa do teto de ' + cfg.descontoMaximo +
                  '% definido em Configurações → Financeiro.', 'alerta');
                return;
              }
              /* Exigir valor é opção do salão e vem DESLIGADA de fábrica:
                 com a tabela de preços vazia, ligá-la travaria toda
                 finalização. Quando ligada, ela vale — é uma decisão da
                 proprietária, não uma sugestão. */
              if (!temValor && cfg.exigirValorFinalizacao) {
                U.toast('Esta configuração exige informar o valor para concluir. ' +
                  'Informe o valor ou desligue a exigência em Configurações → Financeiro.', 'alerta');
                return;
              }
              var registro = {
                forma: formaEscolhida,
                valor: temValor ? bruto : null,
                desconto: temValor ? desconto : 0,
                status: temValor ? statusEscolhido : 'pendente',
                registradoEm: new Date().toISOString()
              };
              var r = N.finalizarAtendimento(a.id, registro, new Date());
              if (!r.ok) { U.toast(r.mensagem, 'erro'); return; }
              U.toast(temValor
                ? 'Atendimento finalizado · ' + N.moeda(Math.max(0, bruto - desconto)) + ' registrado.'
                : 'Atendimento finalizado. O valor pode ser lançado depois no Financeiro.', 'sucesso');
              m.fechar();
            }
          }
        })
      ],
      corpo: h('div.finalizar', null,
        h('div.comanda', null,
          h('div.comanda__linha', null,
            h('span.miudo', { texto: 'Serviço' }),
            h('span', { texto: servico.nome })
          ),
          h('div.comanda__linha', null,
            h('span.miudo', { texto: 'Duração' }),
            h('span.num', { texto: N.duracaoLegivel(a.duracao) })
          )
        ),
        h('div.campo-duplo', null, campoValor.el, campoDesconto.el),
        linhaTotal,
        h('div.bloco', null,
          h('span.rotulo', { texto: 'Forma de pagamento' }),
          botoesForma
        ),
        h('div.bloco', null,
          h('span.rotulo', { texto: 'Situação do pagamento' }),
          grupoStatus
        ),
        U.avisoDemo('Os valores desta demonstração não são a tabela de preços do salão. ' +
          'No sistema real, o valor sugerido vem do preço cadastrado em Serviços.')
      )
    });
    atualizarTotal();
    return m;
  }

  /* --- reagendar --- */
  function abrirReagendar(a) {
    var servico = N.servicoDe(a);
    var dataEscolhida = a.dataChave;
    var horaEscolhida = null;
    var m;

    var grade = h('div.grade-horarios');
    var aviso = h('p.miudo');
    var botaoOk = h('button.btn.btn--principal', {
      type: 'button', texto: 'Confirmar novo horário', disabled: true,
      ao: {
        click: function () {
          var r = N.reagendar(a.id, dataEscolhida, horaEscolhida);
          if (r.ok) { m.fechar(); U.toast('Agendamento reagendado.', 'sucesso'); }
          else U.toast(r.mensagem, 'erro');
        }
      }
    });

    function redesenhar() {
      U.limpar(grade);
      var dt = D.dataDeChave(dataEscolhida);
      var livres = N.horariosDisponiveis(servico, dataEscolhida, N.dados.agendamentos, N.dados.bloqueios);
      if (!livres.length) {
        grade.appendChild(h('p.miudo', { texto: 'Nenhum horário livre neste dia para ' + servico.nome + '.' }));
      } else {
        livres.forEach(function (op) {
          grade.appendChild(h('button.opcao-horario', {
            type: 'button', texto: op.inicio,
            'aria-pressed': horaEscolhida === op.inicio ? 'true' : 'false',
            ao: {
              click: function () {
                horaEscolhida = op.inicio;
                Array.prototype.forEach.call(grade.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
                this.setAttribute('aria-pressed', 'true');
                botaoOk.removeAttribute('disabled');
              }
            }
          }));
        });
      }
      aviso.textContent = livres.length
        ? 'Horários livres com bloqueios e atendimentos já descontados.'
        : 'Sem vaga neste dia.';
    }

    var campoData = U.campo({
      tipo: 'date', rotulo: 'Nova data', id: 'reagendar-data', valor: dataEscolhida,
      aoMudar: null
    });
    campoData.controle.addEventListener('change', function () {
      if (!campoData.controle.value) return;
      dataEscolhida = campoData.controle.value;
      horaEscolhida = null;
      botaoOk.setAttribute('disabled', '');
      redesenhar();
    });

    var corpo = h('div', null,
      h('div.campo', null, campoData.el),
      h('div', { estilo: { marginTop: 'var(--e4)' } },
        h('span.rotulo', { texto: 'Horário — ' + servico.nome + ' (' + N.duracaoLegivel(servico.duracao) + ')' }),
        h('div', { estilo: { marginTop: 'var(--e3)' } }, grade),
        aviso
      ),
      h('div', { estilo: { marginTop: 'var(--e4)' } },
        U.avisoDemo('Os horários disponíveis são calculados sobre uma agenda demonstrativa.'))
    );
    redesenhar();

    m = U.modal({
      titulo: 'Reagendar',
      texto: 'Atual: ' + N.rotuloDia(a.dataChave, new Date()) + ' às ' + N.horaCheia(a.inicio) +
             '. Escolha a nova data e o novo horário.',
      largo: true,
      acoes: [h('button.btn.btn--secundario', { type: 'button', texto: 'Voltar', ao: { click: function () { m.fechar(); } } }), botaoOk],
      corpo: corpo
    });
    return m;
  }

  /* --- bloqueio: novo e detalhe --- */
  function abrirBloqueioNovo(data) {
    var m;
    var campoData = U.campo({ tipo: 'date', rotulo: 'Data', valor: D.chaveDe(data) });
    var campoInicio = U.campo({
      tipo: 'selecao', rotulo: 'Início',
      opcoes: D.HORARIOS_GRADE.map(function (hr) { return { valor: hr, nome: hr }; })
    });
    var campoFim = U.campo({
      tipo: 'selecao', rotulo: 'Fim',
      opcoes: D.HORARIOS_GRADE.concat(['18:00']).map(function (hr) { return { valor: hr, nome: hr }; })
    });
    var campoMotivo = U.campo({
      tipo: 'selecao', rotulo: 'Motivo',
      opcoes: D.MOTIVOS_BLOQUEIO.map(function (mo) { return { valor: mo.id, nome: mo.nome }; })
    });
    var campoObs = U.campo({ tipo: 'text', rotulo: 'Observação', placeholder: 'Ex.: Manutenção do sistema de hidratação', max: 80 });

    var botaoOk = h('button.btn.btn--principal', {
      type: 'button', texto: 'Bloquear horário',
      ao: {
        click: function () {
          var dados = {
            dataChave: campoData.valor(),
            inicio: campoInicio.valor(),
            fim: campoFim.valor(),
            motivo: campoMotivo.valor(),
            observacao: campoObs.valor()
          };
          if (!dados.dataChave) { campoData.marcarErro('Escolha a data.'); return; }
          if (!dados.inicio || !dados.fim) { U.toast('Escolha o início e o fim do bloqueio.', 'alerta'); return; }
          if (!dados.motivo) { U.toast('Escolha o motivo do bloqueio.', 'alerta'); return; }
          if (D.minutosDe(dados.fim) <= D.minutosDe(dados.inicio)) {
            campoFim.marcarErro('O fim precisa ser depois do início.');
            U.toast('O fim do bloqueio precisa ser depois do início.', 'alerta');
            return;
          }
          var r = N.criarBloqueio(dados);
          if (r.ok) {
            m.fechar();
            U.toast('Horário bloqueado. Ele não aparece mais como livre para agendar.', 'sucesso');
            if (r.aviso) setTimeout(function () { U.toast(r.aviso, 'alerta'); }, 250);
          } else {
            U.toast(r.mensagem, 'erro');
          }
        }
      }
    });

    m = U.modal({
      titulo: 'Bloquear horário',
      texto: 'Use para almoço, evento, manutenção, compromisso ou qualquer período indisponível. ' +
             'O horário bloqueado deixa de ser oferecido para agendamento.',
      largo: false,
      acoes: [
        h('button.btn.btn--secundario', { type: 'button', texto: 'Cancelar', ao: { click: function () { m.fechar(); } } }),
        botaoOk
      ],
      corpo: h('div', null,
        campoData.el,
        h('div.campo-par', { estilo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--e3)', marginTop: 'var(--e4)' } },
          campoInicio.el, campoFim.el),
        h('div', { estilo: { marginTop: 'var(--e4)' } }, campoMotivo.el),
        h('div', { estilo: { marginTop: 'var(--e4)' } }, campoObs.el),
        h('div', { estilo: { marginTop: 'var(--e5)' } },
          U.avisoDemo('Os motivos e horários desta demonstração não representam o funcionamento oficial do salão.'))
      )
    });
    return m;
  }

  function abrirBloqueio(b) {
    var mot = D.MOTIVOS_BLOQUEIO.filter(function (m) { return m.id === b.motivo; })[0] || {};
    var g = U.gaveta({
      sobreTitulo: 'Bloqueio de agenda',
      titulo: mot.nome || 'Indisponível',
      acoes: [
        h('button.btn.btn--perigo.btn--pequeno', {
          type: 'button', texto: 'Liberar horário',
          ao: {
            click: function () {
              U.confirmar({
                titulo: 'Liberar este horário?',
                texto: 'O período volta a ficar disponível para agendamento.',
                ok: 'Liberar', perigo: true,
                aoConfirmar: function () {
                  var r = N.removerBloqueio(b.id);
                  if (r.ok) { g.fechar(); U.toast('Horário liberado na agenda.', 'sucesso'); }
                  else U.toast(r.mensagem, 'erro');
                }
              });
            }
          }
        })
      ]
    });
    g.corpo.appendChild(h('div.descricao.descricao--justa', null,
      h('div.descricao__item', null, h('span.rotulo', { texto: 'Data' }),
        h('span.descricao__valor', { texto: N.rotuloDia(b.dataChave, new Date()) + ' · ' + N.dataCompleta(b.dataChave) })),
      h('div.descricao__item', null, h('span.rotulo', { texto: 'Período' }),
        h('span.descricao__valor', { texto: N.horaCheia(b.inicio) + ' – ' + N.horaCheia(b.fim) })),
      h('div.descricao__item', null, h('span.rotulo', { texto: 'Duração' }),
        h('span.descricao__valor', { texto: N.duracaoLegivel(b.fimMin - b.inicioMin) })),
      h('div.descricao__item', null, h('span.rotulo', { texto: 'Recorrente' }),
        h('span.descricao__valor', { texto: b.recorrente ? 'Sim, todo dia útil' : 'Não, apenas neste dia' }))
    ));
    if (b.observacao) {
      g.corpo.appendChild(h('div.bloco', null,
        h('h3.bloco__titulo', { texto: 'Observação' }),
        h('div.nota', null, document.createTextNode(b.observacao))));
    }
    g.corpo.appendChild(h('div.bloco', null, U.avisoDemo(
      'Bloqueios de agenda são registros demonstrativos. O intervalo do almoço é dado de exemplo.')));
    return g;
  }

  /* =======================================================================
     NOVO AGENDAMENTO — fluxo em 4 passos
     Passo 1 serviço · 2 cliente · 3 data e horário · 4 confirmação.
     ======================================================================= */
  function abrirNovo(semente) {
    semente = semente || {};
    var escolha = {
      servicoId: null, clienteId: null,
      dataChave: semente.dataChave || D.chaveDe(new Date()),
      inicio: semente.inicio || null,
      origem: 'manual', observacoes: ''
    };
    var passo = 1;

    var m = U.modal({
      titulo: 'Novo agendamento',
      largo: true,
      acoes: [
        h('button.btn.btn--perigo.btn--empurrar', {
          type: 'button', texto: 'Cancelar', ao: { click: function () { m.fechar(); } }
        }),
        h('button.btn.btn--secundario', { type: 'button', texto: 'Voltar', dados: { voltar: 'sim' },
          ao: { click: function () { if (passo > 1) { passo -= 1; desenhar(); } } } }),
        h('button.btn.btn--principal', { type: 'button', texto: 'Continuar', dados: { avancar: 'sim' },
          ao: { click: function () { if (validar()) { if (passo === 4) concluir(); else { passo += 1; desenhar(); } } } } })
      ]
    });

    function servicoEscolhido() { return escolha.servicoId ? N.servicoDe({ servicoId: escolha.servicoId }) : null; }

    function desenhar() {
      U.limpar(m.corpo);
      /* -- passos -- */
      var nomes = ['Serviço', 'Cliente', 'Data e horário', 'Confirmar'];
      var trilha = h('div.passos', { 'aria-label': 'Etapas do agendamento' });
      nomes.forEach(function (nome, i) {
        var n = i + 1;
        var estado = n === passo ? 'atual' : n < passo ? 'feito' : 'futuro';
        if (i) trilha.appendChild(h('span.passo__traco'));
        trilha.appendChild(h('span.passo', { dados: { estado: estado } },
          h('span.passo__num', { texto: n < passo ? '✓' : String(n) }),
          h('span', { texto: nome })
        ));
      });
      m.corpo.appendChild(trilha);

      var area = h('div');
      m.corpo.appendChild(area);

      if (passo === 1) {
        area.appendChild(h('p.subtexto', { texto: 'Escolha o serviço. A duração define quanto tempo fica reservado na agenda.' }));
        var lista = h('div.pilha', { estilo: { marginTop: 'var(--e4)' } });
        N.dados.servicos.filter(function (s) { return s.ativo; }).forEach(function (s) {
          lista.appendChild(h('button.opcao-cartao', {
            type: 'button', 'aria-pressed': escolha.servicoId === s.id ? 'true' : 'false',
            ao: {
              click: function () {
                escolha.servicoId = s.id;
                escolha.inicio = null;
                Array.prototype.forEach.call(lista.children, function (c) {
                  c.setAttribute('aria-pressed', c === this ? 'true' : 'false');
                }, this);
                atualizarBotoes();
              }
            }
          },
            h('span.opcao-cartao__corpo', null,
              h('span.opcao-cartao__nome', { texto: s.nome }),
              h('span.opcao-cartao__sub', { texto: s.resumo })
            ),
            h('span.opcao-cartao__fim', { texto: N.duracaoLegivel(s.duracao) })
          ));
        });
        area.appendChild(lista);
      }

      if (passo === 2) {
        area.appendChild(h('p.subtexto', { texto: 'Busque um cliente já cadastrado ou use um nome novo.' }));
        var termo = '';
        var resultado = h('div.combo-lista');
        var buscaCliente = U.busca({
          placeholder: 'Nome ou telefone…', bloco: false,
          aoBuscar: function (t) { termo = t.toLowerCase(); listar(); }
        });
        function listar() {
          U.limpar(resultado);
          var cand = N.dados.clientes.filter(function (c) { return !c.semCadastro; });
          if (termo) {
            cand = cand.filter(function (c) {
              return (c.nome + ' ' + (c.fone || '')).toLowerCase().indexOf(termo) !== -1;
            });
          }
          if (!cand.length) {
            resultado.appendChild(U.vazio('pessoas', 'Nenhum cliente encontrado',
              'Não há cadastro automático nesta demonstração — os clientes exibidos são fictícios.', null, true));
            return;
          }
          cand.slice(0, 40).forEach(function (c) {
            var ficha = N.fichaCliente(c, N.dados.agendamentos);
            resultado.appendChild(h('button.opcao-cartao', {
              type: 'button', 'aria-pressed': escolha.clienteId === c.id ? 'true' : 'false',
              ao: {
                click: function () {
                  escolha.clienteId = c.id;
                  Array.prototype.forEach.call(resultado.children, function (el) {
                    el.setAttribute('aria-pressed', el === this ? 'true' : 'false');
                  }, this);
                  atualizarBotoes();
                }
              }
            },
              U.avatar(c),
              h('span.opcao-cartao__corpo', null,
                h('span.opcao-cartao__nome', { texto: c.nome }),
                h('span.opcao-cartao__sub', {
                  texto: (c.fone ? N.telefoneLegivel(c.fone) + ' · ' : '') +
                    (ficha.visitas ? ficha.visitas + (ficha.visitas === 1 ? ' visita' : ' visitas') : 'primeira visita')
                })
              )
            ));
          });
        }
        area.appendChild(h('div', { estilo: { marginTop: 'var(--e4)' } }, buscaCliente.el));
        area.appendChild(resultado);
        listar();
      }

      if (passo === 3) {
        var servico = servicoEscolhido();
        area.appendChild(h('p.subtexto', {
          texto: 'Escolha o dia e o horário. Só aparecem horários realmente livres para ' +
                 N.duracaoLegivel(servico.duracao) + ' de ' + servico.nome + '.'
        }));
        var campoData = U.campo({ tipo: 'date', rotulo: 'Data', valor: escolha.dataChave });
        var grade = h('div.grade-horarios');
        var nota = h('p.miudo');

        function redesenharHorarios() {
          U.limpar(grade);
          escolha.inicio = null;
          var livres = N.horariosDisponiveis(servico, escolha.dataChave, N.dados.agendamentos, N.dados.bloqueios);
          if (!livres.length) {
            grade.appendChild(h('p.miudo', {
              texto: 'Sem horário livre neste dia para esta duração. Tente outra data.'
            }));
            nota.textContent = '';
          } else {
            livres.forEach(function (op) {
              grade.appendChild(h('button.opcao-horario', {
                type: 'button', texto: op.inicio,
                'aria-pressed': escolha.inicio === op.inicio ? 'true' : 'false',
                ao: {
                  click: function () {
                    escolha.inicio = op.inicio;
                    Array.prototype.forEach.call(grade.children, function (c) { c.setAttribute('aria-pressed', 'false'); });
                    this.setAttribute('aria-pressed', 'true');
                    atualizarBotoes();
                  }
                }
              }));
            });
            nota.textContent = livres.length + (livres.length === 1 ? ' horário livre.' : ' horários livres.') +
              ' Bloqueios e atendimentos já descontados.';
          }
        }
        campoData.controle.addEventListener('change', function () {
          if (!campoData.controle.value) return;
          escolha.dataChave = campoData.controle.value;
          redesenharHorarios();
          atualizarBotoes();
        });
        area.appendChild(h('div', { estilo: { marginTop: 'var(--e4)', maxWidth: '16rem' } }, campoData.el));
        area.appendChild(h('div', { estilo: { marginTop: 'var(--e5)' } },
          h('span.rotulo', { texto: 'Horários livres' }),
          h('div', { estilo: { marginTop: 'var(--e3)' } }, grade),
          nota
        ));

        var campoObs = U.campo({
          tipo: 'area', rotulo: 'Observações', linhas: 2,
          placeholder: 'Ex.: cliente pediu para não usar secador', valor: escolha.observacoes
        });
        campoObs.controle.addEventListener('input', function () { escolha.observacoes = campoObs.controle.value; });
        area.appendChild(h('div', { estilo: { marginTop: 'var(--e4)' } }, campoObs.el));

        var origemSel = U.campo({
          tipo: 'selecao', rotulo: 'Origem do agendamento', valor: escolha.origem,
          opcoes: [{ valor: 'manual', nome: 'Manual (lançado no painel)' },
                   { valor: 'site', nome: 'Site (cliente agendou pelo site)' }]
        });
        origemSel.controle.addEventListener('change', function () { escolha.origem = origemSel.controle.value; });
        area.appendChild(h('div', { estilo: { marginTop: 'var(--e4)', maxWidth: '22rem' } }, origemSel.el));

        redesenharHorarios();
      }

      if (passo === 4) {
        var servico4 = servicoEscolhido();
        var cliente4 = N.dados.clientes.filter(function (c) { return c.id === escolha.clienteId; })[0];
        area.appendChild(h('div.comanda', null,
          h('div.comanda__linha', null, h('span.miudo', { texto: 'Cliente' }),
            h('span', null, h('b', { texto: cliente4 ? cliente4.nome : '—' }))),
          h('div.comanda__linha', null, h('span.miudo', { texto: 'Serviço' }),
            h('span', { texto: servico4.nome })),
          h('div.comanda__linha', null, h('span.miudo', { texto: 'Data' }),
            h('span', { texto: N.rotuloDia(escolha.dataChave, new Date()) + ' · ' + N.dataLonga(escolha.dataChave) })),
          h('div.comanda__linha', null, h('span.miudo', { texto: 'Horário' }),
            h('span.num', { texto: N.horaCheia(escolha.inicio) + ' – ' +
              N.horaCheia(D.minutosDe(escolha.inicio) + servico4.duracao) })),
          h('div.comanda__linha', null, h('span.miudo', { texto: 'Duração' }),
            h('span', { texto: N.duracaoLegivel(servico4.duracao) })),
          h('div.comanda__linha', null, h('span.miudo', { texto: 'Origem' }),
            h('span', null, U.origem(escolha.origem))),
          h('div.comanda__total', null,
            h('span.rotulo', { texto: 'Valor' }),
            h('span.traco', { texto: 'Consultar' }))
        ));
        area.appendChild(h('p.miudo', { estilo: { marginTop: 'var(--e2)' },
          texto: 'Os valores dos serviços não constam nos materiais do salão e por isso não são preenchidos pelo sistema.' }));
        area.appendChild(h('div', { estilo: { marginTop: 'var(--e4)' } },
          U.avisoDemo('Este é um cadastro demonstrativo: ele vive apenas nesta sessão do navegador e não é enviado a nenhum servidor.')));
      }

      atualizarBotoes();
    }

    function atualizarBotoes() {
      var avancar = m.el.querySelector('[data-avancar]');
      var voltar = m.el.querySelector('[data-voltar]');
      if (!avancar) return;
      var pronto = passo === 1 ? !!escolha.servicoId
        : passo === 2 ? !!escolha.clienteId
        : passo === 3 ? !!escolha.inicio
        : true;
      avancar.textContent = passo === 4 ? 'Confirmar agendamento' : 'Continuar';
      if (pronto) avancar.removeAttribute('disabled'); else avancar.setAttribute('disabled', '');
      if (voltar) { if (passo > 1) voltar.removeAttribute('disabled'); else voltar.setAttribute('disabled', ''); }
    }

    function validar() {
      if (passo === 1 && !escolha.servicoId) { U.toast('Escolha um serviço para continuar.', 'alerta'); return false; }
      if (passo === 2 && !escolha.clienteId) { U.toast('Escolha um cliente para continuar.', 'alerta'); return false; }
      if (passo === 3 && !escolha.inicio) { U.toast('Escolha um horário livre para continuar.', 'alerta'); return false; }
      return true;
    }

    function concluir() {
      /* A janela de agendamento é uma configuração real: se o site só aceita
         marcar até certa data, o painel também não deixa — senão o ajuste
         seria decorativo, e "até 45 dias à frente" não significaria nada.
         O painel continua podendo lançar o que quiser em data passada; a
         janela limita o FUTURO, que é o que ela promete limitar. */
      var limite = N.limiteDeAgendamento(new Date());
      if (escolha.dataChave > limite) {
        U.toast('A janela de agendamento termina em ' + N.rotuloDia(limite, new Date()) +
          '. Ajuste em Configurações → Agendamento para lançar mais à frente.', 'alerta');
        return;
      }
      var r = N.criarAgendamento({
        servicoId: escolha.servicoId,
        clienteId: escolha.clienteId,
        dataChave: escolha.dataChave,
        inicio: escolha.inicio,
        origem: escolha.origem,
        observacoes: escolha.observacoes,
        status: 'confirmado'
      });
      if (!r.ok) { U.toast(r.mensagem, 'erro'); U.fecharTudo(); return; }
      m.fechar();
      U.toast('Agendamento criado para ' + N.nomeCurto(escolha.clienteId) + ' em ' +
        N.rotuloDia(escolha.dataChave, new Date()) + ' às ' + N.horaCheia(escolha.inicio) + '.', 'sucesso',
        { negrito: 'Pronto.' });
    }

    desenhar();
    return m;
  }

  /* Exporta o que as outras telas usam */
  window.AGENDA = {
    abrirDetalhe: abrirDetalhe,
    abrirNovo: abrirNovo,
    abrirBloqueio: abrirBloqueio,
    abrirBloqueioNovo: abrirBloqueioNovo,
    abrirReagendar: abrirReagendar,
    montarBloco: montarBloco,
    montarListaDias: montarListaDias,
    montarVisaoDia: montarVisaoDia,
    intervalosTomados: intervalosTomados,
    vaosLivres: vaosLivres,
    inicioDaSemana: inicioDaSemana,
    datasDaSemana: datasDaSemana,
    ICONE_MOTIVO: ICONE_MOTIVO
  };
})();
