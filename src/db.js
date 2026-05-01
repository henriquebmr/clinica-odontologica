import Dexie from 'dexie';

export const db = new Dexie('OdontoHubDB');

/**
 * CONFIGURAÇÃO DO BANCO DE DADOS - SPRINT 2
 * Os campos listados abaixo são índices. Campos não listados 
 * (como 'motivo_consulta') ainda são salvos, mas não podem ser 
 * usados em filtros rápidos (.where).
 */
db.version(1).stores({
  users: '++id, &email, role',
  
  // Tabela de pacientes - Adicionado 'email_paciente' como índice para busca
  pacientes: '++id, nome, cpf, telefone, email_paciente, owner_id',
  
  equipe: '++id, nome, cpf, cro, cargo, telefone, email, tipo_usuario', 
  
  // Agendamentos - Sprint 2: Adicionado 'paciente_id' e 'data' para verificação de conflitos
  agendamentos: '++id, paciente_id, data, hora, owner_id, paciente_nome',
  
  // Financeiro - Sprint 2: Adicionado 'paciente_id' para vincular receitas aos pacientes
  financeiro: '++id, tipo, valor, data, paciente_id, owner_id',
  
  odontograma: '++id, paciente_id, dente_id, condicao, data, owner_id'
});

// Função para criptografia de senha (SHA-256)
export async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}