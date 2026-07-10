KumonGen · Gerador de Cadernos Personalizados
Este é um gerador de exercícios no estilo Kumon, desenvolvido como uma SPA (página única) para uso doméstico. O foco principal é auxiliar crianças com dificuldades em matemática (como discalculia), oferecendo cadernos de treino adaptáveis e de fácil expansão.

Funcionalidades
✅ Escolha entre Português (traçado de letras, sílabas, palavras) e Matemática (quantidade, adição, sequências, dezenas, comparação, vizinhos).

✅ Pré‑visualização em tamanho real (A4 paisagem) com duas páginas lado a lado.

✅ Ajuste de zoom e número de linhas por página.

✅ Geração de PDF pronto para impressão (A4 paisagem, alta qualidade).

✅ Banco de dados central (LevelLibrary) em JSON – fácil de expandir sem conhecimentos de programação.

Como usar
Acesse a página (GitHub Pages ou abra o arquivo index.html localmente).

Na barra lateral, selecione Português ou Matemática.

Escolha um nível (os exercícios aparecem na pré‑visualização).

Ajuste o zoom ou o número de linhas conforme necessário.

Clique em GERAR PDF para baixar um arquivo pronto para impressão.

Dica: Você pode imprimir o PDF em casa ou enviá‑lo por e‑mail para uma impressora com conectividade.

Adicionando novos conteúdos (níveis)
Todo o conteúdo é definido no objeto global LevelLibrary, que fica no início do arquivo index.html. Para adicionar um novo nível, basta editar esse objeto seguindo a estrutura abaixo.

Estrutura geral
javascript
window.LevelLibrary = {
  portugues: [ /* lista de níveis de português */ ],
  matematica: [ /* lista de níveis de matemática */ ]
};
Cada nível é um objeto com as seguintes propriedades obrigatórias:

Propriedade	Tipo	Descrição
id	string	Identificador único (ex: 'm8', 'p4').
title	string	Título que aparecerá no cabeçalho do caderno.
type	string	Tipo do exercício (veja a lista completa abaixo).
instruction	string	Instrução curta que aparece abaixo do título.
Além dessas, cada type exige propriedades específicas. Abaixo estão todos os tipos disponíveis com exemplos.

Tipos de exercício (Matemática)
1. quantity – Números e quantidades
javascript
{
  id: 'm1',
  title: 'M1 · Números 1 a 5',
  type: 'quantity',
  numbers: [1, 2, 3, 4, 5],
  instruction: 'Desenhe a quantidade de círculos.'
}
numbers: array de números que serão repetidos.

2. math – Adição simples (pode ser adaptado para subtração futuramente)
javascript
{
  id: 'm2',
  title: 'M2 · Adição +1 (até 10)',
  type: 'math',
  operator: '+',
  operand: 1,
  range: [1, 9],
  instruction: 'Some mentalmente e escreva o resultado.'
}
operator: '+' (por enquanto apenas adição).

operand: valor fixo a ser somado (ex: 1, 2, 5…).

range: intervalo do primeiro operando [min, max].

3. sequence – Complete a sequência
javascript
{
  id: 'm3',
  title: 'M3 · Complete a sequência (1‑10)',
  type: 'sequence',
  sequences: [
    [1, 2, '__', 4, 5],
    [5, 6, 7, '__', 9],
    [8, '__', 10]
  ],
  instruction: 'Escreva o número que falta.'
}
sequences: array de arrays. Use '__' (dois underlines) para indicar a lacuna.

4. tens – Dezena + unidade (visual)
javascript
{
  id: 'm4',
  title: 'M4 · Dezena e unidade (11‑19)',
  type: 'tens',
  numbers: [11, 13, 15, 17, 19],
  instruction: 'Pinte um grupo de 10 e depois as unidades.'
}
numbers: lista de números entre 11 e 19.

5. compare – Comparação (maior/menor)
javascript
{
  id: 'm5',
  title: 'M5 · Comparação',
  type: 'compare',
  pairs: [[3,5], [7,2], [4,4], [6,9]],
  instruction: 'Circule o número maior (ou igual).'
}
pairs: array de pares [a, b].

6. neighbors – Vizinhos (antes/depois)
javascript
{
  id: 'm7',
  title: 'M7 · Vizinhos (1‑20)',
  type: 'neighbors',
  centers: [5, 10, 15, 18],
  instruction: 'Escreva o número que vem antes e depois.'
}
centers: array com os números centrais.

Tipos de exercício (Português)
7. trace – Traçado de letras
javascript
{
  id: 'p1',
  title: 'P1 · Alfabeto',
  type: 'trace',
  letters: ['A', 'B', 'C', 'D', 'E'],
  instruction: 'Cubra o pontilhado e treine a letra.'
}
letters: array de caracteres.

8. syllables – Sílabas simples
javascript
{
  id: 'p2',
  title: 'P2 · Sílabas',
  type: 'syllables',
  syllables: ['BA', 'BE', 'BI', 'BO', 'BU'],
  instruction: 'Leia e copie as sílabas.'
}
syllables: array de strings (sílabas).

9. wordbuilding – Formação de palavras
javascript
{
  id: 'p3',
  title: 'P3 · Palavras curtas',
  type: 'wordbuilding',
  words: [
    { word: 'BOLA', parts: ['BO','LA'] },
    { word: 'CASA', parts: ['CA','SA'] }
  ],
  instruction: 'Junte as sílabas e forme a palavra.'
}
words: array de objetos com word (string completa) e parts (array de sílabas).

Dicas para expansão
Mantenha os id únicos e, de preferência, siga um padrão (m1, m2… / p1, p2…).

Os exercícios são gerados automaticamente repetindo os itens para preencher as páginas (de acordo com o número de linhas escolhido).

Para os tipos math e sequence, a geração é um pouco mais flexível (usa sorteio ou repete sequências).

Para os demais, cada elemento da lista é repetido algumas vezes.

Se quiser um novo tipo de exercício, será necessário editar o código JavaScript (as funções generateItemsForLevel e renderItemCell). Caso precise de ajuda, entre em contato.

Implantação no GitHub Pages
Crie um repositório no GitHub.

Faça o upload do arquivo index.html (com todo o código) e deste README.md.

Nas configurações do repositório, ative o GitHub Pages apontando para a branch principal.

Pronto! Seu gerador estará disponível em https://<seu-usuario>.github.io/<repositorio>/.

Licença
Este projeto é de uso livre para fins educacionais e domésticos. Modificações são bem‑vindas para atender às necessidades específicas de aprendizagem.
