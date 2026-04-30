import React, { useState, useEffect } from 'react';
import { db, hashPassword } from './db';
import logo from './assets/logo.png'; 
import { 
  Users, Calendar, DollarSign, LayoutDashboard, LogOut, UserCircle, 
  Trash2, Edit3, RefreshCw, X, ChevronRight, ArrowUpRight, ArrowDownRight, 
  Search, Activity, Stethoscope, Briefcase 
} from 'lucide-react';

export default function App() {
  // --- 1. ESTADOS GERAIS E DE SESSÃO ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); 
  const [loginForm, setLoginForm] = useState({ email: '', pass: '' });

  // --- 2. ESTADOS ADMINISTRATIVOS ---
  const [pacientes, setPacientes] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  
  const [novoPaciente, setNovoPaciente] = useState({ 
    nome:'', cpf:'', telefone:'', convenio:'', motivo_consulta:'', email_paciente:'' 
  });

  const [novoMembro, setNovoMembro] = useState({ 
    nome: '', cpf: '', cro: '', cargo: '', telefone: '', email: '', tipo_usuario: 'dentista' 
  });

  const [novaConsulta, setNovaConsulta] = useState({ paciente_id: '', data: '', hora: '', procedimento: 'Consulta Geral' });
  const [transacoes, setTransacoes] = useState([]);
  // Estado financeiro atualizado para suportar vínculo com paciente
  const [novaTransacao, setNovaTransacao] = useState({ tipo: 'receita', valor: '', categoria: 'Consulta', paciente_id: '' });
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [odontogramaData, setOdontogramaData] = useState([]);

  // --- 3. ESTADOS DO PACIENTE ---
  const [perfilForm, setPerfilForm] = useState({ nome: '', telefone: '', endereco: '', alergias: '' });
  const [editandoPerfil, setEditandoPerfil] = useState(false);

  // --- 4. MÁSCARAS ---
  const maskCPF = (v) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").slice(0, 14);
  const maskPhone = (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);

  // --- 5. CARREGAMENTO DE DADOS ---
  const carregarTudo = async () => {
    try {
      const [pts, ags, fin, eq] = await Promise.all([
        db.pacientes.toArray(),
        db.agendamentos.toArray(),
        db.financeiro.toArray(),
        db.equipe.toArray()
      ]);
      setPacientes(pts || []);
      setAgendamentos(ags || []);
      setTransacoes(fin || []);
      setEquipe(eq || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('odonto_session');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setIsLoggedIn(true);
      carregarTudo();
    }
  }, []);

  // --- 6. FUNÇÕES DE SALVAMENTO E EDIÇÃO ---
  
  const verificarDisponibilidade = async (data, hora) => {
    const agendamentosDoDia = await db.agendamentos.where({ data: data }).toArray();
    const conflito = agendamentosDoDia.find(a => a.hora === hora && a.id !== editandoId);
    return !conflito;
  };

  const handleSalvarPaciente = async (e) => {
    e.preventDefault();
    if (editandoId) {
      await db.pacientes.update(editandoId, novoPaciente);
      setEditandoId(null);
    } else {
      await db.pacientes.add({ ...novoPaciente, owner_id: currentUser.id });
    }
    setNovoPaciente({ nome:'', cpf:'', telefone:'', convenio:'', motivo_consulta:'', email_paciente:'' });
    await carregarTudo();
  };

  const handleSalvarAgenda = async (e) => {
    if (e) e.preventDefault();
    const p = pacientes.find(px => px.id === parseInt(novaConsulta.paciente_id));
    if (!p) return alert("Selecione um paciente válido.");

    const dadosAgendamento = {
      ...novaConsulta,
      paciente_id: parseInt(novaConsulta.paciente_id),
      owner_id: currentUser.id,
      paciente_nome: p.nome,
      email_paciente: p.email_paciente || '',
      motivo: p.motivo_consulta || 'Nenhum motivo detalhado',
      convenio: p.convenio || 'Particular',
      telefone: p.telefone || ''
    };

    if (editandoId) {
      await db.agendamentos.update(editandoId, dadosAgendamento);
      setEditandoId(null);
    } else {
      await db.agendamentos.add(dadosAgendamento);
    }

    setNovaConsulta({ paciente_id: '', data: '', hora: '', procedimento: 'Consulta Geral' });
    await carregarTudo();
  };

  const handleSalvarEquipe = async (e) => {
    e.preventDefault();
    await db.equipe.add({ ...novoMembro });
    setNovoMembro({ nome: '', cpf: '', cro: '', cargo: '', telefone: '', email: '', tipo_usuario: 'dentista' });
    await carregarTudo();
  };

  const handleSalvarFinanceiro = async (e) => {
    e.preventDefault();
    
    let nomeExibicao = novaTransacao.categoria;
    
    // Vincula o nome do paciente ao lançamento se for uma receita
    if (novaTransacao.tipo === 'receita' && novaTransacao.paciente_id) {
      const pacienteEncontrado = pacientes.find(px => px.id === parseInt(novaTransacao.paciente_id));
      if (pacienteEncontrado) {
        nomeExibicao = `Receita: ${pacienteEncontrado.nome}`;
      }
    }

    await db.financeiro.add({ 
      ...novaTransacao, 
      valor: parseFloat(novaTransacao.valor), 
      data: new Date().toISOString(), 
      owner_id: currentUser.id,
      descricao_exibicao: nomeExibicao 
    });

    setNovaTransacao({ tipo: 'receita', valor: '', categoria: 'Consulta', paciente_id: '' });
    await carregarTudo();
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    const emailLimpo = loginForm.email.toLowerCase().trim();
    const hashed = await hashPassword(loginForm.pass);
    if (authMode === 'login') {
      const account = await db.users.where({ email: emailLimpo }).first();
      if (account && account.password === hashed) {
        setCurrentUser(account); setIsLoggedIn(true);
        localStorage.setItem('odonto_session', JSON.stringify(account));
        await carregarTudo();
      } else alert('E-mail ou senha incorretos.');
    } else {
      const role = emailLimpo.endsWith('@admin.com') ? 'admin' : 'paciente';
      await db.users.add({ email: emailLimpo, password: hashed, role });
      setAuthMode('login'); alert('Conta criada!');
    }
  };

  const logout = () => { localStorage.clear(); window.location.reload(); };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="flex w-full max-w-5xl h-[600px] bg-[#1E293B] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-700">
          <div className="w-1/2 bg-[#2563EB] p-16 text-white flex flex-col justify-center items-center">
            <img src={logo} alt="Logo" className="w-64 mb-8" />
            <h1 className="text-4xl font-black italic uppercase text-white">OdontoHub Pro</h1>
          </div>
          <div className="w-1/2 p-16 flex flex-col justify-center">
            <h2 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter">
              {authMode === 'login' ? 'Entrar' : 'Cadastrar'}
            </h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" required placeholder="E-mail" className="w-full bg-[#0F172A] text-white p-4 rounded-2xl border border-slate-600 outline-none focus:ring-2 focus:ring-blue-500" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              <input type="password" required placeholder="Senha" className="w-full bg-[#0F172A] text-white p-4 rounded-2xl border border-slate-600 outline-none focus:ring-2 focus:ring-blue-500" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
              <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase">Acessar</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 text-xs text-slate-400 font-bold uppercase text-center w-full">
              {authMode === 'login' ? 'Não tem conta? Clique aqui' : 'Já tem conta? Login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="flex h-screen bg-[#0F172A] font-sans text-white overflow-hidden">
      <aside className="w-72 bg-[#1E293B] flex flex-col border-r border-slate-800 z-20">
        <div className="p-10 flex flex-col items-center gap-4">
            <img src={logo} alt="Logo" className="w-56 h-auto object-contain" />
            <h2 className="text-xl font-black tracking-tighter uppercase italic">Odonto<span className="text-blue-500 not-italic">Hub</span></h2>
        </div>
        <nav className="flex-1 px-6 pt-6 space-y-2">
          {isAdmin ? (
            <>
              <NavItem active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
              <NavItem active={activeTab === 'pacientes'} icon={<Users size={20}/>} label="Pacientes" onClick={() => {setActiveTab('pacientes'); setPacienteSelecionado(null); setEditandoId(null);}} />
              <NavItem active={activeTab === 'equipe'} icon={<Briefcase size={20}/>} label="Equipe" onClick={() => setActiveTab('equipe')} />
              <NavItem active={activeTab === 'agenda'} icon={<Calendar size={20}/>} label="Agenda Médica" onClick={() => {setActiveTab('agenda'); setEditandoId(null);}} />
              <NavItem active={activeTab === 'financeiro'} icon={<DollarSign size={20}/>} label="Financeiro" onClick={() => setActiveTab('financeiro')} />
            </>
          ) : (
            <>
              <NavItem active={activeTab === 'consultas'} icon={<Calendar size={20}/>} label="Minhas Consultas" onClick={() => setActiveTab('consultas')} />
              <NavItem active={activeTab === 'perfil'} icon={<UserCircle size={20}/>} label="Meu Perfil" onClick={() => setActiveTab('perfil')} />
            </>
          )}
        </nav>
        <button onClick={logout} className="p-10 text-red-400 font-black text-[10px] uppercase flex items-center gap-2 hover:text-red-300 transition-colors"><LogOut size={16} /> Sair</button>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 bg-[#0F172A] relative">
        {isAdmin ? (
          <>
            {activeTab === 'dashboard' && <DashboardView pacientesCount={pacientes.length} agendamentosCount={agendamentos.length} transacoes={transacoes} />}
            
            {activeTab === 'pacientes' && !pacienteSelecionado && (
              <PacientesView 
                pacientes={pacientes} novo={novoPaciente} setNovo={setNovoPaciente} maskCPF={maskCPF} maskPhone={maskPhone}
                save={handleSalvarPaciente} editandoId={editandoId} setEditandoId={setEditandoId}
                onEdit={(p) => { setNovoPaciente({...p}); setEditandoId(p.id); }}
                deletar={async (id) => { if(confirm("Remover paciente?")) { await db.pacientes.delete(id); carregarTudo(); } }} 
                onSelect={async (p) => { 
                  setPacienteSelecionado(p); 
                  const data = await db.odontograma.where({ paciente_id: p.id }).toArray();
                  setOdontogramaData(data);
                }} 
              />
            )}

            {activeTab === 'equipe' && (
              <EquipeView equipe={equipe} novo={novoMembro} setNovo={setNovoMembro} maskCPF={maskCPF} maskPhone={maskPhone} save={handleSalvarEquipe} deletar={async (id) => { if(confirm("Remover membro?")) { await db.equipe.delete(id); carregarTudo(); } }} />
            )}

            {activeTab === 'agenda' && (
              <AgendaView 
                pacientes={pacientes} agendamentos={agendamentos} nova={novaConsulta} setNova={setNovaConsulta} save={handleSalvarAgenda} 
                editandoId={editandoId} setEditandoId={setEditandoId} onEdit={(ag) => { setNovaConsulta({...ag}); setEditandoId(ag.id); }}
                onDelete={async (id) => { if(confirm("Cancelar agendamento?")) { await db.agendamentos.delete(id); carregarTudo(); } }}
                verificar={verificarDisponibilidade} 
              />
            )}

            {activeTab === 'financeiro' && (
              <FinanceiroView 
                transacoes={transacoes} 
                nova={novaTransacao} 
                setNova={setNovaTransacao} 
                save={handleSalvarFinanceiro} 
                pacientes={pacientes} 
              />
            )}

            {pacienteSelecionado && <OdontogramaDetalhes paciente={pacienteSelecionado} data={odontogramaData} onBack={() => setPacienteSelecionado(null)} onDenteClick={async (id, cond) => { await db.odontograma.where({ paciente_id: pacienteSelecionado.id, dente_id: id }).delete(); if (cond && cond !== 'saudavel') await db.odontograma.add({ owner_id: currentUser.id, paciente_id: pacienteSelecionado.id, dente_id: id, condicao: cond, data: new Date().toISOString() }); const newData = await db.odontograma.where({ paciente_id: pacienteSelecionado.id }).toArray(); setOdontogramaData(newData); }} />}
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
             {activeTab === 'consultas' && <MinhasConsultas agendamentos={agendamentos} carregarDadosPaciente={() => carregarTudo()} currentUser={currentUser} />}
             {activeTab === 'perfil' && <PerfilPacienteView form={perfilForm} setForm={setPerfilForm} maskPhone={maskPhone} save={async (e) => { e.preventDefault(); await db.users.update(currentUser.id, perfilForm); setEditandoPerfil(false); alert("Salvo!"); }} editando={editandoPerfil} setEditando={setEditandoPerfil} email={currentUser.email} />}
          </div>
        )}
      </main>
    </div>
  );
}

// --- SUBCOMPONENTES ---

function NavItem({ icon, label, active, onClick }) {
  return ( <button onClick={onClick} className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-black text-[11px] uppercase tracking-widest ${active ? 'bg-blue-600 text-white shadow-xl scale-105' : 'text-slate-500 hover:text-blue-400'}`}>{icon} {label}</button> );
}

function DashboardView({ pacientesCount, agendamentosCount, transacoes }) {
  const rec = transacoes.filter(t => t.tipo === 'receita').reduce((a, b) => a + b.valor, 0);
  const des = transacoes.filter(t => t.tipo === 'despesa').reduce((a, b) => a + b.valor, 0);
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <h1 className="text-5xl font-black uppercase italic tracking-tighter text-white">Visão Geral</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl"><div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><Users size={24}/></div><div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Pacientes</p><p className="text-4xl font-black text-white">{pacientesCount}</p></div></div>
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl"><div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><Calendar size={24}/></div><div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Agenda</p><p className="text-4xl font-black text-white">{agendamentosCount}</p></div></div>
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl"><div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><DollarSign size={24}/></div><div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Saldo</p><p className="text-4xl font-black text-white">{`R$ ${(rec-des).toFixed(2)}`}</p></div></div>
      </div>
    </div>
  );
}

function PacientesView({ pacientes, novo, setNovo, maskCPF, maskPhone, save, deletar, onSelect, onEdit, editandoId, setEditandoId }) {
  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">{editandoId ? 'Editando Paciente' : 'Pacientes'}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl">
          <form onSubmit={save} className="space-y-4 uppercase text-[10px] text-slate-400 font-black">
            <input required placeholder="Nome Completo" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
            <input required placeholder="CPF" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cpf} onChange={e => setNovo({...novo, cpf: maskCPF(e.target.value)})} />
            <input required placeholder="Telefone" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.telefone} onChange={e => setNovo({...novo, telefone: maskPhone(e.target.value)})} />
            <input placeholder="Convênio" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.convenio} onChange={e => setNovo({...novo, convenio: e.target.value})} />
            <textarea placeholder="Motivo" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.motivo_consulta} onChange={e => setNovo({...novo, motivo_consulta: e.target.value})} />
            <button type="submit" className={`w-full ${editandoId ? 'bg-amber-600' : 'bg-blue-600'} text-white py-5 rounded-xl font-black uppercase shadow-lg transition-all`}>{editandoId ? 'Atualizar Cadastro' : 'Salvar Paciente'}</button>
            {editandoId && <button type="button" onClick={() => { setEditandoId(null); setNovo({nome:'', cpf:'', telefone:'', convenio:'', motivo_consulta:''}) }} className="w-full text-slate-500 font-black uppercase text-[10px]">Cancelar Edição</button>}
          </form>
        </div>
        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] border border-slate-700 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-slate-500 text-[10px] uppercase font-black border-b border-slate-800"><th className="p-8">Identificação</th><th className="p-8 text-right">Ações</th></tr></thead>
            <tbody>{pacientes.map(p => (
              <tr key={p.id} className="border-b border-slate-800 hover:bg-[#0F172A] transition-all">
                <td className="p-8 font-black uppercase text-sm text-white" onClick={() => onSelect(p)}>{p.nome} <span className="text-[9px] block text-slate-500">CPF: {p.cpf} | {p.convenio || 'Particular'}</span></td>
                <td className="p-8 text-right space-x-2">
                  <button onClick={() => onEdit(p)} className="text-blue-400 p-2 hover:bg-blue-400/10 rounded-lg transition-all"><Edit3 size={18}/></button>
                  <button onClick={() => deletar(p.id)} className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EquipeView({ equipe, novo, setNovo, maskCPF, maskPhone, save, deletar }) {
  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Equipe</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl">
          <form onSubmit={save} className="space-y-4 uppercase text-[10px] text-slate-400 font-black">
            <select className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={novo.tipo_usuario} onChange={e => setNovo({...novo, tipo_usuario: e.target.value})}><option value="dentista">Dentista</option><option value="funcionario">Funcionário</option></select>
            <input required placeholder="Nome" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
            <input required placeholder="CPF" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cpf} onChange={e => setNovo({...novo, cpf: maskCPF(e.target.value)})} />
            {novo.tipo_usuario === 'dentista' && <input required placeholder="CRO" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cro} onChange={e => setNovo({...novo, cro: e.target.value})} />}
            <input required placeholder="Cargo" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cargo} onChange={e => setNovo({...novo, cargo: e.target.value})} />
            <input required placeholder="Telefone" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.telefone} onChange={e => setNovo({...novo, telefone: maskPhone(e.target.value)})} />
            <input required type="email" placeholder="E-mail" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.email} onChange={e => setNovo({...novo, email: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-xl font-black uppercase">Adicionar Membro</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] border border-slate-700 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-slate-500 text-[10px] uppercase font-black border-b border-slate-800"><th className="p-8">Colaborador</th><th className="p-8 text-right">Ação</th></tr></thead>
            <tbody>{equipe.map(m => (
              <tr key={m.id} className="border-b border-slate-800 hover:bg-[#0F172A] transition-all"><td className="p-8 font-black uppercase text-sm text-white">{m.nome} <span className="text-[9px] block text-slate-500">{m.tipo_usuario} | {m.cargo} {m.cro ? `- CRO: ${m.cro}` : ''}</span></td><td className="p-8 text-right"><button onClick={() => deletar(m.id)} className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-all"><Trash2 size={18}/></button></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AgendaView({ pacientes, agendamentos, nova, setNova, save, onDelete, verificar, onEdit, editandoId, setEditandoId }) {
  const [slots, setSlots] = useState([]);

  useEffect(() => {
    const carregarSlots = async () => {
      if (!nova.data) return;
      const horariosDoDia = [];
      for (let h = 8; h < 18; h++) {
        for (let m of ['00', '30']) {
          const horario = `${String(h).padStart(2, '0')}:${m}`;
          const disponivel = await verificar(nova.data, horario);
          horariosDoDia.push({ hora: horario, disponivel });
        }
      }
      setSlots(horariosDoDia);
    };
    carregarSlots();
  }, [nova.data, agendamentos, verificar]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">{editandoId ? 'Reagendando Consulta' : 'Agenda Médica'}</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl space-y-6">
          <h2 className="text-xl font-black uppercase text-blue-500">{editandoId ? 'Alterar Dados' : 'Novo Agendamento'}</h2>
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Paciente</label>
              <select required className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500" value={nova.paciente_id} onChange={e => setNova({...nova, paciente_id: e.target.value})}><option value="">Selecione...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Data da Consulta</label>
              <input required type="date" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500" value={nova.data} onChange={e => setNova({...nova, data: e.target.value})} />
            </div>
            {nova.data && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Horários Disponíveis</label>
                <div className="grid grid-cols-3 gap-2 p-2 bg-[#0F172A] rounded-xl border border-slate-700 max-h-52 overflow-y-auto">
                  {slots.map(s => (
                    <button key={s.hora} type="button" disabled={!s.disponivel && nova.hora !== s.hora} onClick={() => setNova({...nova, hora: s.hora})} className={`p-2 rounded-lg text-[10px] font-black border-2 transition-all ${!s.disponivel && nova.hora !== s.hora ? 'bg-red-900/20 text-red-700 border-red-900/30 cursor-not-allowed opacity-50' : nova.hora === s.hora ? 'bg-blue-600 text-white border-blue-400 shadow-lg scale-105' : 'bg-[#1E293B] text-blue-400 border-slate-700 hover:border-blue-500'}`}>{s.hora}</button>
                  ))}
                </div>
              </div>
            )}
            <button type="submit" disabled={!nova.hora || !nova.paciente_id} className={`w-full ${editandoId ? 'bg-orange-500' : 'bg-blue-600'} text-white py-5 rounded-xl font-black uppercase shadow-lg hover:opacity-90 disabled:opacity-50 transition-all`}>{editandoId ? 'Confirmar Alteração' : 'Confirmar Horário'}</button>
            {editandoId && <button type="button" onClick={() => { setEditandoId(null); setNova({paciente_id:'', data:'', hora:''}) }} className="w-full text-slate-500 font-black uppercase text-[10px] hover:text-white transition-colors">Cancelar Edição</button>}
          </form>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {agendamentos.length === 0 ? (
            <div className="text-center p-20 border-2 border-dashed border-slate-800 rounded-[3rem]"><p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Nenhum agendamento encontrado</p></div>
          ) : (
            agendamentos.sort((a,b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)).map(ag => {
              const dadosPaciente = pacientes.find(p => p.id === ag.paciente_id || p.nome === ag.paciente_nome);
              return (
                <div key={ag.id} className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700 flex justify-between items-start shadow-md hover:border-blue-500/50 transition-all group text-white">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <p className="text-blue-400 font-black text-xs uppercase px-4 py-1.5 bg-blue-900/30 rounded-full border border-blue-800/50">{new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {ag.hora}</p>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{dadosPaciente?.convenio || 'Particular'}</span>
                    </div>
                    <div><p className="text-2xl font-black uppercase text-white tracking-tighter">{ag.paciente_nome}</p><p className="text-xs text-slate-400 font-medium">{dadosPaciente?.telefone || 'Contato não disponível'}</p></div>
                    <div className="bg-[#0F172A] p-4 rounded-2xl border border-slate-800 max-w-lg">
                      <p className="text-[9px] font-black text-blue-500 uppercase mb-1 tracking-widest">Motivo Clínico</p>
                      <p className="text-sm text-slate-300 italic leading-relaxed">{dadosPaciente?.motivo_consulta ? `"${dadosPaciente.motivo_consulta}"` : "Nenhum motivo detalhado no cadastro."}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button onClick={() => onEdit(ag)} className="text-blue-400 p-3 hover:bg-blue-400/10 rounded-2xl transition-all"><Edit3 size={22}/></button>
                    <button onClick={() => onDelete(ag.id)} className="text-red-400 p-3 hover:bg-red-400/10 rounded-2xl transition-all"><Trash2 size={22}/></button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function FinanceiroView({ transacoes, nova, setNova, save, pacientes }) {
  return (
    <div className="space-y-12 animate-in fade-in duration-500">
      <h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Financeiro</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl space-y-4">
          <form onSubmit={save} className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Tipo de Lançamento</label>
              <select 
                className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500" 
                value={nova.tipo} 
                onChange={e => setNova({...nova, tipo: e.target.value, paciente_id: ''})}
              >
                <option value="receita">Receita (+)</option>
                <option value="despesa">Despesa (-)</option>
              </select>
            </div>

            {/* Seletor de paciente exclusivo para receitas */}
            {nova.tipo === 'receita' && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Paciente Pagador</label>
                <select 
                  required 
                  className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500" 
                  value={nova.paciente_id} 
                  onChange={e => setNova({...nova, paciente_id: e.target.value})}
                >
                  <option value="">Selecione o Paciente...</option>
                  {pacientes.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Valor (R$)</label>
              <input required type="number" step="0.01" placeholder="0,00" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500" value={nova.valor} onChange={e => setNova({...nova, valor: e.target.value})} />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-500 ml-2">Descrição / Categoria</label>
              <input required placeholder="Ex: Manutenção, Limpeza..." className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none focus:border-blue-500" value={nova.categoria} onChange={e => setNova({...nova, categoria: e.target.value})} />
            </div>

            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-xl font-black uppercase shadow-lg hover:bg-emerald-700 transition-all">Lançar no Caixa</button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] border border-slate-700 shadow-xl overflow-hidden">
           <table className="w-full text-left">
              <thead>
                <tr className="bg-[#0F172A] text-slate-500 text-[10px] uppercase font-black border-b border-slate-800">
                  <th className="p-8">Descrição / Origem</th>
                  <th className="p-8 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {transacoes.map(t => (
                  <tr key={t.id} className="border-b border-slate-800 p-8 text-white hover:bg-[#0F172A] transition-colors">
                    <td className="p-8 font-black uppercase text-sm">{t.descricao_exibicao || t.categoria}</td>
                    <td className={`p-8 text-right font-black ${t.tipo === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>
                      {t.tipo === 'receita' ? '+' : '-'} R$ {parseFloat(t.valor).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>
      </div>
    </div>
  );
}

function OdontogramaDetalhes({ paciente, data, onBack, onDenteClick }) {
  const dentesSuperiores = Array.from({ length: 16 }, (_, i) => i + 1);
  const dentesInferiores = Array.from({ length: 16 }, (_, i) => i + 17);
  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <button onClick={onBack} className="text-slate-400 uppercase text-[10px] font-black flex items-center gap-2 hover:text-white transition-colors"><ChevronRight className="rotate-180"/> Voltar para Lista</button>
      <div className="bg-[#1E293B] p-12 rounded-[4rem] border border-slate-700 shadow-2xl">
        <header className="flex justify-between items-start mb-12">
          <h2 className="text-3xl font-black uppercase tracking-tighter text-white">{paciente.nome} - Odontograma</h2>
          <div className="flex gap-6 bg-[#0F172A] p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-red-600 rounded-full shadow-lg shadow-red-900/50"></div><span className="text-[10px] font-black uppercase text-slate-400">Cárie</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-blue-600 rounded-full shadow-lg shadow-blue-900/50"></div><span className="text-[10px] font-black uppercase text-slate-400">Canal</span></div>
            <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-700 rounded-full"></div><span className="text-[10px] font-black uppercase text-slate-400">Extraído</span></div>
          </div>
        </header>
        <div className="flex flex-col gap-8 items-center">
          <div className="grid grid-cols-8 md:grid-cols-16 gap-3">{dentesSuperiores.map(id => { const r = data.find(d => d.dente_id === id); return (<div key={id} onClick={() => onDenteClick(id, prompt("Condição? (carie, canal, extraido, saudavel)"))} className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center font-black cursor-pointer transition-all hover:scale-110 ${r?.condicao === 'carie' ? 'bg-red-600 border-red-400 shadow-lg' : r?.condicao === 'canal' ? 'bg-blue-600 border-blue-400 shadow-lg' : r?.condicao === 'extraido' ? 'bg-slate-700 border-slate-600 opacity-40' : 'bg-[#0F172A] border-slate-800 text-slate-500 hover:border-blue-500'}`}><span className="text-xs">{id}</span></div>); })}</div>
          <div className="w-full h-px bg-slate-800 my-4 shadow-sm"></div>
          <div className="grid grid-cols-8 md:grid-cols-16 gap-3">{dentesInferiores.map(id => { const r = data.find(d => d.dente_id === id); return (<div key={id} onClick={() => onDenteClick(id, prompt("Condição? (carie, canal, extraido, saudavel)"))} className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center font-black cursor-pointer transition-all hover:scale-110 ${r?.condicao === 'carie' ? 'bg-red-600 border-red-400 shadow-lg' : r?.condicao === 'canal' ? 'bg-blue-600 border-blue-400 shadow-lg' : r?.condicao === 'extraido' ? 'bg-slate-700 border-slate-600 opacity-40' : 'bg-[#0F172A] border-slate-800 text-slate-500 hover:border-blue-500'}`}><span className="text-xs">{id}</span></div>); })}</div>
        </div>
      </div>
    </div>
  );
}

function PerfilPacienteView({ form, setForm, maskPhone, save, editando, setEditando, email }) {
    return ( <div className="space-y-12"><header className="flex justify-between items-end"><h1 className="text-4xl font-black uppercase italic tracking-tighter text-white">Meu Perfil</h1><button onClick={() => setEditando(!editando)} className="bg-[#1E293B] px-8 py-3 rounded-2xl font-black uppercase border border-slate-700 hover:border-blue-500 transition-all text-white">{editando ? "Cancelar" : "Editar"}</button></header><div className="grid grid-cols-1 lg:grid-cols-3 gap-12"><div className="lg:col-span-2 bg-[#1E293B] p-12 rounded-[4rem] border border-slate-700 shadow-2xl space-y-8 font-black uppercase text-[10px] text-slate-400 tracking-widest"><form onSubmit={save} className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><label className="ml-1">Nome</label><input disabled={!editando} className="w-full p-5 bg-[#0F172A] text-white rounded-2xl border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div><div className="space-y-2"><label className="ml-1">Telefone</label><input disabled={!editando} className="w-full p-5 bg-[#0F172A] text-white rounded-2xl border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.telefone} onChange={e => setForm({...form, telefone: maskPhone(e.target.value)})} /></div></div>{editando && <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-700">Salvar Registro</button>}</form></div><div className="bg-[#0F172A] p-12 rounded-[3rem] shadow-xl h-fit border border-slate-800 relative overflow-hidden"><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Conta Ativa</p><p className="text-2xl font-black break-all leading-none italic text-white">{email}</p></div></div></div> );
}

function MinhasConsultas({ agendamentos, carregarDadosPaciente, currentUser }) {
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center"><h1 className="text-4xl font-black text-white uppercase tracking-tighter">Minhas Consultas</h1></header>
      <div className="grid gap-4">
        {agendamentos.filter(a => a.email_paciente === currentUser.email).map(ag => (
          <div key={ag.id} className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700 flex justify-between items-center shadow-lg text-white">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-blue-900/30 rounded-2xl flex flex-col items-center justify-center text-blue-400 font-black border border-blue-800">
                <span>{new Date(ag.data + 'T12:00:00').getDate()}</span>
                <span className="text-[10px] uppercase">{new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', {month: 'short'})}</span>
              </div>
              <div><p className="font-black uppercase text-blue-400 text-xs">{ag.procedimento}</p><p className="text-xl font-bold text-white">Às {ag.hora}</p></div>
            </div>
            <button onClick={async () => { await db.agendamentos.delete(ag.id); carregarDadosPaciente(); }} className="text-red-400 font-black uppercase text-xs hover:scale-110 transition-all">Cancelar</button>
          </div>
        ))}
      </div>
    </div>
  );
}