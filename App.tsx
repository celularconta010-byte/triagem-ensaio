import React, { useState, useEffect, useRef } from 'react';
import { Attendee, Role, Level, ViewState, INSTRUMENTS, Ministry, EventMetadata } from './types';
import { Button } from './components/Button';
import { BRAZILIAN_CITIES } from './services/cities';
import { EventDashboard } from './components/EventDashboard';
import { PrintReport } from './components/PrintReport';
import { CityPrint } from './components/CityPrint';
import { CitiesList } from './components/CitiesList';
import { AttendeesList } from './components/AttendeesList';
import { fetchAttendees, addAttendee, updateAttendee, deleteAttendee, clearAllAttendees, fetchEventMetadata, saveEventMetadata, clearEventMetadata, checkSystemStatus } from './services/supabase';

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('landing');
  const [isOffline, setIsOffline] = useState(false);

  const generateId = () => {
    try {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // Custom function to change view and update browser history
  const navigateTo = (newView: ViewState, replace: boolean = false) => {
    if (newView === view) return;
    
    if (replace) {
      window.history.replaceState({ view: newView }, '', '');
    } else {
      window.history.pushState({ view: newView }, '', '');
    }
    setView(newView);
  };

  // Handle browser back/forward buttons (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.view) {
        setView(event.state.view);
      } else {
        setView('landing');
      }
    };

    // Initialize history state on first load
    window.history.replaceState({ view: 'landing' }, '', '');
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [ministry, setMinistry] = useState<Ministry>(Ministry.NONE);
  const [instrument, setInstrument] = useState('');
  const [level, setLevel] = useState<Level>(Level.MUSICIAN);
  const [city, setCity] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Custom Dropdown States for City
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState('');
  const cityDropdownRef = useRef<HTMLDivElement>(null);

  const initialMeta: EventMetadata = {
    eventTitle: 'Triagem Ensaio',
    local: '',
    date: new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    anciao: '',
    regionais: '',
    palavra: '',
    hinos: ''
  };

  // Event Metadata
  const [eventMeta, setEventMeta] = useState<EventMetadata>(initialMeta);

  // Dinamic Title for Printing - Helps naming the PDF file
  useEffect(() => {
    if (view === 'print') {
      const originalTitle = document.title;
      const cleanLocal = eventMeta.local.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      document.title = `Relatorio_Triagem_${cleanLocal || 'Ensaio'}_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}`;
      return () => { document.title = originalTitle; };
    }
  }, [view, eventMeta.local]);

  // Carregar dados do Supabase ao iniciar
  useEffect(() => {
    const loadData = async () => {
      const status = await checkSystemStatus();
      if (status.offline) {
        setIsOffline(true);
        return;
      }

      const [attendeesData, metaData] = await Promise.all([
        fetchAttendees(),
        fetchEventMetadata()
      ]);

      if (attendeesData.length > 0) {
        setAttendees(attendeesData);
      }

      if (metaData) {
        setEventMeta(metaData);
      }
    };

    loadData();
  }, []);

  // Salvar metadados do evento quando mudarem
  useEffect(() => {
    if (eventMeta.local || eventMeta.anciao || eventMeta.regionais || eventMeta.palavra || eventMeta.hinos || eventMeta.eventTitle || eventMeta.date) {
      saveEventMetadata(eventMeta);
    }
  }, [eventMeta]);

  // Click outside listener for city dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cityDropdownRef.current && !cityDropdownRef.current.contains(event.target as Node)) {
        setIsCityDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRegister = (role: Role) => {
    setSelectedRole(role);
    setInstrument(role === Role.ORGANIST ? 'Órgão' : '');
    setMinistry(Ministry.NONE);
    setLevel(Level.NONE);
    setCity('');
    setCitySearchTerm('');
    navigateTo('form');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!city) return;

    const newAttendee: Attendee = {
      id: editingAttendee ? editingAttendee.id : generateId(),
      ministry,
      role: selectedRole!,
      instrument: instrument || (selectedRole === Role.ORGANIST ? 'Órgão' : 'Não informado'),
      level: selectedRole === Role.ORGANIST ? Level.MUSICIAN : level,
      city,
      timestamp: editingAttendee ? editingAttendee.timestamp : Date.now(),
    };

    // Adicionar ou Atualizar no Supabase
    const success = editingAttendee
      ? await updateAttendee(newAttendee)
      : await addAttendee(newAttendee);

    if (success) {
      if (editingAttendee) {
        setAttendees(prev => prev.map(a => a.id === newAttendee.id ? newAttendee : a));
      } else {
        setAttendees(prev => [newAttendee, ...prev]);
      }

      setShowSuccess(true);

      // Reset Completo do formulário após registro
      setCity('');
      setCitySearchTerm('');
      setMinistry(Ministry.NONE);
      setInstrument(selectedRole === Role.ORGANIST ? 'Órgão' : '');
      setLevel(Level.NONE);
      setEditingAttendee(null);

      setTimeout(() => {
        setShowSuccess(false);
        if (editingAttendee) navigateTo('dashboard');
      }, 2000);
    } else {
      alert('Erro ao salvar participante. Tente novamente.');
    }
  };

  const clearAllData = async () => {
    if (confirm('ATENÇÃO: Isso apagará TODOS os registros para iniciar um NOVO evento. Deseja continuar?')) {
      await Promise.all([
        clearAllAttendees(),
        clearEventMetadata()
      ]);

      setAttendees([]);
      setEventMeta({
        ...initialMeta,
        date: new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      });
      setView('landing');
      navigateTo('landing', true); // Reset history
    }
  };

  const handleEditAttendee = (attendee: Attendee) => {
    setEditingAttendee(attendee);
    setSelectedRole(attendee.role);
    setMinistry(attendee.ministry);
    setInstrument(attendee.instrument);
    setLevel(attendee.level);
    setCity(attendee.city);
    setCitySearchTerm(attendee.city);
    navigateTo('form');
  };

  const handleDeleteAttendee = async (id: string) => {
    if (confirm('Deseja realmente excluir este participante?')) {
      const success = await deleteAttendee(id);
      if (success) {
        setAttendees(prev => prev.filter(a => a.id !== id));
      } else {
        alert('Erro ao excluir participante.');
      }
    }
  };


  const filteredCities = BRAZILIAN_CITIES.filter(c =>
    c.toLowerCase().includes(citySearchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center">
      <style>{`
        /* Cores de Fundo (Grayscale) */
        .bg-gray-light { background-color: #f7fafc !important; }
        .bg-header-gray { background-color: #edf2f7 !important; }
        .bg-summary-gray { background-color: #f7fafc !important; }
        
        /* Utilitários de Borda */
        .border-k { border: 1px solid black !important; }
        .border-k-2 { border: 2px solid black !important; }
        .border-k-double { border: 4px double black !important; }

        /* Reset Geral para Impressão e Preview */
        * { box-sizing: border-box !important; }

        /* Container Principal do Relatório (Simula folha A4) */
        .print-view {
          background: white;
          color: black;
          font-family: "Inter", "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
          margin: 0 auto;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
          border: 1px solid #e2e8f0;
          width: 29.7cm;
          height: 21cm;
          overflow: hidden;
          position: relative;
        }

        .print-columns-wrapper {
          display: flex !important;
          flex-direction: row !important;
          width: 100% !important;
          height: 100% !important;
          background: white;
        }

        .print-column {
          flex: 0 0 33.33% !important;
          height: 100% !important;
          padding: 0.4cm 0.4cm;
          display: flex;
          flex-direction: column;
          border-right: 0.5pt solid #cbd5e1 !important;
          position: relative;
        }

        .print-column:last-child {
          border-right: none !important;
        }

        /* Tabelas Estilizadas */
        table { width: 100%; border-collapse: collapse; margin-bottom: 6px; }
        th, td { border: 0.5pt solid #1e293b; padding: 2px 4px; font-size: 7.5pt; color: black; line-height: 1.1; }
        th { font-weight: 900; text-align: left; background-color: #f1f5f9; text-transform: uppercase; font-size: 7.5pt; color: #1e293b; }
        
        .table-header-box { border: 1pt solid #1e293b; font-weight: 900; text-align: center; padding: 4px; margin-bottom: 15px; text-transform: uppercase; font-size: 9pt; tracking: 0.1em; color: #1e293b; }
        .row-even { background-color: #f8fafc; }
        .cell-qty { width: 30px; text-align: center; font-weight: 900; background-color: #f1f5f9; border-left: 1pt solid #1e293b; }

        /* Tables */
        .section-header {
          border: 1pt solid #1e293b; font-weight: 1000; text-align: center; padding: 5pt; 
          margin-bottom: 15pt; text-transform: uppercase; font-size: 10pt; letter-spacing: 0.1em;
          background: white; width: 100%;
        }
        
        table { width: 100%; border-collapse: collapse; margin-bottom: 10pt; }
        th, td { border: 0.5pt solid #1e293b; padding: 3pt 5pt; font-size: 8pt; line-height: 1.1; color: black; }
        th { background: #f1f5f9; font-weight: 900; text-transform: uppercase; font-size: 8pt; text-align: left; }
        .qty-cell { width: 35pt; text-align: center; font-weight: 1000; background: #f8fafc; border-left: 1pt solid #1e293b; }
        .row-alt { background: #f8fafc; }

        .col-3-footer { border-top: 1pt solid #1e293b; margin-top: auto; padding-top: 5pt; display: flex; justify-content: space-between; font-size: 7.5pt; font-weight: 1000; text-transform: uppercase; }
        .brand-italic { font-style: italic; font-weight: 500; }

        @media print {
          @page { margin: 0; size: A4 landscape; }
          body { background: white !important; margin: 0; padding: 0; }
          .no-print { display: none !important; }
          .print-canvas { box-shadow: none !important; border: none !important; margin: 0 !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>

      {/* Main UI */}
      {isOffline && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-2xl text-center space-y-6">
            <div className="text-6xl mb-4 animate-pulse">⚠️</div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Sistema Inativo</h2>
            <p className="text-slate-600 font-medium">
              O banco de dados está temporariamente offline ou pausado por inatividade.
            </p>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-xl text-sm text-left">
              <strong>Atenção Administrador:</strong> Acesse o painel do Supabase e clique em <b>Restore</b> para reativar o sistema e restabelecer a conexão.
            </div>
            <Button onClick={() => window.location.reload()} variant="primary" className="w-full py-4 rounded-xl text-lg font-bold">
              Tentar Novamente
            </Button>
          </div>
        </div>
      )}

      {view !== 'print' && (
        <header className="w-full max-w-4xl px-6 py-8 flex flex-col items-center no-print">
          <div className="bg-white p-3 rounded-full shadow-sm mb-4">
            <span className="text-3xl">🎺</span>
          </div>
          <h1 className="title-font text-3xl font-bold text-slate-800">Triagem Ensaio</h1>
        </header>
      )}

      <main className={`w-full ${view === 'print' ? 'max-w-none p-0' : 'max-w-2xl px-4'} mb-20`}>

        {view === 'landing' && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleRegister(Role.MUSICIAN)}
                className="h-48 bg-white border-2 border-indigo-100 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:shadow-xl transition-all group"
              >
                <div className="p-4 bg-indigo-50 rounded-full group-hover:bg-indigo-100">
                  <span className="text-4xl">🎻</span>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-xl text-slate-800">Irmãos</h3>
                  <p className="text-slate-500">Músicos</p>
                </div>
              </button>

              <button
                onClick={() => handleRegister(Role.ORGANIST)}
                className="h-48 bg-white border-2 border-emerald-100 rounded-2xl flex flex-col items-center justify-center gap-4 hover:border-emerald-400 hover:shadow-xl transition-all group"
              >
                <div className="p-4 bg-emerald-50 rounded-full group-hover:bg-emerald-100">
                  <span className="text-4xl">🎹</span>
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-xl text-slate-800">Irmãs</h3>
                  <p className="text-slate-500">Organistas</p>
                </div>
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800">Painel do Evento</h4>
                <p className="text-sm text-slate-500">{attendees.length} presentes registrados</p>
              </div>
              <Button onClick={() => navigateTo('dashboard')} variant="outline">Configurar e Relatórios</Button>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-4 mb-6">
              <Button
                onClick={() => {
                  if (editingAttendee) {
                    setEditingAttendee(null);
                    navigateTo('dashboard');
                  } else {
                    navigateTo('landing');
                  }
                }}
                variant="outline"
                className="px-2 py-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </Button>
              <h2 className="text-2xl font-bold text-slate-800">
                {editingAttendee ? 'Editar Registro' : `Registro: ${selectedRole}`}
              </h2>
            </div>

            {showSuccess && (
              <div className="bg-emerald-100 text-emerald-800 p-4 rounded-xl mb-6 text-center font-bold animate-in fade-in zoom-in-95 duration-200">
                {editingAttendee ? 'Atualizado com sucesso!' : 'Inscrito com sucesso!'}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">
                  {selectedRole === Role.ORGANIST ? 'Cargo' : 'Ministério'}
                </label>
                <select
                  value={ministry}
                  onChange={(e) => setMinistry(e.target.value as Ministry)}
                  className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                >
                  {(selectedRole === Role.ORGANIST
                    ? [Ministry.NONE, Ministry.EXAMINADORA, Ministry.INSTRUTORA, Ministry.ORGANISTA]
                    : [Ministry.NONE, Ministry.ANCIAO, Ministry.DIACONO, Ministry.COOPERADOR_OFICIO, Ministry.COOPERADOR_JOVENS]
                  ).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {selectedRole === Role.MUSICIAN && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Cargo</label>
                    <select
                      value={level}
                      onChange={(e) => setLevel(e.target.value as Level)}
                      className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                      {Object.values(Level).map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Instrumento</label>
                    <select
                      value={instrument}
                      onChange={(e) => setInstrument(e.target.value)}
                      className="w-full p-4 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                    >
                      <option value="">Selecione o Instrumento</option>
                      {INSTRUMENTS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                </>
              )}

              <div className="relative" ref={cityDropdownRef}>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Cidade / Localidade <span className="text-rose-500">*</span></label>
                <div
                  onClick={() => setIsCityDropdownOpen(!isCityDropdownOpen)}
                  className={`w-full p-4 bg-white border rounded-xl flex justify-between items-center cursor-pointer ${!city ? 'border-amber-300' : 'border-slate-300'}`}
                >
                  <span className={city ? 'text-slate-900' : 'text-slate-400'}>{city || 'Selecione a cidade'}</span>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
                {isCityDropdownOpen && (
                  <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto">
                    <div className="p-3 border-b sticky top-0 bg-white">
                      <input
                        autoFocus
                        type="text"
                        value={citySearchTerm}
                        onChange={e => setCitySearchTerm(e.target.value)}
                        placeholder="Buscar cidade..."
                        className="w-full p-2 border rounded-lg focus:border-indigo-400 outline-none"
                      />
                    </div>
                    {filteredCities.map(c => (
                      <div key={c} onClick={() => { setCity(c); setIsCityDropdownOpen(false); }} className="p-3 hover:bg-indigo-50 cursor-pointer border-b last:border-0">
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={!city}
                className="w-full py-5 text-xl font-bold rounded-2xl shadow-lg"
                variant={selectedRole === Role.MUSICIAN ? 'primary' : 'secondary'}
              >
                {editingAttendee ? 'SALVAR ALTERAÇÕES' : 'REGISTRAR PRESENÇA'}
              </Button>
            </form>
          </div>
        )}

        {view === 'dashboard' && (
          <EventDashboard
            attendees={attendees}
            eventMeta={eventMeta}
            onUpdateMeta={setEventMeta}
            onClearData={clearAllData}
            onGenerateReport={() => navigateTo('print')}
            onPrintCities={() => navigateTo('print-cities')}
            onViewCities={() => navigateTo('cities-list')}
            onViewAttendees={() => navigateTo('attendees-list')}
            onBack={() => navigateTo('landing')}
          />
        )}
        {view === 'print' && (
          <PrintReport
            attendees={attendees}
            eventMeta={eventMeta}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {view === 'print-cities' && (
          <CityPrint
            attendees={attendees}
            eventMeta={eventMeta}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {view === 'cities-list' && (
          <CitiesList
            attendees={attendees}
            onPrintCities={() => navigateTo('print-cities')}
            onBack={() => navigateTo('dashboard')}
          />
        )}

        {view === 'attendees-list' && (
          <AttendeesList
            attendees={attendees}
            onEditAttendee={handleEditAttendee}
            onDeleteAttendee={handleDeleteAttendee}
            onBack={() => navigateTo('dashboard')}
          />
        )}
      </main>

      {view !== 'landing' && view !== 'print' && (
        <div className="fixed bottom-6 right-6 no-print">
          <Button
            onClick={() => navigateTo('landing')}
            className="w-14 h-14 rounded-full flex items-center justify-center p-0 shadow-2xl bg-indigo-600 text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          </Button>
        </div>
      )}
    </div>
  );
};

export default App;
