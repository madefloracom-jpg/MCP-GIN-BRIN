import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  ExternalLink, 
  CheckCircle2, 
  RefreshCw, 
  Sparkles, 
  X, 
  FileText,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  Video
} from 'lucide-react';
import { AgendaItem, TeamMember } from '../types';
import { syncEventToGoogleCalendar, deleteGoogleCalendarEvent, getGoogleCalendarWebUrl } from '../lib/googleApi';

interface AgendaEditorProps {
  agendas: AgendaItem[];
  onChange: (agendas: AgendaItem[]) => void;
  teamMembers?: TeamMember[];
  taskTitle?: string;
  taskStartDate?: string;
  taskEndDate?: string;
  className?: string;
  accessToken?: string | null;
}

const HOURS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

export default function AgendaEditor({
  agendas = [],
  onChange,
  teamMembers = [],
  taskTitle = 'Task Meeting / Discussion',
  taskStartDate = new Date().toISOString().split('T')[0],
  taskEndDate,
  className = '',
  accessToken
}: AgendaEditorProps) {
  const activeMembers = teamMembers || [];
  const [viewMode, setViewMode] = useState<'timeline' | 'list'>('timeline');
  const [selectedDate, setSelectedDate] = useState<string>(
    taskStartDate || new Date().toISOString().split('T')[0]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('Google Meet');
  const [notes, setNotes] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState<string[]>([]);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  // Current time state for ClickUp red indicator
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = now.toISOString().split('T')[0];
  const isToday = selectedDate === todayStr;

  const currentHourNum = now.getHours();
  const currentMinNum = now.getMinutes();
  const currentTimeFormatted = `${String(currentHourNum).padStart(2, '0')}:${String(currentMinNum).padStart(2, '0')}`;

  // Date Navigation
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(todayStr);
  };

  const openAddModalForHour = (hourStr?: string) => {
    setEditingId(null);
    setTitle(`Discussion: ${taskTitle}`);
    setDate(selectedDate);
    if (hourStr) {
      setStartTime(hourStr);
      const h = parseInt(hourStr.split(':')[0], 10);
      const nextH = (h + 1) % 24;
      setEndTime(`${String(nextH).padStart(2, '0')}:00`);
    } else {
      setStartTime('09:00');
      setEndTime('10:00');
    }
    setLocation('Google Meet');
    setNotes('');
    setSelectedAttendees(activeMembers.map(m => m.email));
    setIsModalOpen(true);
  };

  const openEditModal = (item: AgendaItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDate(item.date || selectedDate);
    setStartTime(item.startTime || '09:00');
    setEndTime(item.endTime || '10:00');
    setLocation(item.location || 'Google Meet');
    setNotes(item.notes || '');
    setSelectedAttendees(item.attendees || []);
    setIsModalOpen(true);
  };

  const handleSave = async (shouldSyncToGoogle = false) => {
    if (!title.trim()) return;

    let googleEventId: string | undefined;
    let googleEventLink: string | undefined;
    let syncedAt: string | undefined;

    const existingItem = agendas.find(a => a.id === editingId);
    if (existingItem) {
      googleEventId = existingItem.googleEventId;
      googleEventLink = existingItem.googleEventLink;
      syncedAt = existingItem.syncedAt;
    }

    const newItem: AgendaItem = {
      id: editingId || `agenda_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      date,
      startTime,
      endTime,
      location: location.trim(),
      notes: notes.trim(),
      attendees: selectedAttendees,
      googleEventId,
      googleEventLink,
      syncedAt
    };

    if (shouldSyncToGoogle && accessToken) {
      try {
        setIsSyncing(newItem.id);
        const res = await syncEventToGoogleCalendar(accessToken, {
          title: newItem.title,
          description: newItem.notes ? `Task: ${taskTitle}\n\nNotes:\n${newItem.notes}` : `Task: ${taskTitle}`,
          location: newItem.location,
          startDate: newItem.date,
          endDate: newItem.date,
          startTime: newItem.startTime,
          endTime: newItem.endTime,
          attendees: newItem.attendees,
          eventId: newItem.googleEventId
        });
        newItem.googleEventId = res.id;
        newItem.googleEventLink = res.htmlLink;
        newItem.syncedAt = new Date().toISOString();
      } catch (err: any) {
        console.warn('Sync to Google Calendar failed, falling back to web link:', err);
        newItem.googleEventLink = getGoogleCalendarWebUrl({
          title: newItem.title,
          description: newItem.notes ? `Task: ${taskTitle}\n\n${newItem.notes}` : `Task: ${taskTitle}`,
          location: newItem.location,
          startDate: newItem.date,
          endDate: newItem.date,
          startTime: newItem.startTime,
          endTime: newItem.endTime
        });
      } finally {
        setIsSyncing(null);
      }
    } else if (shouldSyncToGoogle && !accessToken) {
      newItem.googleEventLink = getGoogleCalendarWebUrl({
        title: newItem.title,
        description: newItem.notes ? `Task: ${taskTitle}\n\n${newItem.notes}` : `Task: ${taskTitle}`,
        location: newItem.location,
        startDate: newItem.date,
        endDate: newItem.date,
        startTime: newItem.startTime,
        endTime: newItem.endTime
      });
    }

    if (editingId) {
      onChange(agendas.map(a => a.id === editingId ? newItem : a));
    } else {
      onChange([newItem, ...agendas]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    const item = agendas.find(a => a.id === id);
    if (item?.googleEventId && accessToken) {
      deleteGoogleCalendarEvent(accessToken, item.googleEventId).catch(() => {});
    }
    onChange(agendas.filter(a => a.id !== id));
  };

  const handleSyncSingle = async (item: AgendaItem) => {
    if (!accessToken) {
      const webUrl = getGoogleCalendarWebUrl({
        title: item.title,
        description: item.notes ? `Task: ${taskTitle}\n\n${item.notes}` : `Task: ${taskTitle}`,
        location: item.location,
        startDate: item.date,
        endDate: item.date,
        startTime: item.startTime,
        endTime: item.endTime
      });
      window.open(webUrl, '_blank');
      return;
    }

    setIsSyncing(item.id);
    try {
      const res = await syncEventToGoogleCalendar(accessToken, {
        title: item.title,
        description: item.notes ? `Task: ${taskTitle}\n\n${item.notes}` : `Task: ${taskTitle}`,
        location: item.location,
        startDate: item.date,
        endDate: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        attendees: item.attendees,
        eventId: item.googleEventId
      });

      const updatedItem: AgendaItem = {
        ...item,
        googleEventId: res.id,
        googleEventLink: res.htmlLink,
        syncedAt: new Date().toISOString()
      };

      onChange(agendas.map(a => a.id === item.id ? updatedItem : a));
    } catch (err: any) {
      console.error('Failed to sync event:', err);
      const webUrl = getGoogleCalendarWebUrl({
        title: item.title,
        description: item.notes ? `Task: ${taskTitle}\n\n${item.notes}` : `Task: ${taskTitle}`,
        location: item.location,
        startDate: item.date,
        endDate: item.date,
        startTime: item.startTime,
        endTime: item.endTime
      });
      window.open(webUrl, '_blank');
    } finally {
      setIsSyncing(null);
    }
  };

  // Filter agendas for selected date
  const selectedDateAgendas = agendas.filter(a => !a.date || a.date === selectedDate);
  const allDayAgendas = selectedDateAgendas.filter(a => !a.startTime);

  // Helper to format date display e.g. "Thu, Jul 23"
  const formattedDateTitle = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const formattedDayNum = new Date(selectedDate + 'T00:00:00').getDate();
  const formattedDayName = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });

  return (
    <div className={`bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden ${className}`}>
      {/* ClickUp Style Agenda Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
            <CalendarIcon className="h-4 w-4 text-rose-500" />
            <span>Agenda</span>
          </h3>

          {/* Date Navigation Bar */}
          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-1.5 py-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevDay}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-all cursor-pointer"
              title="Hari Sebelumnya"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleNextDay}
              className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition-all cursor-pointer"
              title="Hari Berikutnya"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>

            <span className="text-xs font-bold text-slate-800 px-1.5">
              {formattedDateTitle}
            </span>

            {!isToday && (
              <button
                type="button"
                onClick={handleToday}
                className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md hover:bg-blue-100 transition-all cursor-pointer"
              >
                Hari Ini
              </button>
            )}
          </div>

          <span className="text-[10px] font-semibold text-slate-400 hidden sm:inline-block">
            GMT+7
          </span>
        </div>

        {/* Right Tools: View Toggle & Add Button */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Kalender Timeline ClickUp"
            >
              <CalendarDays className="h-3.5 w-3.5 text-rose-500" />
              <span className="hidden sm:inline">Timeline</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Tampilan Daftar Agenda"
            >
              <List className="h-3.5 w-3.5 text-blue-600" />
              <span className="hidden sm:inline">List</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => openAddModalForHour()}
            className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xs transition-all cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Agenda</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: CLICKUP TIMELINE GRID */}
      {viewMode === 'timeline' && (
        <div className="p-3 bg-white space-y-3">
          {/* Day Header Row */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
            <div className="w-16 text-right text-[10px] font-bold text-slate-400 uppercase">
              GMT+7
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">{formattedDayName}</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full text-white ${isToday ? 'bg-rose-600' : 'bg-slate-700'}`}>
                {formattedDayNum}
              </span>
            </div>
          </div>

          {/* All Day Section */}
          <div className="flex items-start gap-3 border-b border-slate-100 pb-2.5 text-xs">
            <div className="w-16 shrink-0 text-right text-[11px] font-bold text-slate-400 uppercase pt-1">
              All day
            </div>
            <div className="flex-1 min-h-[32px] bg-slate-50/80 rounded-xl border border-dashed border-slate-200 p-1.5 flex flex-wrap gap-2">
              {allDayAgendas.length === 0 ? (
                <span className="text-[11px] text-slate-400 italic font-normal px-2 pt-0.5">
                  Belum ada agenda seharian. Klik untuk menambah.
                </span>
              ) : (
                allDayAgendas.map(item => (
                  <div
                    key={item.id}
                    onClick={() => openEditModal(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 hover:border-blue-300 rounded-lg shadow-2xs text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                    <span>{item.title}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Hourly Timeline Grid */}
          <div className="relative border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
            {HOURS.map((hourStr) => {
              const hourInt = parseInt(hourStr.split(':')[0], 10);
              const matchingAgendas = selectedDateAgendas.filter(a => {
                if (!a.startTime) return false;
                const aHour = parseInt(a.startTime.split(':')[0], 10);
                return aHour === hourInt;
              });

              // Check if current hour indicator sits inside this hour row
              const isCurrentHourRow = isToday && currentHourNum === hourInt;

              return (
                <div
                  key={hourStr}
                  className="relative group flex items-start min-h-[52px] hover:bg-slate-50/60 transition-all"
                >
                  {/* Left Hour Label */}
                  <div className="w-16 shrink-0 text-right pr-3 pt-2 text-[11px] font-semibold text-slate-400 group-hover:text-slate-700">
                    {hourInt === 12 ? '12 pm' : hourInt > 12 ? `${hourInt - 12} pm` : `${hourInt} am`}
                  </div>

                  {/* Grid Cell Content */}
                  <div 
                    onClick={() => openAddModalForHour(hourStr)}
                    className="flex-1 p-1.5 border-l border-slate-100 min-h-[52px] cursor-pointer relative"
                  >
                    {/* Render Matching Events */}
                    {matchingAgendas.map((item) => (
                      <div
                        key={item.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(item);
                        }}
                        className="mb-1.5 p-2 bg-gradient-to-r from-blue-50 to-indigo-50/60 border-l-4 border-l-blue-600 border border-blue-200/80 rounded-r-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 truncate">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {item.title}
                            </span>
                            {item.googleEventId && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="h-2.5 w-2.5" />
                                <span>Synced</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-600 font-medium">
                            <span className="flex items-center gap-0.5 text-blue-700 font-bold">
                              <Clock className="h-3 w-3" />
                              {item.startTime} - {item.endTime || '10:00'}
                            </span>
                            {item.location && (
                              <span className="flex items-center gap-0.5 text-slate-500">
                                <MapPin className="h-3 w-3 text-rose-500" />
                                {item.location}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncSingle(item);
                            }}
                            className="p-1 hover:bg-white rounded text-blue-600 border border-blue-200"
                            title="Sync / Open Google Calendar"
                          >
                            <CalendarIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Plus Icon on Hover when cell is empty */}
                    {matchingAgendas.length === 0 && (
                      <div className="opacity-0 group-hover:opacity-100 text-[10px] font-bold text-slate-400 flex items-center gap-1 pt-2 pl-2 transition-all">
                        <Plus className="h-3 w-3 text-blue-500" />
                        <span>Jadwalkan jam {hourStr}</span>
                      </div>
                    )}
                  </div>

                  {/* Red Current Time Indicator Line (ClickUp Style) */}
                  {isCurrentHourRow && (
                    <div 
                      className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                      style={{
                        top: `${Math.min(Math.max((currentMinNum / 60) * 100, 10), 90)}%`
                      }}
                    >
                      {/* Current Time Badge */}
                      <div className="w-16 shrink-0 flex justify-end pr-1">
                        <span className="bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-2xs animate-pulse">
                          {currentTimeFormatted}
                        </span>
                      </div>
                      {/* Red Dot & Red Line */}
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-600 border-2 border-white shadow-xs -ml-1"></div>
                      <div className="flex-1 h-[2px] bg-rose-600 shadow-xs"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="p-4 bg-slate-50/50 space-y-3">
          {agendas.length === 0 ? (
            <div className="text-center py-8 px-4 bg-white rounded-xl border border-dashed border-slate-200">
              <CalendarIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Belum ada agenda meeting atau event</p>
              <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                Tambahkan agenda untuk langsung disinkronkan dengan Google Kalender
              </p>
              <button
                type="button"
                onClick={() => openAddModalForHour()}
                className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-2xs transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Buat Agenda Baru</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {agendas.map((item) => (
                <div
                  key={item.id}
                  className="bg-white p-3.5 rounded-xl border border-slate-200/90 hover:border-blue-300 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Left Column: Date & Details */}
                  <div className="flex items-start gap-3">
                    {/* Date Badge */}
                    <div className="shrink-0 text-center px-2.5 py-1.5 bg-blue-50 border border-blue-200/80 rounded-xl min-w-[60px]">
                      <span className="block text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                        {item.date ? new Date(item.date).toLocaleDateString('id-ID', { month: 'short' }) : 'DUE'}
                      </span>
                      <span className="block text-sm font-black text-slate-900 leading-tight">
                        {item.date ? new Date(item.date).getDate() : '--'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs font-bold text-slate-900">{item.title}</h5>
                        
                        {/* Sync Badge */}
                        {item.googleEventId ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Google Calendar Synced</span>
                          </span>
                        ) : item.googleEventLink ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <Sparkles className="h-3 w-3 text-blue-600" />
                            <span>Link Calendar Ready</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="h-3 w-3 text-slate-400" />
                            <span>Not Synced</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Clock className="h-3 w-3 text-blue-600" />
                          {item.startTime || '09:00'} - {item.endTime || '10:00'}
                        </span>

                        {item.location && (
                          <span className="flex items-center gap-1 text-slate-600 truncate max-w-[180px]">
                            <MapPin className="h-3 w-3 text-rose-500" />
                            {item.location}
                          </span>
                        )}

                        {item.attendees && item.attendees.length > 0 && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <Users className="h-3 w-3 text-amber-500" />
                            {item.attendees.length} peserta
                          </span>
                        )}
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSyncSingle(item)}
                      disabled={isSyncing === item.id}
                      className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 transition-all cursor-pointer disabled:opacity-50"
                      title="Sinkronkan atau buka di Google Kalender"
                    >
                      {isSyncing === item.id ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
                      )}
                      <span>{item.googleEventId ? 'Re-Sync Calendar' : 'Konek Google Calendar'}</span>
                    </button>

                    {item.googleEventLink && (
                      <a
                        href={item.googleEventLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 transition-all"
                        title="Buka Event di Google Kalender"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-all cursor-pointer"
                      title="Edit Agenda"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer"
                      title="Hapus Agenda"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT AGENDA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingId ? 'Edit Agenda Meeting' : 'Tambah Agenda Meeting / Calendar'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Koneksikan jadwal ke Google Kalender secara otomatis
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Judul Agenda / Meeting <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Misal: Review Progress Sprints, Meeting Klien..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Mulai
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Selesai
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Video className="h-3.5 w-3.5 text-blue-500" />
                  <span>Lokasi / Link Google Meet</span>
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Google Meet, Ruang Rapat Lt 3, Link Zoom..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium"
                />
              </div>

              {activeMembers.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-amber-500" />
                    <span>Undang Tim (Peserta Meeting)</span>
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {activeMembers.map((m) => {
                      const isChecked = selectedAttendees.includes(m.email);
                      return (
                        <label
                          key={m.email}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                            isChecked
                              ? 'bg-blue-50 border-blue-300 text-blue-800'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAttendees([...selectedAttendees, m.email]);
                              } else {
                                setSelectedAttendees(selectedAttendees.filter(e => e !== m.email));
                              }
                            }}
                            className="h-3 w-3 rounded text-blue-600"
                          />
                          <span>{m.name || m.email}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5 text-slate-500" />
                  <span>Catatan / Agenda Diskusi</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Deskripsi ringkas poin-poin yang akan dibahas..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium resize-none"
                />
              </div>

              <div className="p-3 bg-rose-50/70 border border-rose-200/80 rounded-xl text-[11px] text-rose-900 flex items-start gap-2">
                <CalendarIcon className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                <p>
                  Mengklik <strong>Simpan & Konek Google Kalender</strong> akan langsung menyinkronkan event ini ke kalender Google Workspace Anda.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200/70 transition-all"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() => handleSave(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition-all"
              >
                Simpan Lokal
              </button>

              <button
                type="button"
                onClick={() => handleSave(true)}
                disabled={isSyncing !== null}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSyncing !== null ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CalendarIcon className="h-3.5 w-3.5" />
                )}
                <span>Simpan & Konek Google Kalender</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
