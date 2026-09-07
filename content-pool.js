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

const POOL_MAT_FRACOES = [
    [1, 2],
    [1, 3], [2, 3],
    [1, 4], [2, 4], [3, 4],
    [1, 5], [2, 5], [3, 5], [4, 5],
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    [1, 8], [2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8],
    [1, 10], [3, 10], [5, 10], [7, 10], [9, 10]
];

// ============================================================
// PORTUGUÊS — Rimas & Frases Extras
// ============================================================
const POOL_PT_RIMAS = [
    { word: 'GATO', target: 'PATO', options: ['PATO', 'BOLO', 'MESA'], rhymeEnding: 'ATO' },
    { word: 'BOLA', target: 'MOLA', options: ['MOLA', 'DADO', 'GIRAFA'], rhymeEnding: 'OLA' },
    { word: 'MÃO', target: 'PÃO', options: ['PÃO', 'LUVA', 'TATU'], rhymeEnding: 'ÃO' },
    { word: 'COELHO', target: 'ESPELHO', options: ['ESPELHO', 'JANELA', 'RATO'], rhymeEnding: 'ELHO' },
    { word: 'PANELA', target: 'JANELA', options: ['JANELA', 'SAPATO', 'BONECO'], rhymeEnding: 'ELA' },
    { word: 'CORAÇÃO', target: 'BALÃO', options: ['BALÃO', 'CANETA', 'CACHORRO'], rhymeEnding: 'ÃO' },
    { word: 'CHUVA', target: 'UVA', options: ['UVA', 'BANANA', 'BODE'], rhymeEnding: 'UVA' },
    { word: 'SAPATO', target: 'RATO', options: ['RATO', 'CABELO', 'FOGO'], rhymeEnding: 'ATO' },
    { word: 'FLOR', target: 'AMOR', options: ['AMOR', 'PEIXE', 'DENTE'], rhymeEnding: 'OR' },
    { word: 'DADO', target: 'CADEADO', options: ['CADEADO', 'PIPOCA', 'LEÃO'], rhymeEnding: 'ADO' },
    { word: 'DENTE', target: 'PRESENTE', options: ['PRESENTE', 'GELADO', 'SUCO'], rhymeEnding: 'ENTE' },
    { word: 'LATA', target: 'BATA', options: ['BATA', 'COPO', 'SINO'], rhymeEnding: 'ATA' },
    { word: 'SOL', target: 'CARACOL', options: ['CARACOL', 'NUVEM', 'LIVRO'], rhymeEnding: 'OL' },
    { word: 'PEIXE', target: 'FEIXE', options: ['FEIXE', 'BARCO', 'PEDRA'], rhymeEnding: 'EIXE' },
    { word: 'LEÃO', target: 'AVIÃO', options: ['AVIÃO', 'ZEBRA', 'FLORESTA'], rhymeEnding: 'ÃO' },
    { word: 'BONECA', target: 'PETECA', options: ['PETECA', 'MALA', 'CAMA'], rhymeEnding: 'ECA' },
    { word: 'JARDIM', target: 'PUDIM', options: ['PUDIM', 'FLOR', 'ÁRVORE'], rhymeEnding: 'IM' },
    { word: 'SAPO', target: 'PAPO', options: ['PAPO', 'LAGOA', 'PEDRA'], rhymeEnding: 'APO' },
    { word: 'CASA', target: 'ASA', options: ['ASA', 'PORTA', 'CHAVE'], rhymeEnding: 'ASA' },
    { word: 'CASTELO', target: 'AMARELO', options: ['AMARELO', 'REI', 'TORRE'], rhymeEnding: 'ELO' },
    { word: 'MALA', target: 'SALA', options: ['SALA', 'ROUPA', 'VIAGEM'], rhymeEnding: 'ALA' },
    { word: 'CÃO', target: 'BOTÃO', options: ['BOTÃO', 'GATO', 'OSSO'], rhymeEnding: 'ÃO' },
    { word: 'BICO', target: 'RICO', options: ['RICO', 'PENA', 'VOO'], rhymeEnding: 'ICO' },
    { word: 'VENTO', target: 'TALENTO', options: ['TALENTO', 'BRISA', 'FOLHA'], rhymeEnding: 'ENTO' },
    { word: 'DOCE', target: 'TOSSE', options: ['TOSSE', 'AÇÚCAR', 'BOLO'], rhymeEnding: 'OCE' },
    { word: 'RUA', target: 'LUA', options: ['LUA', 'CARRO', 'CASA'], rhymeEnding: 'UA' }
];

const POOL_PT_FRASES = [
    { sentence: 'O GATO BEBE LEITE', parts: ['O GATO', 'BEBE', 'LEITE'] },
    { sentence: 'A BOLA É AZUL', parts: ['A BOLA', 'É', 'AZUL'] },
    { sentence: 'O CACHORRO LATIU ALTO', parts: ['O CACHORRO', 'LATIU', 'ALTO'] },
    { sentence: 'A MENINA COMEU MAÇÃ', parts: ['A MENINA', 'COMEU', 'MAÇÃ'] },
    { sentence: 'O SOL BRILHA NO CÉU', parts: ['O SOL', 'BRILHA', 'NO CÉU'] },
    { sentence: 'O SAPO PULA NA LAGOA', parts: ['O SAPO', 'PULA', 'NA LAGOA'] },
    { sentence: 'EU GOSTO DE DESENHAR', parts: ['EU GOSTO', 'DE', 'DESENHAR'] },
    { sentence: 'O PASSARINHO CANTA FELIZ', parts: ['O PASSARINHO', 'CANTA', 'FELIZ'] },
    { sentence: 'O PEIXE NADA NO RIO', parts: ['O PEIXE', 'NADA', 'NO RIO'] },
    { sentence: 'O LIVRO TEM HISTÓRIAS', parts: ['O LIVRO', 'TEM', 'HISTÓRIAS'] },
    { sentence: 'A CORUJA DORME DE DIA', parts: ['A CORUJA', 'DORME', 'DE DIA'] },
    { sentence: 'O BARCO NAVEGA NO MAR', parts: ['O BARCO', 'NAVEGA', 'NO MAR'] },
    { sentence: 'A BORBOLETA VOA NO JARDIM', parts: ['A BORBOLETA', 'VOA', 'NO JARDIM'] },
    { sentence: 'O MENINO CHUTA A BOLA', parts: ['O MENINO', 'CHUTA', 'A BOLA'] },
    { sentence: 'A MAÇÃ É VERMELHA E DOCE', parts: ['A MAÇÃ É', 'VERMELHA', 'E DOCE'] },
    { sentence: 'A ESTRELA BRILHA NA NOITE', parts: ['A ESTRELA', 'BRILHA', 'NA NOITE'] },
    { sentence: 'O VENTO SOPRA AS FOLHAS', parts: ['O VENTO', 'SOPRA', 'AS FOLHAS'] },
    { sentence: 'O COELHO COME CENOURA', parts: ['O COELHO', 'COME', 'CENOURA'] },
    { sentence: 'A FLOR CRESCE NO VASO', parts: ['A FLOR', 'CRESCE', 'NO VASO'] },
    { sentence: 'O TREM ANDA NOS TRILHOS', parts: ['O TREM', 'ANDA', 'NOS TRILHOS'] },
    { sentence: 'A TARTARUGA ANDA DEVAGAR', parts: ['A TARTARUGA', 'ANDA', 'DEVAGAR'] },
    { sentence: 'A CHUVA MOLHA A PLANTA', parts: ['A CHUVA', 'MOLHA', 'A PLANTA'] },
    { sentence: 'O PATO NADA NA LAGOA', parts: ['O PATO', 'NADA', 'NA LAGOA'] },
    { sentence: 'O MACACO GOSTA DE BANANA', parts: ['O MACACO', 'GOSTA DE', 'BANANA'] },
    { sentence: 'A ABELHA PRODUZ MEL DOCE', parts: ['A ABELHA', 'PRODUZ', 'MEL DOCE'] }
];

// ============================================================
// INGLÊS — Sentenças & Opostos Extras
// ============================================================
const POOL_EN_SENTENCES = [
    { sentence: 'I SEE A CAT', parts: ['I SEE', 'A CAT'] },
    { sentence: 'THE DOG IS BIG', parts: ['THE DOG', 'IS', 'BIG'] },
    { sentence: 'I LIKE RED APPLES', parts: ['I LIKE', 'RED', 'APPLES'] },
    { sentence: 'THE SUN IS HOT', parts: ['THE SUN', 'IS', 'HOT'] },
    { sentence: 'SHE HAS A DOLL', parts: ['SHE HAS', 'A', 'DOLL'] },
    { sentence: 'WE PLAY IN THE PARK', parts: ['WE PLAY', 'IN THE', 'PARK'] },
    { sentence: 'HE CAN RUN FAST', parts: ['HE CAN', 'RUN', 'FAST'] },
    { sentence: 'THE BIRD CAN FLY', parts: ['THE BIRD', 'CAN', 'FLY'] },
    { sentence: 'LOOK AT THE MOON', parts: ['LOOK AT', 'THE', 'MOON'] },
    { sentence: 'THIS IS MY BOOK', parts: ['THIS IS', 'MY', 'BOOK'] },
    { sentence: 'THE FISH CAN SWIM', parts: ['THE FISH', 'CAN', 'SWIM'] },
    { sentence: 'I LOVE MY FAMILY', parts: ['I LOVE', 'MY', 'FAMILY'] },
    { sentence: 'THE SKY IS BLUE', parts: ['THE SKY', 'IS', 'BLUE'] },
    { sentence: 'SHE READS A GOOD BOOK', parts: ['SHE READS', 'A GOOD', 'BOOK'] },
    { sentence: 'WE EAT SWEET FRUIT', parts: ['WE EAT', 'SWEET', 'FRUIT'] },
    { sentence: 'THE GREEN FROG JUMPS', parts: ['THE GREEN FROG', 'JUMPS'] },
    { sentence: 'I HAVE TWO HANDS', parts: ['I HAVE', 'TWO', 'HANDS'] },
    { sentence: 'THE CAR IS VERY FAST', parts: ['THE CAR', 'IS VERY', 'FAST'] },
    { sentence: 'HE DRINKS COLD MILK', parts: ['HE DRINKS', 'COLD', 'MILK'] },
    { sentence: 'THE FLOWERS ARE PRETTY', parts: ['THE FLOWERS', 'ARE', 'PRETTY'] },
    { sentence: 'I CAN JUMP HIGH', parts: ['I CAN', 'JUMP', 'HIGH'] },
    { sentence: 'THE RABBIT IS WHITE', parts: ['THE RABBIT', 'IS', 'WHITE'] },
    { sentence: 'OPEN THE BIG DOOR', parts: ['OPEN', 'THE BIG', 'DOOR'] },
    { sentence: 'THE STARS SHINE AT NIGHT', parts: ['THE STARS', 'SHINE', 'AT NIGHT'] }
];

const POOL_EN_OPPOSITES = [
    { word: 'BIG', target: 'SMALL', options: ['SMALL', 'HOT', 'RED'], icon: '🐘 / 🐭' },
    { word: 'HOT', target: 'COLD', options: ['COLD', 'FAST', 'SUN'], icon: '🔥 / ❄️' },
    { word: 'HAPPY', target: 'SAD', options: ['SAD', 'BIG', 'BLUE'], icon: '😊 / 😢' },
    { word: 'UP', target: 'DOWN', options: ['DOWN', 'IN', 'OUT'], icon: '⬆️ / ⬇️' },
    { word: 'DAY', target: 'NIGHT', options: ['NIGHT', 'RAIN', 'MOON'], icon: '☀️ / 🌙' },
    { word: 'FAST', target: 'SLOW', options: ['SLOW', 'COLD', 'RUN'], icon: '🏎️ / 🐢' },
    { word: 'OPEN', target: 'CLOSED', options: ['CLOSED', 'BOX', 'DOOR'], icon: '📖 / 📕' },
    { word: 'IN', target: 'OUT', options: ['OUT', 'ON', 'OFF'], icon: '📥 / 📤' },
    { word: 'HARD', target: 'SOFT', options: ['SOFT', 'ROCK', 'TALL'], icon: '🪨 / 🧸' },
    { word: 'TALL', target: 'SHORT', options: ['SHORT', 'LITTLE', 'TREE'], icon: '🦒 / 🦔' },
    { word: 'HEAVY', target: 'LIGHT', options: ['LIGHT', 'STRONG', 'BIG'], icon: '🐘 / 🪶' },
    { word: 'WET', target: 'DRY', options: ['DRY', 'WATER', 'RAIN'], icon: '🌧️ / 🌵' },
    { word: 'CLEAN', target: 'DIRTY', options: ['DIRTY', 'FRESH', 'SHINY'], icon: '✨ / 🧼' },
    { word: 'FULL', target: 'EMPTY', options: ['EMPTY', 'CUP', 'PLENTY'], icon: '🥛 / 🫙' },
    { word: 'NEAR', target: 'FAR', options: ['FAR', 'CLOSE', 'HERE'], icon: '📍 / 🔭' },
    { word: 'EARLY', target: 'LATE', options: ['LATE', 'FIRST', 'CLOCK'], icon: '⏰ / 🌙' },
    { word: 'STRONG', target: 'WEAK', options: ['WEAK', 'BOLD', 'FAST'], icon: '💪 / 🍃' },
    { word: 'OLD', target: 'YOUNG', options: ['YOUNG', 'TIME', 'WISE'], icon: '👴 / 👶' },
    { word: 'DARK', target: 'LIGHT', options: ['LIGHT', 'SHADOW', 'SUN'], icon: '🌑 / 💡' },
    { word: 'FRONT', target: 'BACK', options: ['BACK', 'DOOR', 'SIDE'], icon: '🚪 / 🔙' },
    { word: 'QUIET', target: 'LOUD', options: ['LOUD', 'NOISE', 'CALM'], icon: '🤫 / 📢' },
    { word: 'SWEET', target: 'SOUR', options: ['SOUR', 'SUGAR', 'CANDY'], icon: '🍭 / 🍋' },
    { word: 'GOOD', target: 'BAD', options: ['BAD', 'GREAT', 'NICE'], icon: '👍 / 👎' },
    { word: 'RICH', target: 'POOR', options: ['POOR', 'GOLD', 'COIN'], icon: '💎 / 🪙' }
];

// Exportação universal para compatibilidade com browser e node
if (typeof window !== 'undefined') {
    window.ContentPool = {
        POOL_PT_2_SILABAS,
        POOL_PT_3_SILABAS,
        POOL_PT_4_SILABAS,
        POOL_PT_RIMAS,
        POOL_PT_FRASES,
        POOL_EN_CVC,
        POOL_EN_EASY,
        POOL_EN_SNAP_WORDS,
        POOL_EN_CVCE,
        POOL_EN_SENTENCES,
        POOL_EN_OPPOSITES,
        POOL_MAT_SEQUENCIAS,
        POOL_MAT_COMPARACAO,
        POOL_MAT_FRACOES
    };
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        POOL_PT_2_SILABAS,
        POOL_PT_3_SILABAS,
        POOL_PT_4_SILABAS,
        POOL_PT_RIMAS,
        POOL_PT_FRASES,
        POOL_EN_CVC,
        POOL_EN_EASY,
        POOL_EN_SNAP_WORDS,
        POOL_EN_CVCE,
        POOL_EN_SENTENCES,
        POOL_EN_OPPOSITES,
        POOL_MAT_SEQUENCIAS,
        POOL_MAT_COMPARACAO,
        POOL_MAT_FRACOES
    };
}
