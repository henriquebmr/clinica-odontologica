import React, { useState, useEffect } from 'react';
import { db, hashPassword } from './db';
import logo from './assets/logo.png'; 
import { 
  Users, Calendar, DollarSign, LayoutDashboard, LogOut, UserCircle, 
  Trash2, Edit3, RefreshCw, X, ChevronRight, ArrowUpRight, ArrowDownRight, 
  Search, Activity, Stethoscope, Briefcase 
} from 'lucide-react';

export default function App() {
  // --- 1. ESTADOS GERAIS ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authMode, setAuthMode] = useState('login'); 
  const [loginForm, setLoginForm] = useState({ email: '', pass: '' });

  // --- 2. ESTADOS ADMINISTRATIVOS ---
  const [pacientes, setPacientes] = useState([]);
  const [equipe, setEquipe] = useState([]);
  const [agendamentos, setAgendamentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [novoPaciente, setNovoPaciente] = useState({ nome:'', cpf:'', telefone:'', convenio:'', motivo_consulta:'', email_paciente:'' });
  const [novoMembro, setNovoMembro] = useState({ nome:'', cpf:'', cro:'', cargo:'', telefone:'', email:'', tipo_usuario:'dentista' });
  const [novaConsulta, setNovaConsulta] = useState({ paciente_id: '', data: '', hora: '', procedimento: 'Consulta Geral' });
  const [transacoes, setTransacoes] = useState([]);
  const [novaTransacao, setNovaTransacao] = useState({ tipo: 'receita', valor: '', categoria: 'Consulta' });
  const [pacienteSelecionado, setPacienteSelecionado] = useState(null);
  const [odontogramaData, setOdontogramaData] = useState([]);

  // --- 3. ESTADOS DO PACIENTE ---
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [perfilForm, setPerfilForm] = useState({ nome: '', telefone: '', endereco: '', alergias: '' });
  const [showModalAgendamento, setShowModalAgendamento] = useState(false);

  // --- 4. MÁSCARAS ---
  const maskCPF = (v) => v.replace(/\D/g, "").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2").slice(0, 14);
  const maskPhone = (v) => v.replace(/\D/g, "").replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2").slice(0, 15);

  // --- 5. CARREGAMENTO DE DADOS ---
  const carregarDadosAdmin = async () => {
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

  const carregarDadosPaciente = async (user) => {
    const agsUser = await db.agendamentos.where({ email_paciente: user.email.toLowerCase().trim() }).toArray();
    setAgendamentos(agsUser || []);
    const dbUser = await db.users.get(user.id);
    if (dbUser) setPerfilForm({ nome: dbUser.nome || '', telefone: dbUser.telefone || '', endereco: dbUser.endereco || '', alergias: dbUser.alergias || '' });
  };

  useEffect(() => {
    const saved = localStorage.getItem('odonto_session');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setIsLoggedIn(true);
      user.role === 'admin' ? carregarDadosAdmin() : carregarDadosPaciente(user);
    }
  }, []);

  // --- 6. FUNÇÕES DE SALVAMENTO CORRIGIDAS (SEM MARCAÇÕES DE CITAÇÃO) ---
  const salvarPaciente = async (e) => {
    e.preventDefault();
    await db.pacientes.add({ ...novoPaciente, owner_id: currentUser.id });
    setNovoPaciente({ nome:'', cpf:'', telefone:'', convenio:'', motivo_consulta:'', email_paciente:'' });
    await carregarDadosAdmin();
  };

  const salvarMembroEquipe = async (e) => {
    e.preventDefault();
    await db.equipe.add({ ...novoMembro });
    setNovoMembro({ nome:'', cpf:'', cro:'', cargo:'', telefone:'', email:'', tipo_usuario:'dentista' });
    await carregarDadosAdmin();
  };

  const salvarFinanceiro = async (e) => {
    e.preventDefault();
    await db.financeiro.add({ 
      ...novaTransacao, 
      valor: parseFloat(novaTransacao.valor), 
      data: new Date().toISOString(), 
      owner_id: currentUser.id 
    });
    setNovaTransacao({ tipo: 'receita', valor: '', categoria: 'Consulta' });
    await carregarDadosAdmin();
  };

  const salvarAgenda = async (e) => {
    e.preventDefault();
    const p = pacientes.find(px => px.id === parseInt(novaConsulta.paciente_id));
    await db.agendamentos.add({
      ...novaConsulta,
      owner_id: currentUser.id,
      paciente_nome: p?.nome || 'Paciente'
    });
    setNovaConsulta({ paciente_id: '', data: '', hora: '', procedimento: 'Consulta Geral' });
    await carregarDadosAdmin();
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
        account.role === 'admin' ? carregarDadosAdmin() : carregarDadosPaciente(account);
      } else alert('E-mail ou senha incorretos.');
    } else {
      const role = emailLimpo.endsWith('@admin.com') ? 'admin' : 'paciente';
      try {
        await db.users.add({ email: emailLimpo, password: hashed, role });
        alert('Perfil criado! Agora faça o login.'); setAuthMode('login');
      } catch { alert('E-mail já cadastrado.'); }
    }
  };

  const logout = () => { localStorage.clear(); window.location.reload(); };

  if (!isLoggedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="flex w-full max-w-5xl h-[600px] bg-[#1E293B] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-700">
          <div className="w-1/2 bg-[#2563EB] p-16 text-white flex flex-col justify-center items-center">
            <img src={logo} alt="Logo" className="w-64 mb-8" />
            <h1 className="text-4xl font-black italic uppercase">OdontoHub Pro</h1>
          </div>
          <div className="w-1/2 p-16 flex flex-col justify-center">
            <h2 className="text-3xl font-black text-white mb-8 uppercase">{authMode === 'login' ? 'Entrar' : 'Cadastrar'}</h2>
            <form onSubmit={handleAuth} className="space-y-4">
              <input type="email" required placeholder="E-mail" className="w-full bg-[#0F172A] text-white p-4 rounded-2xl border border-slate-600 outline-none" value={loginForm.email} onChange={e => setLoginForm({...loginForm, email: e.target.value})} />
              <input type="password" required placeholder="Senha" className="w-full bg-[#0F172A] text-white p-4 rounded-2xl border border-slate-600 outline-none" value={loginForm.pass} onChange={e => setLoginForm({...loginForm, pass: e.target.value})} />
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
                save={salvarPaciente} search={searchTerm} setSearch={setSearchTerm} 
                deletar={async (id) => { await db.pacientes.delete(id); carregarDadosAdmin(); }} 
                onSelect={async (p) => { 
                  setPacienteSelecionado(p); 
                  const data = await db.odontograma.where({ paciente_id: p.id }).toArray();
                  setOdontogramaData(data);
                }} 
              />
            )}

            {activeTab === 'equipe' && (
              <EquipeView 
                equipe={equipe} novo={novoMembro} setNovo={setNovoMembro} maskCPF={maskCPF} maskPhone={maskPhone}
                save={salvarMembroEquipe} deletar={async (id) => { await db.equipe.delete(id); carregarDadosAdmin(); }}
              />
            )}

            {activeTab === 'agenda' && <AgendaView pacientes={pacientes} agendamentos={agendamentos} nova={novaConsulta} setNova={setNovaConsulta} save={salvarAgenda} onDelete={async (id) => { await db.agendamentos.delete(id); carregarDadosAdmin(); }} />}

            {activeTab === 'financeiro' && <FinanceiroView transacoes={transacoes} nova={novaTransacao} setNova={setNovaTransacao} save={salvarFinanceiro} />}

            {pacienteSelecionado && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <button onClick={() => setPacienteSelecionado(null)} className="text-slate-400 uppercase text-[10px] font-black flex items-center gap-2 hover:text-white"><ChevronRight className="rotate-180"/> Voltar</button>
                <div className="bg-[#1E293B] p-12 rounded-[4rem] border border-slate-700 shadow-2xl">
                  <h2 className="text-3xl font-black uppercase mb-12">{pacienteSelecionado.nome} - Odontograma</h2>
                  <div className="grid grid-cols-8 gap-4">
                    {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28,48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(id => {
                      const r = odontogramaData.find(d => d.dente_id === id);
                      return (
                        <div key={id} onClick={async () => {
                          const cond = prompt("Condição? (carie, canal, extraido, saudavel)");
                          await db.odontograma.where({ paciente_id: pacienteSelecionado.id, dente_id: id }).delete();
                          if (cond && cond !== 'saudavel') await db.odontograma.add({ owner_id: currentUser.id, paciente_id: pacienteSelecionado.id, dente_id: id, condicao: cond, data: new Date().toISOString() });
                          const newData = await db.odontograma.where({ paciente_id: pacienteSelecionado.id }).toArray();
                          setOdontogramaData(newData);
                        }} className={`h-16 rounded-xl border-2 flex items-center justify-center font-black cursor-pointer transition-all ${r?.condicao==='carie'?'bg-red-600 border-red-500':r?.condicao==='canal'?'bg-blue-600 border-blue-400':r?.condicao==='extraido'?'bg-slate-700 border-slate-600 opacity-50':'bg-[#0F172A] border-slate-700 hover:border-blue-500'}`}>{id}</div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="animate-in fade-in duration-500">
             {activeTab === 'consultas' && (
                <div className="space-y-8">
                  <header className="flex justify-between items-center"><h1 className="text-4xl font-black text-white uppercase">Minhas Consultas</h1></header>
                  <div className="grid gap-4">
                    {agendamentos.filter(a => a.email_paciente === currentUser.email).map(ag => (
                      <div key={ag.id} className="bg-[#1E293B] p-8 rounded-[2.5rem] border border-slate-700 flex justify-between items-center">
                        <div className="flex items-center gap-6">
                           <div className="w-16 h-16 bg-blue-900/30 rounded-2xl flex flex-col items-center justify-center text-blue-400 font-black border border-blue-800">
                             <span>{new Date(ag.data + 'T12:00:00').getDate()}</span>
                             <span className="text-[10px] uppercase">{new Date(ag.data + 'T12:00:00').toLocaleDateString('pt-BR', {month: 'short'})}</span>
                           </div>
                           <div><p className="font-black uppercase text-blue-400 text-xs">{ag.procedimento}</p><p className="text-xl font-bold">Às {ag.hora}</p></div>
                        </div>
                        <button onClick={async () => { await db.agendamentos.delete(ag.id); carregarDadosPaciente(currentUser); }} className="text-red-400 font-black uppercase text-xs">Cancelar</button>
                      </div>
                    ))}
                  </div>
                </div>
             )}
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
      <h1 className="text-5xl font-black uppercase italic">Visão Geral</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl"><div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><Users size={24}/></div><div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Pacientes</p><p className="text-4xl font-black">{pacientesCount}</p></div></div>
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl"><div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><Calendar size={24}/></div><div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Agenda</p><p className="text-4xl font-black">{agendamentosCount}</p></div></div>
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 h-56 flex flex-col justify-between shadow-xl"><div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center text-blue-400"><DollarSign size={24}/></div><div><p className="text-[10px] font-black uppercase text-slate-500 mb-1">Saldo</p><p className="text-4xl font-black">{`R$ ${(rec-des).toFixed(2)}`}</p></div></div>
      </div>
    </div>
  );
}

function PacientesView({ pacientes, novo, setNovo, maskCPF, maskPhone, save, deletar, onSelect }) {
  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-black uppercase italic">Pacientes</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl">
          <form onSubmit={save} className="space-y-4 uppercase text-[10px] text-slate-400">
            <div className="space-y-2">
              <label>Nome Completo</label>
              <input required placeholder="Nome" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label>CPF</label>
              <input required placeholder="CPF" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cpf} onChange={e => setNovo({...novo, cpf: maskCPF(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label>Telefone</label>
              <input required placeholder="Telefone" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.telefone} onChange={e => setNovo({...novo, telefone: maskPhone(e.target.value)})} />
            </div>
            <div className="space-y-2">
              <label>Convênio</label>
              <input placeholder="Convênio" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.convenio} onChange={e => setNovo({...novo, convenio: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label>Motivo da Consulta</label>
              <textarea placeholder="Motivo" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.motivo_consulta} onChange={e => setNovo({...novo, motivo_consulta: e.target.value})} />
            </div>
            <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-xl font-black uppercase">SALVAR PACIENTE</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] overflow-hidden border border-slate-700 shadow-xl">
          <table className="w-full text-left">
            <thead><tr className="bg-[#0F172A] text-slate-500 text-[10px] uppercase font-black border-b border-slate-800"><th className="p-8">Identificação</th><th className="p-8 text-right">Ação</th></tr></thead>
            <tbody>{pacientes.map(p => (
              <tr key={p.id} className="border-b border-slate-800 hover:bg-[#0F172A] cursor-pointer" onClick={() => onSelect(p)}>
                <td className="p-8">
                  <p className="font-black uppercase text-sm">{p.nome}</p>
                  <p className="text-[9px] text-slate-500">CPF: {p.cpf} | {p.convenio || 'Particular'}</p>
                </td>
                <td className="p-8 text-right"><button onClick={(e) => {e.stopPropagation(); deletar(p.id)}} className="text-red-400"><Trash2 size={18}/></button></td>
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
      <h1 className="text-4xl font-black uppercase italic">Equipe</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl">
          <form onSubmit={save} className="space-y-4 uppercase text-[10px] text-slate-500">
            <select className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={novo.tipo_usuario} onChange={e => setNovo({...novo, tipo_usuario: e.target.value})}>
              <option value="dentista">Dentista</option><option value="funcionario">Funcionário</option>
            </select>
            <input required placeholder="Nome" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.nome} onChange={e => setNovo({...novo, nome: e.target.value})} />
            <input placeholder="Cargo" className="w-full p-4 bg-[#0F172A] text-white rounded-xl border border-slate-600 outline-none" value={novo.cargo} onChange={e => setNovo({...novo, cargo: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-xl font-black">ADICIONAR</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] overflow-hidden border border-slate-700 shadow-xl">
          <table className="w-full text-left">
            <tbody>{equipe.map(m => (
              <tr key={m.id} className="border-b border-slate-800"><td className="p-8 font-black uppercase">{m.nome} - {m.cargo}</td><td className="p-8 text-right"><button onClick={() => deletar(m.id)}><Trash2 className="text-red-400"/></button></td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AgendaView({ pacientes, agendamentos, nova, setNova, save, onDelete }) {
  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-black uppercase italic">Agenda</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl space-y-4">
          <form onSubmit={save} className="space-y-4">
            <select required className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.paciente_id} onChange={e => setNova({...nova, paciente_id: e.target.value})}><option value="">Selecione...</option>{pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            <input required type="date" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.data} onChange={e => setNova({...nova, data: e.target.value})} />
            <input required type="time" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.hora} onChange={e => setNova({...nova, hora: e.target.value})} />
            <button type="submit" className="w-full bg-blue-600 py-5 rounded-xl font-black">CONFIRMAR</button>
          </form>
        </div>
        <div className="lg:col-span-2 space-y-4">
          {agendamentos.map(ag => (
            <div key={ag.id} className="bg-[#1E293B] p-8 rounded-[2rem] border border-slate-700 flex justify-between items-center shadow-md">
               <div><p className="text-blue-400 font-black">{ag.data} às {ag.hora}</p><p className="text-xl font-black uppercase">{ag.paciente_nome}</p></div>
               <button onClick={() => onDelete(ag.id)}><Trash2 className="text-red-400"/></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FinanceiroView({ transacoes, nova, setNova, save }) {
  return (
    <div className="space-y-12">
      <h1 className="text-4xl font-black uppercase italic">Financeiro</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="bg-[#1E293B] p-10 rounded-[3rem] border border-slate-700 shadow-xl space-y-4">
          <form onSubmit={save} className="space-y-4">
            <select className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.tipo} onChange={e => setNova({...nova, tipo: e.target.value})}><option value="receita">Receita (+)</option><option value="despesa">Despesa (-)</option></select>
            <input required type="number" placeholder="Valor" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.valor} onChange={e => setNova({...nova, valor: e.target.value})} />
            <input required placeholder="Descrição" className="w-full p-4 bg-[#0F172A] text-white border border-slate-600 rounded-xl outline-none" value={nova.categoria} onChange={e => setNova({...nova, categoria: e.target.value})} />
            <button type="submit" className="w-full bg-emerald-600 py-5 rounded-xl font-black">LANÇAR</button>
          </form>
        </div>
        <div className="lg:col-span-2 bg-[#1E293B] rounded-[3rem] overflow-hidden border border-slate-700 shadow-xl"><table className="w-full text-left"><tbody>{transacoes.map(t => (<tr key={t.id} className="border-b border-slate-800 p-8"><td className="p-8 font-black uppercase">{t.categoria}</td><td className={`p-8 text-right font-black ${t.tipo==='receita'?'text-emerald-400':'text-red-400'}`}>R$ {t.valor}</td></tr>))}</tbody></table></div>
      </div>
    </div>
  );
}

function PerfilPacienteView({ form, setForm, maskPhone, save, editando, setEditando, email }) {
    return ( <div className="space-y-12"><header className="flex justify-between items-end"><h1 className="text-4xl font-black uppercase italic">Meu Perfil</h1><button onClick={() => setEditando(!editando)} className="bg-[#1E293B] px-8 py-3 rounded-2xl font-black uppercase border border-slate-700">{editando ? "Cancelar" : "Editar"}</button></header><div className="grid grid-cols-1 lg:grid-cols-3 gap-12"><div className="lg:col-span-2 bg-[#1E293B] p-12 rounded-[4rem] border border-slate-700 shadow-2xl space-y-8 font-black uppercase text-[10px] text-slate-400 tracking-widest"><form onSubmit={save} className="space-y-8"><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-2"><label className="ml-1">Nome</label><input disabled={!editando} className="w-full p-5 bg-[#0F172A] text-white rounded-2xl border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} /></div><div className="space-y-2"><label className="ml-1">Telefone</label><input disabled={!editando} className="w-full p-5 bg-[#0F172A] text-white rounded-2xl border border-slate-700 font-bold focus:border-blue-500 outline-none" value={form.telefone} onChange={e => setForm({...form, telefone: maskPhone(e.target.value)})} /></div></div>{editando && <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black uppercase shadow-xl hover:bg-blue-700">Salvar Registro</button>}</form></div><div className="bg-[#0F172A] p-12 rounded-[3rem] shadow-xl h-fit border border-slate-800 relative overflow-hidden"><p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2">Conta</p><p className="text-2xl font-black break-all leading-none italic">{email}</p></div></div></div> );
}