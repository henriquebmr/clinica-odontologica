import Dexie from 'dexie';

export const db = new Dexie('OdontoHubDB');

/**
 * CONFIGURAÇÃO INTEGRAL DO BANCO DE DADOS
 * Inclui tabelas para usuários, pacientes, equipe, agenda, financeiro, odontograma e prontuários.
 */
db.version(1).stores({
  users: '++id, &email, cpf, role',
  // O cadastro do paciente agora centraliza a anamnese inicial
  pacientes: '++id, nome, cpf, telefone, email_paciente, convenio, motivo_consulta, owner_id',
  equipe: '++id, nome, cpf, cro, cargo, telefone, email, tipo_usuario', 
  agendamentos: '++id, paciente_id, data, hora, owner_id, paciente_nome, paciente_cpf, equipe_id',
  financeiro: '++id, tipo, valor, data, paciente_id, owner_id',
  odontograma: '++id, paciente_id, dente_id, condicao, data, owner_id',
  // Histórico de evoluções para consultas recorrentes
  prontuarios: '++id, paciente_id, data, dentista_nome, observacoes' 
});

export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}