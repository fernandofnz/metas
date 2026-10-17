// Lista inicial usada apenas no MODO DEMONSTRAÇÃO (quando config.js está vazio).
// No modo real, os membros ficam no banco do Supabase (veja supabase.sql).
// Formato: [ID, Nome, Cargo, Situação]
//   cargos:    gerencia, soldado, membro, morador
//   situações: paga, adiantada, atrasada, atrasada_mais, off, isenta
window.MEMBROS_INICIAIS = [
  // ---------- Moradores ----------
  ['54528', 'Style', 'morador', 'paga'],
  ['31616', 'Golda', 'morador', 'paga'],
  ['48731', 'Rafa', 'morador', 'paga'],
  ['5892', 'Jade', 'morador', 'paga'],
  ['12963', 'Mandela', 'morador', 'paga'],

  ['48232', 'Victor Oliveira', 'morador', 'atrasada'],
  ['55738', 'LV', 'morador', 'atrasada'],
  ['40579', 'Lara', 'morador', 'atrasada'],

  ['25597', 'Paraíba', 'morador', 'isenta'],
  ['9432', 'Pablo', 'morador', 'isenta'],
  ['32586', 'Júlio', 'morador', 'isenta'],
  ['26477', 'Biel', 'morador', 'isenta'],
  ['49039', 'Diego', 'morador', 'isenta'],
  ['58893', 'Bernardo', 'morador', 'isenta'],
  ['28550', 'Pichote', 'morador', 'isenta'],
  ['53134', 'Jalambe', 'morador', 'isenta'],
  ['17635', 'Maxi', 'morador', 'isenta'],
  ['49310', 'Tiagueira', 'morador', 'isenta'],
  ['57858', 'Mac', 'morador', 'isenta'],
  ['57', 'Dani', 'morador', 'isenta'],
  ['25329', 'Neclass', 'morador', 'isenta'],
  ['54736', 'Marcin', 'morador', 'isenta'],
  ['59724', 'João', 'morador', 'isenta'],
  ['59596', 'Davi', 'morador', 'isenta'],
  ['55559', 'HEITTS', 'morador', 'isenta'],
  ['27278', 'Dinho', 'morador', 'isenta'],
  ['36723', 'Ice', 'morador', 'isenta'],
  ['59668', 'Hudson', 'morador', 'isenta'],
  ['59584', 'Matheus', 'morador', 'isenta'],
  ['59975', 'Skank', 'morador', 'isenta'],
  ['47632', 'Drey', 'morador', 'isenta'],
  ['59982', 'Mauro', 'morador', 'isenta'],
  ['59939', 'Gamibé', 'morador', 'isenta'],
  ['19839', 'Psico', 'morador', 'isenta'],
  ['57062', 'HRZ', 'morador', 'isenta'],
  ['17231', 'Índio', 'morador', 'isenta'],
  ['60176', 'Costela', 'morador', 'isenta'],
  ['60330', 'Ajás', 'morador', 'isenta'],
  ['58868', 'Rick XT', 'morador', 'isenta'],

  // ---------- Membros ----------
  ['11350', 'Leozinho', 'membro', 'paga'],
  ['57865', 'Jonatas', 'membro', 'paga'],
  ['57627', 'Alec', 'membro', 'paga'],
  ['55987', 'Michael Jackson', 'membro', 'paga'],
  ['55913', 'Senna', 'membro', 'paga'],
  ['23960', 'Alves', 'membro', 'paga'],
  ['57755', 'Alves', 'membro', 'paga'],
  ['29705', 'Teixeira', 'membro', 'paga'],
  ['656', 'THS', 'membro', 'paga'],

  ['55934', 'Blood', 'membro', 'atrasada'],
  ['51617', 'Benjamin', 'membro', 'atrasada'],
  ['58259', 'Levi', 'membro', 'atrasada'],

  ['27331', 'Zarate', 'membro', 'off'],
  ['47408', 'Pé de Pato', 'membro', 'off'],

  // ---------- Soldados ----------
  ['14040', 'Gemini', 'soldado', 'paga'],
  ['570', 'Silas', 'soldado', 'paga'],
  ['27992', 'BG', 'soldado', 'paga'],
  ['15054', 'Duda', 'soldado', 'paga'],
  ['15645', 'Hanabi', 'soldado', 'paga'],
  ['577', 'Strong', 'soldado', 'paga'],
  ['43303', 'Maicon', 'soldado', 'paga'],

  ['30240', 'Boca', 'soldado', 'atrasada'],
  ['9695', 'Vitor', 'soldado', 'atrasada'],
  ['49620', 'Dedé', 'soldado', 'atrasada'],
  ['54073', 'Rian', 'soldado', 'atrasada'],
  ['576', 'Marcelo', 'soldado', 'atrasada'],

  ['15939', 'JNE', 'soldado', 'off'],
];
