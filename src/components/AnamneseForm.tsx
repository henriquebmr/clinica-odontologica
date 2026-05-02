import React, { useState, useEffect } from 'react';
import { db } from '../db';
import { 
  ClipboardList, Stethoscope, Save, Activity, 
  MapPin, CreditCard, Mail, Phone, Calendar, CheckCircle2 
} from 'lucide-react';

export default function AnamneseForm() {
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [dentistas, setDentistas] = useState<any[]>([]);
  const [odontogramaHistorico, setOdontogramaHistorico] = useState<any[]>([]);
  const [pacienteInfo, setPacienteInfo] = useState<any>(null);
  
  // Estado para os dentes selecionados para a NOVA consulta (Plano de Trabalho)
  const [dentesNovaConsulta, setDentesNovaConsulta] = useState<number[]>([]);

  const [formData, setFormData] = useState({
    pacienteId: '',
    dentistaId: '',
    comoConheceu: '',
    avaliacao: {
      tratamentoMedico: { res: '', obs: '' },
      diabetes: { res: '', obs: '' },
      cirurgiaRecente: { res: '', obs: '' },
      alergiaMedicamento: { res: '', obs: '' },
      problemaCicatrizacao: { res: '', obs: '' },
      depressaoAnsiedade: { res: '', obs: '' },
      doencaInfecto: { res: '', obs: '' },
      historicoConvulsao: { res: '', obs: '' },
    },
    checklist: {
      cancer: '', cardiopatia: '', anemia: '',
      disturbioCirculatorio: '', hipertensao: '', queloide: '',
      usoDrogas: '', hipotensao: '', vitiligo: '',
      efeitoAlcool: '', marcapasso: '', gestante: '',
      dormiuBem: '', hemofilia: '', amamentando: '',
      jejum: '', hepatite: ''
    },
    outrosProblemas: '',
    tipoRh: '',
    observacoesTratamento: ''
  });

  useEffect(() => {
    const carregarListas = async () => {
      const [p, d] = await Promise.all([
        db.pacientes.toArray(),
        db.equipe.filter(e => e.tipo_usuario === 'dentista').toArray()
      ]);
      setPacientes(p || []);
      setDentistas(d || []);
    };
    carregarListas();
  }, []);

  const handlePacienteChange = async (id: string) => {
    const pId = parseInt(id);
    const p = pacientes.find(item => item.id === pId);
    setPacienteInfo(p || null);
    setFormData(prev => ({ ...prev, pacienteId: id }));
    setDentesNovaConsulta([]); 

    if (p) {
      // Importa os procedimentos registrados na tela de paciente[cite: 1]
      const historico = await db.odontograma.where({ paciente_id: pId }).toArray();
      setOdontogramaHistorico(historico || []);
    } else {
      setOdontogramaHistorico([]);
    }
  };

  const toggleDentePlanoTrabalho = (denteId: number) => {
    if (!formData.pacienteId) return alert("Selecione um paciente primeiro.");
    setDentesNovaConsulta(prev => 
      prev.includes(denteId) ? prev.filter(id => id !== denteId) : [...prev, denteId]
    );
  };

  const salvarFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await db.prontuarios.add({
        ...formData,
        dentesPlanoTratamento: dentesNovaConsulta,
        data: new Date().toISOString()
      });
      alert("Ficha de Anamnese e Plano de Trabalho registrados!");
    } catch (err) {
      alert("Erro ao salvar os dados.");
    }
  };

  const dentesSuperioresSequence = Array.from({ length: 16 }, (_, i) => i + 1); 
  const dentesInferioresSequence = Array.from({ length: 16 }, (_, i) => i + 17);

  return (
    <div className="p-4 md:p-8 bg-[#0F172A] min-h-screen text-white font-sans">
      <form onSubmit={salvarFicha} className="max-w-5xl mx-auto bg-[#1E293B] p-6 md:p-10 rounded-[3rem] border border-slate-700 shadow-2xl space-y-10">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-700 pb-8">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg">
              <ClipboardList size={32} />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Ficha de Anamnese</h1>
          </div>
          <div className="w-full md:w-72 space-y-2 text-right">
            <label className="text-[10px] font-black uppercase text-blue-500 mr-2">Dentista Responsável</label>
            <select 
              className="w-full bg-[#0F172A] border border-slate-600 p-3 rounded-xl outline-none focus:border-blue-500"
              value={formData.dentistaId}
              onChange={e => setFormData({...formData, dentistaId: e.target.value})}
              required
            >
              <option value="">Selecionar Dentista...</option>
              {dentistas.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Dados Cadastrais do Paciente */}
        <section className="bg-[#0F172A] p-8 rounded-[2.5rem] border border-slate-800 space-y-6 shadow-inner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Buscar Paciente</label>
               <select 
                className="w-full bg-[#1E293B] border border-slate-600 p-4 rounded-2xl outline-none focus:border-blue-500 font-bold"
                onChange={e => handlePacienteChange(e.target.value)}
                required
               >
                 <option value="">Selecione um paciente...</option>
                 {pacientes.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
               </select>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-500 ml-4">Como nos conheceu?</label>
                <div className="flex gap-4 h-[58px] items-center bg-[#1E293B] px-6 rounded-2xl border border-slate-700">
                  {['Facebook', 'Instagram', 'Indicação'].map(meio => (
                    <label key={meio} className="flex items-center gap-2 text-xs font-bold cursor-pointer hover:text-blue-400">
                      <input type="radio" name="conheceu" className="accent-blue-500" onChange={() => setFormData({...formData, comoConheceu: meio})} /> {meio}
                    </label>
                  ))}
                </div>
             </div>
          </div>

          {pacienteInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-8 pt-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 text-slate-400"><Calendar size={16} className="text-blue-500"/><span className="text-xs">Nasc: {pacienteInfo.data_nascimento || 'N/A'}</span></div>
              <div className="flex items-center gap-3 text-slate-400"><CreditCard size={16} className="text-blue-500"/><span className="text-xs">CPF: {pacienteInfo.cpf}</span></div>
              <div className="flex items-center gap-3 text-slate-400"><Phone size={16} className="text-blue-500"/><span className="text-xs">Tel: {pacienteInfo.telefone}</span></div>
              <div className="flex items-center gap-3 text-slate-400"><MapPin size={16} className="text-blue-500"/><span className="text-xs">Endereço: {pacienteInfo.endereco || 'N/A'}</span></div>
              <div className="flex items-center gap-3 text-slate-400"><Mail size={16} className="text-blue-500"/><span className="text-xs">E-mail: {pacienteInfo.email_paciente}</span></div>
            </div>
          )}
        </section>

        {/* Avaliação Detalhada (Sim/Não/Obs) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.keys(formData.avaliacao).map((key) => (
            <div key={key} className="bg-[#0F172A] p-6 rounded-[2rem] border border-slate-800 space-y-4 transition-all hover:border-slate-600">
              <p className="text-sm font-bold uppercase text-blue-400">
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}?
              </p>
              <div className="flex gap-6">
                {['Sim', 'Não'].map(opcao => (
                  <label key={opcao} className="flex items-center gap-2 cursor-pointer group">
                    <input 
                      type="radio" 
                      name={key} 
                      className="accent-blue-500"
                      onChange={() => setFormData({
                        ...formData, 
                        avaliacao: { ...formData.avaliacao, [key]: { ...formData.avaliacao[key], res: opcao }}
                      })}
                    />
                    <span className="text-xs font-black uppercase group-hover:text-blue-400">{opcao}</span>
                  </label>
                ))}
              </div>
              <input 
                type="text" 
                placeholder="Especifique..."
                className="w-full bg-transparent border-b border-slate-700 py-1 text-sm outline-none focus:border-blue-500"
                onChange={e => setFormData({
                  ...formData, 
                  avaliacao: { ...formData.avaliacao, [key]: { ...formData.avaliacao[key], obs: e.target.value }}
                })}
              />
            </div>
          ))}
        </div>

        {/* Checklist de Condições */}
        <div className="bg-[#0F172A] p-8 rounded-[2.5rem] border border-slate-800">
          <h3 className="text-[10px] font-black uppercase text-blue-500 mb-6 tracking-widest">Checklist de Saúde</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-10">
            {Object.keys(formData.checklist).map((item) => (
              <div key={item} className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-[11px] font-bold uppercase text-slate-300">
                  {item.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                </span>
                <div className="flex gap-3">
                  {['Sim', 'Não'].map(op => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setFormData({...formData, checklist: {...formData.checklist, [item]: op}})}
                      className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${formData.checklist[item] === op ? 'bg-blue-600 text-white' : 'bg-[#1E293B] text-slate-500'}`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Plano de Trabalho e Odontograma */}
        <div className="bg-[#0F172A] p-8 rounded-[3rem] border border-slate-800 shadow-inner">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center gap-3">
              <Activity size={20} className="text-blue-500" />
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Plano de Trabalho da Consulta</h3>
            </div>
            <div className="flex gap-4 text-[9px] uppercase font-black">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-600 rounded-sm" /> Cárie</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-600 rounded-sm" /> Canal</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-500 border border-white rounded-sm" /> Selecionado</div>
            </div>
          </div>
          
          <div className="flex flex-col gap-10 items-center overflow-x-auto pb-6">
            <div className="grid grid-cols-8 md:grid-cols-16 gap-3">
              {dentesSuperioresSequence.map(id => {
                const hist = odontogramaHistorico.find(d => d.dente_id === id);
                const selecionado = dentesNovaConsulta.includes(id);
                return (
                  <div 
                    key={id} 
                    onClick={() => toggleDentePlanoTrabalho(id)}
                    className={`w-12 h-16 rounded-xl border-2 flex flex-col items-center justify-center font-black cursor-pointer transition-all hover:scale-110 
                      ${selecionado ? 'border-white bg-blue-500 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 
                        hist?.condicao === 'carie' ? 'bg-red-600 border-red-400' : 
                        hist?.condicao === 'canal' ? 'bg-blue-600 border-blue-400' : 
                        hist?.condicao === 'extraido' ? 'bg-slate-700 border-slate-600 opacity-40' : 
                        'bg-[#1E293B] border-slate-700 text-slate-500 hover:border-blue-500'}`}
                  >
                    <span className="text-[10px]">{id}</span>
                    {selecionado && <CheckCircle2 size={12} className="mt-1 text-white animate-in zoom-in" />}
                  </div>
                );
              })}
            </div>
            
            <div className="w-full h-px bg-slate-800 shadow-sm" />

            <div className="grid grid-cols-8 md:grid-cols-16 gap-3">
              {dentesInferioresSequence.map(id => {
                const hist = odontogramaHistorico.find(d => d.dente_id === id);
                const selecionado = dentesNovaConsulta.includes(id);
                return (
                  <div 
                    key={id} 
                    onClick={() => toggleDentePlanoTrabalho(id)}
                    className={`w-12 h-16 rounded-xl border-2 flex flex-col items-center justify-center font-black cursor-pointer transition-all hover:scale-110 
                      ${selecionado ? 'border-white bg-blue-500 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 
                        hist?.condicao === 'carie' ? 'bg-red-600 border-red-400' : 
                        hist?.condicao === 'canal' ? 'bg-blue-600 border-blue-400' : 
                        hist?.condicao === 'extraido' ? 'bg-slate-700 border-slate-600 opacity-40' : 
                        'bg-[#1E293B] border-slate-700 text-slate-500 hover:border-blue-500'}`}
                  >
                    {selecionado && <CheckCircle2 size={12} className="mb-1 text-white animate-in zoom-in" />}
                    <span className="text-[10px]">{id}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <textarea 
            placeholder="Observações do plano de tratamento..."
            className="w-full mt-8 bg-[#1E293B] border border-slate-700 p-6 rounded-[2rem] text-sm outline-none focus:border-blue-500 text-white"
            rows={4}
            onChange={e => setFormData({...formData, observacoesTratamento: e.target.value})}
          />
        </div>

        <button type="submit" className="w-full bg-blue-600 text-white py-6 rounded-[2rem] font-black text-xl uppercase italic tracking-tighter shadow-2xl hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-3">
          <Save size={24} /> Registrar Ficha e Plano de Trabalho
        </button>

      </form>
    </div>
  );
}