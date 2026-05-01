import React, { useState, useEffect } from 'react';
import { db, hashPassword } from './db';
import logo from './assets/logo.png'; 
import { 
  Users, Calendar, DollarSign, LayoutDashboard, LogOut, UserCircle, 
  Trash2, Edit3, RefreshCw, X, ChevronRight, ArrowUpRight, ArrowDownRight, 
  Search, Activity, Stethoscope, Briefcase, Phone, ClipboardList, User, Save, Info
} from 'lucide-react';

export default function App() {
  // --- 1. ESTADOS DE SESSÃO E NAVEGAÇÃO ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); 
  const [loginForm, setLoginForm] = useState({ identifier: '', pass: '' });

  // --- 2. ESTADOS DE DADOS (BANCO) ---
  const [pacientes, setPacientes] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [transacoes, setTransacoes] = useState([]);
  const [prontuarios, setProntuarios] = useState([]);
  const [editandoId, setEditandoId] = useState(null);
  
  // --- 3. ESTADOS DE FORMULÁRIOS ---
  const [novoPaciente, setNovoPaciente] = useState({ nome:'', cpf:'', telefone:'', convenio:'', motivo_consulta:'', email_paciente:'' });
  const [novoMembro, setNovoMembro] = useState({ nome: '', cpf: '', cro: '', cargo: '', telefone: '', email: '', tipo_usuario: 'dentista' });
  const [novaConsulta, setNovaConsulta] = useState({ paciente_id: '', equipe_id: '', data: '', hora: '', procedimento: 'Consulta Geral', motivo: '' });
  const [novaTransacao, setNovaTransacao] = useState({ tipo: 'receita', valor: '', categoria: 'Consulta', paciente_id: '' });
  const [novoRegistroProntuario, setNovoRegistroProntuario] = useState({ anamnese: '', observacoes: '', medicamentos: '' });
  
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [odontogramaData, setOdontogramaData] = useState([]);

  // --- 4. ESTADOS ESPECÍFICOS DO PACIENTE ---
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilPacienteForm, setPerfilPacienteForm] = useState({ nome: '', telefone: '' });
  const [consultaSelecionada, setConsultaSelecionada] = useState(null);

  // --- 5. UTILITÁRIOS (MÁSCARAS) ---
  const maskCPF = (v) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").slice(0, 14);
  const maskPhone = (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);

  // --- 6. CARREGAMENTO INICIAL ---
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
    } catch (e) { console.error(e); }
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

  // --- 7. LÓGICA DE AUTENTICAÇÃO ---
  const handleAuth = async (e) => {
    e.preventDefault();
    const input = loginForm.identifier.trim();
    const hashed = await hashPassword(loginForm.pass);

    if (authMode === 'login') {
      let user = await db.users.where({ email: input.toLowerCase() }).first();
      if (!user) user = await db.users.where({ cpf: input }).first();

      if (user && user.password === hashed) {
        setCurrentUser(user);
        setIsLoggedIn(true);
        localStorage.setItem('odonto_session', JSON.stringify(user));
        await carregarTudo();
      } else alert('Credenciais inválidas.');
    } else {
      const cadastrado = await db.pacientes.where({ cpf: input }).first();
      if (!cadastrado && !input.includes('@admin.com')) return alert('CPF não pré-cadastrado.');
      const role = input.includes('@admin.com') ? 'admin' : 'paciente';
      await db.users.add({ 
        email: role === 'admin' ? input.toLowerCase() : cadastrado.email_paciente, 
        cpf: role === 'paciente' ? input : '',
        password: hashed, role, nome: role === 'paciente' ? cadastrado.nome : 'Admin'
      });
      setAuthMode('login'); alert('Conta criada!');
    }
  };

  // --- 8. AÇÕES ADMINISTRATIVAS ---
  const carregarProntuarios = async (id) => {
    const data = await db.prontuarios.where({ paciente_id: id }).reverse().sortBy('data');
    setProntuarios(data);
  };

  const verificarDisponibilidade = async (data, hora, equipeId) => {
    const ags = await db.agendamentos.where({ data }).filter(a => a.hora === hora && a.equipe_id === parseInt(equipeId)).toArray();
    return !ags.find(a => a.id !== editandoId);
  };

  const handleSalvarPaciente = async (e) => {
    e.preventDefault();
    if (editandoId) await db.pacientes.update(editandoId, novoPaciente);
    else await db.pacientes.add({ ...novoPaciente, owner_id: currentUser.id });
    setEditandoId(null); setNovoPaciente({ nome:'', cpf:'', telefone:'', convenio:'', motivo_consulta:'', email_paciente:'' });
    await carregarTudo();
  };

  const handleSalvarAgenda = async (e) => {
    if (e) e.preventDefault();
    const p = pacientes.find(px => px.id === parseInt(novaConsulta.paciente_id));
    const m = equipe.find(ex => ex.id === parseInt(novaConsulta.equipe_id));
    if (!p || !m) return alert("Dados incompletos.");
    const dados = { ...novaConsulta, owner_id: currentUser.id, paciente_nome: p.nome, paciente_cpf: p.cpf, medico_nome: m.nome, motivo: novaConsulta.motivo || p.motivo_consulta };
    if (editandoId) await db.agendamentos.update(editandoId, dados);
    else await db.agendamentos.add(dados);
    setNovaConsulta({ paciente_id: '', equipe_id: '', data: '', hora: '', procedimento: 'Consulta Geral', motivo: '' });
    setEditandoId(null); await carregarTudo();
  };

  const handleSalvarFinanceiro = async (e) => {
    e.preventDefault();
    let desc = novaTransacao.categoria;
    if (novaTransacao.tipo === 'receita' && novaTransacao.paciente_id) {
      const p = pacientes.find(px => px.id === parseInt(novaTransacao.paciente_id));
      if (p) desc = `Receita: ${p.nome}`;
    }
    await db.financeiro.add({ ...novaTransacao, valor: parseFloat(novaTransacao.valor), data: new Date().toISOString(), owner_id: currentUser.id, descricao_exibicao: desc });
    setNovaTransacao({ tipo: 'receita', valor: '', categoria: 'Consulta', paciente_id: '' });
    await carregarTudo();
  };

  const handleSalvarProntuario = async (e) => {
    e.preventDefault();
    if (!pacienteSelecionado) return;
    await db.prontuarios.add({
      paciente_id: pacienteSelecionado.id,
      data: new Date().toISOString(),
      dentista_nome: currentUser.nome || "Dentista",
      ...novoRegistroProntuario
    });
    setNovoRegistroProntuario({ anamnese: '', observacoes: '', medicamentos: '' });
    await carregarProntuarios(pacienteSelecionado.id);
    alert("Prontuário atualizado!");
  };

  const handleSalvarPerfilPaciente = async (e) => {
    e.preventDefault();
    const reg = await db.pacientes.where({ cpf: currentUser.cpf }).first();
    if (reg) {
      await db.pacientes.update(reg.id, { nome: perfilPacienteForm.nome, telefone: perfilPacienteForm.telefone });
      await db.users.update(currentUser.id, { nome: perfilPacienteForm.nome });
      setEditandoPerfil(false); await carregarTudo();
      alert("Cadastro atualizado!");
    }
  };

  const logout = () => { localStorage.clear(); window.location.reload(); };
  const isAdmin = currentUser?.role === 'admin';

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="flex w-full max-w-5xl h-[600px] bg-[#1E293B] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-700">
          <div className="w-1/2 bg-[#2563EB] p-16 text-white flex flex-col justify-center items-center">
            <img src={logo} alt="Logo" className="w-48 mb-8" />
            <h1 className="text-4xl font-black italic uppercase">OdontoHub Pro</h1>
          </div>
          <div className="w-1/2 p-16 flex flex-col justify-center">
            <h2 className="text-3xl font-black text-white mb-8 uppercase tracking-tighter">{authMode === 'login' ? 'Acesso' : 'Senha'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <input required placeholder="CPF ou E-mail" className="w-full bg-[#0F172A] text-white p-4 rounded-2xl border border-slate-600 outline-none focus:ring-2 focus:ring-blue-500" value={loginForm.identifier} onChange={e => setLoginForm({...loginForm, identifier: e.target.value})} />
              <input type="password" required placeholder="Senha" className="w-full bg-[#0F172A] text-white p-4 rounded-2xl border border-slate-600 outline-none focus:ring-2 focus:ring-blue-500" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
              <button type="submit" className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-700">Entrar</button>
            </form>
            <button onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')} className="mt-8 text-xs text-slate-400 font-black uppercase text-center w-full">{authMode === 'login' ? 'Primeiro acesso?' : 'Voltar'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#0F172A] text-white overflow-hidden font-sans">
      <aside className="w-72 bg-[#1E293B] flex flex-col border-r border-slate-800 z-20">
        <div className="p-10 flex flex-col items-center gap-4">
            <img src={logo} alt="Logo" className="w-32 h-auto object-contain" />
            <h2 className="text-xl font-black tracking-tighter uppercase italic">OdontoHub</h2>
        </div>
        <nav className="flex-1 px-6 pt-6 space-y-2">
          {isAdmin ? (
            <>
              <NavItem active={activeTab === 'dashboard'} icon={<LayoutDashboard size={20}/>} label="Dashboard" onClick={() => setActiveTab('dashboard')} />
              <NavItem active={activeTab === 'pacientes'} icon={<Users size={20}/>} label="Pacientes" onClick={() => {setActiveTab('pacientes'); setPacienteSelecionado(null);}} />
              <NavItem active={activeTab === 'equipe'} icon={<Briefcase size={20}/>} label="Equipe" onClick={() => setActiveTab('equipe')} />
              <NavItem active={activeTab === 'agenda'} icon={<Calendar size={20}/>} label="Agenda Médica" onClick={() => setActiveTab('agenda')} />
              <NavItem active={activeTab === 'financeiro'} icon={<DollarSign size={20}/>} label="Financeiro" onClick={() => setActiveTab('financeiro')} />
            </>
          ) : (
            <>
              <NavItem active={activeTab === 'consultas'} icon={<Calendar size={20}/>} label="Minhas Consultas" onClick={() => {setActiveTab('consultas'); setConsultaSelecionada(null);}} />
              <NavItem active={activeTab === 'perfil'} icon={<UserCircle size={20}/>} label="Meu Perfil" onClick={() => setActiveTab('perfil')} />
            </>
          )}
        </nav>
        <button onClick={logout} className="p-10 text-red-400 font-black text-[10px] uppercase flex items-center gap-2 mt-auto"><LogOut size={16} /> Sair</button>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 relative bg-[#0F172A]">
        {isAdmin ? (
          <>
            {activeTab === 'dashboard' && <DashboardView pacientesCount={pacientes.length} agendamentosCount={agendamentos.length} transacoes={transacoes} />}
            {activeTab === 'pacientes' && !pacienteSelecionado && <PacientesView pacientes={pacientes} novo={novoPaciente} setNovo={setNovoPaciente} maskCPF={maskCPF} maskPhone={maskPhone} save={handleSalvarPaciente} onEdit={(p) => {setNovoPaciente(p); setEditandoId(p.id);}} deletar={async id => {await db.pacientes.delete(id); carregarTudo();}} onSelect={async p => { setPacienteSelecionado(p); await carregarProntuarios(p.id); const odont = await db.odontograma.where({ paciente_id: p.id }).toArray(); setOdontogramaData(odont); }} />}
            {activeTab === 'equipe' && <EquipeView equipe={equipe} novo={novoMembro} setNovo={setNovoMembro} maskCPF={maskCPF} maskPhone={maskPhone} save={async e => {e.preventDefault(); await db.equipe.add(novoMembro); setNovoMembro({nome:'', cpf:'', cro:'', cargo:'', telefone:'', email:'', tipo_usuario:'dentista'}); carregarTudo();}} deletar={async id => {await db.equipe.delete(id); carregarTudo();}} />}
            {activeTab === 'agenda' && <AgendaView pacientes={pacientes} equipe={equipe} agendamentos={agendamentos} nova={novaConsulta} setNova={setNovaConsulta} save={handleSalvarAgenda} verificar={verificarDisponibilidade} onEdit={ag => {setNovaConsulta(ag); setEditandoId(ag.id);}} onDelete={async id => {await db.agendamentos.delete(id); carregarTudo();}} />}
            {activeTab === 'financeiro' && <FinanceiroView transacoes={transacoes} nova={novaTransacao} setNova={setNovaTransacao} save={handleSalvarFinanceiro} pacientes={pacientes} />}
            
            {pacienteSelecionado && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <button onClick={() => setPacienteSelecionado(null)} className="text-slate-400 uppercase text-[10px] font-black flex items-center gap-2 hover:text-white transition-colors"><ChevronRight className="rotate-180"/> Voltar à Lista</button>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                   <ProntuarioView registros={prontuarios} novo={novoRegistroProntuario} setNovo={setNovoRegistroProntuario} onSave={handleSalvarProntuario} />
                   <OdontogramaDetalhes paciente={pacienteSelecionado} data={odontogramaData} onDenteClick={async (id, cond) => { await db.odontograma.where({ paciente_id: pacienteSelecionado.id, dente_id: id }).delete(); if (cond && cond !== 'saudavel') await db.odontograma.add({ owner_id: currentUser.id, paciente_id: pacienteSelecionado.id, dente_id: id, condicao: cond, data: new Date().toISOString() }); const newData = await db.odontograma.where({ paciente_id: pacienteSelecionado.id }).toArray(); setOdontogramaData(newData); }} />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
             {activeTab === 'consultas' && <MinhasConsultas agendamentos={agendamentos} currentUser={currentUser} selecionada={consultaSelecionada} setSelecionada={setConsultaSelecionada} />}
             {activeTab === 'perfil' && <PerfilPacienteView pacientes={pacientes} currentUser={currentUser} editando={editandoPerfil} setEditando={setEditandoPerfil} form={perfilPacienteForm} setForm={setPerfilPacienteForm} save={handleSalvarPerfilPaciente} maskPhone={maskPhone} />}
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
    <div className="space-y-12">
      <h1 className="text-5xl font-black uppercase italic tracking-tighter">Visão Geral</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl">
          <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><Users size={24}/></div>
          <div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Pacientes</p><p className="text-4xl font-black">{pacientesCount}</p></div>
        </div>
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl">
          <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><Calendar size={24}/></div>
          <div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Agenda</p><p className="text-4xl font-black">{agendamentosCount}</p></div>
        </div>
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl">
          <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><DollarSign size={24}/></div>
          <div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Saldo</p><p className="text-4xl font-black">R$ {(rec-des).toFixed(2)}</p></div>
        </div>
      </div>
    </div>
  );
}

function PacientesView({ pacientes, novo, setNovo, maskCPF, maskPhone, save, deletar, onSelect, onEdit }) {
  return (
    <div className="space-y-12 text-white">
      <h1 className="text-4xl font-black uppercase italic tracking-tighter">Pacientes</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl">
          <form onSubmit={save} className="space-y-4">
            <input required placeholder="Nome Completo" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
            <input required placeholder="CPF" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cpf} onChange={e => setNovo({...novo, cpf: maskCPF(e.target.value)})} />
            <input required placeholder="Telefone" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.telefone} onChange={e => setNovo({...novo, telefone: maskPhone(e.target.value)})} />
            <input placeholder="Convênio" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.convenio} onChange={e => setNovo({...novo, convenio: e.target.value})} />
            <textarea placeholder="Anamnese Inicial / Prontuário..." className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none min-h-[100px]" value={novo.motivo_consulta} onChange={e => setNovo({...novo, motivo_consulta: e.target.value})} />
            <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-xl font-black uppercase shadow-lg">Salvar Paciente</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] border border-slate-700 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-slate-500 text-[10px] uppercase font-black border-b border-slate-800"><th className="p-8">Identificação</th><th className="p-8 text-right">Ações</th></tr></thead>
            <tbody>{pacientes.map(p => (
              <tr key={p.id} className="border-b border-slate-800 hover:bg-[#0F172A] transition-all">
                <td className="p-8 font-black uppercase text-sm cursor-pointer" onClick={() => onSelect(p)}>{p.nome} <span className="text-[9px] block text-slate-500">CPF: {p.cpf} | {p.convenio}</span></td>
                <td className="p-8 text-right space-x-2">
                  <button onClick={() => onEdit(p)} className="text-blue-400 p-2 hover:bg-blue-400/10 rounded-lg"><Edit3 size={18}/></button>
                  <button onClick={() => deletar(p.id)} className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg"><Trash2 size={18}/></button>
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
    <div className="space-y-12 text-white">
      <h1 className="text-4xl font-black uppercase italic tracking-tighter">Equipe</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl">
          <form onSubmit={save} className="space-y-4">
            <select className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={novo.tipo_usuario} onChange={e => setNovo({...novo, tipo_usuario: e.target.value})}><option value="dentista">Dentista</option><option value="funcionario">Funcionário</option></select>
            <input required placeholder="Nome" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
            <input required placeholder="CPF" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cpf} onChange={e => setNovo({...novo, cpf: maskCPF(e.target.value)})} />
            {novo.tipo_usuario === 'dentista' && <input required placeholder="CRO" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cro} onChange={e => setNovo({...novo, cro: e.target.value})} />}
            <input required placeholder="Cargo" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cargo} onChange={e => setNovo({...novo, cargo: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-xl font-black uppercase">Adicionar</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] border border-slate-700 shadow-xl overflow-hidden">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-slate-500 text-[10px] uppercase font-black border-b border-slate-800"><th className="p-8">Colaborador</th><th className="p-8 text-right">Ação</th></tr></thead>
            <tbody>{equipe.map(m => (
              <tr key={m.id} className="border-b border-slate-800 hover:bg-[#0F172A] transition-all"><td className="p-8 font-black uppercase text-sm">{m.nome} <span className="text-[9px] block text-slate-500">{m.cargo} {m.cro && `| CRO: ${m.cro}`}</span></td><td className="p-8 text-right"><button onClick={() => deletar(m.id)} className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg"><Trash2 size={18}/></button></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AgendaView({ pacientes, equipe, agendamentos, nova, setNova, save, onDelete, verificar, onEdit }) {
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    const load = async () => {
      if (!nova.data || !nova.equipe_id) { setSlots([]); return; }
      const hours = [];
      for (let h = 8; h < 18; h++) {
        for (let m of ['00', '30']) {
          const time = `${String(h).padStart(2, '0')}:${m}`;
          const ok = await verificar(nova.data, time, nova.equipe_id);
          hours.push({ time, ok });
        }
      }
      setSlots(hours);
    };
    load();
  }, [nova.data, nova.equipe_id, agendamentos]);

  return (
    <div className="space-y-12 animate-in fade-in duration-500 text-white">
      <h1 className="text-4xl font-black uppercase italic tracking-tighter">Agenda Médica</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl space-y-6">
          <form onSubmit={save} className="space-y-4">
            <select required className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.paciente_id} onChange={e => setNova({...nova, paciente_id: e.target.value})}><option value="">Paciente...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            <select required className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.equipe_id} onChange={e => setNova({...nova, equipe_id: e.target.value})}><option value="">Médico...</option>{equipe.filter(e => e.tipo_usuario === 'dentista').map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}</select>
            <input required type="date" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.data} onChange={e => setNova({...nova, data: e.target.value})} />
            <textarea placeholder="Motivo específico..." className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none min-h-[100px]" value={nova.motivo} onChange={e => setNova({...nova, motivo: e.target.value})} />
            <div className="grid grid-cols-3 gap-2 p-2 bg-[#0F172A] rounded-xl border border-slate-700 max-h-52 overflow-y-auto">
              {slots.map(s => (
                <button key={s.time} type="button" disabled={!s.ok && nova.hora !== s.time} onClick={() => setNova({...nova, hora: s.time})} className={`p-2 rounded-lg text-[10px] font-black border-2 transition-all ${!s.ok && nova.hora !== s.time ? 'opacity-30 cursor-not-allowed' : nova.hora === s.time ? 'bg-blue-600 text-white border-blue-400' : 'text-blue-400 border-slate-700'}`}>{s.time}</button>
              ))}
            </div>
            <button type="submit" disabled={!nova.hora || !nova.paciente_id} className="w-full bg-blue-600 text-white py-5 rounded-xl font-black uppercase shadow-lg">Confirmar</button>
          </form>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {agendamentos.sort((a,b) => a.data.localeCompare(b.data) || a.hora.localeCompare(b.hora)).map(ag => (
            <div key={ag.id} className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700 flex justify-between items-start shadow-md">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-blue-400 font-black text-xs uppercase px-4 py-1.5 bg-blue-900/30 rounded-full border border-blue-800/50">{new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR')} às {ag.hora}</p>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">DR(A). {ag.medico_nome}</span>
                </div>
                <div><p className="text-2xl font-black uppercase tracking-tighter">{ag.paciente_nome}</p></div>
                <div className="bg-[#0F172A] p-4 rounded-2xl border border-slate-800 max-w-lg">
                  <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Motivo</p>
                  <p className="text-sm text-slate-300 italic">"{ag.motivo || "Nenhum detalhe."}"</p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button onClick={() => onEdit(ag)} className="text-blue-400 p-3 hover:bg-blue-400/10 rounded-2xl"><Edit3 size={22}/></button>
                <button onClick={() => onDelete(ag.id)} className="text-red-400 p-3 hover:bg-red-400/10 rounded-2xl"><Trash2 size={22}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanceiroView({ transacoes, nova, setNova, save, pacientes }) {
  return (
    <div className="space-y-12 text-white">
      <h1 className="text-4xl font-black uppercase italic tracking-tighter">Financeiro</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl space-y-4">
          <form onSubmit={save} className="space-y-4">
            <select className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.tipo} onChange={e => setNova({...nova, tipo: e.target.value, paciente_id: ''})}><option value="receita">Receita (+)</option><option value="despesa">Despesa (-)</option></select>
            {nova.tipo === 'receita' && <select required className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.paciente_id} onChange={e => setNova({...nova, paciente_id: e.target.value})}><option value="">Paciente...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>}
            <input required type="number" step="0.01" placeholder="Valor (R$)" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.valor} onChange={e => setNova({...nova, valor: e.target.value})} />
            <input required placeholder="Categoria..." className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.categoria} onChange={e => setNova({...nova, categoria: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-xl font-black uppercase shadow-lg">Lançar</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] border border-slate-700 shadow-xl overflow-hidden">
           <table className="w-full text-left">
              <thead><tr className="bg-[#0F172A] text-slate-500 text-[10px] uppercase font-black border-b border-slate-800"><th className="p-8">Descrição</th><th className="p-8 text-right">Valor</th></tr></thead>
              <tbody>{transacoes.map(t => (<tr key={t.id} className="border-b border-slate-800 p-8"><td className="p-8 font-black uppercase text-sm">{t.descricao_exibicao || t.categoria}</td><td className={`p-8 text-right font-black ${t.tipo === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>R$ {parseFloat(t.valor).toFixed(2)}</td></tr>))}</tbody>
           </table>
        </div>
      </div>
    </div>
  );
}

function ProntuarioView({ registros, novo, setNovo, onSave }) {
  return (
    <div className="space-y-8 text-white">
      <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl">
        <h2 className="text-2xl font-black uppercase mb-6 flex items-center gap-2"><ClipboardList className="text-blue-500" /> Evolução Clínica</h2>
        <form onSubmit={onSave} className="space-y-4">
          <textarea placeholder="Anamnese / Queixas..." className="w-full bg-[#0F172A] border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-blue-500 min-h-[100px]" value={novo.anamnese} onChange={e => setNovo({...novo, anamnese: e.target.value})} />
          <textarea placeholder="Observações de Atendimento..." className="w-full bg-[#0F172A] border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-blue-500 min-h-[100px]" value={novo.observacoes} onChange={e => setNovo({...novo, observacoes: e.target.value})} />
          <button type="submit" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all"><Save size={18} /> Registrar Atendimento</button>
        </form>
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {registros.map(reg => (
          <div key={reg.id} className="bg-[#1E293B]/50 p-8 rounded-[2.5rem] border border-slate-800">
            <div className="flex justify-between items-center mb-4 text-[10px] font-black uppercase">
              <span className="text-blue-400">{new Date(reg.data).toLocaleDateString('pt-BR')}</span>
              <span className="text-slate-500">Dr(a). {reg.dentista_nome}</span>
            </div>
            <p className="text-sm text-slate-300 italic">"{reg.observacoes}"</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OdontogramaDetalhes({ paciente, data, onBack, onDenteClick }) {
  const ds = Array.from({ length: 16 }, (_, i) => i + 1);
  const di = Array.from({ length: 16 }, (_, i) => i + 17);
  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 text-white">
      <div className="bg-[#1E293B] p-12 rounded-[4rem] border border-slate-700 shadow-2xl">
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-12">{paciente.nome} - Odontograma</h2>
        <div className="flex flex-col gap-8 items-center">
          <div className="grid grid-cols-8 md:grid-cols-16 gap-3">{ds.map(id => { const r = data.find(d => d.dente_id === id); return (<div key={id} onClick={() => onDenteClick(id, prompt("Condição? (carie, canal, extraido, saudavel)"))} className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center font-black cursor-pointer transition-all hover:scale-110 ${r?.condicao === 'carie' ? 'bg-red-600 border-red-400 shadow-lg' : r?.condicao === 'canal' ? 'bg-blue-600 border-blue-400 shadow-lg' : r?.condicao === 'extraido' ? 'bg-slate-700 border-slate-600 opacity-40' : 'bg-[#0F172A] border-slate-800 text-slate-500 hover:border-blue-500'}`}><span className="text-xs">{id}</span></div>); })}</div>
          <div className="w-full h-px bg-slate-800 my-4 shadow-sm"></div>
          <div className="grid grid-cols-8 md:grid-cols-16 gap-3">{di.map(id => { const r = data.find(d => d.dente_id === id); return (<div key={id} onClick={() => onDenteClick(id, prompt("Condição? (carie, canal, extraido, saudavel)"))} className={`w-12 h-16 rounded-xl border-2 flex items-center justify-center font-black cursor-pointer transition-all hover:scale-110 ${r?.condicao === 'carie' ? 'bg-red-600 border-red-400 shadow-lg' : r?.condicao === 'canal' ? 'bg-blue-600 border-blue-400 shadow-lg' : r?.condicao === 'extraido' ? 'bg-slate-700 border-slate-600 opacity-40' : 'bg-[#0F172A] border-slate-800 text-slate-500 hover:border-blue-500'}`}><span className="text-xs">{id}</span></div>); })}</div>
        </div>
      </div>
    </div>
  );
}

function MinhasConsultas({ agendamentos, currentUser, selecionada, setSelecionada }) {
  const consultas = agendamentos.filter(a => a.paciente_cpf === currentUser.cpf);
  return (
    <div className="space-y-12 text-white">
      <header className="space-y-2">
        <h1 className="text-5xl font-black uppercase tracking-tighter">Minhas Consultas</h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Clique para detalhes</p>
      </header>
      <div className="flex gap-8 items-start">
        <div className="flex-1 grid gap-6">
          {consultas.length === 0 ? (
            <div className="p-20 border-2 border-dashed border-slate-800 rounded-[3rem] text-center text-slate-500 font-black uppercase text-xs">Sem agendamentos.</div>
          ) : (
            consultas.map(ag => (
              <div key={ag.id} onClick={() => setSelecionada(ag)} className={`bg-[#1E293B] p-10 rounded-[3rem] border-2 flex flex-col md:flex-row justify-between items-center shadow-2xl gap-8 cursor-pointer transition-all ${selecionada?.id === ag.id ? 'border-blue-500 scale-[1.02]' : 'border-transparent hover:border-slate-700'}`}>
                <div className="flex items-center gap-8">
                  <div className="w-20 h-20 bg-blue-600/20 rounded-[2rem] flex flex-col items-center justify-center text-blue-400 border border-blue-500/30 font-black">
                    <span className="text-2xl">{new Date(ag.data + 'T12:00:00').getDate()}</span>
                    <span className="text-[9px] uppercase">{new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', {month: 'short'})}</span>
                  </div>
                  <div><span className="px-4 py-1 bg-blue-600 text-white text-[9px] font-black uppercase rounded-full">{ag.hora}</span><h3 className="text-2xl font-black uppercase mt-1">{ag.procedimento}</h3><p className="text-xs font-black text-slate-500 uppercase tracking-widest">DR(A). {ag.medico_nome}</p></div>
                </div>
                <div className="bg-[#0F172A] p-6 rounded-2xl border border-slate-800 w-full max-w-[300px]"><p className="text-[9px] font-black text-slate-500 uppercase mb-2">Resumo clínico</p><p className="text-sm text-slate-300 italic truncate">"{ag.motivo || "Nenhuma observação."}"</p></div>
              </div>
            ))
          )}
        </div>
        {selecionada && (
          <div className="w-96 bg-[#1E293B] p-10 rounded-[4rem] border border-slate-700 shadow-2xl animate-in slide-in-from-right duration-500">
            <div className="flex justify-between items-start mb-8"><h2 className="text-2xl font-black uppercase tracking-tighter">Detalhes</h2><button onClick={() => setSelecionada(null)} className="text-slate-500 hover:text-white"><X size={20}/></button></div>
            <div className="space-y-8">
              <div className="bg-[#0F172A] p-6 rounded-[2.5rem] border border-slate-800">
                <p className="text-[9px] font-black text-blue-500 uppercase mb-4 tracking-widest">Data e Horário</p>
                <div className="flex items-center gap-4 text-white"><Calendar className="text-slate-500" size={18}/><p className="text-sm font-bold">{new Date(selecionada.data + 'T12:00:00').toLocaleDateString('pt-BR', { dateStyle: 'long' })}</p></div>
                <div className="flex items-center gap-4 text-white mt-3"><RefreshCw className="text-slate-500" size={18}/><p className="text-sm font-bold">{selecionada.hora}h (Sessão confirmada)</p></div>
              </div>
              <div className="space-y-4 px-4">
                <div><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Médico Responsável</label><p className="text-lg font-black uppercase">Dr(a). {selecionada.medico_nome}</p></div>
                <div><label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Procedimento</label><p className="text-lg font-black text-blue-400 uppercase">{selecionada.procedimento}</p></div>
              </div>
              <div className="bg-[#0F172A] p-8 rounded-[3rem] border border-slate-800 italic text-slate-300 text-sm">
                <label className="text-[9px] font-black text-slate-500 uppercase block mb-4 not-italic flex items-center gap-2"><Info size={14} className="text-blue-500"/> Orientações Clínicas</label>
                "{selecionada.motivo || "Sem orientações específicas registradas."}"
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PerfilPacienteView({ pacientes, currentUser, editando, setEditando, form, setForm, save, maskPhone }) {
  const dados = pacientes.find(p => p.cpf === currentUser.cpf);
  const ativarEdicao = () => {
    setForm({ nome: dados?.nome || '', telefone: dados?.telefone || '' });
    setEditando(true);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 text-white">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter">Meu Prontuário</h1>
        {!editando ? (
          <button onClick={ativarEdicao} className="flex items-center gap-2 bg-[#1E293B] border border-slate-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase hover:border-blue-500 transition-all shadow-xl"><Edit3 size={16} className="text-blue-500"/> Editar Cadastro</button>
        ) : (
          <div className="flex gap-4">
            <button onClick={() => setEditando(false)} className="px-6 py-3 text-[10px] font-black uppercase text-slate-500 hover:text-white transition-colors">Cancelar</button>
            <button onClick={save} className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-900/20"><Save size={16}/> Salvar Alterações</button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-[#1E293B] p-12 rounded-[4rem] border border-slate-700 shadow-2xl relative overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Nome Completo</label>{!editando ? <p className="text-2xl font-black uppercase tracking-tighter">{dados?.nome || 'N/A'}</p> : <input className="w-full bg-[#0F172A] border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-blue-500" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />}</div>
            <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">CPF (Apenas Leitura)</label><p className="text-2xl font-black text-slate-500">{currentUser.cpf}</p></div>
            <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Telefone</label>{!editando ? <p className="text-2xl font-black">{dados?.telefone || 'N/A'}</p> : <input className="w-full bg-[#0F172A] border border-slate-700 p-4 rounded-2xl text-white outline-none focus:border-blue-500" value={form.telefone} onChange={e => setForm({...form, telefone: maskPhone(e.target.value)})} />}</div>
            <div className="space-y-1"><label className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Plano/Convênio</label><p className="text-2xl font-black text-slate-500 uppercase">{dados?.convenio || 'Particular'}</p></div>
          </div>
        </div>
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl opacity-80">
           <h4 className="text-[10px] font-black uppercase mb-6 text-blue-500 tracking-widest flex items-center gap-2"><ClipboardList size={14}/> Histórico de Anamnese</h4>
           <div className="bg-[#0F172A]/50 border-l-4 border-blue-600 p-8 rounded-r-3xl italic text-slate-400 leading-relaxed">{dados?.motivo_consulta || "Sem dados clínicos registrados pela clínica."}</div>
        </div>
      </div>
    </div>
  );
}