import Dexie from 'dexie';

export const db = new Dexie('OdontoHubDB');

// Mantemos a versão 1 para quem já tem o banco instalado
db.version(1).stores({
  users: '++id, &email, cpf, role, nome',
  pacientes: '++id, nome, cpf, telefone, email_paciente, convenio, profissao, contato_emergencia, owner_id',
  equipe: '++id, nome, cpf, cro, cargo, telefone, email, tipo_usuario', 
  agendamentos: '++id, paciente_id, data, hora, owner_id, paciente_nome, paciente_cpf, equipe_id',
  financeiro: '++id, tipo, valor, data, paciente_id, owner_id',
  odontograma: '++id, paciente_id, dente_id, condicao, data, owner_id',
  prontuarios: '++id, paciente_id, data, dentista_nome, dentista_id, queixa_principal, historico_medico, historico_odontologico, habitos_vida' 
});

// Criamos a versão 2 para expandir a tabela de prontuários com os campos da Imagem 2
// Adicionamos também o índice 'paciente_id' em prontuários para facilitar a busca por ficha de cada paciente
db.version(2).stores({
  prontuarios: '++id, paciente_id, equipe_id, data, tipo_sanguineo' 
}).upgrade(tx => {
  // Aqui você pode adicionar lógica de migração se necessário no futuro
});

/**
 * Função original mantida para suporte ao sistema de login
 */
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}