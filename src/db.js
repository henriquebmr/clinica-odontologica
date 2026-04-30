import Dexie from 'dexie';

export const db = new Dexie('OdontoHubDB');

// Definição das tabelas com suporte a todos os campos solicitados
db.version(1).stores({
  users: '++id, &email, role',
  // Cadastro expandido de pacientes
  pacientes: '++id, nome, cpf, telefone, convenio, motivo_consulta, email_paciente, owner_id',
  // Tabela para Dentistas e Funcionários (Equipe)
  equipe: '++id, nome, cpf, cro, cargo, telefone, email, tipo_usuario', 
  agendamentos: '++id, paciente_id, data, hora, email_paciente, owner_id, procedimento, paciente_nome',
  financeiro: '++id, tipo, valor, data, categoria, owner_id',
  odontograma: '++id, paciente_id, dente_id, condicao, data, owner_id'
});

// Função para criptografia de senha
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}