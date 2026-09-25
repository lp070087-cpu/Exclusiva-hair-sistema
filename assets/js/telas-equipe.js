/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-equipe.js

   EQUIPE — os POSTOS DE TRABALHO do salão, vistos pela proprietária.

   TRÊS DECISÕES QUE EXPLICAM ESTE ARQUIVO INTEIRO:

   1. NÃO HÁ NOMES DE PESSOA AQUI. Os materiais do salão não trazem os nomes
      da equipe, e nome de gente não se inventa. O que existe são POSTOS
      NUMERADOS — "Profissional 01/02/03", "P1/P2/P3" nos espaços compactos —
      com as características OPERACIONAIS que a proprietária descreveu:
      quantas clientes cada posto acompanha ao mesmo tempo, quais serviços
      realiza, em que dias e horas trabalha. Isso não é nome: é configuração.

   2. CAPACIDADE NÃO É HORÁRIO. No Exclusiva Hair uma profissional acompanha
      várias clientes simultaneamente (processos que descansam no fio), então
      "3 de 8 vagas ocupadas" quer dizer que AINDA CABE GENTE, e não que o
      horário está tomado. A tela fala em VAGAS por causa disso, e a seção
      Horários explica a diferença em vez de deixar a proprietária supor.

   3. TODO NÚMERO SAI DOS DADOS. As vagas vêm de `N.vagasDe`, a situação de
      `N.situacaoDa`, a agenda do dia de `N.doDia`. Nada é calculado aqui, e
      nada é fixo: se a agenda demonstrativa mudar, estes números mudam junto.

   Nenhum ranking entre funcionárias: o §10 do pedido proíbe, e a razão é
   boa — a tela serve para organizar a agenda, não para comparar pessoas.

   UMA ARMADILHA QUE VALE REGISTRAR: o expediente DECLARADO de um posto não é
   o expediente EM VIGOR. `janelaDe()` cruza o horário do posto com o
   funcionamento do salão, e é a interseção que vale — a P3 declara sair às
   19h, mas o salão fecha às 18h, então a agenda dela para às 18h. Mostrar o
   horário declarado como se fosse a agenda prometeria um horário que o
   sistema nunca oferece. As duas leituras aparecem, com a diferença dita.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  var TELAS = (window.TELAS = window.TELAS || {});

  /* Memória de tela: sobrevive à troca de rota, como os filtros das outras
     abas. Não é dado do salão — é posição de leitura. */
  var FILTRO = 'todas';
  var ABA = 'geral';

  function hojeChave() { return D.chaveDe(new Date()); }

  function servicosAtivos() {
    return N.dados.servicos.filter(function (s) { return s.ativo; });
  }

  /* ---------------------------------------------------------------------
     DADOS DERIVADOS — todos de leitura, nenhum inventado.
     --------------------------------------------------------------------- */

  function linhas(chave, agora) {
    return N.equipeDoDia(chave, N.dados.agendamentos, N.dados.bloqueios, agora).profissionais;
  }

  function linhaDe(p, chave, agora) {
    return linhas(chave, agora).filter(function (l) {
      return l.profissional.id === p.id;
    })[0] || null;
  }

  function atendimentosDe(p, chave) {
    return N.doDia(N.dados.agendamentos, chave).filter(function (a) {
      return a.profissionalId === p.id;
    });
  }

  /* Próximo atendimento daquele posto: o primeiro que ainda não terminou.
     Devolve null quando não há mais nada — e a tela diz "sem mais
     atendimentos hoje" em vez de mostrar uma hora vazia. */
  function proximoDe(p, chave, agora) {
    var ref = agora || new Date();
    var refMin = ref.getHours() * 60 + ref.getMinutes();
    var ehHoje = chave === D.chaveDe(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()));
    var lista = atendimentosDe(p, chave).filter(function (a) { return N.estaAtivo(a); });
    if (ehHoje) {
      lista = lista.filter(function (a) { return a.inicioMin + a.duracao > refMin; });
    }
    lista.sort(function (a, b) { return a.inicioMin - b.inicioMin; });
    return lista[0] || null;
  }

  /* Um posto já cadastrado mas ainda sem serviços marcados atende TUDO — é a
     regra do núcleo (`fazServico`), e a tela precisa dizer isso com todas as
     letras, senão a proprietária lê a lista vazia como "não faz nada". */
  function atendeTudo(p) { return !p.servicos || !p.servicos.length; }

  function nomesServicos(p) {
    return (p.servicos || []).map(function (id) { return N.nomeServico(id); });
  }

  /* Expediente declarado × em vigor. Sem isto a tela promete horário que a
     agenda não oferece (ver a nota no cabeçalho do arquivo). */
  function janelaHoje(p, ref) {
    var dt = ref || new Date();
    var cfg = D.FUNCIONAMENTO[dt.getDay()];
    var j = N.janelaDe(p, cfg);
    return {
      cfg: cfg,
      janela: j,
      /* A interseção cortou o expediente declarado em alguma ponta? */
      cortado: !!j && (j.inicio > N.minutosDe(p.entrada || cfg.inicio) ||
                       j.fim < N.minutosDe(p.saida || cfg.fim))
    };
  }

  function diasLegiveis(dias) {
    var d = (dias || []).slice().sort(function (a, b) { return a - b; });
    if (!d.length) return 'nenhum dia';
    if (d.length === 7) return 'todos os dias';
    var corrido = d.every(function (v, i) { return i === 0 || v === d[i - 1] + 1; });
    var nomes = d.map(function (n) { return D.DIAS_CURTO[n]; });
    if (corrido && d.length > 2) return nomes[0] + ' a ' + nomes[nomes.length - 1];
    return nomes.join(', ');
  }

  /* ---------------------------------------------------------------------
     PEÇAS DE DESENHO
     --------------------------------------------------------------------- */

  /* P1/P2/P3 no avatar. Não usa U.avatar de propósito: ele reduz o nome a
     iniciais, e "Profissional 01" daria "P0" — as duas palavras começam com
     a mesma letra. O posto já TEM sigla; é ela que aparece. */
  function avatarPosto(p, tamanho) {
    return h('span.avatar' + (tamanho ? '.avatar--' + tamanho : ''), {
      dados: { matiz: String(N.matizDe(p.nome)) },
      'aria-hidden': 'true',
      texto: p.curto || ('P' + p.numero)
    });
  }

  function seloSituacao(s) {
    return h('span.eq-sit.eq-sit--' + s.id, { texto: s.nome });
  }

  /* A BARRA DE VAGAS. "5 / 8 vagas ocupadas" e "3 vagas disponíveis" saem do
     mesmo objeto — a barra é a leitura rápida do número, não outra conta. */
  function blocoVagas(v, compacto) {
    var ocupadas = Math.min(v.pico, v.capacidade);
    var cheio = ocupadas >= v.capacidade;
    var caixa = h('div.vagas' + (compacto ? '.vagas--compacto' : ''),
      { dados: { cheio: cheio ? 'sim' : 'nao' } },
      h('div.vagas__topo', null,
        h('span.vagas__contagem', null,
          h('b.num', { texto: String(ocupadas) }),
          document.createTextNode(' / ' + v.capacidade + ' vagas ocupadas')),
        h('span.vagas__livres', {
          texto: v.vagas === 1 ? '1 vaga disponível' : v.vagas + ' vagas disponíveis'
        })
      ),
      h('div.vagas__trilha', {
        role: 'img',
        'aria-label': ocupadas + ' de ' + v.capacidade + ' vagas ocupadas no pico do dia'
      }, h('i.vagas__preenchimento', { estilo: { width: Math.round(v.fracao * 100) + '%' } }))
    );
    if (!compacto) {
      caixa.appendChild(h('p.miudo', { estilo: { marginTop: 'var(--e2)' },
        texto: cheio
          ? 'No pico do dia ela está no próprio teto: nesse momento não cabe outra cliente.'
          : 'Vagas restantes no momento mais cheio do dia — não é o horário inteiro tomado.'
      }));
    }
    return caixa;
  }

  /* Cartão compacto do posto (§3). O pedido diz que não precisa mostrar tudo
     ao mesmo tempo, e que o cartão deve continuar elegante — então o cartão
     mostra o que responde de imediato e o resto vive no detalhe. */
  function cartaoPosto(l, agora) {
    var p = l.profissional;
    var v = l.vagas;
    var chave = hojeChave();
    var prox = v.trabalha ? proximoDe(p, chave, agora) : null;
    var quantos = atendimentosDe(p, chave).length;
    var jan = janelaHoje(p, agora);

    var corpo = h('div.eq-cartao__corpo');

    if (!v.trabalha) {
      corpo.appendChild(h('p.eq-cartao__aviso', {
        texto: p.ativo === false
          ? 'Posto desativado no cadastro: não recebe agendamento.'
          : 'Hoje não é dia de trabalho deste posto (' + diasLegiveis(p.dias) + ').'
      }));
    } else {
      corpo.appendChild(blocoVagas(v, true));
    }

    corpo.appendChild(h('div.eq-cartao__dados', null,
      h('span.linha-media', null,
        h('span.linha-media__rotulo', null,
          U.svg('relogio'), document.createTextNode('Expediente')),
        h('span.linha-media__valor', {
          texto: jan.janela
            ? N.horaCheia(jan.janela.inicio) + ' às ' + N.horaCheia(jan.janela.fim)
            : diasLegiveis(p.dias)
        })),
      h('span.linha-media', null,
        h('span.linha-media__rotulo', null,
          U.svg('lista'), document.createTextNode('Hoje')),
        h('span.linha-media__valor', {
          texto: quantos
            ? quantos + (quantos === 1 ? ' atendimento' : ' atendimentos')
            : 'nenhum atendimento'
        })),
      h('span.linha-media', null,
        h('span.linha-media__rotulo', null,
          U.svg('chevron-dir'), document.createTextNode('A seguir')),
        h('span.linha-media__valor', {
          texto: prox
            ? N.horaCheia(prox.inicioMin) + ' · ' + N.nomeCurto(prox.clienteId)
            : (v.trabalha ? 'sem mais atendimentos hoje' : '—')
        }))
    ));

    /* Serviços: no cartão cabe a contagem e o aviso do caso especial. */
    corpo.appendChild(h('div.eq-cartao__servicos', null,
      U.rotulo('Serviços que realiza'),
      h('p.miudo', {
        texto: atendeTudo(p)
          ? 'Todos os serviços ativos (' + servicosAtivos().length + ')'
          : nomesServicos(p).slice(0, 3).join(' · ') +
            (p.servicos.length > 3 ? ' e mais ' + (p.servicos.length - 3) : '')
      })
    ));

    return h('article.eq-cartao', {
      dados: { situacao: l.situacao.id, inativo: p.ativo === false ? 'sim' : 'nao' }
    },
      h('div.eq-cartao__topo', null,
        avatarPosto(p, 'g'),
        h('div.eq-cartao__identidade', null,
          h('h3.eq-cartao__nome', { texto: p.nome }),
          h('p.eq-cartao__funcao', { texto: p.funcao || 'Profissional' })
        ),
        seloSituacao(l.situacao)
      ),
      corpo,
      h('footer.eq-cartao__rodape', null,
        U.marcaDemo('posto demonstrativo'),
        h('button.btn.btn--secundario.btn--pequeno', {
          type: 'button', texto: 'Abrir posto',
          ao: { click: function () { N.roteador.ir('#/equipe/' + p.id); } }
        }, U.svg('usuario'))
      )
    );
  }

  /* ---------------------------------------------------------------------
     ABA EQUIPE — a lista
     --------------------------------------------------------------------- */
  TELAS.equipe = {
    titulo: 'Equipe',
    aoAbrir: function () {},
    montar: function (params, estado) {
      /* "#/equipe/p1" cai na ficha do posto. O roteador resolve só a primeira
         parte do hash e passa o resto em `params` — igual ao que Clientes e
         Agenda já fazem. */
      if (params && params[0]) {
        var alvo = N.dados.profissionais.filter(function (p) { return p.id === params[0]; })[0];
        if (alvo) return TELAS.profissional.montar(params, estado);
      }
      return TELAS.equipe.lista();
    },

    lista: function () {
      var caixa = h('div');
      var agora = new Date();
      var chave = hojeChave();
      var todas = linhas(chave, agora);
      var eq = N.equipeDoDia(chave, N.dados.agendamentos, N.dados.bloqueios, agora);
      var ativas = N.dados.profissionais.filter(function (p) { return p.ativo !== false; }).length;

      /* ------------------------------------------------------------------
         TOPO
         ------------------------------------------------------------------ */
      caixa.appendChild(h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: 'Equipe' }),
          h('div.cabecalho__contexto', null,
            h('span', {
              texto: N.dados.profissionais.length + ' postos de trabalho · ' +
                eq.trabalhando + ' trabalhando hoje'
            }),
            U.marcaDemo('postos demonstrativos')
          )
        ),
        h('div.cabecalho__acoes', null,
          h('button.btn.btn--principal', {
            type: 'button', texto: 'Nova profissional',
            ao: { click: function () { abrirCadastro(null); } }
          }, U.svg('mais'))
        )
      ));

      /* ------------------------------------------------------------------
         AVISO — a regra da casa em uma frase, para ninguém ler "5/8" como
         "cheio" nem procurar aqui um nome que não existe.
         ------------------------------------------------------------------ */
      caixa.appendChild(h('div.aviso-demo', null, U.svg('info'),
        h('div', null,
          h('b', { texto: 'Postos numerados, capacidade real de agenda. ' }),
          document.createTextNode('Os materiais do salão não trazem os nomes da equipe, ' +
            'então os postos são numerados — nenhum nome foi inventado. A capacidade ' +
            'simultânea de cada posto foi informada pela proprietária, e é ela que a ' +
            'agenda usa para decidir se ainda cabe cliente.')
        )));

      /* ------------------------------------------------------------------
         MÉTRICAS DO DIA
         ------------------------------------------------------------------ */
      caixa.appendChild(h('div.grade.grade--metricas', null,
        U.metrica({
          rotulo: 'Postos ativos', valor: ativas + ' de ' + N.dados.profissionais.length,
          icone: 'pessoas', demo: true, nota: 'disponíveis para agendar'
        }),
        U.metrica({
          rotulo: 'Capacidade de hoje', valor: String(eq.capacidade),
          icone: 'pessoas', demo: true, nota: 'clientes simultâneas nos postos que trabalham'
        }),
        U.metrica({
          rotulo: 'Vagas livres hoje', valor: String(eq.vagasLivres),
          icone: 'checar-circulo', demo: true, nota: 'no momento mais cheio de cada posto'
        }),
        U.metrica({
          rotulo: 'Atendimentos hoje', valor: String(N.doDia(N.dados.agendamentos, chave).length),
          icone: 'lista', demo: true, nota: 'na agenda demonstrativa de hoje'
        })
      ));

      /* ------------------------------------------------------------------
         FILTRO POR SITUAÇÃO — real, e com contagem vinda dos dados.
         ------------------------------------------------------------------ */
      var contagem = {};
      todas.forEach(function (l) { contagem[l.situacao.id] = (contagem[l.situacao.id] || 0) + 1; });

      var lista = h('div.grade.grade--painel');
      var vazio = h('div');

      function redesenhar() {
        U.limpar(lista);
        U.limpar(vazio);
        var visiveis = todas.filter(function (l) {
          return FILTRO === 'todas' || l.situacao.id === FILTRO;
        });
        if (!visiveis.length) {
          vazio.appendChild(U.vazio('pessoas', 'Nenhum posto nesta situação',
            'Nenhuma profissional está com esta situação hoje. Escolha outra situação ' +
            'ou volte para "Todas".',
            h('button.btn.btn--secundario', {
              type: 'button', texto: 'Ver todas',
              ao: { click: function () { FILTRO = 'todas'; desenharFiltro(); redesenhar(); } }
            }), true));
          return;
        }
        visiveis.forEach(function (l) { lista.appendChild(cartaoPosto(l, agora)); });
      }

      var linhaFiltro = h('div.filtros', { role: 'group', 'aria-label': 'Filtrar por situação' });
      function desenharFiltro() {
        U.limpar(linhaFiltro);
        linhaFiltro.appendChild(U.chip('Todas', FILTRO === 'todas', function () {
          FILTRO = 'todas'; desenharFiltro(); redesenhar();
        }, { contador: todas.length }));
        N.SITUACOES_EQUIPE.forEach(function (s) {
          if (!contagem[s.id]) return;   /* não oferece filtro que daria vazio */
          linhaFiltro.appendChild(U.chip(s.nome, FILTRO === s.id, function () {
            FILTRO = s.id; desenharFiltro(); redesenhar();
          }, { contador: contagem[s.id] }));
        });
      }
      desenharFiltro();
      caixa.appendChild(linhaFiltro);
      caixa.appendChild(lista);
      caixa.appendChild(vazio);

      redesenhar();

      caixa.appendChild(h('p.miudo', { estilo: { marginTop: 'var(--e5)' },
        texto: 'As vagas são calculadas a partir da agenda: o pico de clientes ' +
          'simultâneas de cada posto contra o teto que a proprietária cadastrou. ' +
          'Um posto com 3 de 8 ocupadas continua recebendo agendamento.' }));

      return caixa;
    }
  };

  /* ---------------------------------------------------------------------
     FICHA DO POSTO — cinco seções (§10)
     VISÃO GERAL · AGENDA · SERVIÇOS · HORÁRIOS · DESEMPENHO
     --------------------------------------------------------------------- */
  var ABAS = [
    { id: 'geral',      nome: 'Visão geral' },
    { id: 'agenda',     nome: 'Agenda' },
    { id: 'servicos',   nome: 'Serviços' },
    { id: 'horarios',   nome: 'Horários' },
    { id: 'desempenho', nome: 'Desempenho' }
  ];

  function posto(id) {
    return N.dados.profissionais.filter(function (p) { return p.id === id; })[0] || null;
  }

  TELAS.profissional = {
    titulo: 'Profissional',
    aoAbrir: function () { ABA = 'geral'; },
    montar: function (params) {
      var p = posto(params && params[0]);
      if (!p) {
        return h('div.cabecalho', null, U.vazio('pessoas', 'Posto não encontrado',
          'Este posto de trabalho não existe na demonstração.',
          h('button.btn.btn--secundario', {
            type: 'button', texto: 'Voltar para Equipe',
            ao: { click: function () { N.roteador.ir('#/equipe'); } }
          })));
      }

      var caixa = h('div');
      var agora = new Date();
      var chave = hojeChave();
      var lin = linhaDe(p, chave, agora);
      var situacao = lin ? lin.situacao
        : N.situacaoDa(p, chave, N.dados.agendamentos, N.dados.bloqueios, agora);
      var vagas = lin ? lin.vagas
        : N.vagasDe(p, chave, N.dados.agendamentos, N.dados.bloqueios, agora);
      var jan = janelaHoje(p, agora);

      caixa.appendChild(h('button.voltar', {
        type: 'button', ao: { click: function () { N.roteador.ir('#/equipe'); } }
      }, U.svg('chevron-esq'), document.createTextNode('Equipe')));

      caixa.appendChild(h('div.perfil-topo', null,
        avatarPosto(p, 'x'),
        h('div.perfil-topo__texto', null,
          h('h1.perfil-topo__nome', { texto: p.nome }),
          h('div.etiquetas', null,
            h('span.etiqueta', null, U.svg('maleta'),
              document.createTextNode(p.funcao || 'Profissional')),
            h('span.etiqueta', null, U.svg('relogio'),
              document.createTextNode(jan.janela
                ? N.horaCheia(jan.janela.inicio) + ' às ' + N.horaCheia(jan.janela.fim) + ' hoje'
                : diasLegiveis(p.dias))),
            seloSituacao(situacao),
            U.marcaDemo('posto demonstrativo')
          )
        ),
        h('div.perfil-topo__acoes', null,
          h('button.btn.btn--secundario.btn--pequeno', {
            type: 'button', texto: 'Editar cadastro',
            ao: { click: function () { abrirCadastro(p); } }
          }, U.svg('editar')),
          h('button.btn.btn--principal.btn--pequeno', {
            type: 'button', texto: 'Novo agendamento',
            ao: { click: function () { window.AGENDA.abrirNovo({ dataChave: chave }); } }
          }, U.svg('mais'))
        )
      ));

      caixa.appendChild(h('div.grade.grade--metricas', null,
        U.metrica({
          rotulo: 'Vagas hoje', icone: 'pessoas', demo: true,
          valor: vagas.trabalha ? vagas.vagas + ' de ' + vagas.capacidade : '—',
          nota: vagas.trabalha ? 'livres no pico do dia' : 'não trabalha hoje'
        }),
        U.metrica({
          rotulo: 'Atendimentos hoje', icone: 'lista', demo: true,
          valor: String(atendimentosDe(p, chave).length), nota: 'na agenda de hoje'
        }),
        U.metrica({
          rotulo: 'Capacidade simultânea', icone: 'pessoas', demo: true,
          valor: String(N.capacidadeDe(p)), nota: 'clientes acompanhadas ao mesmo tempo'
        }),
        U.metrica({
          rotulo: 'Serviços habilitados', icone: 'tesoura', demo: true,
          valor: atendeTudo(p) ? 'Todos' : String(p.servicos.length),
          nota: atendeTudo(p) ? 'nenhum restrito no cadastro'
            : 'de ' + servicosAtivos().length + ' ativos'
        })
      ));

      var corpo = h('div');
      caixa.appendChild(U.abas(ABAS.map(function (a) {
        return { id: a.id, nome: a.nome };
      }), ABA, function (novo) { ABA = novo; desenhar(); }, 'Seções do posto'));
      caixa.appendChild(corpo);

      function desenhar() {
        U.limpar(corpo);
        if (ABA === 'geral') secaoGeral(corpo, p, situacao, vagas, jan);
        else if (ABA === 'agenda') secaoAgenda(corpo, p, chave, agora);
        else if (ABA === 'servicos') secaoServicos(corpo, p);
        else if (ABA === 'horarios') secaoHorarios(corpo, p, jan);
        else secaoDesempenho(corpo, p, chave);
      }
      desenhar();

      return caixa;
    }
  };

  /* --- 1. VISÃO GERAL ---------------------------------------------------- */
  function secaoGeral(caixa, p, situacao, vagas, jan) {
    var chave = hojeChave();
    var prox = proximoDe(p, chave, new Date());
    var listaHoje = atendimentosDe(p, chave);

    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Situação de agora' }),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Situação' }),
        seloSituacao(situacao)),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Ocupação de hoje' }),
        h('span.linha-dado__valor', {
          texto: vagas.trabalha
            ? Math.min(vagas.pico, vagas.capacidade) + ' / ' + vagas.capacidade +
              ' vagas ocupadas no pico'
            : 'não trabalha hoje'
        })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Atendimentos marcados' }),
        h('span.linha-dado__valor', { texto: String(listaHoje.length) + ' no dia' })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Próximo atendimento' }),
        h('span.linha-dado__valor', {
          texto: prox
            ? N.horaCheia(prox.inicioMin) + ' · ' + N.nomeCliente(prox.clienteId)
            : 'sem mais atendimentos hoje'
        })),
      h('p.miudo', { estilo: { marginTop: 'var(--e3)' },
        texto: 'A ocupação conta quantos atendimentos estão abertos em cada minuto do dia. ' +
          'Ela não mede qualidade nem ritmo de trabalho — serve para saber se ainda cabe ' +
          'cliente naquele posto.' })
    ));

    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Cadastro' }),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Função' }),
        h('span.linha-dado__valor', { texto: p.funcao || 'Profissional' })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Expediente declarado' }),
        h('span.linha-dado__valor', {
          texto: N.horaCheia(p.entrada) + ' às ' + N.horaCheia(p.saida) +
            (p.intervaloInicio && p.intervaloFim
              ? ' · pausa ' + N.horaCheia(N.minutosDe(p.intervaloInicio)) + '–' +
                N.horaCheia(N.minutosDe(p.intervaloFim))
              : '')
        })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Expediente em vigor' }),
        h('span.linha-dado__valor', {
          texto: jan.janela
            ? N.horaCheia(jan.janela.inicio) + ' às ' + N.horaCheia(jan.janela.fim) + ' hoje'
            : 'não trabalha hoje'
        })),
      jan.cortado ? h('p.miudo', {
        texto: 'O horário declarado passa do funcionamento do salão (' +
          jan.cfg.inicio + '–' + jan.cfg.fim + '), e a agenda respeita o do salão. ' +
          'É por isso que o expediente em vigor é mais curto que o declarado.'
      }) : null,
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Dias que trabalha' }),
        h('span.linha-dado__valor', { texto: diasLegiveis(p.dias) })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Serviços que realiza' }),
        h('span.linha-dado__valor', {
          texto: atendeTudo(p) ? 'todos os serviços ativos' : String(p.servicos.length)
        })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Situação no cadastro' }),
        h('span.linha-dado__valor', { texto: p.ativo === false ? 'Inativa' : 'Ativa' }))
    ));
  }

  /* --- 2. AGENDA --------------------------------------------------------- */
  function secaoAgenda(caixa, p, chave, agora) {
    var lista = atendimentosDe(p, chave).slice().sort(function (a, b) {
      return a.inicioMin - b.inicioMin;
    });

    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Hoje · ' + N.rotuloDia(chave, agora) }),
      h('p.miudo', { texto: 'Como este posto está distribuído ao longo do dia. ' +
        'A sobreposição é normal: ela acompanha mais de uma cliente por vez.' })
    ));

    if (!lista.length) {
      caixa.appendChild(U.vazio('calendario-x', 'Nenhum atendimento hoje',
        'Este posto não tem atendimento marcado para hoje na agenda demonstrativa.', null, true));
    } else {
      var pilha = h('div.pilha');
      lista.forEach(function (a) {
        pilha.appendChild(U.linhaAgendamento(a, {
          semPagamento: true,
          aoAbrir: function () { window.AGENDA.abrirDetalhe(a); }
        }));
      });
      caixa.appendChild(pilha);
    }

    /* Próximos dias: onde este posto terá trabalho. Uma régua de sete dias
       basta para a proprietária se orientar — sem segunda agenda gigante. */
    var base = D.dataDeChave(chave);
    var proximos = [];
    for (var i = 1; i <= 7; i += 1) {
      var dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
      var k = D.chaveDe(dt);
      var j = N.janelaDe(p, D.FUNCIONAMENTO[dt.getDay()]);
      proximos.push({
        data: dt,
        trabalha: !!j,
        quantos: N.doDia(N.dados.agendamentos, k).filter(function (a) {
          return a.profissionalId === p.id;
        }).length
      });
    }
    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Próximos sete dias' }),
      h('div.regua-dias', null, proximos.map(function (d) {
        return h('div.regua-dias__dia', { dados: { fechado: d.trabalha ? 'nao' : 'sim' } },
          h('span.regua-dias__nome', { texto: D.DIAS_CURTO[d.data.getDay()] }),
          h('span.regua-dias__num', { texto: String(d.data.getDate()) }),
          h('span.regua-dias__n', {
            texto: d.trabalha ? (d.quantos ? String(d.quantos) : '—') : 'folga'
          }));
      })),
      h('p.miudo', { estilo: { marginTop: 'var(--e3)' },
        texto: 'O número é a quantidade de atendimentos já marcados naquele dia.' })
    ));
  }

  /* --- 3. SERVIÇOS ------------------------------------------------------- */
  /* §4: NÃO atribuir funções aleatoriamente. A tela não sugere, não pré-marca
     e não "otimiza": ela mostra o que está gravado e deixa a proprietária
     marcar. Posto sem serviço marcado atende TODOS — e a tela diz isso,
     porque a leitura contrária ("não faz nada") seria errada. */
  function secaoServicos(caixa, p) {
    var todos = atendeTudo(p);

    var bloco = h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Serviços que esta profissional realiza' }),
      h('p.miudo', { texto: 'Marque o que ela realmente faz. A agenda usa esta lista para ' +
        'decidir quem pode receber cada agendamento — serviço desmarcado não é oferecido ' +
        'neste posto.' })
    );

    if (todos) {
      bloco.appendChild(h('div.aviso-demo', null, U.svg('info'),
        h('div', null,
          h('b', { texto: 'Nenhum serviço restrito neste posto. ' }),
          document.createTextNode('Com a lista vazia, o núcleo entende que este posto ' +
            'realiza TODOS os serviços ativos — uma profissional recém-cadastrada não ' +
            'pode desaparecer da agenda por causa de um cadastro pela metade. Marque os ' +
            'serviços abaixo para restringir.')
        )));
    }

    var grade = h('div.grade-opcoes');
    servicosAtivos().forEach(function (s) {
      grade.appendChild(h('div.opcao-servico', { dados: { servico: s.id } },
        todos
          ? h('label.caixa', null,
              h('input', { type: 'checkbox', checked: true, disabled: true,
                'aria-label': s.nome + ' — realizada por ' + p.nome }),
              h('span', { texto: s.nome }))
          : U.caixaSelecao({
              texto: s.nome, marcado: (p.servicos || []).indexOf(s.id) !== -1,
              rotulo: s.nome + ' — realizada por ' + p.nome
            }),
        h('span.opcao-servico__sub', { texto: N.duracaoLegivel(s.duracao) })
      ));
    });
    bloco.appendChild(grade);

    var rodape = h('div.bloco__acoes');
    if (todos) {
      rodape.appendChild(h('p.miudo', { texto: 'Marque ao menos um serviço para poder ' +
        'salvar a restrição. Com a lista vazia, este posto atende todos.' }));
    } else {
      rodape.appendChild(h('button.btn.btn--principal', {
        type: 'button', texto: 'Salvar serviços',
        ao: {
          click: function () {
            var escolhidos = [];
            Array.prototype.forEach.call(grade.querySelectorAll('.opcao-servico'), function (el) {
              var cx = el.querySelector('input');
              if (cx && cx.checked) escolhidos.push(el.dataset.servico);
            });
            var r = N.salvarProfissional(pacoteDoPosto(p, { servicos: escolhidos }));
            if (r.ok) {
              U.toast(escolhidos.length
                ? 'Serviços de ' + p.nome + ' atualizados.'
                : 'Sem serviços marcados: ' + p.nome + ' volta a realizar todos os ativos.',
                'sucesso');
              window.EH_APP.redesenhar();
            } else U.toast(r.mensagem, 'erro');
          }
        }
      }, U.svg('checar')));
    }
    bloco.appendChild(rodape);
    caixa.appendChild(bloco);

    /* O que ela já atendeu — leitura do histórico, não desempenho. */
    var feitos = {};
    N.dados.agendamentos.forEach(function (a) {
      if (a.profissionalId !== p.id) return;
      feitos[a.servicoId] = (feitos[a.servicoId] || 0) + 1;
    });
    var linhasFeitas = servicosAtivos().map(function (s) {
      return { s: s, n: feitos[s.id] || 0 };
    }).filter(function (x) { return x.n > 0; });

    var blocoUso = h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Serviços já registrados neste posto' }),
      h('p.miudo', { texto: 'Contagem dos atendimentos da agenda demonstrativa. Não é ' +
        'avaliação de desempenho: é o registro de quem atendeu o quê.' })
    );
    if (!linhasFeitas.length) {
      blocoUso.appendChild(h('p.miudo', {
        texto: 'Ainda não há atendimentos registrados para este posto.'
      }));
    } else {
      linhasFeitas.forEach(function (x) {
        blocoUso.appendChild(h('div.linha-dado', null,
          h('span.linha-dado__rotulo', { texto: x.s.nome }),
          h('span.linha-dado__valor', {
            texto: x.n + (x.n === 1 ? ' atendimento' : ' atendimentos')
          })));
      });
    }
    caixa.appendChild(blocoUso);
  }

  /* --- 4. HORÁRIOS E CAPACIDADE ------------------------------------------ */
  /* A seção que mais precisa de cuidado, porque §9 diz com todas as letras:
     NÃO CONFUNDIR CAPACIDADE COM HORÁRIO. A explicação vem antes do
     formulário — quem lê "3 de 8" precisa entender que ainda cabe gente. */
  function secaoHorarios(caixa, p, jan) {
    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Capacidade × horário' }),
      h('p.miudo', { texto: 'São duas coisas diferentes, e a agenda trata as duas de ' +
        'formas diferentes. HORÁRIO é quando o salão abre e quando a profissional ' +
        'trabalha — fora disso não existe agendamento. CAPACIDADE é quantas clientes ela ' +
        'acompanha ao mesmo tempo: com 3 de 8 ocupadas, AINDA HÁ VAGA. Só quando ela ' +
        'chega ao próprio teto é que o sistema deixa de oferecer aquele horário.' }),
      h('p.miudo', { texto: 'Ao procurar horário, o sistema cruza, nesta ordem: quem ' +
        'realiza o serviço, se é dia de trabalho da profissional, se o horário cai dentro ' +
        'do expediente e fora da pausa, se há bloqueio do salão, se a duração cabe antes ' +
        'do fechamento e, por fim, se ela tem vaga livre naquele minuto.' })
    ));

    /* Dias — o mesmo controle do cadastro, para a ficha não ser só leitura. */
    var escolhidos = (p.dias || []).slice();
    var dias = h('div.opcoes-dias');
    function pintarDias() {
      U.limpar(dias);
      D.DIAS_CURTO.forEach(function (nome, i) {
        if (i === 0) return;   /* domingo: o salão não abre na demonstração */
        var ativo = escolhidos.indexOf(i) !== -1;
        dias.appendChild(h('button.opcao-dia' + (ativo ? '.opcao-dia--on' : ''), {
          type: 'button', texto: nome,
          'aria-pressed': ativo ? 'true' : 'false',
          ao: {
            click: function () {
              var k = escolhidos.indexOf(i);
              if (k === -1) escolhidos.push(i); else escolhidos.splice(k, 1);
              pintarDias();
            }
          }
        }));
      });
    }
    pintarDias();

    var campoEntrada = U.campo({ tipo: 'time', rotulo: 'Entra', valor: p.entrada });
    var campoSaida = U.campo({ tipo: 'time', rotulo: 'Sai', valor: p.saida });
    var campoPausaIni = U.campo({ tipo: 'time', rotulo: 'Pausa de', valor: p.intervaloInicio || '' });
    var campoPausaFim = U.campo({ tipo: 'time', rotulo: 'Pausa até', valor: p.intervaloFim || '' });
    var campoCap = U.campo({
      tipo: 'number', rotulo: 'Capacidade simultânea', min: 1, valor: String(p.capacidade || 1),
      dica: 'Quantas clientes ela consegue acompanhar ao mesmo tempo. É o teto do dia.'
    });

    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Expediente' }),
      h('div.campo-par', null, campoEntrada.el, campoSaida.el, campoPausaIni.el, campoPausaFim.el),
      h('div', { estilo: { marginTop: 'var(--e4)' } },
        U.rotulo('Dias que trabalha'),
        dias),
      jan.cortado ? h('p.miudo', { estilo: { marginTop: 'var(--e3)' },
        texto: 'O salão funciona das ' + jan.cfg.inicio + ' às ' + jan.cfg.fim + '. ' +
          'Um expediente declarado fora dessa faixa é aceito, mas a agenda só oferece ' +
          'horário dentro do funcionamento do salão.' }) : null
    ));

    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Capacidade de atendimento' }),
      h('div', { estilo: { maxWidth: '16rem' } }, campoCap.el),
      h('p.miudo', { estilo: { marginTop: 'var(--e3)' },
        texto: 'Medido na agenda demonstrativa, este posto chega a acompanhar ' +
          ((linhaDe(p, hojeChave(), new Date()) || { vagas: { pico: 0 } }).vagas.pico) +
          ' clientes simultâneas.' })
    ));

    /* Capacidade por serviço: a ESTRUTURA existe, os valores não existem
       porque ninguém os informou. §6 pede exatamente isso — nada de X/Y/Z
       inventado. A tela mostra o mapa vazio e explica por quê. */
    var porServico = p.capacidadePorServico || {};
    var configurados = Object.keys(porServico);
    var blocoCap = h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Teto por serviço' }),
      h('p.miudo', { texto: 'Alguns serviços prendem mais a profissional do que outros: ' +
        'um alisamento longo não deixa acompanhar tantas clientes quanto uma avaliação de ' +
        '30 minutos. Esta regra existe no sistema, mas só vale para um serviço quando o ' +
        'salão informa o número.' })
    );
    if (!configurados.length) {
      blocoCap.appendChild(h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Regra por serviço' }),
        h('span.linha-dado__valor', { texto: 'não configurada' })));
      blocoCap.appendChild(h('p.miudo', {
        texto: 'Nenhum teto por serviço foi cadastrado, e o painel não inventa esses ' +
          'valores. Enquanto isso, vale o teto geral de ' + N.capacidadeDe(p) + ' clientes ' +
          'simultâneas para todos os serviços. Quando a proprietária informar os números ' +
          'de cada serviço, este bloco passa a listá-los e a agenda a respeitá-los.'
      }));
    } else {
      configurados.forEach(function (id) {
        blocoCap.appendChild(h('div.linha-dado', null,
          h('span.linha-dado__rotulo', { texto: N.nomeServico(id) }),
          h('span.linha-dado__valor', { texto: porServico[id] + ' simultâneas' })));
      });
    }
    caixa.appendChild(blocoCap);

    caixa.appendChild(h('div.bloco__acoes', null,
      h('button.btn.btn--principal', {
        type: 'button', texto: 'Salvar horários e capacidade',
        ao: {
          click: function () {
            var cap = parseInt(campoCap.valor(), 10);
            campoCap.marcarErro(null);
            if (!cap || cap < 1 || cap > 30) {
              campoCap.marcarErro('Informe um número de 1 a 30.');
              return;
            }
            if (!escolhidos.length) {
              U.toast('Marque ao menos um dia de trabalho.', 'alerta');
              return;
            }
            var entrada = campoEntrada.valor(), saida = campoSaida.valor();
            if (!entrada || !saida || N.minutosDe(saida) <= N.minutosDe(entrada)) {
              U.toast('O horário de saída precisa ser depois do de entrada.', 'alerta');
              return;
            }
            var pIni = campoPausaIni.valor(), pFim = campoPausaFim.valor();
            if ((pIni && !pFim) || (!pIni && pFim)) {
              U.toast('Preencha os dois lados da pausa, ou nenhum.', 'alerta');
              return;
            }
            var r = N.salvarProfissional(pacoteDoPosto(p, {
              capacidade: cap,
              dias: escolhidos.slice(),
              entrada: entrada, saida: saida,
              intervaloInicio: pIni || null, intervaloFim: pFim || null
            }));
            if (r.ok) {
              U.toast('Horários e capacidade de ' + p.nome + ' atualizados.', 'sucesso');
              window.EH_APP.redesenhar();
            } else U.toast(r.mensagem, 'erro');
          }
        }
      }, U.svg('checar')),
      h('button.btn.btn--secundario', {
        type: 'button', texto: 'Descartar alterações',
        ao: { click: function () { window.EH_APP.redesenhar(); } }
      })
    ));
  }

  /* --- 5. DESEMPENHO ----------------------------------------------------- */
  /* §10: NÃO criar ranking entre funcionárias. Então: números de um posto só,
     lado a lado com nada além do próprio histórico, e uma nota dizendo que a
     tela não ordena ninguém. */
  function secaoDesempenho(caixa, p, chave) {
    var meus = N.dados.agendamentos.filter(function (a) {
      return a.profissionalId === p.id;
    });
    var passado = meus.filter(function (a) { return a.dataChave < chave; });
    var concluidos = passado.filter(function (a) {
      return a.status === 'concluido' || a.status === 'atendimento';
    });
    var cancelados = passado.filter(function (a) { return a.status === 'cancelado'; });
    var ausentes = passado.filter(function (a) { return a.status === 'ausente'; });
    var futuros = meus.filter(function (a) { return a.dataChave >= chave; });
    var esperados = passado.length;
    var minutos = passado.reduce(function (s, a) {
      return s + (N.ocupaAgenda(a) ? a.duracao : 0);
    }, 0);
    var dias = {};
    passado.forEach(function (a) { if (N.ocupaAgenda(a)) dias[a.dataChave] = 1; });
    var distintos = {};
    concluidos.forEach(function (a) { distintos[a.servicoId] = 1; });

    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Registros da agenda demonstrativa' }),
      h('div.grade.grade--metricas', null,
        U.metrica({ rotulo: 'Atendimentos concluídos', valor: String(concluidos.length),
          icone: 'checar-circulo', demo: true, nota: 'em dias já encerrados' }),
        U.metrica({ rotulo: 'Comparecimento', icone: 'checar-circulo', demo: true,
          valor: esperados ? N.percentual(concluidos.length / esperados) : '—',
          nota: concluidos.length + ' de ' + esperados + ' esperados' }),
        U.metrica({ rotulo: 'Tempo em atendimento', valor: N.duracaoLegivel(minutos),
          icone: 'relogio', demo: true, nota: 'soma das durações realizadas' }),
        U.metrica({ rotulo: 'Agendados à frente', valor: String(futuros.length),
          icone: 'calendario', demo: true, nota: 'de hoje em diante' }))
    ));

    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Registros do período' }),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Atendimentos no histórico' }),
        h('span.linha-dado__valor', { texto: String(meus.length) })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Cancelamentos' }),
        h('span.linha-dado__valor', { texto: String(cancelados.length) })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Faltas registradas' }),
        h('span.linha-dado__valor', { texto: String(ausentes.length) })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Dias com atendimento' }),
        h('span.linha-dado__valor', { texto: String(Object.keys(dias).length) })),
      h('div.linha-dado', null,
        h('span.linha-dado__rotulo', { texto: 'Serviços diferentes realizados' }),
        h('span.linha-dado__valor', { texto: String(Object.keys(distintos).length) }))
    ));

    caixa.appendChild(h('div.bloco', null,
      h('h2.bloco__titulo', { texto: 'Sobre esta seção' }),
      h('p.miudo', { texto: 'Esta seção lê o que está registrado, para organizar a agenda ' +
        '— não para comparar profissionais. O painel não cria ranking, nem nota, nem ' +
        'ordenação por produtividade: o salão não pediu isso, e uma lista de "quem rende ' +
        'mais" não ajudaria a marcar o próximo horário.' })
    ));
  }

  /* ---------------------------------------------------------------------
     CADASTRO (§11) — DADOS · FUNÇÃO · SERVIÇOS · CAPACIDADE · HORÁRIO · STATUS
     --------------------------------------------------------------------- */
  /* `salvarProfissional` sobrescreve TODOS os campos que recebe, então mandar
     o pacote inteiro — mudando só o que o formulário mexeu — é o que preserva
     o resto. O núcleo já cuida de manter `capacidadePorServico` quando ela não
     vem no pacote. */
  function pacoteDoPosto(p, mudancas) {
    var base = {
      id: p.id,
      nome: p.nome,
      funcao: p.funcao,
      capacidade: p.capacidade,
      dias: (p.dias || []).slice(),
      entrada: p.entrada,
      saida: p.saida,
      intervaloInicio: p.intervaloInicio,
      intervaloFim: p.intervaloFim,
      servicos: (p.servicos || []).slice(),
      ativo: p.ativo !== false
    };
    Object.keys(mudancas || {}).forEach(function (k) { base[k] = mudancas[k]; });
    return base;
  }

  function abrirCadastro(p) {
    var novo = !p;
    var proximoNumero = N.dados.profissionais.length + 1;
    var sugestao = 'Profissional ' + (proximoNumero < 10 ? '0' : '') + proximoNumero;

    var campoNome = U.campo({
      tipo: 'text', rotulo: 'Nome do posto', max: 40,
      valor: novo ? '' : p.nome, placeholder: sugestao,
      dica: 'Os materiais do salão não trazem os nomes da equipe. Deixe em branco para ' +
        'usar o número do posto — nenhum nome de pessoa é inventado pelo sistema.'
    });
    var campoFuncao = U.campo({
      tipo: 'text', rotulo: 'Função', max: 40,
      valor: novo ? '' : (p.funcao || ''), placeholder: 'Cabeleireira'
    });
    var campoCap = U.campo({
      tipo: 'number', rotulo: 'Capacidade simultânea', min: 1,
      valor: novo ? '1' : String(p.capacidade),
      dica: 'Quantas clientes ela acompanha ao mesmo tempo.'
    });
    var campoEntrada = U.campo({ tipo: 'time', rotulo: 'Entra', valor: novo ? '09:00' : p.entrada });
    var campoSaida = U.campo({ tipo: 'time', rotulo: 'Sai', valor: novo ? '18:00' : p.saida });
    var campoPausaIni = U.campo({ tipo: 'time', rotulo: 'Pausa de',
      valor: novo ? '12:00' : (p.intervaloInicio || '') });
    var campoPausaFim = U.campo({ tipo: 'time', rotulo: 'Pausa até',
      valor: novo ? '13:00' : (p.intervaloFim || '') });
    var campoAtivo = U.campo({
      tipo: 'interruptor', rotulo: 'Posto ativo', valor: novo ? true : p.ativo !== false,
      textoInterruptor: 'Pode receber agendamento'
    });

    /* Sábado entra ligado, domingo não — o salão fecha domingo. Nada de
       "escolher por ela" além disso. */
    var escolhidos = novo ? [1, 2, 3, 4, 5, 6] : (p.dias || []).slice();
    var gradeDias = h('div.opcoes-dias');
    function pintarDias() {
      U.limpar(gradeDias);
      D.DIAS_CURTO.forEach(function (nome, i) {
        if (i === 0) return;
        var ativo = escolhidos.indexOf(i) !== -1;
        gradeDias.appendChild(h('button.opcao-dia' + (ativo ? '.opcao-dia--on' : ''), {
          type: 'button', texto: nome,
          'aria-pressed': ativo ? 'true' : 'false',
          ao: {
            click: function () {
              var k = escolhidos.indexOf(i);
              if (k === -1) escolhidos.push(i); else escolhidos.splice(k, 1);
              pintarDias();
            }
          }
        }));
      });
    }
    pintarDias();

    /* Serviços: caixas de seleção, NENHUMA pré-marcada no cadastro novo (§4).
       A ordem é a do catálogo, estável — não embaralhada. */
    var gradeServicos = h('div.grade-opcoes');
    servicosAtivos().forEach(function (s) {
      var marcado = !novo && (p.servicos || []).indexOf(s.id) !== -1;
      gradeServicos.appendChild(h('div.opcao-servico', { dados: { servico: s.id } },
        U.caixaSelecao({ texto: s.nome, marcado: marcado, rotulo: s.nome }),
        h('span.opcao-servico__sub', { texto: N.duracaoLegivel(s.duracao) })
      ));
    });

    /* O rodapé do modal é montado AQUI, não depois: `U.modal` só o desenha
       quando recebe ações (ver `if (opcoes.acoes && opcoes.acoes.length)`
       em componentes.js). Preencher `m.rodape` por fora deixaria o
       formulário sem botão nenhum. Os botões são criados antes do modal e
       só LEEM `m` dentro do clique — que acontece muito depois da
       atribuição. É a mesma ordem que `U.confirmar` usa. */
    var m, botaoCancelar, botaoSalvar;

    botaoCancelar = h('button.btn.btn--secundario', {
      type: 'button', texto: 'Cancelar',
      ao: { click: function () { m.fechar(); } }
    });

    botaoSalvar = h('button.btn.btn--principal', {
      type: 'button', texto: novo ? 'Cadastrar posto' : 'Salvar alterações',
      ao: {
        click: function () {
          var nome = campoNome.valor().trim();
          var cap = parseInt(campoCap.valor(), 10);
          campoNome.marcarErro(null);
          campoCap.marcarErro(null);
          if (nome && nome.length < 3) {
            campoNome.marcarErro('Escreva pelo menos 3 letras, ou deixe em branco.');
            return;
          }
          if (!cap || cap < 1 || cap > 30) {
            campoCap.marcarErro('Informe um número de 1 a 30.');
            return;
          }
          if (!escolhidos.length) {
            U.toast('Marque ao menos um dia de trabalho.', 'alerta');
            return;
          }
          var entrada = campoEntrada.valor(), saida = campoSaida.valor();
          if (!entrada || !saida || N.minutosDe(saida) <= N.minutosDe(entrada)) {
            U.toast('O horário de saída precisa ser depois do de entrada.', 'alerta');
            return;
          }
          var pIni = campoPausaIni.valor(), pFim = campoPausaFim.valor();
          if ((pIni && !pFim) || (!pIni && pFim)) {
            U.toast('Preencha os dois lados da pausa, ou nenhum.', 'alerta');
            return;
          }
          var servicos = [];
          Array.prototype.forEach.call(gradeServicos.querySelectorAll('.opcao-servico'),
            function (el) {
              var cx = el.querySelector('input');
              if (cx && cx.checked) servicos.push(el.dataset.servico);
            });

          var r = N.salvarProfissional({
            id: novo ? null : p.id,
            nome: nome || null,
            /* No cadastro novo, sigla e número saem do núcleo. Numa edição,
               a sigla existente é preservada. */
            curto: novo ? null : p.curto,
            funcao: campoFuncao.valor().trim() || 'Profissional',
            capacidade: cap,
            dias: escolhidos.slice(),
            entrada: entrada, saida: saida,
            intervaloInicio: pIni || null, intervaloFim: pFim || null,
            servicos: servicos,
            ativo: campoAtivo.valor()
          });
          if (!r.ok) { U.toast(r.mensagem, 'erro'); return; }
          m.fechar();
          U.toast(r.mensagem, 'sucesso');
          if (novo) {
            /* Leva direto para o posto recém-criado: cadastrar e não ver o
               resultado é o tipo de beco sem saída que o pedido proíbe. */
            var criado = N.dados.profissionais[N.dados.profissionais.length - 1];
            N.roteador.ir('#/equipe/' + criado.id);
          }
          window.EH_APP.redesenhar();
        }
      }
    }, U.svg('checar'));

    m = U.modal({
      titulo: novo ? 'Nova profissional' : 'Editar ' + p.nome,
      texto: novo
        ? 'O posto entra na agenda imediatamente. Este cadastro vive só nesta sessão do ' +
          'navegador — é uma demonstração.'
        : 'Alterações valem para os próximos agendamentos; o que já está marcado não é remexido.',
      largo: true,
      acoes: [botaoCancelar, botaoSalvar],
      corpo: h('div', null,
        h('div.bloco', null,
          h('h4.bloco__titulo', { texto: 'Dados' }),
          h('div.campo-duplo', null, campoNome.el, campoFuncao.el)
        ),
        h('div.bloco', null,
          h('h4.bloco__titulo', { texto: 'Função, capacidade e horário' }),
          h('div.campo-par', null, campoCap.el, campoEntrada.el, campoSaida.el),
          h('div.campo-par', { estilo: { marginTop: 'var(--e3)' } },
            campoPausaIni.el, campoPausaFim.el),
          h('div', { estilo: { marginTop: 'var(--e4)' } },
            U.rotulo('Dias que trabalha'), gradeDias)
        ),
        h('div.bloco', null,
          h('h4.bloco__titulo', { texto: 'Serviços que esta profissional realiza' }),
          h('p.miudo', { texto: 'Nenhum serviço vem marcado por padrão: quem marca é você. ' +
            'Com a lista vazia, o posto realiza todos os serviços ativos.' }),
          gradeServicos
        ),
        h('div.bloco', null,
          h('h4.bloco__titulo', { texto: 'Status' }),
          campoAtivo.el
        ),
        h('div.bloco', null,
          h('h4.bloco__titulo', { texto: 'Capacidade por serviço' }),
          h('p.miudo', { texto: 'A estrutura existe no sistema, mas esta tela não pede os ' +
            'números: o salão ainda não informou quanto cada serviço reduz a capacidade, e ' +
            'o painel não inventa esse valor. Enquanto não houver número, vale o teto geral.' }))
      )
    });

    return m;
  }

  /* Expõe o cadastro para quem quiser abrir de fora — a seção Equipe das
     Configurações aponta para cá em vez de manter uma segunda lista. */
  window.EQUIPE = {
    abrirCadastro: abrirCadastro,
    abrirPosto: function (id) { N.roteador.ir('#/equipe/' + id); }
  };
})();
