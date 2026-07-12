/**
 * POOL DE CONTEÚDOS — KumonGen Wizard
 * ====================================
 * 
 * Arquivo de referência com palavras pré-separadas e validadas para
 * expansão rápida dos bancos de exercícios.
 * 
 * COMO USAR:
 * 1. Escolha palavras de uma categoria abaixo
 * 2. Copie o objeto { word, parts } para o wordList do nível desejado
 * 3. Rode o app e verifique a renderização
 * 
 * REGRAS DE SEPARAÇÃO:
 * - PT: Sílabas reais do português (dígrafos CH/LH/NH juntos, encontros BR/CR etc. juntos)
 * - EN CVC: Cada letra separada (C-A-T)
 * - EN Digraphs: SH, CH, TH, CK, NG, LL, EE, OO, AI, OU juntos
 * - EN CVCe: Padrão C-V-CE (C-A-KE)
 */

// ============================================================
// PORTUGUÊS — Pool de palavras novas (validadas)
// ============================================================

const POOL_PT_2_SILABAS = [
    // Animais
    { word: 'GALO', parts: ['GA','LO'] },
    { word: 'PEGA', parts: ['PE','GA'] },
    { word: 'URSO', parts: ['UR','SO'] },
    { word: 'PERU', parts: ['PE','RU'] },
    { word: 'LEÃO', parts: ['LE','ÃO'] },  // nota: ÃO é ditongo, fica junto
    { word: 'CAJU', parts: ['CA','JU'] },
    { word: 'PUMA', parts: ['PU','MA'] },
    { word: 'LOBA', parts: ['LO','BA'] },
    
    // Objetos do cotidiano
    { word: 'MESA', parts: ['ME','SA'] },
    { word: 'CAMA', parts: ['CA','MA'] },
    { word: 'COPO', parts: ['CO','PO'] },
    { word: 'BOTE', parts: ['BO','TE'] },
    { word: 'REMO', parts: ['RE','MO'] },
    { word: 'VELA', parts: ['VE','LA'] },
    { word: 'MAPA', parts: ['MA','PA'] },
    { word: 'SELA', parts: ['SE','LA'] },
    { word: 'LATA', parts: ['LA','TA'] },
    { word: 'PISO', parts: ['PI','SO'] },
    
    // Natureza
    { word: 'MATO', parts: ['MA','TO'] },
    { word: 'POÇO', parts: ['PO','ÇO'] },
    { word: 'ROSA', parts: ['RO','SA'] },
    { word: 'GOTA', parts: ['GO','TA'] },
    { word: 'NUVEM', parts: ['NU','VEM'] },  // nota: VEM é sílaba travada
    { word: 'NEVE', parts: ['NE','VE'] },
    { word: 'LODO', parts: ['LO','DO'] },
    
    // Comida
    { word: 'BIFE', parts: ['BI','FE'] },
    { word: 'SOPA', parts: ['SO','PA'] },
    { word: 'POTE', parts: ['PO','TE'] },
    { word: 'BALA', parts: ['BA','LA'] },
    { word: 'BOLO', parts: ['BO','LO'] },
    { word: 'CAFÉ', parts: ['CA','FÉ'] },
    
    // Corpo/Ações
    { word: 'MÃOS', parts: ['MÃOS'] },       // monossílaba! não usar para treino 2 síl
    { word: 'RISO', parts: ['RI','SO'] },
    { word: 'GIRO', parts: ['GI','RO'] },
    { word: 'PULO', parts: ['PU','LO'] },
    { word: 'BEIJO', parts: ['BEI','JO'] },   // ditongo EI junto
];

const POOL_PT_3_SILABAS = [
    // Animais
    { word: 'GALINHA', parts: ['GA','LI','NHA'] },   // dígrafo NH
    { word: 'COELHO', parts: ['CO','E','LHO'] },     // dígrafo LH
    { word: 'ABELHA', parts: ['A','BE','LHA'] },     // dígrafo LH
    { word: 'OVELHA', parts: ['O','VE','LHA'] },     // dígrafo LH
    { word: 'PAPAGAIO', parts: ['PA','PA','GAI','O'] }, // ditongo AI
    { word: 'FORMIGA', parts: ['FOR','MI','GA'] },
    { word: 'LAGARTO', parts: ['LA','GAR','TO'] },
    { word: 'TARTARUGA', parts: ['TAR','TA','RU','GA'] },
    { word: 'JOANINHA', parts: ['JO','A','NI','NHA'] },
    
    // Comida
    { word: 'SALADA', parts: ['SA','LA','DA'] },
    { word: 'BATATA', parts: ['BA','TA','TA'] },
    { word: 'CENOURA', parts: ['CE','NOU','RA'] },    // ditongo OU
    { word: 'MACARRÃO', parts: ['MA','CAR','RÃO'] },  // RR se divide, ditongo ÃO
    { word: 'FEIJÃO', parts: ['FEI','JÃO'] },         // ditongo EI + ÃO
    { word: 'CEBOLA', parts: ['CE','BO','LA'] },
    { word: 'MELANCIA', parts: ['ME','LAN','CI','A'] },
    
    // Objetos
    { word: 'CADEIRA', parts: ['CA','DEI','RA'] },    // ditongo EI
    { word: 'TRAVESSA', parts: ['TRA','VES','SA'] },   // encontro TR, SS se divide
    { word: 'MOCHILA', parts: ['MO','CHI','LA'] },    // dígrafo CH
    { word: 'TESOURA', parts: ['TE','SOU','RA'] },    // ditongo OU
    { word: 'PINTURA', parts: ['PIN','TU','RA'] },
    { word: 'DESENHO', parts: ['DE','SE','NHO'] },    // dígrafo NH
    { word: 'COZINHA', parts: ['CO','ZI','NHA'] },    // dígrafo NH
    
    // Lugares
    { word: 'FAZENDA', parts: ['FA','ZEN','DA'] },
    { word: 'FLORESTA', parts: ['FLO','RES','TA'] },  // encontro FL
    { word: 'MONTANHA', parts: ['MON','TA','NHA'] },  // dígrafo NH
    { word: 'PRAIA', parts: ['PRAI','A'] },            // encontro PR, ditongo AI
    { word: 'ESCOLA', parts: ['ES','CO','LA'] },
    
    // Profissões/Pessoas
    { word: 'PROFESSORA', parts: ['PRO','FES','SO','RA'] }, // encontro PR
    { word: 'BOMBEIRO', parts: ['BOM','BEI','RO'] },       // ditongo EI
    { word: 'CRIANÇA', parts: ['CRI','AN','ÇA'] },         // encontro CR
];

const POOL_PT_4_SILABAS = [
    { word: 'BICICLETA', parts: ['BI','CI','CLE','TA'] },
    { word: 'GELADEIRA', parts: ['GE','LA','DEI','RA'] },
    { word: 'CHOCOLATE', parts: ['CHO','CO','LA','TE'] },
    { word: 'TELEFONE', parts: ['TE','LE','FO','NE'] },
    { word: 'ABACAXI', parts: ['A','BA','CA','XI'] },
    { word: 'BORBOLETA', parts: ['BOR','BO','LE','TA'] },
    { word: 'DINOSSAURO', parts: ['DI','NOS','SAU','RO'] },
    { word: 'HELICÓPTERO', parts: ['HE','LI','CÓP','TE','RO'] },
    { word: 'COMPUTADOR', parts: ['COM','PU','TA','DOR'] },
    { word: 'VENTILADOR', parts: ['VEN','TI','LA','DOR'] },
    { word: 'TELEVISÃO', parts: ['TE','LE','VI','SÃO'] },
    { word: 'JACARÉ', parts: ['JA','CA','RÉ'] },
    { word: 'ELEFANTE', parts: ['E','LE','FAN','TE'] },
    { word: 'HIPOPÓTAMO', parts: ['HI','PO','PÓ','TA','MO'] },
    { word: 'RINOCERONTE', parts: ['RI','NO','CE','RON','TE'] },
];

// ============================================================
// INGLÊS — Pool de palavras novas (validadas)
// ============================================================

const POOL_EN_CVC = [
    // Extras CVC que não estão no banco atual
    { word: 'RED', parts: ['R','E','D'] },
    { word: 'SIT', parts: ['S','I','T'] },
    { word: 'POP', parts: ['P','O','P'] },
    { word: 'LID', parts: ['L','I','D'] },
    { word: 'WAG', parts: ['W','A','G'] },
    { word: 'HUG', parts: ['H','U','G'] },
    { word: 'YAM', parts: ['Y','A','M'] },
    { word: 'COD', parts: ['C','O','D'] },
    { word: 'KID', parts: ['K','I','D'] },
    { word: 'DAD', parts: ['D','A','D'] },
    { word: 'MOM', parts: ['M','O','M'] },
    { word: 'WIG', parts: ['W','I','G'] },
    { word: 'SIP', parts: ['S','I','P'] },
    { word: 'DIM', parts: ['D','I','M'] },
    { word: 'GAS', parts: ['G','A','S'] },
    { word: 'TAG', parts: ['T','A','G'] },
    { word: 'NUT', parts: ['N','U','T'] },
    { word: 'ROD', parts: ['R','O','D'] },
    { word: 'TUG', parts: ['T','U','G'] },
    { word: 'LOG', parts: ['L','O','G'] },
];

const POOL_EN_EASY = [
    // 4-5 letras com dígrafos comuns
    { word: 'BATH', parts: ['B','A','TH'] },
    { word: 'MATH', parts: ['M','A','TH'] },
    { word: 'CASH', parts: ['C','A','SH'] },
    { word: 'WISH', parts: ['W','I','SH'] },
    { word: 'RUSH', parts: ['R','U','SH'] },
    { word: 'SUCH', parts: ['S','U','CH'] },
    { word: 'MUCH', parts: ['M','U','CH'] },
    { word: 'RICH', parts: ['R','I','CH'] },
    { word: 'LOCK', parts: ['L','O','CK'] },
    { word: 'KICK', parts: ['K','I','CK'] },
    { word: 'DUCK', parts: ['D','U','CK'] },
    { word: 'SONG', parts: ['S','O','NG'] },
    { word: 'LONG', parts: ['L','O','NG'] },
    { word: 'SING', parts: ['S','I','NG'] },
    { word: 'WING', parts: ['W','I','NG'] },
    { word: 'WELL', parts: ['W','E','LL'] },
    { word: 'TALL', parts: ['T','A','LL'] },
    { word: 'FALL', parts: ['F','A','LL'] },
    
    // Com blends iniciais
    { word: 'FROG', parts: ['F','R','O','G'] },
    { word: 'CRAB', parts: ['C','R','A','B'] },
    { word: 'DRUM', parts: ['D','R','U','M'] },
    { word: 'SLUG', parts: ['S','L','U','G'] },
    { word: 'SPOT', parts: ['S','P','O','T'] },
    { word: 'STOP', parts: ['S','T','O','P'] },
    { word: 'TRIP', parts: ['T','R','I','P'] },
    { word: 'CLAP', parts: ['C','L','A','P'] },
    { word: 'SNAP', parts: ['S','N','A','P'] },
    { word: 'GRAB', parts: ['G','R','A','B'] },
];

const POOL_EN_SNAP_WORDS = [
    // Dolch/Fry sight words extras
    { word: 'THEY', parts: ['TH','EY'] },
    { word: 'THIS', parts: ['TH','I','S'] },
    { word: 'THAT', parts: ['TH','A','T'] },
    { word: 'THEM', parts: ['TH','E','M'] },
    { word: 'THEN', parts: ['TH','E','N'] },
    { word: 'WITH', parts: ['W','I','TH'] },
    { word: 'WHEN', parts: ['WH','E','N'] },
    { word: 'WHAT', parts: ['WH','A','T'] },
    { word: 'WILL', parts: ['W','I','LL'] },
    { word: 'DOWN', parts: ['D','OW','N'] },
    { word: 'EACH', parts: ['EA','CH'] },
    { word: 'FROM', parts: ['F','R','O','M'] },
    { word: 'HAVE', parts: ['H','A','VE'] },
    { word: 'BEEN', parts: ['B','EE','N'] },
    { word: 'SOME', parts: ['S','O','ME'] },
    { word: 'JUST', parts: ['J','U','S','T'] },
    { word: 'VERY', parts: ['V','ER','Y'] },
    { word: 'OVER', parts: ['O','V','ER'] },
    { word: 'INTO', parts: ['IN','TO'] },
    { word: 'GOOD', parts: ['G','OO','D'] },
];

const POOL_EN_CVCE = [
    // CVCe extras — padrão C-V-CE
    { word: 'BAKE', parts: ['B','A','KE'] },
    { word: 'CAPE', parts: ['C','A','PE'] },
    { word: 'DIME', parts: ['D','I','ME'] },
    { word: 'DIVE', parts: ['D','I','VE'] },
    { word: 'FIVE', parts: ['F','I','VE'] },
    { word: 'GAME', parts: ['G','A','ME'] },
    { word: 'GLOBE', parts: ['G','LO','BE'] },   // blend GL
    { word: 'GRADE', parts: ['G','RA','DE'] },   // blend GR
    { word: 'HIDE', parts: ['H','I','DE'] },
    { word: 'HOPE', parts: ['H','O','PE'] },
    { word: 'JOKE', parts: ['J','O','KE'] },
    { word: 'LIFE', parts: ['L','I','FE'] },
    { word: 'MANE', parts: ['M','A','NE'] },
    { word: 'NAME', parts: ['N','A','ME'] },
    { word: 'NINE', parts: ['N','I','NE'] },
    { word: 'PRIZE', parts: ['P','RI','ZE'] },   // blend PR
    { word: 'QUITE', parts: ['QU','I','TE'] },   // QU fonema
    { word: 'RIPE', parts: ['R','I','PE'] },
    { word: 'SAFE', parts: ['S','A','FE'] },
    { word: 'SIDE', parts: ['S','I','DE'] },
    { word: 'SNAKE', parts: ['S','NA','KE'] },   // blend SN
    { word: 'STONE', parts: ['S','TO','NE'] },   // blend ST
    { word: 'TIME', parts: ['T','I','ME'] },
    { word: 'VINE', parts: ['V','I','NE'] },
    { word: 'ZONE', parts: ['Z','O','NE'] },
];

// ============================================================
// MATEMÁTICA — Pool de conteúdo para novos níveis
// ============================================================

const POOL_MAT_SEQUENCIAS = [
    // Sequências com passo 1 (fáceis)
    [1,2,'__',4,5], [5,6,7,'__',9], ['__',3,4,5,6],
    // Sequências com passo 2
    [2,4,'__',8,10], [1,3,5,'__',9], [10,12,'__',16,18],
    // Sequências com passo 5
    [5,10,15,'__',25], [10,15,20,'__',30], [25,30,'__',40,45],
    // Sequências com passo 10
    [10,20,'__',40,50], [30,40,50,'__',70], [50,'__',70,80,90],
    // Sequências decrescentes
    [20,19,'__',17,16], [10,9,8,'__',6], [15,14,'__',12,11],
    // Com dupla lacuna
    [1,'__',3,'__',5], ['__',4,'__',6,7], [10,'__',12,'__',14],
];

const POOL_MAT_COMPARACAO = [
    // Pares fáceis (diferença grande)
    [1,9], [2,8], [3,7],
    // Pares médios
    [4,6], [5,7], [3,5],
    // Pares iguais (piège!)
    [4,4], [7,7], [5,5],
    // Pares com dezenas
    [12,15], [20,18], [11,11],
    // Pares com diferença 1
    [8,9], [6,5], [3,2],
];
