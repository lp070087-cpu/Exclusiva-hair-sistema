/* ==========================================================================
   EXCLUSIVA HAIR — SISTEMA · icones.js
   Conjunto de ícones em SVG embutido.

   Um só idioma para todos: grade 24, traço 1.5, pontas e junções arredondadas,
   cor herdada por currentColor. Nada de biblioteca externa — o painel abre por
   file://, sem rede, e um sprite remoto deixaria a interface sem ícones.

   O traço é fino de propósito: a identidade do salão é delicada (a logo é um
   arco), então o ícone acompanha em vez de competir.
   ========================================================================== */
(function () {
  'use strict';

  /* Cada entrada é o CONTEÚDO interno do <svg>. O que é preenchimento sólido
     (não traço) vem marcado em `solido`, porque a marcação muda. */
  var FORMAS = {
    /* --- navegação do trilho ------------------------------------------- */
    painel:      '<path d="M3.5 3.5h7v6h-7zM13.5 3.5h7v10h-7zM3.5 13.5h7v7h-7zM13.5 17.5h7v3h-7z"/>',
    agenda:      '<rect x="3.25" y="5" width="17.5" height="15.5" rx="2.5"/><path d="M3.25 10h17.5M8 3.25v3.5M16 3.25v3.5"/>',
    lista:       '<path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12"/><circle cx="4.5" cy="6.5" r="1.15"/><circle cx="4.5" cy="12" r="1.15"/><circle cx="4.5" cy="17.5" r="1.15"/>',
    pessoas:     '<circle cx="9.25" cy="8.5" r="3.5"/><path d="M2.75 20c0-3.2 2.9-5.5 6.5-5.5s6.5 2.3 6.5 5.5"/><path d="M16.5 5.6a3.3 3.3 0 0 1 0 6.3M18.2 14.8c2 .8 3.3 2.3 3.3 4.2"/>',
    tesoura:     '<circle cx="6.5" cy="6.5" r="2.75"/><circle cx="6.5" cy="17.5" r="2.75"/><path d="M8.7 8.4 20 18M20 6 8.7 15.6"/>',
    dinheiro:    '<path d="M3.25 7.5h17.5v9a2 2 0 0 1-2 2H5.25a2 2 0 0 1-2-2z"/><path d="M3.25 7.5 6 15M20.75 7.5 18 15"/><circle cx="12" cy="12" r="2.4"/>',
    grafico:     '<path d="M3.5 20.25h17"/><path d="M6.75 20.25v-6.5M11.5 20.25V7.5M16.25 20.25v-9.5"/><path d="M4 10.5 9 5.5l3.5 3L20 2.75"/>',
    ajustes:     '<circle cx="12" cy="12" r="3"/><path d="M12 2.75v2.5M12 18.75v2.5M4.6 7.4l2.2 1.25M17.2 15.35l2.2 1.25M4.6 16.6l2.2-1.25M17.2 8.65l2.2-1.25"/>',

    /* --- ações ---------------------------------------------------------- */
    mais:        '<path d="M12 5v14M5 12h14"/>',
    menos:       '<path d="M5 12h14"/>',
    busca:       '<circle cx="10.75" cy="10.75" r="6.5"/><path d="M15.5 15.5 20.5 20.5"/>',
    filtro:      '<path d="M3.5 5.75h17l-6.5 7.6v5.4l-4 2.1v-7.5z"/>',
    fechar:      '<path d="M6 6l12 12M18 6 6 18"/>',
    checar:      '<path d="M4.75 12.5 9.5 17.25 19.25 6.75"/>',
    'checar-circulo': '<circle cx="12" cy="12" r="8.75"/><path d="M8.25 12.35 11 15.1l4.9-5.4"/>',
    'x-circulo': '<circle cx="12" cy="12" r="8.75"/><path d="M9.25 9.25l5.5 5.5M14.75 9.25l-5.5 5.5"/>',
    'mais-circulo':'<circle cx="12" cy="12" r="8.75"/><path d="M12 8.25v7.5M8.25 12h7.5"/>',
    relogio:     '<circle cx="12" cy="12" r="8.75"/><path d="M12 7.25V12l3.25 2"/>',
    calendario:  '<rect x="3.25" y="5" width="17.5" height="15.5" rx="2.5"/><path d="M3.25 10h17.5M8 3.25v3.5M16 3.25v3.5"/>',
    telefone:    '<path d="M20.5 16.9v2.6a1.7 1.7 0 0 1-1.9 1.7 16.8 16.8 0 0 1-7.3-2.6 16.5 16.5 0 0 1-5.1-5.1A16.8 16.8 0 0 1 3.6 6.1 1.7 1.7 0 0 1 5.3 4.2h2.6a1.7 1.7 0 0 1 1.7 1.5c.1.8.3 1.6.6 2.4a1.7 1.7 0 0 1-.4 1.8l-1.1 1.1a13.5 13.5 0 0 0 5.1 5.1l1.1-1.1a1.7 1.7 0 0 1 1.8-.4c.8.3 1.6.5 2.4.6a1.7 1.7 0 0 1 1.4 1.7z"/>',
    email:       '<rect x="2.75" y="5" width="18.5" height="14" rx="2.5"/><path d="m3.5 7.5 8.5 5.6 8.5-5.6"/>',
    local:       '<path d="M12 21.5c4-4.4 6-7.6 6-10.4a6 6 0 1 0-12 0c0 2.8 2 6 6 10.4z"/><circle cx="12" cy="10.8" r="2.4"/>',
    globo:       '<circle cx="12" cy="12" r="8.75"/><path d="M3.4 12h17.2M12 3.25c2.2 2.4 3.3 5.3 3.3 8.75S14.2 18.35 12 20.75c-2.2-2.4-3.3-5.3-3.3-8.75S9.8 5.65 12 3.25z"/>',
    instagram:   '<rect x="3.25" y="3.25" width="17.5" height="17.5" rx="5"/><circle cx="12" cy="12" r="3.9"/><circle cx="17.1" cy="6.9" r="1" solido/>',
    editar:      '<path d="M16.6 4.4a2.1 2.1 0 0 1 3 3L8.4 18.6l-4 1 1-4z"/><path d="M14.8 6.2l3 3"/>',
    lixeira:     '<path d="M4.5 6.75h15M9.25 6.75V4.5h5.5v2.25"/><path d="M6.5 6.75 7.5 20a1.4 1.4 0 0 0 1.4 1.3h6.2A1.4 1.4 0 0 0 16.5 20l1-13.25"/><path d="M10.5 10.75v6M13.5 10.75v6"/>',
    copiar:      '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5v-2a2.5 2.5 0 0 0-2.5-2.5H6a2.5 2.5 0 0 0-2.5 2.5v7a2.5 2.5 0 0 0 2.5 2.5h2"/>',
    imprimir:    '<path d="M6.75 9.25V3.5h10.5v5.75"/><rect x="3.25" y="9.25" width="17.5" height="7.5" rx="2"/><path d="M6.75 13.75h10.5V20.5H6.75z"/>',
    baixar:      '<path d="M12 3.5v11M7.5 10.25 12 14.75l4.5-4.5"/><path d="M3.75 17v2.25a1.5 1.5 0 0 0 1.5 1.5h13.5a1.5 1.5 0 0 0 1.5-1.5V17"/>',
    'seta-baixo':'<path d="M12 4.75v14.5M5.75 13 12 19.25 18.25 13"/>',
    'seta-cima': '<path d="M12 19.25V4.75M5.75 11 12 4.75 18.25 11"/>',
    'seta-esq':  '<path d="M19.25 12H4.75M11 5.75 4.75 12 11 18.25"/>',
    'seta-dir':  '<path d="M4.75 12h14.5M13 5.75 19.25 12 13 18.25"/>',
    'chevron-baixo':'<path d="M6 9.5 12 15.5 18 9.5"/>',
    'chevron-cima': '<path d="M6 14.5 12 8.5 18 14.5"/>',
    'chevron-esq':'<path d="M14.5 6 8.5 12l6 6"/>',
    'chevron-dir':'<path d="M9.5 6 15.5 12l-6 6"/>',
    sino:        '<path d="M18 9.25a6 6 0 1 0-12 0c0 5.25-2.25 6.75-2.25 6.75h16.5S18 14.5 18 9.25z"/><path d="M13.7 19.5a1.95 1.95 0 0 1-3.4 0"/>',
    sair:        '<path d="M9.25 20.25H5.5a1.75 1.75 0 0 1-1.75-1.75V5.5A1.75 1.75 0 0 1 5.5 3.75h3.75"/><path d="M15.5 16.5 20 12l-4.5-4.5M20 12H9.25"/>',
    menu:        '<path d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"/>',
    recolher:    '<path d="M4 4.75h16v14.5H4z"/><path d="M9.5 4.75v14.5"/><path d="M15.5 9.75 13 12l2.5 2.25"/>',
    expandir:    '<path d="M4 4.75h16v14.5H4z"/><path d="M9.5 4.75v14.5"/><path d="M13 9.75 15.5 12 13 14.25"/>',
    olho:        '<path d="M2.5 12S6 5.75 12 5.75 21.5 12 21.5 12 18 18.25 12 18.25 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.9"/>',
    'olho-fechado':'<path d="M9.5 5.9A9.6 9.6 0 0 1 12 5.75c6 0 9.5 6.25 9.5 6.25a17.6 17.6 0 0 1-3.3 4.1M6.4 7.6A17.4 17.4 0 0 0 2.5 12S6 18.25 12 18.25a9.5 9.5 0 0 0 3.2-.5"/><path d="M4 4l16 16"/>',
    bloquear:    '<circle cx="12" cy="12" r="8.75"/><path d="M5.9 5.9l12.2 12.2"/>',
    'calendario-x':'<rect x="3.25" y="5" width="17.5" height="15.5" rx="2.5"/><path d="M3.25 10h17.5M8 3.25v3.5M16 3.25v3.5"/><path d="M9.75 13.25l4.5 4.5M14.25 13.25l-4.5 4.5"/>',
    usuario:     '<circle cx="12" cy="8" r="4"/><path d="M4.25 20.5c0-3.6 3.5-6 7.75-6s7.75 2.4 7.75 6"/>',
    estrela:     '<path d="m12 3.5 2.7 5.6 6 .85-4.35 4.25 1.03 6-5.38-2.87-5.38 2.87 1.03-6L3.3 9.95l6-.85z"/>',
    info:        '<circle cx="12" cy="12" r="8.75"/><path d="M12 11v5.5"/><circle cx="12" cy="7.9" r="0.9" solido/>',
    alerta:      '<path d="M10.6 4.1 2.9 17.4A1.6 1.6 0 0 0 4.3 19.9h15.4a1.6 1.6 0 0 0 1.4-2.5L13.4 4.1a1.6 1.6 0 0 0-2.8 0z"/><path d="M12 9.5v4"/><circle cx="12" cy="16.6" r="0.9" solido/>',
    'escudo-check':'<path d="M12 3.25 5 6v5.5c0 4.4 3 7.6 7 9.25 4-1.65 7-4.85 7-9.25V6z"/><path d="M9.25 11.9l2 2 3.5-3.9"/>',
    cartao:      '<rect x="2.75" y="5.25" width="18.5" height="13.5" rx="2.5"/><path d="M2.75 10h18.5"/>',
    pix:         '<path d="m12 3.4 8.6 8.6-8.6 8.6-8.6-8.6z"/><path d="m8.2 8.2 3.8 3.8 3.8-3.8M8.2 15.8l3.8-3.8 3.8 3.8"/>',
    cedula:      '<rect x="2.75" y="6.25" width="18.5" height="11.5" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.25 12h.01M17.75 12h.01"/>',
    utensilios:  '<path d="M6.5 3.25v7.5a2.2 2.2 0 0 0 4.4 0v-7.5"/><path d="M8.7 10.75v10"/><path d="M16.5 3.25c1.6 0 2.6 1.9 2.6 4.6s-1 3.6-2.6 3.6z"/><path d="M16.5 11.45v9.3"/>',
    chave:       '<circle cx="8" cy="14" r="4.25"/><path d="m11.2 11 8.3-8.3M16.5 5.7l2.3 2.3M14.2 8l2.3 2.3"/>',
    ferramenta:  '<path d="M15.4 3.8a5.5 5.5 0 0 0-6.6 7.3L3.5 16.4a2.1 2.1 0 0 0 3 3l5.3-5.3a5.5 5.5 0 0 0 7.3-6.6l-3 3-2.5-.6-.6-2.5z"/>',
    maleta:      '<rect x="2.75" y="7" width="18.5" height="13.25" rx="2.5"/><path d="M8.5 7V5.25A1.75 1.75 0 0 1 10.25 3.5h3.5A1.75 1.75 0 0 1 15.5 5.25V7"/><path d="M2.75 12.5h18.5"/>',
    'meia-noite': '<circle cx="12" cy="12" r="8.75"/><path d="M12 7.25V12l3.25 2"/>',
    faisca:      '<path d="M12 3.25 13.9 9.1 19.75 11 13.9 12.9 12 18.75 10.1 12.9 4.25 11 10.1 9.1z"/><path d="M18.5 17.5v3M17 19h3"/>',
    'embreve':   '<circle cx="12" cy="12" r="8.75"/><path d="M12 8.5v4M8.5 16.5h7"/>',
    externo:     '<path d="M13.5 4.75h5.75v5.75"/><path d="M19.25 4.75 11 13"/><path d="M18 14.5v4.25a1.75 1.75 0 0 1-1.75 1.75H5.5a1.75 1.75 0 0 1-1.75-1.75V7.75A1.75 1.75 0 0 1 5.5 6h4.25"/>',
    arrastar:    '<circle cx="9" cy="6.5" r="1.3"/><circle cx="15" cy="6.5" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="17.5" r="1.3"/><circle cx="15" cy="17.5" r="1.3"/>',
    tendencia:   '<path d="M3.5 17.5 9.5 11l4 4 7-7.5"/><path d="M15.75 7.5h4.75v4.75"/>',
    'tendencia-baixo':'<path d="M3.5 6.5 9.5 13l4-4 7 7.5"/><path d="M15.75 16.5h4.75V11.75"/>',
    caixa:       '<path d="M3.5 7.25 12 3.25l8.5 4v9.5L12 20.75l-8.5-4z"/><path d="M3.5 7.25 12 11.25l8.5-4M12 11.25v9.5"/>',
    cifrao:      '<path d="M12 2.75v18.5"/><path d="M16.25 7.25c0-1.9-1.9-3-4.25-3s-4.25 1.1-4.25 3 1.9 2.6 4.25 3 4.25 1.1 4.25 3-1.9 3-4.25 3-4.25-1.1-4.25-3"/>',
    setas:       '<path d="M7.5 4.75v13.5M4.25 15l3.25 3.25L10.75 15"/><path d="M16.5 19.25V5.75M13.25 9l3.25-3.25L19.75 9"/>'
  };

  var SOLIDOS = {
    'ponto':  '<circle cx="12" cy="12" r="4.25"/>'
  };

  /* Ícones cujo preenchimento é sólido em vez de traço. */
  function ehSolido(nome) {
    return nome === 'ponto';
  }

  /* Marca um ou mais elementos internos como preenchidos. É feito por
     substituição do atributo no próprio conteúdo, para o autor do ícone só
     precisar escrever `solido` no elemento. */
  function aplicarSolidos(conteudo) {
    return conteudo.replace(/ solido/g, ' fill="currentColor" stroke="none"');
  }

  /* CAUSA RAIZ DOS "ÍCONES GIGANTES", resolvida aqui uma vez só:
     um <svg viewBox="0 0 24 24"> SEM width/height e com `max-width: 100%`
     do reset estica até a largura do container — em card largo vira um
     ícone do tamanho do card. Todo ícone nasce com tamanho explícito. */
  var TAM_PADRAO = 20;
  function svg(nome, opcoes) {
    opcoes = opcoes || {};
    var forma = FORMAS[nome] || SOLIDOS[nome];
    if (!forma) return '';
    var tam = ' width="' + (opcoes.tamanho || TAM_PADRAO) + '" height="' + (opcoes.tamanho || TAM_PADRAO) + '"';
    var classe = opcoes.classe ? ' class="' + opcoes.classe + '"' : '';
    var traco = ehSolido(nome) ? '' : ' fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"';
    var extra = opcoes.rotulo === false ? ' aria-hidden="true" focusable="false"' : ' role="img"';
    return '<svg viewBox="0 0 24 24"' + traco + tam + classe + extra +
           (opcoes.rotulo && opcoes.rotulo !== false ? '><title>' + opcoes.rotulo + '</title>' : '>') +
           aplicarSolidos(forma) + '</svg>';
  }

  /* Versão de uso decorativo: sempre ao lado de um texto que já diz o que é. */
  function d(nome, tamanho) { return svg(nome, { rotulo: false, tamanho: tamanho }); }

  /* Nomes pedidos que não existem. Um ícone que some sem avisar é um defeito
     que ninguém acha depois — esta lista é o rastro, e a bancada cobra que
     ela esteja vazia. */
  var faltando = [];

  window.Icone = {
    svg: svg,
    d: d,
    nomes: Object.keys(FORMAS).concat(Object.keys(SOLIDOS)),
    faltando: faltando,
    tem: function (nome) { return !!(FORMAS[nome] || SOLIDOS[nome]); }
  };
})();
