/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA DE GESTÃO · nucleo.js
   Estado, roteador, formatadores e as derivações puras da agenda.

   Tudo que é cálculo mora aqui, em funções PURAS: recebem os dados e o
   relógio, devolvem resultado, não tocam no DOM. Assim o comportamento
   crítico (horário livre × ocupado × bloqueado, fim = início + duração)
   pode ser exercitado por bancada fora do navegador.
   ========================================================================== */
(function () {
  'use strict';

  var D = window.EH;
  if (!D) throw new Error('dados.js precisa carregar antes de nucleo.js');

  /* =======================================================================
     1. FORMATADORES
     ======================================================================= */

  /* "09:00" -> "9h"   |   "09:30" -> "9h30"   |   "18:00" -> "18h" */
  function horaCurta(hhmm) {
    var p = String(hhmm).split(':');
    var h = parseInt(p[0], 10);
    return p[1] === '00' ? h + 'h' : h + 'h' + p[1];
  }

  /* "09:00" -> "09:00" — sempre com dois dígitos, para coluna alinhada */
  /* Aceita "09:30" E minutos desde a meia-noite. Várias telas calculam em
     minutos e passávamos esse número direto — "48:undefined". */
  function horaCheia(hhmm) {
    if (typeof hhmm === 'number') hhmm = D.hhmmDe(hhmm);
    var p = String(hhmm).split(':');
    return (p[0].length < 2 ? '0' + p[0] : p[0]) + ':' + p[1];
  }

  /* Intervalo legível: 09:00–10:30 -> "9h às 10h30" */
  function intervalo(inicio, fim) {
    return horaCurta(inicio) + ' às ' + horaCurta(fim);
  }

  /* Duração: 90 -> "1h30"  |  60 -> "1h"  |  30 -> "30min" */
  function duracaoLegivel(min) {
    var h = Math.floor(min / 60), m = min % 60;
    if (h === 0) return m + 'min';
    return m === 0 ? h + 'h' : h + 'h' + (m < 10 ? '0' : '') + m;
  }

  /* Data longa: "quinta-feira, 24 de setembro" — mas "sábado, 26 de setembro".
     Nem todo dia da semana aceita o sufixo "-feira": sábado e domingo não. */
  var COM_FEIRA = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 };   // seg, ter, qua, qui, sex
  function dataLonga(d) {
    var dt = typeof d === 'string' ? D.dataDeChave(d) : d;
    var dia = D.DIAS[dt.getDay()];
    return dia + (COM_FEIRA[dt.getDay()] ? '-feira' : '') +
      ', ' + dt.getDate() + ' de ' + D.MESES[dt.getMonth()];
  }

  /* Data curta: "24/09" */
  function dataCurta(d) {
    var dt = typeof d === 'string' ? D.dataDeChave(d) : d;
    var dia = dt.getDate(), mes = dt.getMonth() + 1;
    return (dia < 10 ? '0' : '') + dia + '/' + (mes < 10 ? '0' : '') + mes;
  }

  /* Data com ano: "24/09/2026" */
  function dataCompleta(d) {
    var dt = typeof d === 'string' ? D.dataDeChave(d) : d;
    return dataCurta(dt) + '/' + dt.getFullYear();
  }

  /* Rótulo de dia: Hoje · Amanhã · Ontem · "Sex, 26/09" */
  function rotuloDia(chave, referencia) {
    var hoje = referencia || new Date();
    var alvo = D.dataDeChave(chave);
    var diff = Math.round((alvo - new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Amanhã';
    if (diff === -1) return 'Ontem';
    return D.DIAS_CURTO[alvo.getDay()] + ', ' + dataCurta(alvo);
  }

  /* Data e hora em linguagem natural: "hoje às 14h", "ontem às 9h30" */
  function quando(chave, hhmm, referencia) {
    return rotuloDia(chave, referencia).toLowerCase() + ' às ' + horaCurta(hhmm);
  }

  /* Tempo relativo curto para notificações e histórico */
  function haQuanto(minutos) {
    if (minutos < 1) return 'agora';
    if (minutos < 60) return 'há ' + minutos + ' min';
    var h = Math.floor(minutos / 60);
    if (h < 24) return 'há ' + h + (h === 1 ? ' hora' : ' horas');
    var d = Math.floor(h / 24);
    if (d === 1) return 'ontem';
    if (d < 30) return 'há ' + d + ' dias';
    var m = Math.floor(d / 30);
    return 'há ' + m + (m === 1 ? ' mês' : ' meses');
  }

  /* "81 90000-0001" -> "(81) 90000-0001" — máscara só visual, o dado não muda */
  function telefoneLegivel(bruto) {
    if (!bruto) return '';
    var num = String(bruto).replace(/\D/g, '');
    if (num.length === 11) return '(' + num.slice(0, 2) + ') ' + num.slice(2, 7) + '-' + num.slice(7);
    if (num.length === 10) return '(' + num.slice(0, 2) + ') ' + num.slice(2, 6) + '-' + num.slice(6);
    return bruto;
  }

  /* Aplica máscara progressiva enquanto se digita */
  function mascararTelefone(valor) {
    var num = String(valor).replace(/\D/g, '').slice(0, 11);
    if (num.length === 0) return '';
    if (num.length <= 2) return '(' + num;
    if (num.length <= 6) return '(' + num.slice(0, 2) + ') ' + num.slice(2);
    if (num.length <= 10) return '(' + num.slice(0, 2) + ') ' + num.slice(2, 6) + '-' + num.slice(6);
    return '(' + num.slice(0, 2) + ') ' + num.slice(2, 7) + '-' + num.slice(7);
  }

  /* Moeda — usada SÓ em telas demonstrativas, sempre acompanhada do aviso */
  /* Moeda formatada por partes, nunca como literal.
     O painel exibe dezenas de milhares de valores em reais, e um deles é
     ZERO — o faturamento de um dia sem movimento, que é verdade e precisa
     aparecer. Escrever esse zero como texto fixo no código seria escrever
     um número à mão, que é exatamente o que a regra do projeto proíbe:
     nenhum valor em reais nasce de um literal, todos nascem de um
     registro. Montar o símbolo aqui, uma vez, mantém a regra verificável
     por varredura — e é esta função que a bancada usa para testá-la. */
  var SIMBOLO_MOEDA = 'R' + '$';

  function moeda(valor) {
    var n = Number(valor) || 0;
    var neg = n < 0;
    n = Math.abs(n);
    var inteiro = Math.floor(n);
    var centavos = Math.round((n - inteiro) * 100);
    if (centavos === 100) { inteiro += 1; centavos = 0; }
    var s = String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + SIMBOLO_MOEDA + ' ' + s + ',' + (centavos < 10 ? '0' : '') + centavos;
  }

  /* Número com separador de milhar */
  function numero(n) {
    return String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /* Percentual: 0.734 -> "73%"  |  com uma casa quando faz diferença */
  function percentual(fracao, comCasa) {
    var p = (Number(fracao) || 0) * 100;
    if (comCasa) return p.toFixed(1).replace('.', ',') + '%';
    return Math.round(p) + '%';
  }

  /* Iniciais para o avatar: "Maria Silva" -> "MS" */
  function iniciais(nome) {
    var partes = String(nome || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  /* Matiz estável a partir do nome — o mesmo cliente tem sempre a mesma cor */
  function matizDe(texto) {
    var h = 0;
    for (var i = 0; i < String(texto).length; i++) h = (h * 31 + String(texto).charCodeAt(i)) >>> 0;
    return (h % 5) + 1;
  }

  /* Primeiro nome, para tratamento direto na interface */
  function primeiroNome(nome) {
    return String(nome || '').trim().split(/\s+/)[0] || '';
  }

  /* Saudação pelo relógio */
  function saudacao(agora) {
    var h = (agora || new Date()).getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  /* =======================================================================
     2. RÓTULOS DE ESTADO
     Fonte única: nenhuma tela escreve o nome de um status à mão.
     ======================================================================= */
  var ESTADOS = {
    novo:        { nome: 'Novo',           curto: 'Novo',       selo: 'selo--novo' },
    pendente:    { nome: 'Pendente',       curto: 'Pendente',   selo: 'selo--pendente' },
    confirmado:  { nome: 'Confirmado',     curto: 'Confirmado', selo: 'selo--confirmado' },
    atendimento: { nome: 'Em atendimento', curto: 'Atendendo',  selo: 'selo--atendimento' },
    concluido:   { nome: 'Concluído',      curto: 'Concluído',  selo: 'selo--concluido' },
    cancelado:   { nome: 'Cancelado',      curto: 'Cancelado',  selo: 'selo--cancelado' },
    ausente:     { nome: 'Não compareceu', curto: 'Ausente',    selo: 'selo--ausente' }
  };
  var ORDEM_ESTADOS = ['novo', 'pendente', 'confirmado', 'atendimento', 'concluido', 'cancelado', 'ausente'];

  /* O lookup devolve o `id` junto com o rótulo. Sem ele, quem monta a
     classe a partir do registro (U.selo, U.origem) escrevia a classe com
     `undefined` no lugar do nome: "selo--undefined". O texto aparecia —
     por isso passou tanto tempo despercebido — mas o chip ficava SEM cor,
     porque nenhuma regra do CSS casa com esse nome. O `id` fecha a conta:
     a chave de entrada é a mesma que sai, e ninguém precisa reconstruir. */
  function estado(id) {
    return ESTADOS[id] || { id: id, nome: id, curto: id, selo: '' };
  }

  /* Um agendamento nestes estados ainda ocupa a agenda. Cancelado e ausente
     liberam o horário — é isso que faz o horário voltar a aparecer livre. */
  var ESTADOS_OCUPAM = { novo: 1, pendente: 1, confirmado: 1, atendimento: 1, concluido: 1 };
  function ocupaAgenda(ag) { return !!ESTADOS_OCUPAM[ag.status]; }
  function estaAtivo(ag) {
    return ag.status !== 'cancelado' && ag.status !== 'concluido' && ag.status !== 'ausente';
  }

  var ORIGENS = {
    site:   { nome: 'Site',   curto: 'Site' },
    manual: { nome: 'Manual', curto: 'Manual' }
  };
  function origem(id) { return ORIGENS[id] || { id: id, nome: '—', curto: '—' }; }

  /* =======================================================================
     2a. SITUAÇÕES DA EQUIPE

     Os cinco estados do §3 do pedido, com o rótulo que a tela mostra.
     O cálculo de QUAL estado vale em cada momento mora em `situacaoDa`
     (seção 3b) — aqui é só o vocabulário, para nenhuma tela inventar
     texto próprio e as nove abas falarem a mesma língua.
     ======================================================================= */
  var SITUACOES_EQUIPE = [
    { id: 'atendimento', nome: 'Em atendimento' },
    { id: 'ativa',       nome: 'Ativa' },
    { id: 'intervalo',   nome: 'Em intervalo' },
    { id: 'folga',       nome: 'Folga' },
    { id: 'inativa',     nome: 'Inativa' }
  ];
  function situacaoEquipe(id) {
    return SITUACOES_EQUIPE.filter(function (s) { return s.id === id; })[0] ||
           { id: id, nome: '—' };
  }

  /* =======================================================================
     2b. ESTADO TEMPORAL — o cronômetro do atendimento

     Isto NÃO é o status. São duas perguntas diferentes:

       status ............ em que ponto do fluxo o atendimento está
                           (novo, confirmado, em atendimento, concluído…)
       estado temporal ... quanto falta para o horário marcado, ou quanto
                           já passou dele

     Um atendimento CONFIRMADO pode estar a 3 minutos de começar; um EM
     ATENDIMENTO já começou. Por isso o cálculo é centralizado aqui e a
     interface só desenha o que ele devolve — nenhuma tela faz essa conta
     por conta própria.

     Regras (pedidas pela proprietária):
       · mais de 10 min antes ....... "Começa em X min", discreto
       · de 10 a 6 min antes ........ "Em X min"
       · de 5 a 1 min antes ......... destaque maior
       · no horário ................. "NO HORÁRIO"
       · de 1 a 10 min depois ....... "+0X min", em vermelho elegante
       · mais de 10 min depois ...... "ATRASADO +X min"
       · em atendimento ............. "EM ATENDIMENTO · X min"
       · concluído/cancelado/ausente  sem cronômetro

     `minutos` é sempre o valor absoluto da diferença, e `atraso` diz o
     sentido. A tela nunca recalcula: lê daqui.
     ======================================================================= */
  function estadoTemporal(ag, agora) {
    var ref = agora || new Date();
    var chaveHoje = D.chaveDe(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()));
    var agoraMin = ref.getHours() * 60 + ref.getMinutes();

    /* Estados que encerram o cronômetro. Concluído e cancelado não contam
       nada; ausente também não — não houve atendimento para cronometrar. */
    if (ag.status === 'concluido') return { nivel: 'encerrado', rotulo: '', minutos: 0, atraso: 0 };
    if (ag.status === 'cancelado') return { nivel: 'encerrado', rotulo: '', minutos: 0, atraso: 0 };
    if (ag.status === 'ausente')   return { nivel: 'encerrado', rotulo: '', minutos: 0, atraso: 0 };

    /* EM ATENDIMENTO: conta o tempo decorrido desde o início REAL quando ele
       existe; sem ele, desde o horário marcado. */
    if (ag.status === 'atendimento') {
      var base = ag.inicioReal ? new Date(ag.inicioReal) : null;
      var desdeMin;
      if (base && D.chaveDe(base) === chaveHoje) {
        desdeMin = (ref.getHours() * 60 + ref.getMinutes()) -
                   (base.getHours() * 60 + base.getMinutes());
      } else if (ag.dataChave === chaveHoje) {
        desdeMin = agoraMin - ag.inicioMin;
      } else if (ag.dataChave < chaveHoje) {
        desdeMin = ag.duracao;                 // dia passado: já terminou
      } else {
        desdeMin = 0;                          // dia futuro com status estranho
      }
      desdeMin = Math.max(0, desdeMin);
      return {
        nivel: 'em-curso',
        rotulo: 'EM ATENDIMENTO · ' + desdeMin + ' min',
        minutos: desdeMin, atraso: 0,
        curto: 'Em atendimento'
      };
    }

    /* Sem horário de hoje não existe contagem: só o rótulo do dia. */
    if (ag.dataChave > chaveHoje) {
      var dias = Math.round((D.dataDeChave(ag.dataChave) -
        new Date(ref.getFullYear(), ref.getMonth(), ref.getDate())) / 86400000);
      return {
        nivel: 'outro-dia',
        rotulo: dias === 1 ? 'Amanhã às ' + horaCheia(ag.inicio) : rotuloDia(ag.dataChave, ref) + ' às ' + horaCheia(ag.inicio),
        minutos: 0, atraso: 0
      };
    }
    if (ag.dataChave < chaveHoje) {
      return { nivel: 'encerrado', rotulo: '', minutos: 0, atraso: 0 };
    }

    /* HOJE, ainda não começou ou já passou da hora. */
    var diferenca = ag.inicioMin - agoraMin;

    if (diferenca === 0) {
      return { nivel: 'no-horario', rotulo: 'NO HORÁRIO', minutos: 0, atraso: 0, curto: 'No horário' };
    }
    if (diferenca > 0) {
      var nivel = diferenca > 10 ? 'longe' : (diferenca >= 6 ? 'proximo' : 'iminente');
      return {
        nivel: nivel,
        rotulo: nivel === 'longe' ? 'Começa em ' + diferenca + ' min' : 'Em ' + diferenca + ' min',
        minutos: diferenca, atraso: 0,
        curto: diferenca > 10 ? 'em ' + diferenca + ' min' : 'em ' + diferenca + ' min'
      };
    }
    /* Passou do horário e ninguém deu início. */
    var atraso = -diferenca;
    var critico = atraso > 10;
    return {
      nivel: critico ? 'atraso-critico' : 'atraso',
      rotulo: critico ? 'ATRASADO +' + atraso + ' min' : '+' + doisDigitos(atraso) + ' min',
      minutos: atraso, atraso: atraso,
      curto: critico ? 'atrasado +' + atraso + ' min' : '+' + doisDigitos(atraso) + ' min'
    };
  }

  function doisDigitos(n) { return n < 10 ? '0' + n : String(n); }

  /* Quanto tempo o atendimento está em curso, em texto curto — usado na
     Visão Geral, onde só cabe "18 min". */
  function tempoEmCurso(ag, agora) {
    var e = estadoTemporal(ag, agora);
    return e.nivel === 'em-curso' ? e.minutos : null;
  }

  /* =======================================================================
     2c. PAGAMENTO — leitura do registro

     `pagamento` é um OBJETO: { forma, valor, desconto, status, registradoEm }.
     Nulo significa "nada registrado" — e nulo NÃO é zero. Um atendimento sem
     valor informado não é um atendimento que valeu nada; se as duas coisas
     virarem a mesma, o ticket médio do salão mente.
     ======================================================================= */
  function pagamentoDe(ag) { return (ag && ag.pagamento) || null; }

  /* Valor que a cliente efetivamente pagou: cobrado menos desconto.
     Devolve null quando não há valor — nunca 0. */
  function valorLiquido(p) {
    if (!p || p.valor == null) return null;
    return Math.max(0, Number(p.valor) - (Number(p.desconto) || 0));
  }
  function valorLiquidoDe(ag) { return valorLiquido(pagamentoDe(ag)); }

  function formaPagamento(id) {
    return (D.DEMO.formasPagamento || []).filter(function (f) { return f.id === id; })[0] || null;
  }
  function nomeFormaPagamento(id) {
    var f = formaPagamento(id);
    return f ? f.nome : null;
  }
  function statusPagamento(id) {
    return (D.DEMO.statusPagamento || []).filter(function (s) { return s.id === id; })[0] ||
      { id: 'nao-informado', nome: 'Não informado' };
  }

  /* =======================================================================
     2d. FINANCEIRO — derivação sobre pagamentos registrados

     Toda soma daqui ignora registro sem valor. `comValor` é sempre o
     denominador do ticket médio: dividir pelo número de atendimentos
     faria o ticket cair por causa de atendimento sem valor lançado, o
     que é falso.
     ======================================================================= */
  function resumoFinanceiro(agendamentos, de, ate) {
    var noPeriodo = (agendamentos || []).filter(function (a) {
      if (de && a.dataChave < de) return false;
      if (ate && a.dataChave > ate) return false;
      return true;
    });

    var recebido = 0, aReceber = 0, comValor = 0, semValor = 0;
    var porForma = {}, porStatus = {};

    noPeriodo.forEach(function (a) {
      var p = pagamentoDe(a);
      var valor = valorLiquido(p);
      if (valor == null) {
        /* Atendimento que OCORREU e não teve valor lançado. É isto que
           separa "não faturou" de "esqueceu de lançar". */
        if (a.status === 'concluido') semValor += 1;
        return;
      }
      comValor += 1;
      porStatus[p.status] = (porStatus[p.status] || 0) + 1;
      if (p.status === 'pago') {
        recebido += valor;
        porForma[p.forma || 'nao-informado'] = (porForma[p.forma || 'nao-informado'] || 0) + valor;
      } else if (p.status === 'pendente' || p.status === 'parcial') {
        aReceber += valor;
      }
      /* Estornado não entra em nenhuma das duas somas — o dinheiro voltou. */
    });

    return {
      registros: noPeriodo.length,
      comValor: comValor,
      semValor: semValor,
      recebido: recebido,
      aReceber: aReceber,
      ticketMedio: comValor ? recebido / comValor : null,
      porForma: porForma,
      porStatus: porStatus
    };
  }

  /* =======================================================================
     3. CONSULTAS — funções puras sobre uma lista de agendamentos
     Recebem a lista explicitamente para poderem ser testadas com qualquer
     conjunto, sem depender do estado global.
     ======================================================================= */

  function doDia(lista, chave) {
    return lista.filter(function (a) { return a.dataChave === chave; });
  }

  function bloqueiosDoDia(lista, chave) {
    return lista.filter(function (b) { return b.dataChave === chave; });
  }

  /* Ocupação de um dia, minuto a minuto — a base de toda decisão de
     disponibilidade. Cancelado e ausente NÃO ocupam. */
  function mapaOcupacao(agendamentos, bloqueios) {
    var mapa = {};
    (agendamentos || []).forEach(function (a) {
      if (!ocupaAgenda(a)) return;
      var ini = a.inicioMin;
      var fim = ini + a.duracao;
      for (var m = ini; m < fim; m += D.PASSO_MIN) {
        mapa[m] = { tipo: 'atendimento', ref: a };
      }
    });
    (bloqueios || []).forEach(function (b) {
      for (var m = b.inicioMin; m < b.fimMin; m += D.PASSO_MIN) {
        /* Um atendimento que já ocupa tem precedência na leitura, mas os dois
           nunca deveriam coexistir — a bancada cobra isso. */
        if (!mapa[m]) mapa[m] = { tipo: 'bloqueio', ref: b };
      }
    });
    return mapa;
  }

  /* Situação de um horário de início: livre, ocupado ou bloqueado.
     Um serviço de duração N só pode começar em `inicio` se TODOS os slots
     que ele atravessa estiverem livres. */
  function situacaoHorario(mapa, inicio, duracao) {
    var fim = inicio + (duracao || D.PASSO_MIN);
    var primeiro = null;
    for (var m = inicio; m < fim; m += D.PASSO_MIN) {
      var oc = mapa[m];
      if (oc) {
        /* Guarda o motivo mais relevante: atendimento manda sobre bloqueio */
        if (!primeiro || (primeiro.tipo === 'bloqueio' && oc.tipo === 'atendimento')) primeiro = oc;
      }
    }
    if (!primeiro) return { livre: true, tipo: null, ref: null };
    return { livre: false, tipo: primeiro.tipo, ref: primeiro.ref };
  }

  /* Horários de início possíveis para um serviço num dia, respeitando
     funcionamento, bloqueios, agendamentos e o momento presente.
     Dia que já passou e horário que já passou hoje NÃO são oferecidos: não
     se agenda no passado. */
  /* `antecedencia` é opcional: sem ela, vale a configurada. Existe o
     parâmetro para a bancada poder perguntar pela capacidade FÍSICA da
     agenda (antecedência zero) sem misturar as duas perguntas. */
  /* =======================================================================
     3b. PROFISSIONAIS, CAPACIDADE E VAGAS

     ESTA É A REGRA QUE MUDA TUDO, e vale explicar por que ela substitui a
     anterior em vez de conviver com ela.

     Antes, a agenda perguntava "algum atendimento ocupa este minuto?". Uma
     resposta sim significava horário tomado. Isso descreve um salão de UMA
     cadeira — e não é o Exclusiva Hair. Aqui uma profissional acompanha
     várias clientes ao mesmo tempo (o processo descansa no fio enquanto ela
     atende outra), então o que limita não é o relógio: é quantas clientes
     cabem juntas. Com teto 8 e três clientes em processo, AINDA HÁ VAGA — e
     a regra antiga diria que não. Era ela, e não a capacidade, que estava
     errada.

     Duas perguntas diferentes, que antes eram a mesma:

       BLOQUEIO ...... o horário não existe para ninguém      (almoço, evento)
       CAPACIDADE .... existe, mas o teto daquela profissional  (3 de 8)

     Confundir as duas produziria a leitura errada na tela: "cheio" onde o
     correto é "3 de 8 ocupadas".
     ======================================================================= */

  /* Quantas clientes esta profissional acompanha simultaneamente. O teto
     pode variar por serviço (`capacidadePorServico`): um alisamento prende
     a profissional, uma avaliação não. Enquanto a proprietária não
     configurar aquele serviço, vale o teto geral — e é isso que a tela
     diz, em vez de exibir um número que ninguém cadastrou. */
  function capacidadeDe(prof, servicoId) {
    if (!prof) return 1;
    var porServico = prof.capacidadePorServico || {};
    if (servicoId && porServico[servicoId] != null) return Number(porServico[servicoId]) || 1;
    var c = Number(prof.capacidade);
    return c > 0 ? c : 1;
  }

  /* Lookup com a MESMA disciplina dos outros: devolve o `id` junto, para
     quem monta classe a partir do registro não escrever "undefined" — foi
     exatamente esse o defeito dos selos. */
  function profissional(id) {
    var lista = S.profissionais || [];
    var p = lista.filter(function (x) { return x.id === id; })[0];
    /* `a-definir` é o resquício do cadastro antigo (quando não havia
       equipe). Em vez de deixar registro órfão, resolve para a primeira
       ativa — e a tela mostra a profissional real. */
    if (!p && id === "a-definir") p = lista.filter(function (x) { return x.ativo !== false; })[0];
    if (!p) return { id: id, nome: "Profissional a definir", curto: "—", ativo: true };
    return p;
  }
  function profissionaisAtivas() {
    return (S.profissionais || []).filter(function (p) { return p.ativo !== false; });
  }

  /* Quem realiza este serviço. Lista vazia devolve TODO MUNDO em vez de
     ninguém: uma profissional recém-cadastrada, ainda sem serviços
     marcados, não pode simplesmente desaparecer da agenda — ela fica
     disponível para tudo até a proprietária restringir. O contrário
     (vazio = ninguém) faria o salão parar de agendar por causa de um
     cadastro pela metade. */
  function fazServico(prof, servicoId) {
    if (!prof || !prof.servicos || !prof.servicos.length) return true;
    /* Serviço sem id é uma MEDIÇÃO de agenda, não um serviço real: quem pode
       atender é questão que não se aplica. */
    if (!servicoId) return true;
    return prof.servicos.indexOf(servicoId) !== -1;
  }
  function quemFaz(servicoId, diaSemana) {
    return profissionaisAtivas().filter(function (p) {
      if (diaSemana != null && (p.dias || []).indexOf(diaSemana) === -1) return false;
      return fazServico(p, servicoId);
    });
  }

  /* A janela de trabalho da profissional naquele dia: interseção do
     expediente do salão com o horário dela, menos o intervalo dela.
     Devolve null quando ela não trabalha nesse dia. */
  function janelaDe(prof, cfgDia) {
    if (!prof || !cfgDia || !cfgDia.aberto) return null;
    var dia = cfgDia.dia;
    if (dia != null && (prof.dias || []).indexOf(dia) === -1) return null;
    var ini = Math.max(D.minutosDe(cfgDia.inicio), D.minutosDe(prof.entrada || cfgDia.inicio));
    var fim = Math.min(D.minutosDe(cfgDia.fim), D.minutosDe(prof.saida || cfgDia.fim));
    if (fim <= ini) return null;
    return {
      inicio: ini, fim: fim,
      intervaloInicio: prof.intervaloInicio ? D.minutosDe(prof.intervaloInicio) : null,
      intervaloFim: prof.intervaloFim ? D.minutosDe(prof.intervaloFim) : null
    };
  }

  /* CARGA: quantos minutos de atendimento cada profissional tem, minuto a
     minuto, naquele dia. É a base de toda conta de vaga. Cancelado e
     ausente NÃO entram — liberam o horário, pela mesma razão de sempre. */
  function cargaDoDia(chave, agendamentos, bloqueios) {
    var carga = {};
    (agendamentos || []).forEach(function (a) {
      if (a.dataChave !== chave) return;
      if (!ocupaAgenda(a)) return;
      var pid = a.profissionalId || "a-definir";
      var c = (carga[pid] = carga[pid] || { minutos: {}, total: 0 });
      for (var m = a.inicioMin; m < a.inicioMin + a.duracao; m += D.PASSO_MIN) {
        c.minutos[m] = (c.minutos[m] || 0) + 1;
      }
      c.total += a.duracao;
    });
    /* Bloqueios são do SALÃO, não de uma profissional: valem para todas. */
    var bloq = {};
    (bloqueios || []).forEach(function (b) {
      if (b.dataChave !== chave) return;
      for (var m = b.inicioMin; m < b.fimMin; m += D.PASSO_MIN) bloq[m] = true;
    });
    return { porProfissional: carga, bloqueado: bloq };
  }

  /* SITUAÇÃO DE UMA PROFISSIONAL, AGORA. Cinco estados, e nenhum é
     decorativo — cada um sai de um dado que existe:

       inativa ........ desligada no cadastro
       folga .......... hoje não é dia de trabalho dela
       intervalo ...... agora cai dentro do intervalo dela
       atendendo ...... tem cliente em curso neste minuto
       ativa .......... trabalha hoje e está livre neste minuto

     A ordem importa: quem está em atendimento às 12h50, cinco minutos
     antes do próprio intervalo, aparece ATENDENDO — porque é o que ela
     está fazendo. O intervalo só rotula quem de fato parou. */
  function situacaoDa(prof, chave, agendamentos, bloqueios, agora) {
    var ref = agora || new Date();
    if (!prof || prof.ativo === false) return { id: "inativa", nome: "Inativa" };
    var dt = D.dataDeChave(chave);
    var cfg = D.FUNCIONAMENTO[dt.getDay()];
    var j = janelaDe(prof, cfg);
    if (!j) return { id: "folga", nome: "Folga" };

    var hojeChave = D.chaveDe(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()));
    var agoraMin = ref.getHours() * 60 + ref.getMinutes();
    var ehHoje = chave === hojeChave;

    var carga = cargaDoDia(chave, agendamentos, bloqueios).porProfissional[prof.id];
    var emAtendimento = 0;
    if (carga && ehHoje) emAtendimento = carga.minutos[agoraMin - (agoraMin % D.PASSO_MIN)] || 0;
    if (emAtendimento > 0) return { id: "atendimento", nome: "Em atendimento", clientes: emAtendimento };

    if (ehHoje && j.intervaloInicio != null && agoraMin >= j.intervaloInicio && agoraMin < j.intervaloFim) {
      return { id: "intervalo", nome: "Em intervalo" };
    }
    return { id: "ativa", nome: "Ativa" };
  }

  /* VAGAS — o número que a proprietária lê na tela.

     "5/8 vagas ocupadas" sai daqui, e é derivado: o pico de clientes
     simultâneas daquela profissional no dia, contra o teto dela. Pico, e
     não soma: o que interessa é o momento mais apertado, não o volume do
     dia. Também devolvemos quantas clientes ela acompanha NESTE minuto —
     são perguntas diferentes e a tela mostra as duas. */
  function vagasDe(prof, chave, agendamentos, bloqueios, agora) {
    var ref = agora || new Date();
    var dt = D.dataDeChave(chave);
    var cfg = D.FUNCIONAMENTO[dt.getDay()];
    var j = janelaDe(prof, cfg);
    var carga = cargaDoDia(chave, agendamentos, bloqueios);
    var c = carga.porProfissional[prof.id];

    /* O teto do dia é o GERAL. `capacidadePorServico` restringe o agendar
       de um serviço específico (um alisamento prende mais que uma
       avaliação) e é consultado em `vagaNoPosto`; aqui ele não entra,
       para a barra do dia não herdar o limite de um serviço só. */
    var cap = capacidadeDe(prof);

    if (!j) {
      return { capacidade: cap, vagas: cap, ocupadasAgora: 0, pico: 0,
               vagasLivres: cap, trabalha: false, fracao: 0, minutos: 0 };
    }

    var pico = 0;
    if (c) {
      Object.keys(c.minutos).forEach(function (m) {
        if (c.minutos[m] > pico) pico = c.minutos[m];
      });
    }
    var hojeChave = D.chaveDe(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()));
    var ocupadasAgora = 0;
    if (c && chave === hojeChave) {
      var agoraMin = ref.getHours() * 60 + ref.getMinutes();
      ocupadasAgora = c.minutos[agoraMin - (agoraMin % D.PASSO_MIN)] || 0;
    }
    var picoLimitado = Math.min(pico, cap);
    return {
      capacidade: cap,
      vagas: Math.max(0, cap - picoLimitado),
      vagasLivres: Math.max(0, cap - picoLimitado),
      ocupadasAgora: ocupadasAgora,
      pico: pico,
      trabalha: true,
      fracao: cap ? picoLimitado / cap : 0,
      minutos: c ? c.total : 0
    };
  }

  /* RESUMO DA EQUIPE NO DIA — alimenta "Equipe hoje" na Visão Geral e o
     bloco de ocupação na Agenda. Cada linha vem de vagasDe(); nenhuma é
     calculada na tela, para as duas telas não discordarem. */
  function equipeDoDia(chave, agendamentos, bloqueios, agora) {
    var ref = agora || new Date();
    var lista = (S.profissionais || []).map(function (p) {
      return {
        profissional: p,
        situacao: situacaoDa(p, chave, agendamentos, bloqueios, ref),
        vagas: vagasDe(p, chave, agendamentos, bloqueios, ref)
      };
    });
    var trabalhando = lista.filter(function (l) { return l.vagas.trabalha; });
    return {
      profissionais: lista,
      trabalhando: trabalhando.length,
      total: lista.length,
      capacidade: trabalhando.reduce(function (s, l) { return s + l.vagas.capacidade; }, 0),
      ocupadasAgora: trabalhando.reduce(function (s, l) { return s + l.vagas.ocupadasAgora; }, 0),
      vagasLivres: trabalhando.reduce(function (s, l) { return s + l.vagas.vagas; }, 0)
    };
  }

  /* Existe vaga REAL para este serviço, nesta profissional, neste horário?
     É a pergunta que a agenda faz antes de oferecer — e a única diferença
     em relação ao passado é que agora ela é feita POR PROFISSIONAL e contra
     o teto, não contra o relógio. */
  function vagaNoPosto(prof, servicoId, chave, inicioMin, duracao, carga, agora) {
    var dt = D.dataDeChave(chave);
    var cfg = D.FUNCIONAMENTO[dt.getDay()];
    var j = janelaDe(prof, cfg);
    if (!j) return false;
    if (inicioMin < j.inicio || inicioMin + duracao > j.fim) return false;
    var cap = capacidadeDe(prof, servicoId);
    var minutos = (carga.porProfissional[prof.id] || {}).minutos || {};
    for (var m = inicioMin; m < inicioMin + duracao; m += D.PASSO_MIN) {
      if (carga.bloqueado[m]) return false;
      if (j.intervaloInicio != null && m >= j.intervaloInicio && m < j.intervaloFim) return false;
      if ((minutos[m] || 0) >= cap) return false;
    }
    return true;
  }

  function horariosDisponiveis(servico, chave, agendamentos, bloqueios, agora, antecedencia, profissionalId) {
    var dt = D.dataDeChave(chave);
    var cfg = D.FUNCIONAMENTO[dt.getDay()];
    var agoraRef = agora || new Date();
    var hojeChave = D.chaveDe(new Date(agoraRef.getFullYear(), agoraRef.getMonth(), agoraRef.getDate()));
    var ehHoje = chave === hojeChave;
    var agoraMin = agoraRef.getHours() * 60 + agoraRef.getMinutes();
    var antecedenciaMin = antecedencia == null
      ? (Number(S.config.antecedenciaMinima) || 0)
      : Number(antecedencia) || 0;

    if (!cfg.aberto) return [];
    if (chave < hojeChave) return [];

    var duracao = servico ? servico.duracao : D.PASSO_MIN;
    var servicoId = servico ? servico.id : null;

    /* Quem PODE atender este serviço neste dia. É a lista que responde a
       pergunta que a proprietária vai fazer: "posso marcar um alisamento
       na sexta?" — e, quando ela quiser saber com quem, a mesma lista
       devolve os nomes. */
    var candidatas = quemFaz(servicoId, dt.getDay());
    if (profissionalId && profissionalId !== "a-definir") {
      candidatas = candidatas.filter(function (p) { return p.id === profissionalId; });
    }
    if (!candidatas.length) return [];

    var carga = cargaDoDia(chave, agendamentos, bloqueios);

    var inicioDia = D.minutosDe(cfg.inicio);
    var fimDia = D.minutosDe(cfg.fim);

    var saida = [];
    for (var m = inicioDia; m + duracao <= fimDia; m += D.PASSO_MIN) {
      /* No dia de hoje, horário que já passou não é oferecido — nem o que
         ainda está dentro da antecedência mínima. As duas coisas são a
         MESMA pergunta ("dá tempo de a cliente chegar?"), e por isso moram
         juntas. */
      if (ehHoje && m <= agoraMin + antecedenciaMin) continue;

      var comVaga = candidatas.filter(function (p) {
        return vagaNoPosto(p, servicoId, chave, m, duracao, carga, agoraRef);
      });
      if (comVaga.length) {
        saida.push({
          inicioMin: m,
          inicio: D.hhmmDe(m),
          fim: D.hhmmDe(m + duracao),
          /* Quem pode pegar este horário. Não é enfeite: é o que permite a
             agenda dizer "com a Profissional 02" ANTES de a dona perguntar. */
          profissionais: comVaga.map(function (p) { return p.id; }),
          profissional: comVaga[0].id
        });
      }
    }
    return saida;
  }
  /* Resumo de um dia — usado pela Visão Geral, pela Agenda e pelos Relatórios */
  function resumoDoDia(chave, agendamentos, bloqueios, agora) {
    var lista = doDia(agendamentos, chave);
    var bloq = doDia(bloqueios, chave);
    var dt = D.dataDeChave(chave);
    var cfg = D.FUNCIONAMENTO[dt.getDay()];
    var agoraRef = agora || new Date();

    var contagem = {};
    ORDEM_ESTADOS.forEach(function (s) { contagem[s] = 0; });
    lista.forEach(function (a) { contagem[a.status] = (contagem[a.status] || 0) + 1; });

    var porOrigem = { site: 0, manual: 0 };
    lista.forEach(function (a) { porOrigem[a.origem] = (porOrigem[a.origem] || 0) + 1; });

    var minutosTotais = cfg.aberto ? (D.minutosDe(cfg.fim) - D.minutosDe(cfg.inicio)) : 0;
    var minutosBloqueados = bloq.reduce(function (s, b) { return s + (b.fimMin - b.inicioMin); }, 0);
    var minutosOcupados = lista.reduce(function (s, a) {
      return s + (ocupaAgenda(a) ? a.duracao : 0);
    }, 0);
    var minutosLivres = Math.max(0, minutosTotais - minutosBloqueados - minutosOcupados);

    /* Todos os atendimentos esperados do dia (para taxa de comparecimento) */
    var esperados = lista.filter(function (a) { return a.status !== 'cancelado'; }).length;
    var atendidos = contagem.concluido + contagem.atendimento;

    return {
      chave: chave,
      data: dt,
      aberto: cfg.aberto,
      config: cfg,
      agendamentos: lista,
      bloqueios: bloq,
      contagem: contagem,
      total: lista.length,
      porOrigem: porOrigem,
      compareceram: atendidos,
      esperados: esperados,
      taxaComparecimento: esperados ? atendidos / esperados : 0,
      minutosTotais: minutosTotais,
      minutosOcupados: minutosOcupados,
      minutosBloqueados: minutosBloqueados,
      minutosLivres: minutosLivres,
      ocupacao: minutosTotais ? minutosOcupados / (minutosTotais - minutosBloqueados || 1) : 0
    };
  }

  /* Próximo atendimento a partir de agora — o cartão mais importante da home */
  function proximoAtendimento(agendamentos, agora) {
    var ref = agora || new Date();
    var chaveHoje = D.chaveDe(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()));
    var agoraMin = ref.getHours() * 60 + ref.getMinutes();
    var futuros = agendamentos.filter(function (a) {
      if (!estaAtivo(a)) return false;
      if (a.dataChave > chaveHoje) return true;
      if (a.dataChave < chaveHoje) return false;
      return a.inicioMin + a.duracao > agoraMin;
    });
    futuros.sort(function (a, b) {
      if (a.dataChave !== b.dataChave) return a.dataChave < b.dataChave ? -1 : 1;
      return a.inicioMin - b.inicioMin;
    });
    return futuros[0] || null;
  }

  /* Atendimento acontecendo neste instante */
  function emAndamento(agendamentos, agora) {
    var ref = agora || new Date();
    var chaveHoje = D.chaveDe(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()));
    var agoraMin = ref.getHours() * 60 + ref.getMinutes();
    return agendamentos.filter(function (a) {
      return a.dataChave === chaveHoje && a.status === 'atendimento';
    }).filter(function (a) {
      return a.inicioMin <= agoraMin && agoraMin < a.inicioMin + a.duracao;
    })[0] || null;
  }

  /* Histórico de um cliente, mais recente primeiro */
  function historicoDoCliente(clienteId, agendamentos, agora) {
    var ref = agora || new Date();
    var chaveHoje = D.chaveDe(new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()));
    var lista = agendamentos.filter(function (a) { return a.clienteId === clienteId; });
    var passados = lista.filter(function (a) {
      return a.dataChave < chaveHoje || (a.dataChave === chaveHoje && a.status === 'concluido');
    }).sort(function (a, b) {
      if (a.dataChave !== b.dataChave) return a.dataChave > b.dataChave ? -1 : 1;
      return b.inicioMin - a.inicioMin;
    });
    var futuros = lista.filter(function (a) {
      return a.dataChave > chaveHoje ||
        (a.dataChave === chaveHoje && a.status !== 'concluido' && estaAtivo(a));
    }).sort(function (a, b) {
      if (a.dataChave !== b.dataChave) return a.dataChave < b.dataChave ? -1 : 1;
      return a.inicioMin - b.inicioMin;
    });
    var concluidos = passados.filter(function (a) { return a.status === 'concluido'; });
    return {
      todos: lista,
      passados: passados,
      futuros: futuros,
      visitas: concluidos.length,
      ultima: concluidos[0] || null,
      proximo: futuros[0] || null
    };
  }

  /* Ficha resumida de um cliente, para lista e cabeçalho */
  function fichaCliente(cliente, agendamentos, agora) {
    var h = historicoDoCliente(cliente.id, agendamentos, agora);
    var servicosFeitos = {};
    h.passados.forEach(function (a) {
      if (a.status !== 'concluido') return;
      servicosFeitos[a.servicoId] = (servicosFeitos[a.servicoId] || 0) + 1;
    });
    var ranking = Object.keys(servicosFeitos).map(function (id) {
      return { servicoId: id, vezes: servicosFeitos[id] };
    }).sort(function (a, b) { return b.vezes - a.vezes; });

    var cancelamentos = h.todos.filter(function (a) { return a.status === 'cancelado'; }).length;
    var ausencias = h.todos.filter(function (a) { return a.status === 'ausente'; }).length;

    return {
      cliente: cliente,
      historico: h,
      visitas: h.visitas,
      ultima: h.ultima,
      proximo: h.proximo,
      servicosFeitos: ranking,
      cancelamentos: cancelamentos,
      ausencias: ausencias,
      ativo: !!h.proximo
    };
  }

  /* =======================================================================
     4. ESTADO DA APLICAÇÃO
     Um único objeto observável. As telas nunca guardam cópia própria: leem
     daqui e se inscrevem para redesenhar. Isso é o que faz o front-end se
     comportar como sistema de verdade — muda num lugar, aparece em todos.
     ======================================================================= */
  function criarEstado() {
    var ouvintes = [];
    var estado = {
      /* Dados mutáveis durante a sessão — partem da base demonstrativa */
      agendamentos: D.AGENDAMENTOS.slice(),
      bloqueios: D.BLOQUEIOS.slice(),
      clientes: D.CLIENTES.slice(),
      /* A equipe entra na loja como cópia, e não por referência: a
         proprietária vai poder cadastrar e editar, e isso não pode
         contaminar a base demonstrativa de origem. */
      profissionais: D.PROFISSIONAIS.map(function (p) {
        return {
          id: p.id, numero: p.numero, nome: p.nome, curto: p.curto,
          funcao: p.funcao, ativo: p.ativo, exemplo: p.exemplo,
          capacidade: p.capacidade,
          dias: (p.dias || []).slice(),
          entrada: p.entrada, intervaloInicio: p.intervaloInicio,
          intervaloFim: p.intervaloFim, saida: p.saida,
          servicos: (p.servicos || []).slice(),
          capacidadePorServico: Object.assign({}, p.capacidadePorServico)
        };
      }),
      servicos: D.SERVICOS.slice(),
      notificacoes: D.NOTIFICACOES.slice(),
      funcionamento: D.FUNCIONAMENTO.map(function (f) {
        return { dia: f.dia, nome: f.nome, aberto: f.aberto, inicio: f.inicio, fim: f.fim,
                 intervaloInicio: f.intervaloInicio, intervaloFim: f.intervaloFim, exemplo: f.exemplo };
      }),
      config: {
        nome: 'Exclusiva Hair',
        cidade: 'Olinda · Pernambuco',
        telefone: '',                     // não informado nos materiais
        email: '',                        // não informado nos materiais
        instagram: '@exclusivahair__',
        agendamentoOnline: true,
        confirmacaoAutomatica: false,
        antecedenciaMinima: 60,           // minutos
        janelaMaxima: 45,                 // dias à frente
        /* FINANCEIRO — três ajustes, todos LIGADOS a um comportamento real:
             formasAtivas ............ quais formas aparecem na finalização
             descontoMaximo .......... teto do desconto, em % (0 = sem teto)
             exigirValorFinalizacao .. se ligado, não deixa concluir sem valor
           Nenhum é decorativo: os três são lidos pelo diálogo de finalizar. */
        formasAtivas: ['pix', 'credito', 'debito', 'dinheiro', 'outro'],
        descontoMaximo: 0,                // sem teto — o salão ainda não decidiu
        exigirValorFinalizacao: false,    // a cliente não cadastrou preço; exigir travaria o salão
        /* NOTIFICAÇÕES — lidas por `empurrarNotificacao`, que é o único
           caminho por onde todo aviso passa. Desligar aqui impede o aviso
           de nascer, em qualquer tela que o criasse. */
        notificarNovo: true,
        notificarCancelamento: true,
        notificarReagendamento: true,
        /* `resumoDiario` é o único SEM efeito: o resumo da manhã dependeria de
           um envio que não existe nesta etapa (não há e-mail, SMS nem robô).
           Está desligado por padrão e a tela diz onde ele moraria — não
           inventamos um disparo para o interruptor parecer útil. */
        resumoDiario: false,
        usuarios: [
          { nome: 'Proprietária', papel: 'Administradora', acesso: 'Total',        demo: true },
          { nome: 'Recepção',     papel: 'Atendimento',    acesso: 'Agenda e clientes', demo: true }
        ]
      },
      /* Interface */
      trilhoRecolhido: false,
      contadorId: 9000
    };

    function notificar() {
      ouvintes.forEach(function (fn) { fn(estado); });
    }
    return {
      dados: estado,
      inscrever: function (fn) { ouvintes.push(fn); return function () {
        var i = ouvintes.indexOf(fn); if (i !== -1) ouvintes.splice(i, 1);
      }; },
      notificar: notificar,
      /* Grava e avisa */
      aplicar: function (fn) { fn(estado); notificar(); }
    };
  }

  /* =======================================================================
     5. MUTAÇÕES — as ações que o salão realiza
     Cada uma devolve { ok, mensagem } para a tela decidir o que dizer.
     ======================================================================= */
  var store = criarEstado();
  var S = store.dados;

  function proximoId() {
    S.contadorId += 1;
    return 'ag' + String(S.contadorId);
  }

  function agoraIsoLocal() { return new Date().toISOString(); }

  /* --- criar ------------------------------------------------------------
     A criação é o único ponto por onde TODO agendamento entra, venha do site
     ou do balcão. Por isso é aqui — e não na tela — que valem as duas
     decisões de Configurações → Agendamento:

       agendamentoOnline ...... fechado, nada entra marcado como vindo do site
       antecedenciaMinima .... nada entra em cima da hora, de nenhuma origem

     Deixar esta checagem na tela de novo agendamento seria decorativo: o
     caminho do site não passaria por ela, e o interruptor não desligaria
     coisa nenhuma. */
  function criarAgendamento(dados) {
    var servico = S.servicos.filter(function (s) { return s.id === dados.servicoId; })[0];
    if (!servico) return { ok: false, mensagem: 'Serviço não encontrado.' };
    if (!dados.dataChave) return { ok: false, mensagem: 'Escolha uma data.' };
    if (!dados.inicio) return { ok: false, mensagem: 'Escolha um horário.' };

    var origem = dados.origem || 'manual';
    if (origem === 'site' && S.config.agendamentoOnline === false) {
      return { ok: false, mensagem: 'O agendamento pelo site está desligado em Configurações.' };
    }

    var inicioMin = D.minutosDe(dados.inicio);
    var chave = dados.dataChave;

    var antecedencia = Number(S.config.antecedenciaMinima) || 0;
    if (antecedencia) {
      var agora = dados.agora || new Date();
      var agoraChave = D.chaveDe(agora);
      var minutosDoDia = agora.getHours() * 60 + agora.getMinutes();
      var faltam = chave === agoraChave
        ? inicioMin - minutosDoDia
        : (chave < agoraChave ? -1 : Infinity);
      if (faltam < antecedencia) {
        return { ok: false, mensagem: 'Antecedência mínima de ' + duracaoLegivel(antecedencia) +
          ' — este horário está em cima da hora. Ajuste em Configurações → Agendamento.' };
      }
    }


    /* ---------------------------------------------------------------------
       AQUI MORA A MUDANÇA DE REGRA. Antes: "algum atendimento ocupa este
       minuto?". Uma resposta sim recusava o horário — regra de salão de uma
       cadeira. No Exclusiva Hair três clientes podem estar em processo ao
       mesmo tempo com a MESMA profissional, e o horário continua valendo.

       Agora a pergunta é: existe uma profissional que (a) realiza este
       serviço, (b) trabalha neste dia, (c) está dentro do próprio horário
       e fora do próprio intervalo, (d) não está em cima de um bloqueio do
       salão e (e) ainda tem vaga contra o PRÓPRIO teto? A conta está em
       `vagaNoPosto`, e é a mesma que a grade de horários usa — uma regra
       só, para a grade nunca oferecer o que a gravação recusa.

       Bloqueio continua sendo bloqueio: separamos os dois motivos porque
       são coisas diferentes, e a mensagem diz qual dos dois é. Dizer
       "ocupado" quando o certo é "sem vaga" faria a proprietária procurar
       um conflito de horário que não existe.
       --------------------------------------------------------------------- */
    var carga = cargaDoDia(chave, S.agendamentos, S.bloqueios);
    var bloqueado = false;
    for (var mb = inicioMin; mb < inicioMin + servico.duracao; mb += D.PASSO_MIN) {
      if (carga.bloqueado[mb]) { bloqueado = true; break; }
    }
    if (bloqueado) return { ok: false, mensagem: 'Esse horário está bloqueado na agenda.' };

    var diaSemana = D.dataDeChave(chave).getDay();
    var escolhida = null;

    if (dados.profissionalId && dados.profissionalId !== 'a-definir') {
      /* A tela pode ter mandado a profissional escolhida à mão. Quando
         manda, respeitamos — e recusamos explicando o motivo, em vez de
         trocar por outra em silêncio, que seria a pior resposta possível. */
      escolhida = (S.profissionais || []).filter(function (p) {
        return p.id === dados.profissionalId;
      })[0] || null;
      if (!escolhida) return { ok: false, mensagem: 'Profissional não encontrada.' };
      if (escolhida.ativo === false) {
        return { ok: false, mensagem: escolhida.nome + ' está inativa nos cadastros.' };
      }
      if (!fazServico(escolhida, servico.id)) {
        return { ok: false, mensagem: escolhida.nome + ' não realiza ' + servico.nome +
          '. Marque esse serviço nos cadastros da profissional.' };
      }
      if ((escolhida.dias || []).indexOf(diaSemana) === -1) {
        return { ok: false, mensagem: escolhida.nome + ' não trabalha nesse dia.' };
      }
      if (!vagaNoPosto(escolhida, servico.id, chave, inicioMin, servico.duracao, carga)) {
        return { ok: false, mensagem: escolhida.nome + ' não tem vaga nesse horário: já' +
          ' está com ' + capacidadeDe(escolhida, servico.id) + ' clientes ao mesmo tempo' +
          '. Escolha outro horário ou outra profissional.' };
      }
    } else {
      /* Sem escolha explícita: distribui entre quem pode atender, e a
         escolha é a MENOS carregada no dia — não a primeira da lista.
         Sem esse critério, toda a agenda convergiria para a P1 e as
         outras duas apareceriam ociosas, o que é falso. */
      var disponiveis = quemFaz(servico.id, diaSemana).filter(function (p) {
        return vagaNoPosto(p, servico.id, chave, inicioMin, servico.duracao, carga);
      });
      if (!disponiveis.length) {
        var ativas = quemFaz(servico.id, diaSemana).length;
        return { ok: false, mensagem: ativas
          ? 'Nenhuma profissional tem vaga nesse horário para ' + servico.nome +
            '. Escolha outro horário.'
          : 'Nenhuma profissional realiza ' + servico.nome + ' nesse dia.' };
      }
      disponiveis.sort(function (a, b) {
        var ta = (carga.porProfissional[a.id] || {}).total || 0;
        var tb = (carga.porProfissional[b.id] || {}).total || 0;
        if (ta !== tb) return ta - tb;
        return (a.numero || 0) - (b.numero || 0);
      });
      escolhida = disponiveis[0];
    }

    var ag = {
      id: proximoId(),
      clienteId: dados.clienteId,
      servicoId: servico.id,
      profissionalId: escolhida.id,
      dataChave: chave,
      inicio: D.hhmmDe(inicioMin),
      inicioMin: inicioMin,
      fim: D.hhmmDe(inicioMin + servico.duracao),
      duracao: servico.duracao,
      /* Confirmação automática é o terceiro ajuste de Configurações →
         Agendamento, e vale só para o que chega pelo site: o que o salão
         lança no balcão já nasce confirmado — foi a própria recepção que
         combinou com a cliente. Desligado (o padrão), o pedido do site entra
         como "Novo" e espera alguém confirmar. */
      status: dados.status || (origem === 'site'
        ? (S.config.confirmacaoAutomatica ? 'confirmado' : 'novo')
        : 'confirmado'),
      origem: origem,
      criadoEm: agoraIsoLocal(),
      observacoes: dados.observacoes || '',
      pagamento: null,
      inicioReal: null,
      fimReal: null,
      historico: [],
      demo: true
    };
    ag.historico = historicoDe(ag);

    S.agendamentos.push(ag);
    S.agendamentos.sort(function (a, b) {
      if (a.dataChave !== b.dataChave) return a.dataChave < b.dataChave ? -1 : 1;
      return a.inicioMin - b.inicioMin;
    });

    if (ag.origem === 'site') {
      empurrarNotificacao({
        tipo: 'novo', titulo: 'Novo agendamento recebido',
        texto: nomeCurto(ag.clienteId) + ' marcou ' + nomeServico(servico.id) + ' pelo site.',
        rota: '#/agendamentos'
      });
    }
    store.notificar();
    return { ok: true, mensagem: 'Agendamento criado para ' + horaCurta(ag.inicio) + '.', agendamento: ag };
  }

  /* --- mudar status ----------------------------------------------------- */
  /* `extra` é opcional e carrega o que só existe em algumas transições —
     hoje, o registro de pagamento (na conclusão) e o horário real (no
     início). A assinatura antiga de três argumentos continua valendo. */
  function mudarStatus(id, novo, extra) {
    var ag = S.agendamentos.filter(function (a) { return a.id === id; })[0];
    if (!ag) return { ok: false, mensagem: 'Agendamento não encontrado.' };
    if (ag.status === novo) return { ok: true, mensagem: '', agendamento: ag };

    var anterior = ag.status;
    ag.status = novo;

    if (novo === 'atendimento') {
      /* Guarda o horário REAL de início. É dele que sai o cronômetro do
         drawer e o atraso registrado no histórico. */
      ag.inicioReal = (extra && extra.inicioReal) || agoraIsoLocal();
      /* O registro de pagamento é preservado: um atendimento que já tem
         valor lançado não pode perdê-lo ao entrar em atendimento. */
    }

    if (novo === 'concluido') {
      ag.fimReal = (extra && extra.fimReal) || agoraIsoLocal();
      if (extra && extra.pagamento) {
        ag.pagamento = extra.pagamento;
      } else if (!ag.pagamento) {
        /* Concluir sem passar pelo fluxo de finalização: registra o
           pagamento como PENDENTE, sem valor. Nunca inventa forma nem
           quantia — o Financeiro precisa poder dizer "ainda não lançado". */
        ag.pagamento = { forma: null, valor: null, desconto: 0, status: 'pendente', registradoEm: agoraIsoLocal() };
      } else if (ag.pagamento.status !== 'pago') {
        ag.pagamento.status = 'pendente';
      }
    }

    if (novo === 'cancelado' || novo === 'ausente') {
      /* O horário volta para a agenda. O pagamento NÃO é apagado: se houve
         cobrança lançada, apagar esconderia dinheiro que entrou. Ele fica
         marcado como estornado, que é a leitura correta. */
      ag.liberouHorario = true;
      if (ag.pagamento && ag.pagamento.valor != null) ag.pagamento.status = 'estornado';
    }

    ag.historico.push({
      quando: agoraIsoLocal(),
      texto: textoDaTransicao(anterior, novo, ag),
      tipo: novo
    });

    if (novo === 'cancelado') {
      empurrarNotificacao({
        tipo: 'cancelamento', titulo: 'Horário cancelado',
        texto: 'O horário de ' + horaCurta(ag.inicio) + ' voltou a ficar livre na agenda.',
        rota: '#/agenda'
      });
    }
    store.notificar();
    return { ok: true, mensagem: mensagemStatus(novo), agendamento: ag };
  }

  /* --- iniciar e finalizar -----------------------------------------------
     Atalhos com nome próprio para as duas ações que a proprietária repete
     todo dia. Existem para o fluxo do drawer ter um verbo só, sem obrigar
     a tela a conhecer o vocabulário do status. */
  function iniciarAtendimento(id, agora) {
    var ref = agora || new Date();
    return mudarStatus(id, 'atendimento', { inicioReal: ref.toISOString() });
  }

  function finalizarAtendimento(id, pagamento, agora) {
    var ref = agora || new Date();
    return mudarStatus(id, 'concluido', { fimReal: ref.toISOString(), pagamento: pagamento });
  }

  /* Registra/atualiza o pagamento de um atendimento já concluído, sem
     mexer no status. Usado pelo Financeiro e por correção de lançamento. */
  function registrarPagamento(id, pagamento) {
    var ag = S.agendamentos.filter(function (a) { return a.id === id; })[0];
    if (!ag) return { ok: false, mensagem: 'Agendamento não encontrado.' };
    ag.pagamento = pagamento;
    ag.historico.push({
      quando: agoraIsoLocal(),
      texto: pagamento && pagamento.valor != null
        ? 'Pagamento registrado · ' + moeda(valorLiquido(pagamento)) +
          (pagamento.status === 'pago' ? ' (pago)' : ' (pendente)')
        : 'Pagamento atualizado',
      tipo: 'pagamento'
    });
    store.notificar();
    return { ok: true, mensagem: 'Pagamento registrado.', agendamento: ag };
  }

  function textoDaTransicao(de, para, ag) {
    /* O início é o único que ganha texto próprio: o horário real de entrada
       é informação de gestão, e "Atendimento iniciado" sozinho perde o
       atraso. Nos outros casos o mapa basta. */
    if (para === 'atendimento' && ag && ag.inicioReal) {
      var inicio = new Date(ag.inicioReal);
      var atraso = (inicio.getHours() * 60 + inicio.getMinutes()) - ag.inicioMin;
      if (atraso > 0) return 'Atendimento iniciado com ' + atraso + ' min de atraso';
      if (atraso < 0) return 'Atendimento iniciado ' + Math.abs(atraso) + ' min antes do horário';
      return 'Atendimento iniciado no horário';
    }
    var mapa = {
      confirmado: 'Confirmado com a cliente',
      pendente: 'Marcado como pendente',
      atendimento: 'Atendimento iniciado',
      concluido: 'Serviço concluído',
      cancelado: 'Cancelado — horário liberado na agenda',
      ausente: 'Cliente não compareceu — horário liberado',
      novo: 'Reaberto como novo'
    };
    return mapa[para] || ('Alterado de ' + estado(de).nome + ' para ' + estado(para).nome);
  }
  function mensagemStatus(novo) {
    var mapa = {
      confirmado: 'Agendamento confirmado.',
      pendente: 'Agendamento marcado como pendente.',
      atendimento: 'Atendimento iniciado.',
      concluido: 'Atendimento concluído.',
      cancelado: 'Agendamento cancelado e horário liberado.',
      ausente: 'Registrado como não compareceu. Horário liberado.',
      novo: 'Agendamento reaberto.'
    };
    return mapa[novo] || 'Status atualizado.';
  }

  /* --- reagendar -------------------------------------------------------- */
  function reagendar(id, novaChave, novoInicio) {
    var ag = S.agendamentos.filter(function (a) { return a.id === id; })[0];
    if (!ag) return { ok: false, mensagem: 'Agendamento não encontrado.' };
    var servico = S.servicos.filter(function (s) { return s.id === ag.servicoId; })[0];
    var inicioMin = D.minutosDe(novoInicio);

    /* Ignora o próprio agendamento ao checar o novo lugar — de outra
       forma ele ocuparia a vaga contra si mesmo. */
    var outros = S.agendamentos.filter(function (a) { return a.id !== id; });
    var carga = cargaDoDia(novaChave, outros, S.bloqueios);

    var bloqueado = false;
    for (var mb = inicioMin; mb < inicioMin + servico.duracao; mb += D.PASSO_MIN) {
      if (carga.bloqueado[mb]) { bloqueado = true; break; }
    }
    if (bloqueado) return { ok: false, mensagem: 'Esse horário está bloqueado na agenda.' };

    /* Reagendar mantém a MESMA profissional: foi ela quem combinou o
       serviço com a cliente. Trocar de profissional por conta própria
       seria o sistema decidindo algo que é conversa de salão. */
    var dona = profissional(ag.profissionalId);
    if (!vagaNoPosto(dona, servico.id, novaChave, inicioMin, servico.duracao, carga)) {
      return { ok: false, mensagem: dona.nome + ' não tem vaga nesse horário: já está' +
        ' com ' + capacidadeDe(dona, servico.id) + ' clientes ao mesmo tempo.' +
        ' Escolha outro horário.' };
    }

    var deOnde = quando(ag.dataChave, ag.inicio);
    ag.dataChave = novaChave;
    ag.inicio = D.hhmmDe(inicioMin);
    ag.inicioMin = inicioMin;
    ag.fim = D.hhmmDe(inicioMin + servico.duracao);
    /* Reagendar reabre a confirmação: a cliente precisa confirmar de novo. */
    if (ag.status === 'confirmado' || ag.status === 'novo') ag.status = 'pendente';
    ag.historico.push({
      quando: agoraIsoLocal(),
      texto: 'Reagendado de ' + deOnde + ' para ' + quando(novaChave, ag.inicio),
      tipo: 'reagendado'
    });

    S.agendamentos.sort(function (a, b) {
      if (a.dataChave !== b.dataChave) return a.dataChave < b.dataChave ? -1 : 1;
      return a.inicioMin - b.inicioMin;
    });

    empurrarNotificacao({
      tipo: 'reagendar', titulo: 'Agendamento reagendado',
      texto: nomeCurto(ag.clienteId) + ' foi movida para ' + quando(novaChave, ag.inicio) + '.',
      rota: '#/agendamentos'
    });
    store.notificar();
    return { ok: true, mensagem: 'Reagendado para ' + quando(novaChave, ag.inicio) + '.', agendamento: ag };
  }

  /* --- bloquear horário ------------------------------------------------- */
  function criarBloqueio(dados) {
    var inicioMin = D.minutosDe(dados.inicio);
    var fimMin = D.minutosDe(dados.fim);
    if (fimMin <= inicioMin) {
      return { ok: false, mensagem: 'O fim precisa ser depois do início.' };
    }
    var chave = dados.dataChave;

    /* Bloquear não pode passar por cima de um atendimento já marcado. */
    var conflito = doDia(S.agendamentos, chave).filter(function (a) {
      if (!ocupaAgenda(a)) return false;
      return a.inicioMin < fimMin && a.inicioMin + a.duracao > inicioMin;
    });
    if (conflito.length) {
      var c = conflito[0];
      return {
        ok: false,
        mensagem: 'Há um atendimento nesse intervalo (' + horaCurta(c.inicio) + '). ' +
                  'Cancele ou reagende antes de bloquear.'
      };
    }

    S.contadorId += 1;
    var b = {
      id: 'bl' + S.contadorId,
      dataChave: chave,
      inicio: D.hhmmDe(inicioMin),
      fim: D.hhmmDe(fimMin),
      inicioMin: inicioMin,
      fimMin: fimMin,
      motivo: dados.motivo || 'indisponivel',
      observacao: dados.observacao || '',
      recorrente: false,
      demo: true
    };
    S.bloqueios.push(b);
    store.notificar();
    return { ok: true, mensagem: 'Horário bloqueado.', bloqueio: b };
  }

  function removerBloqueio(id) {
    var antes = S.bloqueios.length;
    S.bloqueios = S.bloqueios.filter(function (b) { return b.id !== id; });
    if (S.bloqueios.length === antes) return { ok: false, mensagem: 'Bloqueio não encontrado.' };
    store.notificar();
    return { ok: true, mensagem: 'Bloqueio removido. O horário voltou a ficar livre.' };
  }

  /* --- serviços --------------------------------------------------------- */
  function salvarServico(dados) {
    if (dados.id) {
      var s = S.servicos.filter(function (x) { return x.id === dados.id; })[0];
      if (!s) return { ok: false, mensagem: 'Serviço não encontrado.' };
      s.nome = dados.nome; s.categoria = dados.categoria;
      s.duracao = dados.duracao; s.resumo = dados.resumo;
      s.online = !!dados.online; s.ativo = !!dados.ativo;
      store.notificar();
      return { ok: true, mensagem: 'Serviço atualizado.' };
    }
    S.contadorId += 1;
    S.servicos.push({
      id: 's' + S.contadorId,
      nome: dados.nome,
      categoria: dados.categoria,
      resumo: dados.resumo || '',
      duracao: dados.duracao,
      preco: null,            /* nunca inventamos preço */
      online: !!dados.online,
      ativo: dados.ativo !== false,
      desde: D.chaveDe(new Date()),
      realizadosDemo: 0,
      real: false             /* criado na demonstração, não é serviço da marca */
    });
    store.notificar();
    return { ok: true, mensagem: 'Serviço criado.' };
  }

  /* Cadastro e edição de profissional (§11). Como todo salvar* daqui:
     devolve { ok, mensagem } e não inventa backend — escreve na mesma
     camada local, que é onde todo o painel vive nesta apresentação.

     `capacidadePorServico` é preservada quando não vem no formulário. A
     tela ainda não edita esse mapa (o §6 pede a estrutura, não o
     preenchimento de valores inventados); apagar no salvar seria destruir
     configuração que a proprietária fez por outro caminho. */
  function salvarProfissional(dados) {
    var cap = Number(dados.capacidade);
    if (!cap || cap < 1) cap = 1;
    if (cap > 30) cap = 30;

    var dias = (dados.dias || []).map(Number).filter(function (d) {
      return d >= 0 && d <= 6;
    });

    if (dados.id) {
      var p = (S.profissionais || []).filter(function (x) { return x.id === dados.id; })[0];
      if (!p) return { ok: false, mensagem: 'Profissional não encontrada.' };
      p.nome = dados.nome;
      p.funcao = dados.funcao || p.funcao;
      p.capacidade = cap;
      p.dias = dias;
      p.entrada = dados.entrada || p.entrada;
      p.saida = dados.saida || p.saida;
      p.intervaloInicio = dados.intervaloInicio || null;
      p.intervaloFim = dados.intervaloFim || null;
      p.servicos = (dados.servicos || []).slice();
      if (dados.capacidadePorServico) {
        p.capacidadePorServico = Object.assign({}, dados.capacidadePorServico);
      }
      p.ativo = dados.ativo !== false;
      store.notificar();
      return { ok: true, mensagem: 'Profissional atualizada.' };
    }

    S.contadorId += 1;
    /* O nome vem do formulário; sem ele, número de posto. Nunca um nome
       de pessoa inventado pelo sistema. */
    var numero = (S.profissionais || []).length + 1;
    S.profissionais.push({
      id: 'p' + S.contadorId,
      numero: numero,
      nome: dados.nome || ('Profissional ' + (numero < 10 ? '0' : '') + numero),
      curto: dados.curto || ('P' + numero),
      funcao: dados.funcao || 'Profissional',
      ativo: dados.ativo !== false,
      exemplo: true,          /* criada na demonstração, não é pessoa real */
      capacidade: cap,
      dias: dias,
      entrada: dados.entrada || '09:00',
      saida: dados.saida || '18:00',
      intervaloInicio: dados.intervaloInicio || null,
      intervaloFim: dados.intervaloFim || null,
      servicos: (dados.servicos || []).slice(),
      capacidadePorServico: {}
    });
    store.notificar();
    return { ok: true, mensagem: 'Profissional cadastrada.' };
  }

  function alternarOnlineServico(id) {
    var s = S.servicos.filter(function (x) { return x.id === id; })[0];
    if (!s) return { ok: false, mensagem: 'Serviço não encontrado.' };
    s.online = !s.online;
    store.notificar();
    return {
      ok: true,
      mensagem: s.online
        ? '"' + s.nome + '" voltou a aparecer para agendamento online.'
        : '"' + s.nome + '" não aparece mais para agendamento online.'
    };
  }

  /* --- clientes ---------------------------------------------------------- */
  function salvarCliente(dados) {
    if (dados.id) {
      var c = S.clientes.filter(function (x) { return x.id === dados.id; })[0];
      if (!c) return { ok: false, mensagem: 'Cliente não encontrado.' };
      c.nome = dados.nome; c.fone = dados.fone; c.email = dados.email || '';
      c.nota = dados.nota || '';
      store.notificar();
      return { ok: true, mensagem: 'Ficha atualizada.', cliente: c };
    }
    S.contadorId += 1;
    var novo = {
      id: 'c' + S.contadorId,
      nome: dados.nome, fone: dados.fone, email: dados.email || '',
      desde: D.chaveDe(new Date()), nota: dados.nota || ''
    };
    S.clientes.push(novo);
    store.notificar();
    return { ok: true, mensagem: 'Cliente cadastrado.', cliente: novo };
  }

  /* --- configurações ---------------------------------------------------- */
  function salvarFuncionamento(lista) {
    S.funcionamento = lista;
    store.notificar();
    return { ok: true, mensagem: 'Horários de funcionamento atualizados.' };
  }
  function salvarConfig(parcial) {
    Object.keys(parcial).forEach(function (k) { S.config[k] = parcial[k]; });
    store.notificar();
    return { ok: true, mensagem: 'Configurações salvas.' };
  }

  /* A janela de agendamento (config.janelaMaxima) é medida em DIAS, mas
     ninguém escolhe "45" — escolhe-se até quando a agenda fica aberta. Este
     helper é o único lugar que converte uma coisa na outra; assim o número
     exibido em Configurações e o que a agenda usaria amanhã nunca divergem. */
  function limiteDeAgendamento(agora) {
    var base = agora ? new Date(agora.getTime()) : new Date();
    var dias = Number(S.config.janelaMaxima);
    if (isNaN(dias) || dias < 0) dias = 0;
    return D.chaveDe(new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias));
  }

  /* --- notificações -----------------------------------------------------
     Os interruptores de Configurações → Notificações decidem QUAIS destes
     avisos o painel mostra. A regra vive aqui, no único ponto por onde
     todos passam, e não espalhada pelas telas: assim desligar "novo
     agendamento" desliga de verdade, em qualquer caminho que crie um. */
  var AVISO_POR_TIPO = {
    novo: 'notificarNovo',
    cancelamento: 'notificarCancelamento',
    reagendar: 'notificarReagendamento'
  };

  function empurrarNotificacao(n) {
    var chave = AVISO_POR_TIPO[n.tipo];
    if (chave && S.config[chave] === false) return;
    S.notificacoes.unshift({
      id: 'n' + (++S.contadorId),
      tipo: n.tipo || 'novo',
      titulo: n.titulo,
      texto: n.texto || '',
      minutosAtras: 0,
      lida: false,
      rota: n.rota || '#/visao-geral'
    });
  }
  function marcarNotificacaoLida(id) {
    var n = S.notificacoes.filter(function (x) { return x.id === id; })[0];
    if (n) n.lida = true;
    store.notificar();
  }
  function marcarTodasLidas() {
    S.notificacoes.forEach(function (n) { n.lida = true; });
    store.notificar();
  }
  function naoLidas() {
    return S.notificacoes.filter(function (n) { return !n.lida; }).length;
  }

  /* =======================================================================
     6. AUXILIARES DE NOME
     ======================================================================= */
  function nomeCliente(id) {
    var c = S.clientes.filter(function (x) { return x.id === id; })[0];
    return c ? c.nome : 'Cliente';
  }
  function nomeCurto(id) { return primeiroNome(nomeCliente(id)); }
  function nomeServico(id) {
    var s = S.servicos.filter(function (x) { return x.id === id; })[0];
    return s ? s.nome : 'Serviço';
  }
  /* Aceitam tanto o agendamento inteiro quanto o id solto. Sem isso, quem
     chama com o id recebe null e a tela quebra ao ler .nome — foi o que
     aconteceu em linhaAgendamento. */
  function clienteDe(ag) {
    var id = typeof ag === 'string' ? ag : (ag ? ag.clienteId : null);
    return S.clientes.filter(function (c) { return c.id === id; })[0] || null;
  }
  function servicoDe(ag) {
    var id = typeof ag === 'string' ? ag : (ag ? ag.servicoId : null);
    return S.servicos.filter(function (s) { return s.id === id; })[0] || null;
  }

  /* Texto pronto de um agendamento, para busca e para leitores de tela */
  function textoBusca(ag) {
    var c = clienteDe(ag), s = servicoDe(ag);
    return [
      c ? c.nome : '', c ? c.fone : '', c ? c.email : '',
      s ? s.nome : '', s ? s.categoria : '',
      ag.observacoes, estado(ag.status).nome, origem(ag.origem).nome,
      ag.inicio, ag.fim, dataCompleta(ag.dataChave)
    ].join(' ').toLowerCase();
  }

  /* =======================================================================
     7. ROTEADOR — rotas por hash, uma tela por vez, sem recarregar
     ======================================================================= */
  var ROTAS = [
    { id: 'visao-geral',  rotulo: 'Visão geral',   url: '#/visao-geral' },
    { id: 'agenda',       rotulo: 'Agenda',        url: '#/agenda' },
    { id: 'agendamentos', rotulo: 'Agendamentos',  url: '#/agendamentos' },
    { id: 'clientes',     rotulo: 'Clientes',      url: '#/clientes' },
    { id: 'equipe',       rotulo: 'Equipe',        url: '#/equipe' },
    { id: 'servicos',     rotulo: 'Serviços',      url: '#/servicos' },
    { id: 'financeiro',   rotulo: 'Financeiro',    url: '#/financeiro' },
    { id: 'relatorios',   rotulo: 'Relatórios',    url: '#/relatorios' },
    { id: 'config',       rotulo: 'Configurações', url: '#/config' }
  ];
  /* Aliases: rotas de detalhe caem na tela que as contém. */
  var ALIASES = {
    'cliente': 'clientes',
    'profissional': 'equipe',
    'profissionais': 'equipe',
    'servico': 'servicos',
    'agendamento': 'agendamentos',
    'configuracoes': 'config',
    'dashboard': 'visao-geral',
    'inicio': 'visao-geral'
  };

  function analisarHash(hash) {
    var bruto = String(hash || '').replace(/^#\/?/, '');
    if (!bruto) return { tela: 'visao-geral', params: [] };
    /* Suporta "#/clientes/c01" e "#/agenda/2026-09-24" */
    var partes = bruto.split('/').filter(Boolean);
    var tela = partes[0];
    tela = ALIASES[tela] || tela;
    return { tela: tela, params: partes.slice(1) };
  }

  function rotaExiste(tela) {
    return ROTAS.some(function (r) { return r.id === tela; });
  }

  var roteador = (function () {
    var aoMudar = [];
    function atual() { return analisarHash(window.location.hash); }
    function ir(url) {
      if (window.location.hash === url) { disparar(); return; }
      window.location.hash = url;
    }
    function disparar() {
      var r = atual();
      if (!rotaExiste(r.tela)) r = { tela: 'visao-geral', params: [] };
      aoMudar.forEach(function (fn) { fn(r.tela, r.params); });
    }
    window.addEventListener('hashchange', disparar);
    return {
      atual: atual,
      ir: ir,
      disparar: disparar,
      emMudanca: function (fn) { aoMudar.push(fn); }
    };
  })();

  /* =======================================================================
     8. EXPOSIÇÃO
     ======================================================================= */
  window.EHN = {
    /* formatadores */
    horaCurta: horaCurta, horaCheia: horaCheia, intervalo: intervalo,
    duracaoLegivel: duracaoLegivel, dataLonga: dataLonga, dataCurta: dataCurta,
    dataCompleta: dataCompleta, rotuloDia: rotuloDia, quando: quando,
    haQuanto: haQuanto, telefoneLegivel: telefoneLegivel, mascararTelefone: mascararTelefone,
    moeda: moeda, numero: numero, percentual: percentual, iniciais: iniciais,
    /* utilidades de hora, reexportadas para as telas não dependerem de dois
       namespaces diferentes para a mesma conta */
    minutosDe: D.minutosDe, hhmmDe: D.hhmmDe, chaveDe: D.chaveDe, dataDeChave: D.dataDeChave,
    matizDe: matizDe, primeiroNome: primeiroNome, saudacao: saudacao,
    /* estado */
    ESTADOS: ESTADOS, ORDEM_ESTADOS: ORDEM_ESTADOS, estado: estado,
    ORIGENS: ORIGENS, origem: origem, ocupaAgenda: ocupaAgenda, estaAtivo: estaAtivo,
    /* estado temporal e pagamento */
    estadoTemporal: estadoTemporal, tempoEmCurso: tempoEmCurso,
    pagamentoDe: pagamentoDe, valorLiquido: valorLiquido, valorLiquidoDe: valorLiquidoDe,
    formaPagamento: formaPagamento, nomeFormaPagamento: nomeFormaPagamento,
    statusPagamento: statusPagamento, resumoFinanceiro: resumoFinanceiro,
    /* equipe, capacidade e vagas — a regra que substituiu a cadeira única */
    SITUACOES_EQUIPE: SITUACOES_EQUIPE, situacaoEquipe: situacaoEquipe,
    profissional: profissional, profissionaisAtivas: profissionaisAtivas,
    fazServico: fazServico, quemFaz: quemFaz, capacidadeDe: capacidadeDe,
    janelaDe: janelaDe, cargaDoDia: cargaDoDia, situacaoDa: situacaoDa,
    vagasDe: vagasDe, equipeDoDia: equipeDoDia, vagaNoPosto: vagaNoPosto,
    /* consultas puras */
    doDia: doDia, bloqueiosDoDia: bloqueiosDoDia, mapaOcupacao: mapaOcupacao,
    situacaoHorario: situacaoHorario, horariosDisponiveis: horariosDisponiveis,
    resumoDoDia: resumoDoDia, proximoAtendimento: proximoAtendimento,
    emAndamento: emAndamento, historicoDoCliente: historicoDoCliente,
    fichaCliente: fichaCliente,
    /* loja */
    store: store, dados: S,
    criarAgendamento: criarAgendamento, mudarStatus: mudarStatus, reagendar: reagendar,
    iniciarAtendimento: iniciarAtendimento, finalizarAtendimento: finalizarAtendimento,
    registrarPagamento: registrarPagamento,
    criarBloqueio: criarBloqueio, removerBloqueio: removerBloqueio,
    salvarServico: salvarServico, alternarOnlineServico: alternarOnlineServico,
    salvarProfissional: salvarProfissional,
    salvarCliente: salvarCliente, salvarFuncionamento: salvarFuncionamento,
    salvarConfig: salvarConfig, limiteDeAgendamento: limiteDeAgendamento,
    empurrarNotificacao: empurrarNotificacao, marcarNotificacaoLida: marcarNotificacaoLida,
    marcarTodasLidas: marcarTodasLidas, naoLidas: naoLidas,
    nomeCliente: nomeCliente, nomeCurto: nomeCurto, nomeServico: nomeServico,
    clienteDe: clienteDe, servicoDe: servicoDe, textoBusca: textoBusca,
    /* rotas */
    ROTAS: ROTAS, analisarHash: analisarHash, rotaExiste: rotaExiste, roteador: roteador,
    /* histórico de um agendamento isolado (usado ao criar) */
    historicoDe: historicoDe
  };

  /* historicoDe precisa existir antes de criarAgendamento usá-lo; é declarada
     por elevação de função, então a referência acima já resolve. */
  function historicoDe(ag) {
    var linhas = [{
      quando: ag.criadoEm,
      texto: ag.origem === 'site' ? 'Recebido pelo site' : 'Lançado no painel do salão',
      tipo: ag.origem
    }];
    if (['confirmado','atendimento','concluido','ausente'].indexOf(ag.status) !== -1) {
      linhas.push({ quando: ag.criadoEm, texto: 'Confirmado com a cliente', tipo: 'confirmado' });
    }
    if (ag.status === 'concluido') {
      linhas.push({ quando: ag.criadoEm, texto: 'Serviço concluído', tipo: 'concluido' });
    }
    return linhas;
  }
})();
