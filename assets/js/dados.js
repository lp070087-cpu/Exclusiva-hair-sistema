/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA DE GESTÃO · dados.js
   Camada de dados DEMONSTRATIVA.

   REGRA QUE GOVERNA ESTE ARQUIVO:
   - O que é REAL da Exclusiva Hair vem dos materiais da marca e está marcado
     com  real:true  — nome do salão, serviços oferecidos, duração estimada,
     grade de funcionamento (seg a sáb, 9h às 18h), cidade.
   - O que é INVENTADO está marcado com  real:false  — clientes, telefones,
     agendamentos, valores financeiros. Serve só para a tela ficar viva.
   - Nenhum preço é atribuído a serviço nenhum: os materiais da marca não
     trazem tabela de preços, então todo serviço exibe "Consultar". O
     financeiro demonstrativo NÃO deriva de preço de serviço — deriva de um
     ticket médio explicitamente fictício (ver DEMO).
   ========================================================================== */
(function () {
  'use strict';

  /* =======================================================================
     AVISO GLOBAL
     ======================================================================= */
  var DEMO = {
    avisoCurto: 'Dados demonstrativos',
    avisoLongo:
      'Os números desta tela são demonstrativos e servem apenas para ilustrar o ' +
      'funcionamento do sistema. Não representam o faturamento, o movimento real ' +
      'nem a carteira de clientes da Exclusiva Hair.',
    /* Mix de formas de pagamento — fictício. 'outro' fecha a lista porque o
       salão precisa poder registrar o que não cabe nas quatro anteriores. */
    formasPagamento: [
      { id: 'pix',     nome: 'PIX',               peso: 46 },
      { id: 'credito', nome: 'Cartão de crédito', peso: 30 },
      { id: 'debito',  nome: 'Cartão de débito',  peso: 15 },
      { id: 'dinheiro',nome: 'Dinheiro',          peso: 9  },
      { id: 'outro',   nome: 'Outro',             peso: 0  }
    ],
    /* Situações do pagamento, na fonte única — as telas nunca escrevem
       'Pago' à mão. */
    statusPagamento: [
      { id: 'pendente', nome: 'Pendente' },
      { id: 'pago',     nome: 'Pago' },
      { id: 'parcial',  nome: 'Parcial' },
      { id: 'estornado',nome: 'Estornado' }
    ]
  };

  /* =======================================================================
     VALOR DEMONSTRATIVO DO ATENDIMENTO

     LEIA ANTES DE MEXER. Isto não é a tabela de preços da Exclusiva Hair.

     Os materiais da marca não trazem preço de serviço nenhum, e por isso
     `SERVICOS[].preco` continua null para os oito — a interface segue
     dizendo "Consultar" no VALOR DO SERVIÇO, que é onde o preço oficial
     apareceria.

     O que existe aqui é outra coisa: a quantia que aparece no registro de
     um atendimento JÁ CONCLUÍDO da base fictícia. Sem ela, o Financeiro do
     painel não teria como demonstrar faturamento, ticket médio e desconto —
     e o pedido da proprietária foi justamente por um Financeiro útil.

     Como o valor nasce: uma FAIXA por serviço (nunca um preço único), e o
     número dentro dela é sorteado do mesmo gerador determinístico do resto
     da base. O mesmo atendimento vale sempre o mesmo, em qualquer hora e
     em qualquer máquina.

     Duas consequências que importam:
       · Todo valor daqui é marcado DEMONSTRATIVO na tela. No sistema real
         ele vem do cadastro do serviço, que é onde o salão põe o preço.
       · Nenhuma tela deriva preço de serviço daqui. `preco` continua null.
     ======================================================================= */
  var VALOR_DEMO = {
    /* faixa por id de serviço. min/max em reais; passo de 10 no sorteio. */
    alisamento: { min: 220, max: 340 },
    tratamento: { min: 120, max: 200 },
    cronograma: { min: 150, max: 240 },
    lavagem:    { min:  60, max: 110 },
    oleo:       { min:  40, max:  80 },
    sos:        { min: 110, max: 180 },
    detox:      { min:  90, max: 150 },
    avaliacao:  { min:  0,  max:   0 }   // avaliação não é cobrada
  };

  /* Monta o registro de pagamento de um atendimento concluído. Devolve null
     quando não há o que registrar — e null de verdade, nunca zero: um
     atendimento sem valor lançado não é um atendimento que valeu nada. */
  function montarPagamento(status, chave, inicioMin, servicoId) {
    if (status !== 'concluido') return null;
    var t = VALOR_DEMO[servicoId];
    if (!t) return null;
    if (t.max <= 0) {
      return { forma: null, valor: null, desconto: 0, status: 'nao-cobrado', registradoEm: null };
    }
    /* Sorteador PRÓPRIO, semeado pela chave do atendimento: independe do
       relógio e do fluxo compartilhado da geração. */
    var r = sorteador(sementeDe('pag#' + chave + '#' + inicioMin));
    var valor = t.min + Math.floor(r() * ((t.max - t.min) / 10 + 1)) * 10;
    var desconto = Math.floor(r() * 7) * 5;                  // 0 a 30, de 5 em 5
    var formas = DEMO.formasPagamento;
    return {
      forma: formas[Math.floor(r() * (formas.length - 1))].id,  // 'outro' fora do sorteio
      valor: valor,
      desconto: Math.min(desconto, valor),
      status: 'pago',
      registradoEm: null
    };
  }

  /* =======================================================================
     CONSTANTES DE AGENDA — vindas do funcionamento real do salão
     ======================================================================= */
  var PASSO_MIN = 30;
  var ABERTURA_MIN = 9 * 60;    // 540  — 09:00
  var FECHAMENTO_MIN = 18 * 60; // 1080 — 18:00

  /* Slots de INÍCIO possíveis: 09:00 até 17:30. O 18:00 é o fechamento,
     não um horário em que se começa um serviço. 18 slots. */
  function hhmm(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  var HORARIOS_GRADE = (function () {
    var lista = [];
    for (var m = ABERTURA_MIN; m + PASSO_MIN <= FECHAMENTO_MIN; m += PASSO_MIN) {
      lista.push(hhmm(m));
    }
    return lista;
  })();

  var DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  var DIAS_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var DIAS_MIN = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  var MESES = ['janeiro','fevereiro','março','abril','maio','junho',
               'julho','agosto','setembro','outubro','novembro','dezembro'];
  var MESES_CURTO = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  /* =======================================================================
     CATEGORIAS — agrupamento dos serviços reais
     ======================================================================= */
  var CATEGORIAS = [
    { id: 'alisamento', nome: 'Alisamento' },
    { id: 'tratamento', nome: 'Tratamentos' },
    { id: 'cuidados',   nome: 'Cuidados e lavagem' },
    { id: 'finalizacao',nome: 'Finalização' },
    { id: 'diagnostico',nome: 'Diagnóstico' }
  ];

  /* =======================================================================
     SERVIÇOS — os OITO reais oferecidos pelo salão (fonte: apresentação
     pública da própria Exclusiva Hair). Duração é estimativa de agenda para
     a demonstração funcionar; preço é null porque a marca não publica tabela.
     ======================================================================= */
  var SERVICOS = [
    { id: 'alisamento', nome: 'Alisamento',               categoria: 'alisamento',
      resumo: 'A especialidade da casa, do fio rebelde ao liso saudável.',
      duracao: 180, preco: null, online: true,  ativo: true,
      desde: '2024-01-01', realizadosDemo: 412, real: true },

    { id: 'tratamento', nome: 'Tratamento personalizado', categoria: 'tratamento',
      resumo: 'Protocolo montado para o fio, não para uma tabela.',
      duracao: 90, preco: null, online: true,  ativo: true,
      desde: '2024-01-01', realizadosDemo: 388, real: true },

    { id: 'cronograma', nome: 'Cronograma capilar',       categoria: 'tratamento',
      resumo: 'Etapas programadas de tratamento, com produtos AGL Professional.',
      duracao: 120, preco: null, online: true,  ativo: true,
      desde: '2024-01-01', realizadosDemo: 154, real: true },

    { id: 'lavagem',    nome: 'Lavagem e hidratação',     categoria: 'cuidados',
      resumo: 'O momento mais relaxante da visita, com massagem no couro.',
      duracao: 60, preco: null, online: true,  ativo: true,
      desde: '2024-01-01', realizadosDemo: 503, real: true },

    { id: 'oleo',       nome: 'Óleo perfumado',           categoria: 'finalizacao',
      resumo: 'Finalização que deixa fragrância e brilho no fio.',
      duracao: 30, preco: null, online: true,  ativo: true,
      desde: '2024-01-01', realizadosDemo: 341, real: true },

    { id: 'sos',        nome: 'Cabelo S.O.S',             categoria: 'tratamento',
      resumo: 'Para quando o fio pede cuidado imediato.',
      duracao: 90, preco: null, online: true,  ativo: true,
      desde: '2024-01-01', realizadosDemo: 197, real: true },

    { id: 'detox',      nome: 'Detox capilar',            categoria: 'tratamento',
      resumo: 'Limpeza profunda para devolver leveza aos fios.',
      duracao: 60, preco: null, online: true,  ativo: true,
      desde: '2024-01-01', realizadosDemo: 229, real: true },

    { id: 'avaliacao',  nome: 'Avaliação do fio',         categoria: 'diagnostico',
      resumo: 'Antes de qualquer protocolo: é dessa leitura que sai o cuidado.',
      duracao: 30, preco: null, online: true,  ativo: true,
      desde: '2024-01-01', realizadosDemo: 466, real: true }
  ];

  /* =======================================================================
     PROFISSIONAIS — EQUIPE DA CASA

     ATENÇÃO, e é a regra mais importante deste bloco: os NOMES REAIS da
     equipe não existem nos materiais do salão. Não inventamos pessoa
     nenhuma. O que existe aqui são três POSTOS DE TRABALHO numerados —
     "Profissional 01/02/03" — cada um com as características OPERACIONAIS
     que a proprietária nos contou: quantas clientes consegue acompanhar
     ao mesmo tempo, quais serviços realiza, e em que dias e horas
     trabalha. Nada disso é nome de gente.

     CAPACIDADE SIMULTÂNEA é o conceito que muda a agenda inteira. No
     Exclusiva Hair uma profissional acompanha várias clientes ao mesmo
     tempo (processos que ficam "descansando" no fio), então a regra
     "1 profissional = 1 cliente por horário" está ERRADA aqui. O que
     limita não é o relógio: é quantas clientes cabem juntas.

     `capacidade` é o teto GERAL do posto. `capacidadePorServico` é a
     estrutura para a regra ainda melhor — o teto variar conforme o
     serviço, porque um alisamento prende a profissional e uma avaliação
     não. Os valores de exemplo NÃO foram inventados: é um mapa VAZIO, de
     propósito. Enquanto a proprietária não configurar, vale a capacidade
     geral, e o painel diz isso em vez de fingir um número.

     `servicos` é a lista de SERVIÇOS QUE ESTA PROFISSIONAL REALIZA. É
     ela que decide quem pode receber qual atendimento — a agenda futura
     consulta isso antes de oferecer um horário.
     ======================================================================= */
  var PROFISSIONAIS = [
    {
      id: 'p1', numero: 1, nome: 'Profissional 01', curto: 'P1',
      funcao: 'Cabeleireira', ativo: true, exemplo: true,
      capacidade: 8,
      /* dias de trabalho: 1=seg … 6=sáb (0=domingo o salão não abre) */
      dias: [1, 2, 3, 4, 5, 6],
      entrada: '09:00', intervaloInicio: '12:00', intervaloFim: '13:00', saida: '18:00',
      servicos: ['alisamento', 'tratamento', 'cronograma', 'lavagem', 'oleo', 'sos', 'detox', 'avaliacao'],
      capacidadePorServico: {}
    },
    {
      id: 'p2', numero: 2, nome: 'Profissional 02', curto: 'P2',
      funcao: 'Cabeleireira', ativo: true, exemplo: true,
      capacidade: 6,
      dias: [1, 2, 3, 4, 5],
      entrada: '09:00', intervaloInicio: '12:00', intervaloFim: '13:00', saida: '18:00',
      servicos: ['tratamento', 'cronograma', 'lavagem', 'oleo', 'detox', 'avaliacao'],
      capacidadePorServico: {}
    },
    {
      id: 'p3', numero: 3, nome: 'Profissional 03', curto: 'P3',
      funcao: 'Cabeleireira', ativo: true, exemplo: true,
      capacidade: 8,
      dias: [1, 2, 3, 4, 5, 6],
      entrada: '10:00', intervaloInicio: '13:00', intervaloFim: '14:00', saida: '19:00',
      servicos: ['alisamento', 'lavagem', 'oleo', 'sos', 'detox', 'avaliacao'],
      capacidadePorServico: {}
    }
  ];

  /* Um ID que ainda aparece nos dados antigos e nos cadastros que a
     proprietária criar. `a-definir` era o único responsável possível
     quando a equipe não existia; hoje ele resolve para a primeira
     profissional ativa, para nenhum registro ficar órfão. */
  var PROFISSIONAL_PADRAO = 'p1';

  /* =======================================================================
     CLIENTES — fictícios. Telefones com miolo 90000/91000 para não haver
     dúvida de que não são números reais. E-mails no domínio exemplo.com.br.
     ======================================================================= */
  var CLIENTES = [
    { id: 'c01', nome: 'Maria Silva',          fone: '81 90000-0001', email: 'maria.silva@exemplo.com.br',
      desde: '2024-03-12', nota: 'Prefere horário no fim da tarde. Fio fino, pede calor baixo.' },
    { id: 'c02', nome: 'Ana Beatriz Lima',     fone: '81 90000-0002', email: 'ana.lima@exemplo.com.br',
      desde: '2024-05-02', nota: 'Mantém cronograma a cada 45 dias.' },
    { id: 'c03', nome: 'Carla Menezes',        fone: '81 90000-0003', email: 'carla.menezes@exemplo.com.br',
      desde: '2024-06-18', nota: '' },
    { id: 'c04', nome: 'Daniela Rocha',        fone: '81 90000-0004', email: 'daniela.rocha@exemplo.com.br',
      desde: '2024-08-07', nota: 'Gosta de finalização com óleo perfumado.' },
    { id: 'c05', nome: 'Eduardo Paiva',        fone: '81 90000-0005', email: 'eduardo.paiva@exemplo.com.br',
      desde: '2024-09-23', nota: 'Indicado por Ana Beatriz.' },
    { id: 'c06', nome: 'Fernanda Queiroz',     fone: '81 90000-0006', email: 'fernanda.queiroz@exemplo.com.br',
      desde: '2024-11-14', nota: 'Costuma remarcar; confirmar por telefone na véspera.' },
    { id: 'c07', nome: 'Gabriela Nunes',       fone: '81 90000-0007', email: 'gabriela.nunes@exemplo.com.br',
      desde: '2025-01-09', nota: '' },
    { id: 'c08', nome: 'Helena Marques',       fone: '81 90000-0008', email: 'helena.marques@exemplo.com.br',
      desde: '2025-02-21', nota: 'Fio com química anterior — avaliar antes do protocolo.' },
    { id: 'c09', nome: 'Isabela Freitas',      fone: '81 90000-0009', email: 'isabela.freitas@exemplo.com.br',
      desde: '2025-03-30', nota: '' },
    { id: 'c10', nome: 'Juliana Sampaio',      fone: '81 90000-0010', email: 'juliana.sampaio@exemplo.com.br',
      desde: '2025-05-11', nota: 'Prefere sábado pela manhã.' },
    { id: 'c11', nome: 'Larissa Andrade',      fone: '81 90000-0011', email: 'larissa.andrade@exemplo.com.br',
      desde: '2025-06-27', nota: '' },
    { id: 'c12', nome: 'Marcela Vieira',       fone: '81 90000-0012', email: 'marcela.vieira@exemplo.com.br',
      desde: '2025-08-04', nota: 'Veio pela primeira vez pelo site.' },
    { id: 'c13', nome: 'Natália Correia',      fone: '81 90000-0013', email: 'natalia.correia@exemplo.com.br',
      desde: '2025-09-16', nota: '' },
    { id: 'c14', nome: 'Patrícia Alves',       fone: '81 90000-0014', email: 'patricia.alves@exemplo.com.br',
      desde: '2025-10-29', nota: 'Fio longo — reservar mais tempo na agenda.' },
    { id: 'c15', nome: 'Renata Coelho',        fone: '81 90000-0015', email: 'renata.coelho@exemplo.com.br',
      desde: '2026-01-13', nota: '' },
    { id: 'c16', nome: 'Sofia Bittencourt',    fone: '81 90000-0016', email: 'sofia.bittencourt@exemplo.com.br',
      desde: '2026-03-05', nota: 'Sensível a aroma forte.' },
    { id: 'c17', nome: 'Tatiane Moraes',       fone: '81 90000-0017', email: 'tatiane.moraes@exemplo.com.br',
      desde: '2026-05-22', nota: '' },
    { id: 'c18', nome: 'Vanessa Duarte',       fone: '81 90000-0018', email: 'vanessa.duarte@exemplo.com.br',
      desde: '2026-07-08', nota: 'Prefere contato por WhatsApp.' },
    /* Cliente sem cadastro: atendimento de balcão. Existe para demonstrar
       que o salão pode lançar um agendamento manual sem ficha completa. */
    { id: 'c00', nome: 'Cliente demonstração', fone: '', email: '',
      desde: null, nota: 'Lançado no balcão, sem cadastro completo.', semCadastro: true }
  ];

  /* =======================================================================
     MOTIVOS DE BLOQUEIO DE AGENDA
     ======================================================================= */
  var MOTIVOS_BLOQUEIO = [
    { id: 'almoco',      nome: 'Almoço',       cor: 'neutro' },
    { id: 'compromisso', nome: 'Compromisso',  cor: 'vinho' },
    { id: 'manutencao',  nome: 'Manutenção',   cor: 'dourado' },
    { id: 'evento',      nome: 'Evento',       cor: 'rosa' },
    { id: 'indisponivel',nome: 'Indisponível', cor: 'neutro' }
  ];

  /* =======================================================================
     GERADOR DETERMINÍSTICO
     O mesmo dia sempre produz a mesma agenda: nada de a escala mudar a cada
     recarga. Semente derivada da data.
     ======================================================================= */
  function sementeDe(texto) {
    var h = 2166136261;
    for (var i = 0; i < texto.length; i++) {
      h ^= texto.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function sorteador(semente) {
    var s = semente >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* =======================================================================
     HORAS — utilidades puras
     ======================================================================= */
  function minutosDe(hhmm) {
    var p = String(hhmm).split(':');
    return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
  }
  function hhmmDe(min) {
    var h = Math.floor(min / 60);
    var m = min % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }
  function chaveDe(d) {
    var m = d.getMonth() + 1, dia = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (dia < 10 ? '0' : '') + dia;
  }
  function dataDeChave(chave) {
    var p = String(chave).split('-');
    return new Date(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  }

  /* =======================================================================
     GRADE DE FUNCIONAMENTO
     Real: segunda a sábado, 9h às 18h. Domingo fechado.
     O intervalo de almoço NÃO está nos materiais — é exemplo de configuração
     e por isso aparece marcado como dado demonstrativo na tela.
     ======================================================================= */
  var FUNCIONAMENTO = [
    { dia: 0, nome: 'Domingo',  aberto: false, inicio: '09:00', fim: '18:00', intervaloInicio: '12:00', intervaloFim: '13:00', exemplo: true },
    { dia: 1, nome: 'Segunda',  aberto: true,  inicio: '09:00', fim: '18:00', intervaloInicio: '12:00', intervaloFim: '13:00', exemplo: true },
    { dia: 2, nome: 'Terça',    aberto: true,  inicio: '09:00', fim: '18:00', intervaloInicio: '12:00', intervaloFim: '13:00', exemplo: true },
    { dia: 3, nome: 'Quarta',   aberto: true,  inicio: '09:00', fim: '18:00', intervaloInicio: '12:00', intervaloFim: '13:00', exemplo: true },
    { dia: 4, nome: 'Quinta',   aberto: true,  inicio: '09:00', fim: '18:00', intervaloInicio: '12:00', intervaloFim: '13:00', exemplo: true },
    { dia: 5, nome: 'Sexta',    aberto: true,  inicio: '09:00', fim: '18:00', intervaloInicio: '12:00', intervaloFim: '13:00', exemplo: true },
    { dia: 6, nome: 'Sábado',   aberto: true,  inicio: '09:00', fim: '18:00', intervaloInicio: '12:00', intervaloFim: '13:00', exemplo: true }
  ];

  /* =======================================================================
     GERAÇÃO DA AGENDA
     ======================================================================= */
  var servicoPorId = {};
  SERVICOS.forEach(function (s) { servicoPorId[s.id] = s; });
  var clientePorId = {};
  CLIENTES.forEach(function (c) { clientePorId[c.id] = c; });

  /* Serviços que aparecem com mais frequência na demonstração, para a
     agenda ter cara de salão de alisamento e não de distribuição uniforme. */
  var MIX_SERVICOS = [
    'alisamento','lavagem','tratamento','oleo','avaliacao','lavagem',
    'tratamento','oleo','detox','lavagem','cronograma','sos',
    'oleo','lavagem','tratamento','avaliacao','alisamento','detox'
  ];

  var contadorId = 0;
  function novoId() {
    contadorId += 1;
    return 'ag' + String(contadorId).padStart(4, '0');
  }

  /* Cria os agendamentos de um dia. Não permite sobreposição: cada horário
     só recebe um atendimento, e um atendimento ocupa toda a sua duração.
     `bloqueiosDoDia` é consultado DURANTE a geração — um bloqueio nunca
     pode acabar embaixo de um agendamento. */
  /* Cria os agendamentos de um dia, distribuídos entre as profissionais.

     O QUE MUDOU, E POR QUÊ. Antes esta função tratava o salão como UMA
     cadeira: `cabe()` recusava qualquer minuto já ocupado, e o resultado
     era uma agenda sem uma única sobreposição em 35 dias. Isso é FALSO
     para o Exclusiva Hair, onde a profissional acompanha várias clientes
     ao mesmo tempo (processos que descansam no fio). Manter aquela regra
     faria a "capacidade 8" do cadastro ser número de enfeite: barrinha
     bonita que nenhum dado sustenta.

     Agora cada atendimento pertence a UMA profissional, e o que limita é
     o teto DELA — no máximo `capacidade` clientes simultâneas. Duas
     clientes às 10h para a mesma profissional só existem se a capacidade
     permitir; para profissionais diferentes, são simplesmente normais.

     Quem realiza o quê não é sorteio livre: o atendimento só é oferecido
     a quem tem aquele serviço na própria lista. É a mesma regra que a
     agenda consulta depois para decidir se um horário pode ser marcado.

     A garantia do serviço longo continua, na forma correta: antes de
     aceitar um encaixe, a função confere que AINDA EXISTE uma janela
     contínua de 180 min em que alguma profissional teria vaga real (sem
     estourar a capacidade). Sem isso o dia enche e o Alisamento — o
     serviço de assinatura da casa — some da agenda.

     -------------------------------------------------------------------
     DISTRIBUIÇÃO — medida, não estimada. Não "equilibre" isto no escuro.
     -------------------------------------------------------------------
     Houve a suspeita de que a P3 ficasse quase ociosa. A medição sobre a
     agenda inteira (30 dias) diz o contrário, e por isso o gerador fica
     como está — CONGELADO:

       posto  atendimentos  por dia útil  minutos/dia  ocupação média
       P1     520            17,3          1284         82%  (teto 8)
       P2     381            15,2           910         79%  (teto 6)
       P3     558            18,6          1149         86%  (teto 8)

     Nenhum dia zerado para nenhum dos três; 30 dos 30 dias com dois ou
     mais postos atendendo no MESMO minuto, e 25 com os três juntos.
     A carga da P1 muda de janela para janela (a fatia que ela pega do
     volume cresce dia a dia), mas na média ela é simplesmente maior que
     a da P2 — e isso é legítimo: a P2 tem teto 6 contra 8 das outras, e
     não trabalha no sábado.

     Diferença de carga entre postos é esperada e aceitável (serviços
     habilitados, teto, duração e disponibilidade diferem). O que NÃO
     pode é um posto parecer parado. Antes de mexer no equilíbrio, meça:
     `node outputs/bancada/dbg-dist.js` imprime exatamente esta tabela
     mais as três conferências objetivas (fora do expediente, serviço não
     habilitado, acima da capacidade) — que hoje dão ZERO nas três.
     ======================================================================= */
  function gerarDia(data, contexto, bloqueiosDoDia) {
    var chave = chaveDe(data);
    var diaSemana = data.getDay();
    var cfg = FUNCIONAMENTO[diaSemana];

    if (!cfg.aberto) return [];

    /* Quem trabalha hoje. O domingo o salão não abre; e cada profissional
       tem os próprios dias (P2 não trabalha sábado). Dia em que ninguém
       trabalha é dia sem agenda — não inventamos atendimento para
       preencher a tela. */
    var equipe = PROFISSIONAIS.filter(function (p) {
      return p.ativo !== false && (p.dias || []).indexOf(diaSemana) !== -1;
    });
    if (!equipe.length) return [];

    var rand = sorteador(sementeDe(chave));
    var ehHoje = contexto === "hoje";
    var ehPassado = data < contexto_hojeSemHora;
    var ehFuturo = data > contexto_hojeSemHora;

    var inicioDia = minutosDe(cfg.inicio);
    var fimDia = minutosDe(cfg.fim);

    /* Bloqueios do dia indexados por minuto (consulta O(1)). */
    var bloqueado = {};
    (bloqueiosDoDia || []).forEach(function (b) {
      for (var m = b.inicioMin; m < b.fimMin; m += PASSO_MIN) bloqueado[m] = true;
    });

    /* --- a janela útil de cada profissional ------------------------------
       Interseção de três coisas: o expediente do SALÃO, o horário de
       trabalho DELA e o intervalo DELA. O almoço do salão já vem nos
       bloqueios; o intervalo individual entra aqui, porque é de cada uma —
       a P3 almoça 13–14h, não 12–13h. */
    var postos = {};
    equipe.forEach(function (p) {
      var ini = Math.max(inicioDia, minutosDe(p.entrada || cfg.inicio));
      var fim = Math.min(fimDia, minutosDe(p.saida || cfg.fim));
      var ivIni = p.intervaloInicio ? minutosDe(p.intervaloInicio) : null;
      var ivFim = p.intervaloFim ? minutosDe(p.intervaloFim) : null;
      var livre = {};
      for (var m = ini; m < fim; m += PASSO_MIN) {
        if (bloqueado[m]) continue;
        if (ivIni != null && m >= ivIni && m < ivFim) continue;
        livre[m] = true;
      }
      postos[p.id] = { prof: p, ini: ini, fim: fim, livre: livre, carga: {}, total: 0 };
    });

    /* Cabe este atendimento nesta profissional, neste horário? Três
       perguntas: está na janela dela, e a carga simultânea fica abaixo do
       teto em TODOS os minutos que o atendimento atravessa. */
    function podePosto(posto, inicio, duracao) {
      var cap = posto.prof.capacidade || 1;
      for (var m = inicio; m < inicio + duracao; m += PASSO_MIN) {
        if (!posto.livre[m]) return false;
        if (bloqueado[m]) return false;
        if ((posto.carga[m] || 0) >= cap) return false;
      }
      return true;
    }
    function marcarPosto(posto, inicio, duracao, delta) {
      for (var m = inicio; m < inicio + duracao; m += PASSO_MIN) {
        var v = (posto.carga[m] || 0) + delta;
        if (v > 0) posto.carga[m] = v; else delete posto.carga[m];
      }
      /* Minutos de atendimento ACUMULADOS no posto — é o número que
         equilibra a distribuição entre as profissionais. */
      posto.total += delta * duracao;
      if (posto.total < 0) posto.total = 0;
    }

    /* O MAIOR SERVIÇO DA CASA mede a garantia: se existe UMA janela
       contínua de 180 min com vaga real (para alguma profissional), então
       todo serviço do salão ainda cabe nessa janela. É esta pergunta que
       impede o dia de saturar e o Alisamento de sumir da agenda. */
    var DURACAO_MAXIMA = SERVICOS.reduce(function (m, s) {
      return s.duracao > m ? s.duracao : m;
    }, 0);
    /* O encaixe curto também precisa sobreviver ao dia. */
    var DURACAO_CURTA = 60;

    function temJanelaDe(posto, duracao) {
      var cap = posto.prof.capacidade || 1;
      var seguidos = 0;
      for (var m = posto.ini; m < posto.fim; m += PASSO_MIN) {
        var ok = posto.livre[m] && !bloqueado[m] && (posto.carga[m] || 0) < cap;
        seguidos = ok ? seguidos + PASSO_MIN : 0;
        if (seguidos >= duracao) return true;
      }
      return false;
    }
    /* O dia tem de continuar vendendo OS DOIS formatos depois deste
       encaixe. Um predicado só para o serviço longo deixava o último vão
       do dia ser tomado por 90 min e trancava a lavagem — foi o que a
       bancada pegou. */
    function diaAindaVendavel() {
      return equipe.some(function (p) {
        return temJanelaDe(postos[p.id], DURACAO_MAXIMA);
      }) && equipe.some(function (p) {
        return temJanelaDe(postos[p.id], DURACAO_CURTA);
      });
    }

    /* Quantos atendimentos o dia recebe. Com três profissionais em
       paralelo, a casa atende bem mais que a cadeira única de antes —
       mas não é "encher até a borda": a garantia acima é que decide
       quando parar. */
    var base = diaSemana === 6 ? 38 : 32;
    var quantidade = base + Math.floor(rand() * 7);
    if (ehHoje) quantidade = 28 + Math.floor(rand() * 5);
    if (ehPassado) quantidade = base + 2 + Math.floor(rand() * 5);

    var agendamentos = [];
    var tentativas = 0;
    while (agendamentos.length < quantidade && tentativas < 500) {
      tentativas++;

      var servico = servicoPorId[MIX_SERVICOS[Math.floor(rand() * MIX_SERVICOS.length)]];

      /* Quem PODE realizar este serviço e está trabalhando hoje. É esta
         lista que impede a agenda de pedir um alisamento a quem não faz
         alisamento. */
      var habilitadas = equipe.filter(function (p) {
        return (p.servicos || []).indexOf(servico.id) !== -1;
      });
      if (!habilitadas.length) continue;

      var escolhas = [];
      habilitadas.forEach(function (p) {
        var posto = postos[p.id];
        for (var m = posto.ini; m + servico.duracao <= posto.fim; m += PASSO_MIN) {
          if (!podePosto(posto, m, servico.duracao)) continue;
          /* Simula o encaixe e pergunta se a casa ainda consegue vender
             um serviço longo depois dele. Se não, esta posição não serve. */
          marcarPosto(posto, m, servico.duracao, 1);
          var segue = diaAindaVendavel();
          marcarPosto(posto, m, servico.duracao, -1);
          if (!segue) continue;
          escolhas.push({ posto: posto, inicio: m });
        }
      });
      if (!escolhas.length) break;

      /* Duas coisas ao mesmo tempo, nesta ordem:
          1) quem está com MENOS minutos acumulados atende agora — é o que
             impede a agenda de virar "tudo para a P1";
          2) entre iguais, o horário mais CEDO — salão de verdade enche da
             abertura para a frente, e é isso que deixa o tempo livre
             concentrado no FIM do dia, onde o serviço longo encaixa. */
      escolhas.sort(function (a, b) {
        if (a.posto.total !== b.posto.total) return a.posto.total - b.posto.total;
        return a.inicio - b.inicio;
      });
      /* A folga do sorteio tem de respeitar o equilíbrio: sortear entre as
         8 primeiras por HORÁRIO traria de volta a concentração que o
         critério de carga acabou de desfazer. O corte é pela carga, e
         inclui todos os postos empatados com o menor total. */
      var menorTotal = escolhas[0].posto.total;
      var janela = 0;
      while (janela < escolhas.length &&
             (escolhas[janela].posto.total <= menorTotal + 60 || janela < 2)) janela++;
      var escolha = escolhas[Math.floor(rand() * janela)];

      marcarPosto(escolha.posto, escolha.inicio, servico.duracao, 1);
      var cliente = CLIENTES[Math.floor(rand() * (CLIENTES.length - 1))]; // sem o c00
      var viaSite = rand() < 0.62;

      agendamentos.push(montar({
        data: data, inicio: escolha.inicio, servico: servico, cliente: cliente,
        viaSite: viaSite, rand: rand,
        ehPassado: ehPassado, ehFuturo: ehFuturo, ehHoje: ehHoje,
        profissionalId: escolha.posto.prof.id
      }));
    }

    /* --- fecho: o encaixe curto não pode ficar de fora --------------------

       O laço acima respeita o dia, mas enche de trás para a frente e pode
       consumir todo vão curto com serviços longos. Como o salão vende
       lavagem e óleo todos os dias, uma última passada garante que o dia
       não feche sem vaga curta: se ainda existe um vão de 60 min livre,
       ele recebe um serviço de 30 ou 60 min de quem o realiza.

       A folga de propósito: NÃO se exige aqui que continue existindo
       janela de 180 min, porque esta passada roda justamente quando o dia
       já está cheio. */
    var CURTOS = SERVICOS.filter(function (s) {
      return s.duracao <= DURACAO_CURTA;
    });
    var rodadas = 0;
    while (rodadas < 12) {
      rodadas++;
      var curtoEncaixado = false;
      CURTOS.forEach(function (servico) {
        if (curtoEncaixado) return;
        var habilitadas = equipe.filter(function (p) {
          return (p.servicos || []).indexOf(servico.id) !== -1;
        });
        /* Sorteia a profissional para não concentrar todo o resto na P1. */
        habilitadas.sort(function () { return rand() - 0.5; });
        for (var i = 0; i < habilitadas.length && !curtoEncaixado; i++) {
          var posto = postos[habilitadas[i].id];
          for (var m = posto.ini; m + servico.duracao <= posto.fim; m += PASSO_MIN) {
            if (!podePosto(posto, m, servico.duracao)) continue;
            marcarPosto(posto, m, servico.duracao, 1);
            var cliente = CLIENTES[Math.floor(rand() * (CLIENTES.length - 1))];
            agendamentos.push(montar({
              data: data, inicio: m, servico: servico, cliente: cliente,
              viaSite: rand() < 0.62, rand: rand,
              ehPassado: ehPassado, ehFuturo: ehFuturo, ehHoje: ehHoje,
              profissionalId: posto.prof.id
            }));
            curtoEncaixado = true;
            break;
          }
        }
      });
      if (!curtoEncaixado) break;
    }

    agendamentos.sort(function (a, b) { return a.inicioMin - b.inicioMin; });
    return agendamentos;
  }

  /* Monta um agendamento e decide o status conforme o momento do dia.

     ATENÇÃO ao `rand` local: as decisões daqui saem de um sorteador PRÓPRIO,
     com semente derivada do dia e do horário do atendimento, e não do `rand`
     compartilhado da geração. O motivo é o status: o trecho do dia que está
     acontecendo ("atendimento") NÃO sorteia nada, enquanto os outros trechos
     sorteiam — e, no `rand` compartilhado, essa diferença de UM sorteio
     deslocava a fila inteira. O efeito era a agenda de hoje mudar de
     composição conforme a hora em que o painel fosse aberto: abrir às 9h e
     às 16h dava dias diferentes, contra a promessa de que o mesmo dia produz
     sempre a mesma agenda. Com o sorteador próprio, montar() não mexe mais
     no fluxo da geração. */
  function montar(o) {
    var duracao = o.servico.duracao;
    var fimMin = o.inicio + duracao;
    var agoraMin = contexto_agora.getHours() * 60 + contexto_agora.getMinutes();

    var rand = sorteador(sementeDe(chaveDe(o.data) + '#' + o.inicio));

    var status;
    if (o.ehFuturo) {
      var r = rand();
      status = r < 0.52 ? 'confirmado' : (r < 0.86 ? 'pendente' : 'novo');
    } else if (o.ehHoje) {
      if (fimMin <= agoraMin) {
        var r2 = rand();
        status = r2 < 0.9 ? 'concluido' : (r2 < 0.96 ? 'cancelado' : 'ausente');
      } else if (o.inicio <= agoraMin && agoraMin < fimMin) {
        status = 'atendimento';
      } else {
        var r3 = rand();
        status = r3 < 0.7 ? 'confirmado' : 'pendente';
      }
    } else {
      /* Dia passado */
      var r4 = rand();
      status = r4 < 0.88 ? 'concluido' : (r4 < 0.95 ? 'cancelado' : 'ausente');
    }

    var id = novoId();
    var criadoEm = new Date(o.data.getTime());
    criadoEm.setDate(criadoEm.getDate() - (1 + Math.floor(rand() * 12)));
    criadoEm.setHours(8 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);

    return {
      id: id,
      clienteId: o.cliente.id,
      servicoId: o.servico.id,
      profissionalId: o.profissionalId || PROFISSIONAL_PADRAO,
      dataChave: chaveDe(o.data),
      inicio: hhmmDe(o.inicio),
      inicioMin: o.inicio,
      fim: hhmmDe(fimMin),
      duracao: duracao,
      status: status,
      origem: o.viaSite ? 'site' : 'manual',
      criadoEm: criadoEm.toISOString(),
      observacoes: '',
      /* REGISTRO DE PAGAMENTO — objeto, não string. Forma de pagamento sem
         valor e valor sem situação não sustentam um Financeiro de verdade.
         Vem do sorteio PRÓPRIO de `montarPagamento`, nunca do fluxo
         compartilhado: só atendimento CONCLUÍDO tem pagamento, e
         "concluído" depende do relógio — sortear daqui reintroduziria
         exatamente o defeito que o `rand` local evita, com a forma de
         pagamento do dia mudando conforme a hora da consulta. */
      pagamento: montarPagamento(status, chaveDe(o.data), o.inicio, o.servico.id),
      /* Início e fim REAIS do atendimento. Nulos enquanto não aconteceu: o
         horário marcado (inicio/fim) não é o horário em que a cliente
         sentou na cadeira, e o painel precisa dos dois para medir atraso. */
      inicioReal: null,
      fimReal: null,
      historico: [],
      demo: true
    };
  }

  /* =======================================================================
     HISTÓRICO — linha do tempo de cada agendamento, coerente com o status
     ======================================================================= */
  function historicoDe(ag) {
    var linhas = [];
    var criado = new Date(ag.criadoEm);
    linhas.push({
      quando: criado.toISOString(),
      texto: ag.origem === 'site'
        ? 'Recebido pelo site'
        : 'Lançado no painel do salão',
      tipo: ag.origem === 'site' ? 'site' : 'manual'
    });
    if (['confirmado','atendimento','concluido','ausente'].indexOf(ag.status) !== -1) {
      var c = new Date(criado.getTime() + 3600000 * (2 + ag.inicioMin % 5));
      linhas.push({ quando: c.toISOString(), texto: 'Confirmado com a cliente', tipo: 'confirmado' });
    }
    /* Horário REAL × horário marcado. O momento em que o atendimento começou
       de fato fica gravado no agendamento (inicioReal) e é ele que a linha
       do tempo mostra — é a única forma de a proprietária ver um atraso
       depois que ele já aconteceu. */
    if (ag.status === 'atendimento' || ag.status === 'concluido') {
      var inicio = ag.inicioReal ? new Date(ag.inicioReal) : momentoIso(ag, 0);
      if (!ag.inicioReal) ag.inicioReal = inicio.toISOString();
      var marcado = dataDeChave(ag.dataChave);
      marcado.setMinutes(ag.inicioMin);
      var atraso = Math.round((inicio - marcado) / 60000);
      linhas.push({
        quando: inicio.toISOString(),
        texto: atraso > 0
          ? 'Atendimento iniciado com ' + atraso + ' min de atraso'
          : (atraso < 0
              ? 'Atendimento iniciado ' + Math.abs(atraso) + ' min antes do horário'
              : 'Atendimento iniciado no horário'),
        tipo: 'atendimento'
      });
    }
    if (ag.status === 'concluido') {
      var fim = ag.fimReal ? new Date(ag.fimReal) : momentoIso(ag, ag.duracao);
      if (!ag.fimReal) ag.fimReal = fim.toISOString();
      var durou = Math.max(0, Math.round((fim - new Date(ag.inicioReal)) / 60000));
      linhas.push({
        quando: fim.toISOString(),
        texto: durou ? 'Serviço concluído · ' + durou + ' min de atendimento' : 'Serviço concluído',
        tipo: 'concluido'
      });
    }
    if (ag.status === 'cancelado') {
      linhas.push({ quando: momentoIso(ag, 0).toISOString(), texto: 'Cancelado — horário liberado na agenda', tipo: 'cancelado' });
    }
    if (ag.status === 'ausente') {
      linhas.push({ quando: momentoIso(ag, ag.duracao).toISOString(), texto: 'Cliente não compareceu', tipo: 'ausente' });
    }
    return linhas;
  }
  /* Momento plausível do dia do atendimento: `desloc` minutos depois do
     horário marcado. Devolve Date — quem precisar de texto chama toISOString.
     O atraso é estável: sai de um sorteador semeado pela própria chave do
     agendamento, então não muda com a hora em que o painel for aberto. */
  function momentoIso(ag, desloc) {
    var d = dataDeChave(ag.dataChave);
    var r = sorteador(sementeDe('real#' + ag.dataChave + '#' + ag.inicioMin));
    var atraso = Math.floor(r() * 13) - 3;      // -3 a +9 minutos
    d.setMinutes(ag.inicioMin + Math.max(0, desloc + atraso));
    return d;
  }

  /* =======================================================================
     CONSTRUÇÃO DA BASE
     A ordem importa: os BLOQUEIOS vêm primeiro, porque a geração da agenda
     precisa consultá-los para nunca colocar um atendimento em cima de um
     horário bloqueado. Cinco semanas: duas para trás, a atual e duas à frente.
     ======================================================================= */
  var AGORA = new Date();
  var contexto_agora = AGORA;
  var contexto_hojeSemHora = new Date(AGORA.getFullYear(), AGORA.getMonth(), AGORA.getDate());

  var JANELA_INICIO = new Date(contexto_hojeSemHora.getTime());
  JANELA_INICIO.setDate(JANELA_INICIO.getDate() - 14);
  var JANELA_DIAS = 35;

  function diasDaJanela() {
    var lista = [];
    for (var i = 0; i < JANELA_DIAS; i++) {
      var d = new Date(JANELA_INICIO.getTime());
      d.setDate(d.getDate() + i);
      lista.push(d);
    }
    return lista;
  }

  /* -----------------------------------------------------------------------
     BLOQUEIOS DE AGENDA
     O intervalo do almoço é bloqueio recorrente em todo dia útil; alguns dias
     ainda têm bloqueio pontual (evento, manutenção, compromisso).
     ----------------------------------------------------------------------- */
  var BLOQUEIOS = [];
  (function construirBloqueios() {
    var id = 0;
    function add(data, inicio, fim, motivo, obs, recorrente) {
      id += 1;
      BLOQUEIOS.push({
        id: 'bl' + String(id).padStart(3, '0'),
        dataChave: chaveDe(data),
        inicio: hhmm(inicio),
        fim: hhmm(fim),
        inicioMin: inicio,
        fimMin: fim,
        motivo: motivo,
        observacao: obs || '',
        recorrente: !!recorrente,
        demo: true
      });
    }

    diasDaJanela().forEach(function (d) {
      if (d.getDay() === 0) return;                      // domingo fechado
      add(d, 12 * 60, 13 * 60, 'almoco', 'Intervalo do almoço', true);
    });

    /* Pontuais, à frente de hoje para aparecerem na demonstração */
    function maisDias(n) {
      var d = new Date(contexto_hojeSemHora.getTime());
      d.setDate(d.getDate() + n);
      return d;
    }
    add(maisDias(2), 15 * 60, 16 * 60, 'manutencao', 'Manutenção do sistema de hidratação');
    add(maisDias(4), 9 * 60, 10 * 60 + 30, 'evento', 'Evento de noivas — salão reservado');
    add(maisDias(7), 14 * 60, 15 * 60, 'compromisso', 'Compromisso fora do salão');
    add(maisDias(1), 17 * 60, 18 * 60, 'indisponivel', 'Encerramento mais cedo');
  })();

  /* Índice rápido: chave do dia -> lista de bloqueios */
  var bloqueiosPorDia = {};
  BLOQUEIOS.forEach(function (b) {
    (bloqueiosPorDia[b.dataChave] = bloqueiosPorDia[b.dataChave] || []).push(b);
  });

  /* -----------------------------------------------------------------------
     AGENDA
     ----------------------------------------------------------------------- */
  var AGENDAMENTOS = [];
  diasDaJanela().forEach(function (d) {
    var chave = chaveDe(d);
    var ehHoje = chave === chaveDe(contexto_hojeSemHora);
    var lote = gerarDia(d, ehHoje ? 'hoje' : null, bloqueiosPorDia[chave]);
    AGENDAMENTOS = AGENDAMENTOS.concat(lote);
  });

  /* Cura de HOJE — garante que a agenda de hoje conte a história do produto:
     pelo menos um agendamento vindo do SITE, um lançado MANUALMENTE no
     balcão, e um atendimento EM ANDAMENTO para a Visão Geral ter o que
     mostrar ao vivo. O status é recalculado depois, com o relógio real. */
  (function curarHoje() {
    var chaveHoje = chaveDe(contexto_hojeSemHora);
    var doDia = AGENDAMENTOS.filter(function (a) { return a.dataChave === chaveHoje; });
    if (!doDia.length) return;

    doDia[0].origem = 'site';

    var ultimo = doDia[doDia.length - 1];
    if (!doDia.some(function (a) { return a.origem === 'manual'; })) {
      ultimo.origem = 'manual';
      ultimo.clienteId = 'c00';
      ultimo.observacoes = 'Encaixe de balcão — cliente sem cadastro.';
      ultimo.pagamento = null;
    }

    /* Agenda de hoje é reordenada pelo relógio: os primeiros atendimentos do
       dia já aconteceram (concluído), o que estiver cobrindo o horário atual
       fica EM ATENDIMENTO, e o resto fica por vir. */
    var agoraMin = contexto_agora.getHours() * 60 + contexto_agora.getMinutes();
    doDia.forEach(function (a, i) {
      if (a.inicioMin + a.duracao <= agoraMin) {
        a.status = 'concluido';
        /* O pagamento acompanha a conclusão — e o do atendimento em curso
           também nasce aqui, para o drawer de um atendimento de HOJE ter o
           que mostrar. Os dois são o mesmo registro do gerador. */
        a.pagamento = montarPagamento('concluido', a.dataChave, a.inicioMin, a.servicoId);
      } else if (a.inicioMin <= agoraMin) {
        a.status = 'atendimento';
        a.pagamento = montarPagamento('concluido', a.dataChave, a.inicioMin, a.servicoId);
      } else {
        a.status = i % 5 === 0 ? 'novo' : (i % 2 === 0 ? 'confirmado' : 'pendente');
        a.pagamento = null;
      }
    });
  })();

  AGENDAMENTOS.sort(function (a, b) {
    if (a.dataChave !== b.dataChave) return a.dataChave < b.dataChave ? -1 : 1;
    return a.inicioMin - b.inicioMin;
  });
  AGENDAMENTOS.forEach(function (ag) { ag.historico = historicoDe(ag); });

  /* =======================================================================
     NOTIFICAÇÕES — simuladas, com horário relativo ao agora
     ======================================================================= */
  var NOTIFICACOES = [
    { id: 'n1', tipo: 'novo',       titulo: 'Novo agendamento recebido',
      texto: 'Sofia Bittencourt marcou Lavagem e hidratação pelo site.',
      minutosAtras: 4,   lida: false, rota: '#/agendamentos' },
    { id: 'n2', tipo: 'confirmacao',titulo: 'Agendamento confirmado',
      texto: 'Ana Beatriz Lima confirmou o horário de amanhã.',
      minutosAtras: 26,  lida: false, rota: '#/agendamentos' },
    { id: 'n3', tipo: 'reagendar',  titulo: 'Cliente solicitou reagendamento',
      texto: 'Fernanda Queiroz pediu para trocar o horário da sexta.',
      minutosAtras: 74,  lida: false, rota: '#/agendamentos' },
    { id: 'n4', tipo: 'cancelamento',titulo: 'Horário cancelado',
      texto: 'Um horário das 16:00 foi cancelado e voltou a ficar livre.',
      minutosAtras: 152, lida: true,  rota: '#/agenda' },
    { id: 'n5', tipo: 'cliente',    titulo: 'Novo cliente cadastrado',
      texto: 'Vanessa Duarte fez o primeiro cadastro pelo site.',
      minutosAtras: 320, lida: true,  rota: '#/clientes' },
    { id: 'n6', tipo: 'novo',       titulo: 'Novo agendamento recebido',
      texto: 'Larissa Andrade marcou Alisamento pelo site.',
      minutosAtras: 1490, lida: true, rota: '#/agendamentos' }
  ];

  /* =======================================================================
     EXPOSIÇÃO
     ======================================================================= */
  window.EH = {
    DEMO: DEMO,
    VALOR_DEMO: VALOR_DEMO,
    HORARIOS_GRADE: HORARIOS_GRADE,
    PASSO_MIN: PASSO_MIN,
    ABERTURA_MIN: ABERTURA_MIN,
    FECHAMENTO_MIN: FECHAMENTO_MIN,
    DIAS: DIAS, DIAS_CURTO: DIAS_CURTO, DIAS_MIN: DIAS_MIN,
    MESES: MESES, MESES_CURTO: MESES_CURTO,
    CATEGORIAS: CATEGORIAS,
    SERVICOS: SERVICOS,
    PROFISSIONAIS: PROFISSIONAIS,
    /* Quem recebe o atendimento que não traz profissional. É o mesmo valor
       que o núcleo usa em `criarAgendamento`, exportado para que as telas
       possam mostrar de quem é o atendimento sem repetir o literal. */
    PROFISSIONAL_PADRAO: PROFISSIONAL_PADRAO,
    CLIENTES: CLIENTES,
    MOTIVOS_BLOQUEIO: MOTIVOS_BLOQUEIO,
    FUNCIONAMENTO: FUNCIONAMENTO,
    AGENDAMENTOS: AGENDAMENTOS,
    BLOQUEIOS: BLOQUEIOS,
    NOTIFICACOES: NOTIFICACOES,
    /* utilidades de hora, reaproveitadas pelo núcleo e pelas telas */
    minutosDe: minutosDe,
    hhmmDe: hhmmDe,
    chaveDe: chaveDe,
    dataDeChave: dataDeChave,
    servicoPorId: servicoPorId,
    clientePorId: clientePorId,
    _gerarDia: gerarDia
  };
})();
