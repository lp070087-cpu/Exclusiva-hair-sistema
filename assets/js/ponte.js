/* ==========================================================================
   EXCLUSIVA HAIR — ponte.js · PONTE DEMONSTRATIVA SITE → PAINEL

   O QUE ISTO É
   Um correio de mão única entre as duas partes da demonstração: o site
   deixa um pedido de agendamento aqui, o painel recolhe quando abre.

   O QUE ISTO NÃO É
   Não é arquitetura definitiva, não é banco, não é API, não tem servidor.
   É uma caixa de recados dentro do localStorage do navegador, e só
   funciona porque site e painel são servidos pela MESMA origem HTTP
   (os dois nascem da mesma pasta `Exclusiva hair/`).

   CONSEQUÊNCIA QUE PRECISA ESTAR CLARA
   O recado fica no navegador desta máquina. Se o site for aberto no
   celular da cliente e o painel no computador do salão, são dois
   localStorage diferentes e nada chega. Isso é limitação conhecida e
   aceita nesta etapa: o que se prova aqui é SITE → PAINEL na mesma
   máquina e no mesmo navegador. Comunicação entre aparelhos é outro
   assunto e exigiria uma camada de servidor de verdade.

   ESTE ARQUIVO É O MESMO NOS DOIS LADOS
   `apresentacao/assets/js/ponte.js` e
   `sistema-apresentacao/assets/js/ponte.js` são cópias idênticas, de
   propósito. Se a chave ou o formato do registro mudar de um lado só, o
   contrato se rompe em silêncio — por isso os dois arquivos andam juntos.
   A bancada confere que continuam iguais.
   ========================================================================== */
(function (global) {
  'use strict';

  /* Uma chave só, com nome que se explica sozinho no inspetor do navegador. */
  var CHAVE = 'exclusiva-hair:agendamentos-do-site';

  /* O recado que o site manda. Estes campos são os combinados com o painel;
     `importado` é o que o painel liga depois de recolher. */
  var CAMPOS = ['id', 'cliente', 'telefone', 'servicoId', 'servico',
                'data', 'horario', 'origem', 'status', 'criadoEm'];

  function disponivel() {
    try {
      if (!global.localStorage) return false;
      var sonda = CHAVE + ':sonda';
      global.localStorage.setItem(sonda, '1');
      global.localStorage.removeItem(sonda);
      return true;
    } catch (e) {
      /* Modo privado, cota estourada ou armazenamento bloqueado por política.
         O chamador decide o que dizer — aqui só se responde que não dá. */
      return false;
    }
  }

  function vazio() {
    return { versao: 1, registros: [] };
  }

  /* Leitura TOLERANTE. Qualquer coisa que não seja o envelope esperado vira
     um envelope vazio em vez de exceção: uma chave corrompida não pode
     derrubar o painel inteiro na abertura. */
  function lerTudo() {
    if (!disponivel()) return vazio();
    try {
      var bruto = global.localStorage.getItem(CHAVE);
      if (!bruto) return vazio();
      var obj = JSON.parse(bruto);
      if (!obj || !Array.isArray(obj.registros)) return vazio();
      return obj;
    } catch (e) {
      return vazio();
    }
  }

  function gravarTudo(envelope) {
    if (!disponivel()) return { ok: false, mensagem: 'Armazenamento indisponível.' };
    try {
      global.localStorage.setItem(CHAVE, JSON.stringify(envelope));
      return { ok: true, mensagem: '' };
    } catch (e) {
      return { ok: false, mensagem: 'Não foi possível gravar: ' + e.message };
    }
  }

  /* Um id só, gerado no site. O painel usa este id para não importar duas
     vezes o mesmo pedido, então ele precisa ser único sem depender de
     contador local. */
  function novoId() {
    var d = new Date();
    var p = function (n, casas) { return String(n).padStart(casas || 2, '0'); };
    return 'site-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '-' +
      p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds()) + '-' +
      Math.random().toString(36).slice(2, 7);
  }

  /* O SITE CHAMA ISTO AO CONFIRMAR. Devolve ok:false — nunca uma exceção —
     quando não há onde gravar, para a tela poder dizer a verdade em vez de
     mostrar "sucesso" e não ter gravado nada. */
  function pedirAgendamento(dados) {
    if (!disponivel()) {
      return { ok: false, mensagem: 'Este navegador não está guardando os dados da demonstração.' };
    }
    var registro = {
      id: dados.id || novoId(),
      cliente: dados.cliente || '',
      telefone: dados.telefone || '',
      servicoId: dados.servicoId || '',
      servico: dados.servico || '',
      data: dados.data || '',
      horario: dados.horario || '',
      origem: 'site',
      status: 'novo',
      criadoEm: new Date().toISOString()
    };
    if (dados.observacoes) registro.observacoes = dados.observacoes;
    registro.importado = false;

    var envelope = lerTudo();
    envelope.registros.push(registro);
    var r = gravarTudo(envelope);
    if (!r.ok) return { ok: false, mensagem: r.mensagem };
    return { ok: true, mensagem: 'Agendamento solicitado.', id: registro.id };
  }

  /* O PAINEL CHAMA ISTO NA ABERTURA. Devolve só o que ainda não foi
     recolhido, para o laço de importação ser idempotente: rodar duas vezes
     não cria dois agendamentos. */
  function listarPendentes() {
    return lerTudo().registros.filter(function (r) { return r && !r.importado; });
  }

  /* TODOS os recados, inclusive os já recolhidos. É o que o painel usa de
     verdade, e a diferença importa: a base do painel é demonstrativa e é
     remontada do zero a cada abertura, então "já importei este recado" não
     pode morar só aqui — o agendamento criado ontem não existe mais do
     outro lado. Quem decide se um recado já virou agendamento é a MARCA
     que ficou no histórico do próprio agendamento; esta lista é o que
     permite essa conferência acontecer de novo depois de um F5. */
  function listarTodos() {
    return lerTudo().registros.filter(function (r) { return !!r; });
  }

  /* O painel marca o que já entrou. `agendamentoId` é o id interno que o
     NÚCLEO gerou — guardá-lo aqui deixa rastro de conferência entre os
     dois lados, sem que o painel precise entender nada de localStorage. */
  function marcarImportado(id, agendamentoId) {
    var envelope = lerTudo();
    var achou = false;
    envelope.registros.forEach(function (r) {
      if (r && r.id === id) { r.importado = true; r.agendamentoId = agendamentoId || null; achou = true; }
    });
    if (!achou) return { ok: false, mensagem: 'Registro não encontrado na ponte.' };
    return gravarTudo(envelope);
  }

  /* Apaga TODOS os recados — inclusive os já importados. É o botão de
     "começar a demonstração limpa", e não existe na interface: só pode ser
     acionado de propósito, pelo console. */
  function limparTudo() {
    return gravarTudo(vazio());
  }

  global.PonteSite = {
    CHAVE: CHAVE,
    CAMPOS: CAMPOS,
    disponivel: disponivel,
    novoId: novoId,
    pedirAgendamento: pedirAgendamento,
    listarPendentes: listarPendentes,
    listarTodos: listarTodos,
    marcarImportado: marcarImportado,
    limparTudo: limparTudo
  };
})(typeof window !== 'undefined' ? window : this);
