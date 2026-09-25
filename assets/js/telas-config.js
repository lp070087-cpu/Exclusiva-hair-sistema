/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · telas-config.js

   Configurações do painel, em abas.

   TRÊS REGRAS QUE ESTA TELA NÃO QUEBRA:
   1. O horário de funcionamento que aparece aqui é de EXEMPLO, marcado como
      tal. O salão não informou o horário oficial — nenhum horário foi
      apresentado como se fosse o real.
   2. Telefone, e-mail e demais dados do salão que não constam nos materiais
      aparecem como "não informado", prontos para a cliente preencher.
   3. NENHUM controle aqui é decorativo. Cada interruptor, chip e campo grava
      uma chave que alguma outra tela lê. Configuração que não muda nada é
      pior do que configuração ausente: promete um controle que não existe.
      Onde o efeito só se aplica adiante (um agendamento que ainda vai ser
      criado, por exemplo), o bloco diz isso com todas as letras.

   As seis seções seguem a divisão pedida pela cliente — SALÃO, HORÁRIOS,
   AGENDAMENTO, SERVIÇOS, FINANCEIRO, NOTIFICAÇÕES — e não a divisão interna
   do código. "Funcionamento" e "Agendamento on-line" moram juntos porque são
   o mesmo assunto: quando o salão abre e o que o site pode oferecer nesse
   intervalo. Equipe e Sobre ficam com Salão, pelo mesmo motivo.
   ========================================================================== */
(function () {
  'use strict';

  var N = window.EHN;
  var U = window.UI;
  var D = window.EH;
  var h = U.h;
  var TELAS = (window.TELAS = window.TELAS || {});

  var ABA = 'salao';

  var ABAS = [
    { id: 'salao',      nome: 'Salão' },
    { id: 'horarios',   nome: 'Horários' },
    { id: 'agendamento', nome: 'Agendamento' },
    { id: 'servicos',   nome: 'Serviços' },
    { id: 'financeiro', nome: 'Financeiro' },
    { id: 'avisos',     nome: 'Notificações' }
  ];

  /* Linha de dado que ainda não existe: mostra o convite em vez de um vazio. */
  function naoInformado(campo) {
    return h('span.nao-informado', { texto: 'não informado · ' + campo });
  }

  TELAS.config = {
    titulo: 'Configurações',
    aoAbrir: function () {},
    montar: function () {
      var caixa = h('div');
      /* `cnf-corpo` é uma grade de 1 coluna: em monitor grande ela reparte as
         seções em duas, mas cada seção mantém a largura de leitura. Quem
         limita é o CONTEÚDO, nunca a página. */
      var corpo = h('div.cnf-corpo');

      caixa.appendChild(h('div.cabecalho', null,
        h('div.cabecalho__texto', null,
          h('h1.titulo-tela', { texto: 'Configurações' }),
          h('div.cabecalho__contexto', null,
            h('span', { texto: 'Ajustes do painel' }),
            U.marcaDemo('alterações só nesta sessão')
          )
        )
      ));

      caixa.appendChild(U.abas(ABAS, ABA, function (id) {
        ABA = id; desenharAbas(); montarCorpo();
      }, 'Seções das configurações'));

      var areaAbas = caixa.lastChild;
      caixa.appendChild(corpo);

      function desenharAbas() {
        var novo = U.abas(ABAS, ABA, function (id) {
          ABA = id; desenharAbas(); montarCorpo();
        }, 'Seções das configurações');
        areaAbas.parentNode.replaceChild(novo, areaAbas);
        areaAbas = novo;
      }

      function montarCorpo() {
        U.limpar(corpo);
        if (ABA === 'horarios') return abaHorarios();
        if (ABA === 'agendamento') return abaAgendamento();
        if (ABA === 'servicos') return abaServicos();
        if (ABA === 'financeiro') return abaFinanceiro();
        if (ABA === 'avisos') return abaAvisos();
        return abaSalao();
      }

      /* =================================================================
         SALÃO
         ================================================================= */
      function abaSalao() {
        var c = N.dados.config;

        /* Só o NOME é lido pelo resto do painel — ele escreve o trilho, a
           tela de entrada e o título da aba. Os outros quatro campos são o
           rascunho do cadastro da cliente: ficam guardados, prontos para
           quando houver onde usá-los, e o bloco abaixo diz isso em vez de
           deixar parecer que já valem em algum lugar. */
        var campoNome = U.campo({ tipo: 'text', rotulo: 'Nome do salão', valor: c.nome, max: 60,
          dica: 'Este nome passa a valer no trilho, na tela de entrada e no título da aba.' });
        var campoCidade = U.campo({ tipo: 'text', rotulo: 'Cidade', valor: c.cidade, max: 60,
          dica: 'Ainda não é exibida em nenhuma tela do painel.' });
        var campoInsta = U.campo({ tipo: 'text', rotulo: 'Instagram', valor: c.instagram, max: 40,
          placeholder: '@perfil', dica: 'Guardado para uso futuro.' });
        var campoTelefone = U.campo({ tipo: 'tel', rotulo: 'Telefone de contato',
          valor: c.telefone, placeholder: '(00) 00000-0000',
          dica: 'Não aparece nos materiais do salão — deixe em branco se preferir não informar.' });
        var campoEmail = U.campo({ tipo: 'email', rotulo: 'E-mail de contato',
          valor: c.email, placeholder: 'contato@exemplo.com',
          dica: 'Também não consta nos materiais.' });

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Identidade do salão' }),
          h('p.miudo', { texto: 'O nome vale imediatamente nas três marcas do painel. Os demais ' +
            'campos ficam guardados para o cadastro da cliente — nenhum deles é usado em outra ' +
            'tela ainda, e o painel não finge o contrário.' }),
          h('div.campo-duplo', null, campoNome.el, campoCidade.el),
          h('div.campo-duplo', { estilo: { marginTop: 'var(--e4)' } }, campoInsta.el, campoTelefone.el),
          h('div', { estilo: { marginTop: 'var(--e4)' } }, campoEmail.el)
        ));

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Dados que o salão ainda não informou' }),
          h('p.miudo', { texto: 'Esta demonstração não inventa telefone, e-mail nem endereço. ' +
            'O que não foi informado fica visivelmente em branco, esperando a cliente.' }),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Telefone' }),
            c.telefone ? h('span.linha-dado__valor', { texto: c.telefone }) : naoInformado('preencher')),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'E-mail' }),
            c.email ? h('span.linha-dado__valor', { texto: c.email }) : naoInformado('preencher')),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Endereço' }),
            naoInformado('não consta nos materiais')),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Preços dos serviços' }),
            h('span.traco', { texto: 'Consultar' }))
        ));

        corpo.appendChild(h('div.bloco', null,
          botaoSalvar(function () {
            var r = N.salvarConfig({
              nome: campoNome.valor().trim() || c.nome,
              cidade: campoCidade.valor().trim() || c.cidade,
              instagram: campoInsta.valor().trim(),
              telefone: campoTelefone.valor().trim(),
              email: campoEmail.valor().trim()
            });
            return r;
          })
        ));

        /* Equipe e "sobre o sistema" pertencem a esta seção: são ajustes do
           salão, não do funcionamento nem do dinheiro. */
        blocoEquipe();
        blocoSistema();
      }

      /* =================================================================
         SERVIÇOS — o mesmo catálogo da tela Serviços, visto de fora
         ================================================================= */
      function abaServicos() {
        var ativos = N.dados.servicos.filter(function (s) { return s.ativo; });
        var online = N.dados.servicos.filter(function (s) { return s.ativo && s.online; });
        var semPreco = N.dados.servicos.filter(function (s) { return s.preco == null; });

        corpo.appendChild(U.avisoDemo(
          'Nenhum preço é inventado aqui. O catálogo tem ' + D.SERVICOS.length +
          ' serviços e nenhum deles tem preço cadastrado pela cliente — por isso a coluna ' +
          'de valor aparece como "Consultar" em todo o painel.', false));

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Resumo do catálogo' }),
          h('div.mini-numeros', null,
            h('div.mini-numero', null,
              h('span.mini-numero__valor', { texto: String(N.dados.servicos.length) }),
              h('span.mini-numero__rotulo', { texto: 'cadastrados' })),
            h('div.mini-numero', null,
              h('span.mini-numero__valor', { texto: String(ativos.length) }),
              h('span.mini-numero__rotulo', { texto: 'ativos' })),
            h('div.mini-numero', null,
              h('span.mini-numero__valor', { texto: String(online.length) }),
              h('span.mini-numero__rotulo', { texto: 'no site' })),
            h('div.mini-numero', null,
              h('span.mini-numero__valor', { texto: String(semPreco.length) }),
              h('span.mini-numero__rotulo', { texto: 'sem preço cadastrado' })))
        ));

        /* --- o interruptor do catálogo: atalho para o que se decide na tela
               de Serviços. É o MESMO dado — não existe cópia paralela, por
               isso mexer aqui e mexer lá dá o mesmo resultado. --- */
        var bloco = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Publicação no site' }),
          h('p.miudo', { texto: 'Ligar aqui publica o serviço na agenda on-line. ' +
            'Duração, categoria e descrição continuam sendo editadas na tela Serviços.' })
        );
        N.dados.servicos.forEach(function (s) {
          bloco.appendChild(h('label.linha-opcao.linha-opcao--clicavel', null,
            U.svg('tesoura'),
            h('span.linha-opcao__texto', null,
              h('span', { texto: s.nome }),
              h('span.miudo', { estilo: { display: 'block' },
                texto: N.duracaoLegivel(s.duracao) + ' · ' +
                  (s.preco == null ? 'Consultar' : N.moeda(s.preco)) })),
            s.ativo ? U.interruptor({
              ligado: s.online, texto: '', rotulo: 'Publicar ' + s.nome + ' no site',
              aoMudar: function (v) {
                /* Usa o MESMO alternador da tela Serviços — não há caminho
                   paralelo para o mesmo dado. O interruptor já mudou de
                   estado; a função inverte o dado e o store avisa as telas. */
                var r = N.alternarOnlineServico(s.id);
                if (r && r.ok) U.toast(r.mensagem, v ? 'sucesso' : 'info');
              }
            }).el : U.marcaDemo('inativo')
          ));
        });
        corpo.appendChild(bloco);

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Categorias' }),
          h('div.chips-lista', null, D.CATEGORIAS.map(function (c2) {
            var n = N.dados.servicos.filter(function (s) { return s.categoria === c2.id; }).length;
            /* Chip SEM interação: é rótulo com contagem, não filtro. Por isso
               não vai `aoClicar` — o componente trata a ausência de handler
               como chip não-clicável, e um chip que não faz nada ao ser
               apertado seria pior do que um rótulo. */
            return U.chip(c2.nome, false, null, { contador: n });
          }))
        ));

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Preços' }),
          h('p.miudo', { texto: 'A tabela de preços não veio nos materiais do salão. ' +
            'Cadastrar o valor de cada serviço é o que liga os números do Financeiro: ' +
            'enquanto um atendimento terminar sem valor lançado, ele conta nas horas e ' +
            'não conta em reais.' }),
          h('button.btn.btn--secundario', {
            type: 'button', texto: 'Abrir catálogo de serviços',
            ao: { click: function () { window.EH_APP.irPara('#/servicos'); } }
          }, U.svg('tesoura'))
        ));
      }

      /* =================================================================
         FINANCEIRO — três ajustes, os três ligados a comportamento real
         ================================================================= */
      function abaFinanceiro() {
        var c = N.dados.config;
        var formas = D.DEMO.formasPagamento || [];

        corpo.appendChild(U.avisoDemo(
          'Nada é cobrado de verdade nesta demonstração: não há gateway, maquininha nem ' +
          'banco ligados. O que estes ajustes mudam é o comportamento do painel.', false));

        /* --- quais formas aparecem na finalização --- */
        var ativas = c.formasAtivas && c.formasAtivas.length
          ? c.formasAtivas.slice()
          : formas.map(function (f) { return f.id; });

        var blocoFormas = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Formas de pagamento aceitas' }),
          h('p.miudo', { texto: 'Desligar uma forma tira o botão dela da tela de finalizar. ' +
            'Atendimentos já lançados com ela continuam mostrando a forma registrada — ' +
            'o que já aconteceu não se apaga.' })
        );
        formas.forEach(function (f) {
          blocoFormas.appendChild(h('label.linha-opcao.linha-opcao--clicavel', null,
            U.svg('dinheiro'),
            h('span.linha-opcao__texto', { texto: f.nome }),
            U.interruptor({
              ligado: ativas.indexOf(f.id) !== -1,
              texto: '', rotulo: 'Aceitar ' + f.nome,
              aoMudar: function (v) {
                var proximo = ativas.filter(function (id) { return id !== f.id; });
                if (v) proximo.push(f.id);
                /* Ordem canônica: a lista é reconstruída na ordem de
                   `formasPagamento`, senão o chip escolhido mudaria de lugar
                   só por ter sido desligado e religado. */
                proximo = formas.map(function (x) { return x.id; })
                  .filter(function (id) { return proximo.indexOf(id) !== -1; });
                if (!proximo.length) {
                  U.toast('Pelo menos uma forma precisa ficar ligada — sem nenhuma, ' +
                    'não haveria como lançar um pagamento.', 'alerta');
                  desenharAbas(); montarCorpo();
                  return;
                }
                ativas = proximo;
                var r = N.salvarConfig({ formasAtivas: proximo });
                if (r && r.ok) U.toast('Formas de pagamento atualizadas.', 'sucesso');
              }
            }).el
          ));
        });
        corpo.appendChild(blocoFormas);

        /* --- teto de desconto --- */
        var campoDesconto = U.campo({
          tipo: 'selecao', rotulo: 'Teto de desconto',
          valor: String(c.descontoMaximo || 0),
          opcoes: [0, 5, 10, 15, 20, 30, 50].map(function (p) {
            return { valor: String(p), nome: p === 0 ? 'Sem teto' : 'até ' + p + '%' };
          }),
          dica: 'Porcentagem máxima sobre o valor cobrado. Zero libera o desconto por completo.'
        });
        var campoExigir = U.campo({
          tipo: 'selecao', rotulo: 'Ao concluir sem valor',
          valor: c.exigirValorFinalizacao ? 'exigir' : 'permitir',
          opcoes: [
            { valor: 'permitir', nome: 'Permitir concluir sem valor' },
            { valor: 'exigir', nome: 'Exigir o valor para concluir' }
          ],
          dica: 'Como a tabela de preços ainda não foi cadastrada, o padrão é permitir.'
        });

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Desconto e valor na finalização' }),
          h('p.miudo', { texto: 'Estes dois ajustes são lidos pelo diálogo de finalizar atendimento. ' +
            'O teto recusa um desconto acima do combinado; a exigência recusa concluir sem valor.' }),
          h('div.campo-duplo', { estilo: { marginTop: 'var(--e3)' } },
            campoDesconto.el, campoExigir.el)
        ));

        corpo.appendChild(h('div.bloco', null,
          botaoSalvar(function () {
            return N.salvarConfig({
              descontoMaximo: parseInt(campoDesconto.valor(), 10) || 0,
              exigirValorFinalizacao: campoExigir.valor() === 'exigir'
            });
          }, 'Salvar ajustes financeiros')
        ));

        /* --- o retrato do caixa agora, para o ajuste não ser às cegas --- */
        var r = N.resumoFinanceiro(N.dados.agendamentos);
        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'O caixa agora' }),
          h('p.miudo', { texto: 'Números demonstrativos, calculados só a partir dos ' +
            'atendimentos que realmente têm valor lançado.' }),
          h('div.mini-numeros', null,
            h('div.mini-numero', null,
              h('span.mini-numero__valor', { texto: String(r.comValor) }),
              h('span.mini-numero__rotulo', { texto: 'com valor' })),
            h('div.mini-numero', null,
              h('span.mini-numero__valor', { texto: String(r.semValor) }),
              h('span.mini-numero__rotulo', { texto: 'sem valor' })),
            h('div.mini-numero', null,
              h('span.mini-numero__valor', {
                texto: r.ticketMedio == null ? '—' : N.moeda(r.ticketMedio) }),
              h('span.mini-numero__rotulo', { texto: 'ticket médio' }))),
          h('button.btn.btn--secundario', {
            type: 'button', texto: 'Abrir o Financeiro',
            ao: { click: function () { window.EH_APP.irPara('#/financeiro'); } }
          }, U.svg('dinheiro'))
        ));
      }

      /* =================================================================
         FUNCIONAMENTO
         ================================================================= */
      function abaHorarios() {
        corpo.appendChild(U.avisoDemo(
          'O horário abaixo é um EXEMPLO de grade, criado para a demonstração funcionar. ' +
          'O salão não informou o horário oficial — ajuste os campos antes de usar de verdade. ' +
          'Enquanto estiver como está, isto NÃO é o horário da Exclusiva Hair.', false));

        var rascunho = N.dados.funcionamento.map(function (f) {
          return {
            dia: f.dia, nome: f.nome, aberto: f.aberto,
            inicio: f.inicio, fim: f.fim,
            intervaloInicio: f.intervaloInicio, intervaloFim: f.intervaloFim, exemplo: true
          };
        });

        var linhas = h('div.horarios');
        rascunho.forEach(function (f, indice) {
          var campoInicio = U.campo({ tipo: 'time', rotulo: 'Abre', valor: f.inicio, nome: 'abre-' + f.dia });
          var campoFim = U.campo({ tipo: 'time', rotulo: 'Fecha', valor: f.fim, nome: 'fecha-' + f.dia });
          var campoIntIni = U.campo({ tipo: 'time', rotulo: 'Pausa de', valor: f.intervaloInicio, nome: 'pini-' + f.dia });
          var campoIntFim = U.campo({ tipo: 'time', rotulo: 'Pausa até', valor: f.intervaloFim, nome: 'pfim-' + f.dia });

          var blocoCampos = h('div.horario__campos', null,
            campoInicio.el, campoFim.el,
            h('div.horario__pausa', null, campoIntIni.el, campoIntFim.el));

          var inter = U.interruptor({
            ligado: f.aberto,
            rotulo: 'Abrir ' + f.nome,
            texto: 'Aberto',
            aoMudar: function (ligado) {
              rascunho[indice].aberto = ligado;
              blocoCampos.hidden = !ligado;
            }
          });
          blocoCampos.hidden = !f.aberto;

          linhas.appendChild(h('div.horario', null,
            h('div.horario__dia', null,
              h('span.horario__nome', { texto: f.nome }),
              f.exemplo ? U.marcaDemo('exemplo') : null
            ),
            inter.el,
            blocoCampos,
            h('span.miudo.horario__resumo', {
              texto: f.aberto
                ? 'Grade de exemplo: ' + f.inicio + '–' + f.fim + ' com pausa ' +
                  f.intervaloInicio + '–' + f.intervaloFim
                : 'Fechado'
            })
          ));
        });
        /* Largo: são quatro campos por dia da semana — ao meio ficariam
           espremidos. A seção toma a linha inteira da grade. */
        corpo.appendChild(h('div.bloco.bloco--largo', null,
          h('h2.bloco__titulo', { texto: 'Dias e horários' }),
          h('p.miudo', { texto: 'A pausa existe para o almoço — nenhum horário é oferecido dentro dela.' }),
          linhas
        ));

        /* --- o que a grade diz, lido de volta da fonte --- */
        var abre = N.dados.funcionamento.filter(function (f) { return f.aberto; });
        var resumoGrade = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Semana configurada' }),
          h('p.miudo', { texto: abre.length
            ? 'A grade abre ' + abre.length + (abre.length === 1 ? ' dia' : ' dias') +
              ' por semana, de ' + abre[0].nome + ' a ' + abre[abre.length - 1].nome + '.'
            : 'Nenhum dia aberto — a agenda apareceria fechada a semana inteira.' })
        );
        N.dados.funcionamento.forEach(function (f) {
          var horas = f.aberto
            ? (D.minutosDe(f.fim) - D.minutosDe(f.inicio)) -
              Math.max(0, D.minutosDe(f.intervaloFim) - D.minutosDe(f.intervaloInicio))
            : 0;
          resumoGrade.appendChild(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: f.nome }),
            f.aberto
              ? h('span.linha-dado__valor', { texto: f.inicio + '–' + f.fim + ' · ' +
                  N.duracaoLegivel(horas) + ' de agenda' })
              : h('span.miudo', { texto: 'fechado' })));
        });
        corpo.appendChild(resumoGrade);

        /* --- o efeito do ajuste, medido na hora --- */
        var efeito = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Efeito na agenda' }));
        corpo.appendChild(efeito);

        function atualizarEfeito() {
          U.limpar(efeito);
          var hoje = D.chaveDe(new Date());
          var r = N.resumoDoDia(hoje, N.dados.agendamentos, N.dados.bloqueios);
          efeito.appendChild(h('h2.bloco__titulo', { texto: 'Efeito na agenda' }));
          var lista = h('div');
          r.config && r.config.aberto
            ? lista.appendChild(h('p.miudo', { texto: 'No recorte atual a grade abre às ' +
                r.config.inicio + ' e fecha às ' + r.config.fim + '.' }))
            : lista.appendChild(h('p.miudo', { texto: 'No recorte atual o salão aparece fechado hoje.' }));
          lista.appendChild(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Horários que a grade oferece hoje' }),
            h('span.linha-dado__valor', {
              texto: String(N.horariosDisponiveis({ duracao: 30 }, hoje, N.dados.agendamentos, N.dados.bloqueios).length) })));
          efeito.appendChild(lista);
        }
        atualizarEfeito();

        corpo.appendChild(h('div.bloco', null,
          botaoSalvar(function () {
            var campoDe = {};
            linhas.querySelectorAll('.campo').forEach(function (c) {
              var nome = c.dataset.campo || '';
              if (!nome) return;
              var input = c.querySelector('input');
              if (input) campoDe[nome] = input.value;
            });
            rascunho.forEach(function (f) {
              if (campoDe['abre-' + f.dia]) f.inicio = campoDe['abre-' + f.dia];
              if (campoDe['fecha-' + f.dia]) f.fim = campoDe['fecha-' + f.dia];
              if (campoDe['pini-' + f.dia]) f.intervaloInicio = campoDe['pini-' + f.dia];
              if (campoDe['pfim-' + f.dia]) f.intervaloFim = campoDe['pfim-' + f.dia];
            });
            var invalido = rascunho.filter(function (f) {
              return f.aberto && (!(f.inicio < f.fim));
            });
            if (invalido.length) {
              U.toast('A hora de fechar precisa ser depois da hora de abrir em ' +
                invalido.map(function (f) { return f.nome; }).join(', ') + '.', 'alerta');
              return { ok: false };
            }
            var r = N.salvarFuncionamento(rascunho);
            atualizarEfeito();
            return r;
          }, 'Salvar horários', 'A grade demonstrativa da agenda inteira passa a usar estes horários. ' +
            'Nada é enviado para fora do navegador.')
        ));
      }

      /* =================================================================
         AGENDAMENTO — como o site se comporta e o que a agenda já tem
         ================================================================= */
      function abaAgendamento() {
        var c = N.dados.config;

        corpo.appendChild(U.avisoDemo(
          'Não existe site ligado nem servidor nesta demonstração: os interruptores abaixo ' +
          'mudam o comportamento do painel e nada mais.', false));

        var interOnline = U.interruptor({
          ligado: c.agendamentoOnline, texto: 'Aceitar agendamento pelo site',
          rotulo: 'Aceitar agendamento pelo site',
          aoMudar: function (v) { N.salvarConfig({ agendamentoOnline: v }); }
        });
        var interConfirma = U.interruptor({
          ligado: c.confirmacaoAutomatica, texto: 'Confirmar automaticamente',
          rotulo: 'Confirmar automaticamente os agendamentos recebidos',
          aoMudar: function (v) { N.salvarConfig({ confirmacaoAutomatica: v }); }
        });

        var campoAntecedencia = U.campo({
          tipo: 'selecao', rotulo: 'Antecedência mínima',
          valor: String(c.antecedenciaMinima),
          opcoes: [0, 30, 60, 120, 240, 720, 1440].map(function (min) {
            return { valor: String(min), nome: min === 0 ? 'Sem antecedência' : N.duracaoLegivel(min) + ' antes' };
          }),
          dica: 'Quanto tempo antes a cliente precisa marcar.'
        });
        var campoJanela = U.campo({
          tipo: 'selecao', rotulo: 'Janela de agendamento',
          valor: String(c.janelaMaxima),
          opcoes: [7, 15, 30, 45, 60, 90].map(function (d) {
            return { valor: String(d), nome: d + ' dias à frente' };
          }),
          dica: 'Até quando a agenda do site fica aberta.'
        });

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Como o site se comporta' }),
          h('div.linha-opcao', null, interOnline.el),
          h('div.linha-opcao', null, interConfirma.el),
          h('div.campo-duplo', { estilo: { marginTop: 'var(--e4)' } },
            campoAntecedencia.el, campoJanela.el)
        ));

        corpo.appendChild(h('div.bloco', null,
          botaoSalvar(function () {
            return N.salvarConfig({
              antecedenciaMinima: parseInt(campoAntecedencia.valor(), 10),
              janelaMaxima: parseInt(campoJanela.valor(), 10)
            });
          }, 'Salvar preferências')
        ));

        /* --- a janela, medida por dentro ---
           "45 dias à frente" é um número abstrato. Aqui ele vira a data em
           que o site para de aceitar marcação — o que a proprietária
           realmente quer saber quando escolhe esse número. */
        var limite = N.limiteDeAgendamento(new Date());
        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Onde a janela para hoje' }),
          h('p.miudo', { texto: 'Aplicando os ajustes salvos neste momento, sem ' +
            'inventar nada: é só a data de hoje mais a janela configurada.' }),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Última data que o site aceita' }),
            h('span.linha-dado__valor', { texto: N.rotuloDia(limite, new Date()) })),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Antecedência mínima' }),
            h('span.linha-dado__valor', { texto: c.antecedenciaMinima === 0
              ? 'Sem antecedência'
              : N.duracaoLegivel(c.antecedenciaMinima) + ' antes' }))
        ));

        /* --- o que o site oferece hoje --- */
        var servicosOnline = N.dados.servicos.filter(function (s) { return s.online && s.ativo; });
        var bloco = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Serviços visíveis no site' }),
          h('p.miudo', { texto: servicosOnline.length
            ? 'Estes serviços aparecem na agenda on-line. O ajuste é feito em Serviços, ' +
              'no interruptor de cada cartão.'
            : 'Nenhum serviço está publicado no site agora.' })
        );
        servicosOnline.forEach(function (s) {
          bloco.appendChild(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', null, U.svg('tesoura'), document.createTextNode(' ' + s.nome)),
            h('span.miudo', { texto: N.duracaoLegivel(s.duracao) + ' · Consultar' })));
        });
        if (servicosOnline.length) {
          bloco.appendChild(h('button.btn.btn--secundario', {
            type: 'button', texto: 'Abrir catálogo de serviços',
            ao: { click: function () { window.EH_APP.irPara('#/servicos'); } }
          }, U.svg('tesoura')));
        }
        corpo.appendChild(bloco);

        /* --- bloqueios recorrentes --- */
        var hoje = D.chaveDe(new Date());
        var proximos = [];
        for (var i = 0; i < 14; i += 1) {
          var k = D.chaveDe(new Date(new Date().getTime() + i * 864e5));
          /* `bloqueiosDoDia` recebe a LISTA e a chave — nunca a chave sozinha.
             A chamada com um argumento só estourava com "lista.filter is not
             a function" e derrubava a aba inteira. A lista é a do store, para
             o bloco refletir os bloqueios que existem agora. */
          N.bloqueiosDoDia(N.dados.bloqueios, k).forEach(function (b) {
            proximos.push({ chave: k, b: b });
          });
        }
        var blocoB = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Bloqueios nos próximos 14 dias' }),
          h('p.miudo', { texto: 'Almoço, evento, manutenção, compromisso ou indisponibilidade: ' +
            'o horário bloqueado nunca aparece livre — nem no site, nem no painel.' })
        );
        if (!proximos.length) {
          blocoB.appendChild(h('p.miudo', { texto: 'Nenhum bloqueio nos próximos 14 dias.' }));
        } else {
          proximos.slice(0, 12).forEach(function (x) {
            var motivo = D.MOTIVOS_BLOQUEIO.filter(function (m) { return m.id === x.b.motivo; })[0];
            blocoB.appendChild(h('div.linha-dado', null,
              h('span.linha-dado__rotulo', null,
                U.svg('bloquear'),
                document.createTextNode(' ' + (motivo ? motivo.nome : x.b.motivo) +
                  ' · ' + N.rotuloDia(x.chave, new Date()))),
              h('span.linha-dado__valor', { texto: N.intervalo(x.b.inicio, x.b.fim) })));
          });
        }
        blocoB.appendChild(h('button.btn.btn--secundario', {
          type: 'button', texto: 'Ver bloqueios na agenda',
          ao: { click: function () { window.EH_APP.irPara('#/agenda/' + hoje); } }
        }, U.svg('agenda')));
        corpo.appendChild(blocoB);
      }

      /* =================================================================
         NOTIFICAÇÕES
         ================================================================= */
      function abaAvisos() {
        var c = N.dados.config;
        corpo.appendChild(U.avisoDemo(
          'Nada é enviado de verdade: não há e-mail, SMS nem WhatsApp ligados nesta ' +
          'demonstração. Os interruptores ficam aqui para mostrar onde o aviso mora.', false));

        /* `efeito` diz o que o interruptor muda DE VERDADE. Os três primeiros
           silenciam o aviso na Central de avisos do painel — desligar um
           deles faz o aviso não nascer, e isso é medível. O quarto não tem
           onde acontecer: o resumo da manhã precisaria sair do navegador. */
        var opcoes = [
          { chave: 'notificarNovo', texto: 'Novo agendamento recebido', icone: 'calendario',
            efeito: 'Fora do ar, um agendamento vindo do site entra na agenda sem avisar.' },
          { chave: 'notificarCancelamento', texto: 'Cancelamento de horário', icone: 'x-circulo',
            efeito: 'Fora do ar, um cancelamento não gera aviso na central.' },
          { chave: 'notificarReagendamento', texto: 'Pedido de reagendamento', icone: 'setas',
            efeito: 'Fora do ar, um reagendamento não gera aviso na central.' },
          { chave: 'resumoDiario', texto: 'Resumo do dia pela manhã', icone: 'relogio',
            efeito: 'Ainda sem efeito: o resumo seria enviado por e-mail, e não há envio nesta etapa.' }
        ];

        var bloco = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Quando avisar' }),
          h('p.miudo', { texto: 'Os avisos são os da Central de avisos do painel. ' +
            'Nenhum sai do navegador.' })
        );
        opcoes.forEach(function (o) {
          var nota = h('span.miudo.linha-opcao__nota', {
            estilo: { display: 'none' }, texto: o.efeito
          });
          var linha = h('div.linha-opcao', null,
            U.svg(o.icone),
            h('span.linha-opcao__texto', null,
              h('span', { texto: o.texto }),
              nota),
            U.interruptor({
              ligado: c[o.chave], texto: '', rotulo: o.texto,
              aoMudar: function (v) {
                var parcial = {};
                parcial[o.chave] = v;
                N.salvarConfig(parcial);
                nota.style.display = '';
                U.toast(v ? 'Aviso ligado. ' + o.efeito : 'Aviso desligado. ' + o.efeito,
                  v ? 'info' : 'alerta');
              }
            }).el
          );
          bloco.appendChild(linha);
        });
        corpo.appendChild(bloco);

        /* --- canal --- */
        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Canal de envio' }),
          h('p.miudo', { texto: 'A definir com a cliente. Nenhum canal foi contratado nem ' +
            'simulado nesta demonstração.' }),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'E-mail' }), naoInformado('a definir')),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'WhatsApp' }), naoInformado('sem integração')),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'SMS' }), naoInformado('a definir'))
        ));

        /* --- a central de avisos --- */
        var nl = N.naoLidas();
        var blocoN = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Central de avisos do painel' }),
          h('p.miudo', { texto: nl.length
            ? nl.length + (nl.length === 1 ? ' aviso não lido.' : ' avisos não lidos.')
            : 'Todos os avisos lidos.' })
        );
        N.dados.notificacoes.slice(0, 5).forEach(function (n) {
          blocoN.appendChild(h('button.linha-dado.linha-dado--clicavel', {
            type: 'button',
            'aria-label': 'Abrir aviso: ' + n.titulo,
            ao: {
              click: function () {
                N.marcarNotificacaoLida(n.id);
                if (n.rota) window.EH_APP.irPara(n.rota);
              }
            }
          },
            h('span.linha-dado__rotulo', null,
              U.svg('sino'),
              document.createTextNode(' ' + n.titulo)),
            h('span.miudo', { texto: N.haQuanto(n.minutosAtras) + (n.lida ? '' : ' · novo') })
          ));
        });
        blocoN.appendChild(h('button.btn.btn--secundario', {
          type: 'button', texto: 'Marcar todos como lidos',
          ao: {
            click: function () {
              N.marcarTodasLidas();
              U.toast('Avisos marcados como lidos.', 'sucesso');
              window.EH_APP.redesenhar();
            }
          }
        }, U.svg('checar')));
        corpo.appendChild(blocoN);
      }

      /* =================================================================
         EQUIPE E ACESSO — mora dentro de SALÃO: é ajuste do salão, não do
         funcionamento. A seção começa com um cabeçalho próprio para o
         agrupamento continuar legível numa página que já tem seis abas.
         ================================================================= */
      function blocoEquipe() {
        var c = N.dados.config;
        corpo.appendChild(U.avisoDemo(
          'Não há login real: o acesso é demonstrativo e roda só no navegador. ' +
          'Os nomes da equipe não foram informados pelo salão, então os perfis são ' +
          'genéricos — nada de nome inventado.', false));

        /* ------------------------------------------------------------------
           ACESSO AO SISTEMA (§12)
           O §12 pede duas coisas que a lista antiga não dizia: QUAL perfil
           está em uso agora, e o que cada um pode. A lista de áreas da
           recepção sai de N.ROTAS — uma área nova entra aqui sozinha.
           ------------------------------------------------------------------ */
        var areas = N.ROTAS.map(function (r) { return r.rotulo; });
        /* A recepção atende: agenda, agendamentos e clientes. As demais
           áreas — dinheiro, equipe, relatórios, configurações — são da
           proprietária. Declarado, não verificado: ver a nota acima. */
        var DA_RECEPCAO = ['Agenda', 'Agendamentos', 'Clientes'];
        var soDaDona = areas.filter(function (a) { return DA_RECEPCAO.indexOf(a) === -1; });

        var sessoes = [
          {
            id: 'proprietaria', nome: 'Proprietária', atual: true,
            papel: 'Administradora do salão',
            pode: areas,
            nota: 'Enxerga todas as áreas, inclusive Financeiro, Equipe e Configurações.'
          },
          {
            id: 'recepcao', nome: 'Recepção', atual: false,
            papel: 'Atendimento',
            pode: DA_RECEPCAO,
            nota: 'Perfil previsto, ainda NÃO implementado: hoje não existe ' +
              'troca de perfil nem verificação de permissão no painel.'
          }
        ];

        var bloco = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Acesso ao sistema' }),
          h('p.miudo', { texto: 'Este é o painel da proprietária. A recepção é um perfil ' +
            'secundário, previsto para depois.' })
        );

        sessoes.forEach(function (u) {
          var cartao = h('div.acesso-perfil', {
            dados: { atual: u.atual ? 'sim' : 'nao' }
          },
            h('div.acesso-perfil__topo', null,
              h('span.avatar.avatar--x', { dados: { matiz: String(N.matizDe(u.nome)) },
                'aria-hidden': 'true', texto: N.iniciais(u.nome) }),
              h('span.acesso-perfil__identidade', null,
                h('span.linha-principal__nome', { texto: u.nome }),
                h('span.linha-principal__sub', { texto: u.papel })),
              u.atual
                ? h('span.selo.selo--atendimento', { texto: 'SESSÃO ATUAL' })
                : h('span.selo.selo--novo', { texto: 'PREVISTO' })
            ),
            h('p.miudo', { texto: u.nota }),
            h('div.acesso-perfil__areas', null,
              h('span.acesso-perfil__rotulo', { texto:
                u.atual ? 'Acesso administrativo a:' : 'Acesso limitado a:' }),
              h('span.acesso-perfil__chips', null, u.pode.map(function (a) {
                return h('span.chip.chip--area', { texto: a });
              }))
            ),
            u.atual && soDaDona.length
              ? h('p.miudo.acesso-perfil__exclusivo', { texto:
                  'Só a proprietária enxerga: ' + soDaDona.join(', ') + '.' })
              : null
          );
          bloco.appendChild(cartao);
        });
        corpo.appendChild(bloco);

        /* --- equipe do salão --- */
        var equipe = (N.dados.profissionais || []).filter(function (p) { return p.ativo !== false; });
        var blocoP = h('div.bloco', null,
          h('div.bloco__cabecalho', null,
            h('h2.bloco__titulo', { texto: 'Profissionais na agenda' }),
            h('button.btn.btn--pequeno.btn--secundario', {
              type: 'button', texto: 'Abrir Equipe',
              ao: { click: function () { window.EH_APP.irPara('#/equipe'); } }
            })
          ),
          h('p.miudo', { texto: 'Quem a agenda usa como responsável. Os nomes do salão não ' +
            'foram informados, então os postos são genéricos — nenhum nome foi inventado.' })
        );
        equipe.forEach(function (p) {
          blocoP.appendChild(h('div.linha-dado', null,
            h('span.linha-dado__rotulo', null, U.svg('usuario'),
              document.createTextNode(' ' + p.nome)),
            h('span.miudo', { texto: (p.capacidade || '—') + ' clientes ao mesmo tempo' })));
        });
        corpo.appendChild(blocoP);

        var blocoA = h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Acesso' }),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Login' }),
            h('span.miudo', { texto: 'demonstrativo — qualquer senha entra' })),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Recuperar senha' }),
            h('span.miudo', { texto: 'botão presente na tela, sem envio real' })),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Manter conectado' }),
            h('span.miudo', { texto: 'memória da sessão do navegador' }))
        );
        corpo.appendChild(blocoA);
      }

      /* =================================================================
         SOBRE O SISTEMA — também dentro de SALÃO, pelo mesmo motivo.
         ================================================================= */
      function blocoSistema() {
        corpo.appendChild(h('div.bloco.bloco--largo', null,
          h('h2.bloco__titulo', { texto: 'O que é esta tela' }),
          h('p', { texto: 'Esta é a apresentação navegável do painel de gestão da ' +
            'Exclusiva Hair. Todos os dados são demonstrativos e vivem apenas na memória ' +
            'do navegador: não há banco de dados, servidor, login real, pagamento ou ' +
            'integração externa nesta etapa.' }),
          h('p.miudo', { texto: 'O que existe de verdade aqui é o comportamento: a agenda ' +
            'reserva e libera horários, um bloqueio tira o horário do ar, cancelar devolve ' +
            'a vaga, e cada mudança de situação fica registrada no histórico.' })
        ));

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'O que veio dos materiais do salão' }),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Serviços' }),
            h('span.linha-dado__valor', { texto: N.dados.servicos.length + ' cadastrados' })),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Categorias' }),
            h('span.linha-dado__valor', { texto: D.CATEGORIAS.map(function (c2) {
              return c2.nome;
            }).join(' · ') })),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Cidade' }),
            h('span.linha-dado__valor', { texto: N.dados.config.cidade })),
          h('div.linha-dado', null,
            h('span.linha-dado__rotulo', { texto: 'Instagram' }),
            h('span.linha-dado__valor', { texto: N.dados.config.instagram })),
          h('p.miudo', { estilo: { marginTop: 'var(--e3)' },
            texto: 'Preços, telefone, e-mail, endereço e horário oficial não constavam nos ' +
              'materiais e por isso não foram preenchidos com estimativa.' })
        ));

        /* --- crédito Unitrix --- */
        corpo.appendChild(h('div.bloco.credito', null,
          h('div.credito__marca', null,
            h('span.credito__selo', null, U.svg('faisca')),
            h('div', null,
              h('p.credito__titulo', { texto: 'Desenvolvido pela Unitrix App' }),
              h('p.credito__linha', { texto: 'CNPJ 66.438.449/0001-44' }))),
          h('p.miudo', { texto: 'Painel demonstrativo. Sem CNPJ de terceiros, sem dado ' +
            'pessoal e sem informação fiscal nesta apresentação.' })
        ));

        corpo.appendChild(h('div.bloco', null,
          h('h2.bloco__titulo', { texto: 'Voltar ao começo' }),
          h('p.miudo', { texto: 'Você pode sair e entrar de novo para rever o primeiro acesso.' }),
          h('button.btn.btn--secundario', {
            type: 'button', texto: 'Sair da demonstração',
            ao: {
              click: function () {
                U.confirmar({
                  titulo: 'Sair da demonstração?',
                  texto: 'Nada é perdido além do que foi criado nesta sessão.',
                  ok: 'Sair',
                  aoConfirmar: function () { window.EH_APP.sair(); }
                });
              }
            }
          }, U.svg('sair'))
        ));
      }

      /* --- botão de salvar reaproveitado --- */
      function botaoSalvar(acao, textoBotao, nota) {
        return h('div', null,
          h('div.linha-opcao', null,
            h('button.btn.btn--principal', {
              type: 'button', texto: textoBotao || 'Salvar alterações',
              ao: {
                click: function () {
                  var r = acao();
                  if (r && r.ok) {
                    U.toast(r.mensagem || 'Configurações salvas.', 'sucesso');
                    window.EH_APP.redesenhar();
                  } else if (r && r.mensagem) U.toast(r.mensagem, 'erro');
                }
              }
            }, U.svg('checar'))
          ),
          h('p.miudo', { estilo: { marginTop: 'var(--e2)' }, texto: nota ||
            'As alterações valem só nesta sessão do navegador — não há servidor nesta demonstração.' })
        );
      }

      montarCorpo();
      return caixa;
    }
  };
})();
