'use client';

import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Tooltip } from 'react-tooltip';
import { toast } from 'react-hot-toast';
import type { AvailabilityDto, AppointmentDto } from '../../../lib/api-calendar';
import { apiCreateAvailability } from '../../../lib/api-calendar';

interface CalendarWeekProps {
  availabilities: AvailabilityDto[];
  appointments: AppointmentDto[];
  onRefresh: () => void;
  token: string;
}

interface QuickAddState {
  clientX: number;
  clientY: number;
  dayDate: Date;
  hour: number;
  isBottomHalf: boolean;
}

const DAYS = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];
const DAY_LABELS_SHORT = ['pon', 'wt', 'śr', 'czw', 'pt', 'sob', 'nd'];
const START_HOUR = 0;
const END_HOUR = 24;

function pad(n: number) { return n.toString().padStart(2, '0'); }
function fmtMin(min: number) {
  if (min >= 1440) return '24:00';
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}

function formatTimeUntil(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (hours < 24) return rem > 0 ? `${hours}h ${rem}min` : `${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH > 0 ? `${days} dni ${remH}h` : `${days} dni`;
}

function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ── Quick-add popup ── */
function QuickAddMenu({
  quickAdd,
  onAdd,
  onClose,
  saving,
}: {
  quickAdd: QuickAddState;
  onAdd: (startMin: number, endMin: number) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Slight delay so the opening click doesn't immediately close it
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 50);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', handler); };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const { hour, isBottomHalf, dayDate, clientX, clientY } = quickAdd;

  // Build options
  const options: { label: string; dur: string; startMin: number; endMin: number }[] = [];
  if (!isBottomHalf) {
    const s = hour * 60;
    if (s + 60 <= 1440)  options.push({ label: `${fmtMin(s)} – ${fmtMin(s + 60)}`,  dur: '1 godz.',  startMin: s,      endMin: s + 60 });
    if (s + 30 <= 1380)  options.push({ label: `${fmtMin(s)} – ${fmtMin(s + 30)}`,  dur: '30 min',   startMin: s,      endMin: s + 30 });
    if (s + 60 <= 1440)  options.push({ label: `${fmtMin(s + 30)} – ${fmtMin(s + 60)}`, dur: '30 min', startMin: s + 30, endMin: s + 60 });
  } else {
    const s = hour * 60 + 30;
    if (s + 30 <= 1440)  options.push({ label: `${fmtMin(s)} – ${fmtMin(s + 30)}`,  dur: '30 min',   startMin: s,      endMin: s + 30 });
    if (s + 60 <= 1440)  options.push({ label: `${fmtMin(s)} – ${fmtMin(s + 60)}`,  dur: '1 godz.',  startMin: s,      endMin: s + 60 });
  }

  // Day label
  const dow = dayDate.getDay(); // 0=Sun
  const dayIdx = dow === 0 ? 6 : dow - 1;
  const dateStr = `${dayDate.getDate()}.${(dayDate.getMonth() + 1).toString().padStart(2, '0')}`;
  const timeLabel = isBottomHalf ? `${pad(hour)}:30` : `${pad(hour)}:00`;

  // Position: try to fit within viewport
  const POPUP_W = 230;
  let left = clientX - POPUP_W / 2;
  if (typeof window !== 'undefined') {
    if (left < 8) left = 8;
    if (left + POPUP_W > window.innerWidth - 8) left = window.innerWidth - POPUP_W - 8;
  }
  const top = clientY + 14;

  return (
    <div ref={popupRef} className="cal-quick-add" style={{ left, top }}>
      <div className="cal-quick-add__header">
        <span className="cal-quick-add__title">
          {DAY_LABELS_SHORT[dayIdx]} {dateStr} · {timeLabel}
        </span>
        <button className="cal-quick-add__close" onClick={onClose} aria-label="Zamknij">✕</button>
      </div>
      <p className="cal-quick-add__hint">Dodaj blok dostępności:</p>
      <div className="cal-quick-add__options">
        {options.map((opt) => (
          <button
            key={`${opt.startMin}-${opt.endMin}`}
            className="cal-quick-add__option"
            onClick={() => onAdd(opt.startMin, opt.endMin)}
            disabled={saving}
          >
            <span className="cal-quick-add__time">{opt.label}</span>
            <span className="cal-quick-add__dur">{opt.dur}</span>
          </button>
        ))}
      </div>
      {saving && <div className="cal-quick-add__saving">Dodawanie…</div>}
    </div>
  );
}

/* ── Main component ── */
export function CalendarWeek({ availabilities, appointments, onRefresh, token }: CalendarWeekProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [quickAdd, setQuickAdd] = useState<QuickAddState | null>(null);
  const [quickSaving, setQuickSaving] = useState(false);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h < END_HOUR; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  const weekStart = useMemo(() => {
    const start = getWeekStart();
    start.setDate(start.getDate() + weekOffset * 7);
    return start;
  }, [weekOffset]);

  const handleSlotClick = useCallback(
    (dayIndex: number, slotIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
      // Don't open if clicking on an existing block
      const target = e.target as HTMLElement;
      if (target.closest('.calendar-week__availability, .calendar-week__appointment')) return;

      const hour = START_HOUR + slotIdx;
      const isBottomHalf = e.nativeEvent.offsetY >= 20;

      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      dayDate.setHours(0, 0, 0, 0);

      // Reject past times
      const clickTime = new Date(dayDate);
      clickTime.setHours(hour, isBottomHalf ? 30 : 0, 0, 0);
      if (clickTime < new Date()) return;

      setQuickAdd({
        clientX: e.clientX,
        clientY: e.clientY,
        dayDate: new Date(dayDate),
        hour,
        isBottomHalf,
      });
    },
    [weekStart],
  );

  const handleQuickAdd = useCallback(
    async (startMin: number, endMin: number) => {
      if (!quickAdd) return;
      setQuickSaving(true);
      try {
        const { dayDate } = quickAdd;

        const start = new Date(dayDate);
        start.setHours(Math.floor(startMin / 60), startMin % 60, 0, 0);

        const end = new Date(dayDate);
        if (endMin >= 1440) {
          end.setDate(end.getDate() + 1);
          end.setHours(0, 0, 0, 0);
        } else {
          end.setHours(Math.floor(endMin / 60), endMin % 60, 0, 0);
        }

        await apiCreateAvailability(token, {
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
        });

        toast.success(`Dodano dostępność: ${fmtMin(startMin)} – ${fmtMin(endMin)}`);
        setQuickAdd(null);
        onRefresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Nie udało się dodać dostępności');
      } finally {
        setQuickSaving(false);
      }
    },
    [quickAdd, token, onRefresh],
  );

  const renderDayColumn = (dayIndex: number) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + dayIndex);
    const dayString = `${dayDate.getFullYear()}-${(dayDate.getMonth() + 1).toString().padStart(2, '0')}-${dayDate.getDate().toString().padStart(2, '0')}`;

    const dayAvailabilities = (availabilities || []).filter(avail => {
      const s = new Date(avail.startsAt);
      return `${s.getFullYear()}-${(s.getMonth() + 1).toString().padStart(2, '0')}-${s.getDate().toString().padStart(2, '0')}` === dayString;
    });

    const dayAppointments = (appointments || []).filter(apt => {
      const s = new Date(apt.startsAt);
      return `${s.getFullYear()}-${(s.getMonth() + 1).toString().padStart(2, '0')}-${s.getDate().toString().padStart(2, '0')}` === dayString && apt.status === 'paid';
    });

    const splitAvailabilityByAppointments = (avail: AvailabilityDto) => {
      const start = new Date(avail.startsAt);
      const end = new Date(avail.endsAt);
      const availStartMins = start.getHours() * 60 + start.getMinutes();
      const availEndMins = end.getHours() * 60 + end.getMinutes();

      const overlappingApts = dayAppointments.filter(apt => {
        const aptStart = new Date(apt.startsAt);
        const aptStartMins = aptStart.getHours() * 60 + aptStart.getMinutes();
        const aptEndMins = aptStartMins + apt.durationMinutes;
        return aptStartMins < availEndMins && aptEndMins > availStartMins;
      });

      if (overlappingApts.length === 0) {
        return [{ start: availStartMins, end: availEndMins, type: 'available' as const, appointment: null }];
      }

      const sortedApts = overlappingApts.sort((a, b) => {
        const aS = new Date(a.startsAt); const bS = new Date(b.startsAt);
        return (aS.getHours() * 60 + aS.getMinutes()) - (bS.getHours() * 60 + bS.getMinutes());
      });

      const blocks: Array<{ start: number; end: number; type: 'available' | 'busy'; appointment: AppointmentDto | null }> = [];
      let cur = availStartMins;

      for (const apt of sortedApts) {
        const aptS = new Date(apt.startsAt);
        const aptStartMins = aptS.getHours() * 60 + aptS.getMinutes();
        const aptEndMins = aptStartMins + apt.durationMinutes;
        if (cur < aptStartMins) blocks.push({ start: cur, end: aptStartMins, type: 'available', appointment: null });
        const busyS = Math.max(cur, aptStartMins);
        const busyE = Math.min(availEndMins, aptEndMins);
        if (busyS < busyE) blocks.push({ start: busyS, end: busyE, type: 'busy', appointment: apt });
        cur = Math.max(cur, aptEndMins);
      }
      if (cur < availEndMins) blocks.push({ start: cur, end: availEndMins, type: 'available', appointment: null });
      return blocks;
    };

    // Determine which hour slots are already fully covered by availability (for hover hints)
    const coveredMins = new Set<number>();
    dayAvailabilities.forEach(avail => {
      const s = new Date(avail.startsAt).getHours() * 60 + new Date(avail.startsAt).getMinutes();
      const e = new Date(avail.endsAt).getHours() * 60 + new Date(avail.endsAt).getMinutes();
      for (let m = s; m < e; m++) coveredMins.add(m);
    });

    const now = new Date();
    const todayMidnight = new Date(); todayMidnight.setHours(0,0,0,0);
    const isTodayOrPast = dayDate <= todayMidnight;

    return (
      <div key={dayIndex} className="calendar-week__day-column">
        {timeSlots.map((time, slotIdx) => {
          const hour = START_HOUR + slotIdx;

          // Check if this slot is in the past (only relevant for today or past days)
          let isPastSlot = false;
          if (isTodayOrPast) {
            const slotTime = new Date(dayDate);
            slotTime.setHours(hour, 59, 59, 0);
            isPastSlot = slotTime < now;
          }

          const isFullyCovered = coveredMins.has(hour * 60) && coveredMins.has(hour * 60 + 30);

          return (
            <div
              key={time}
              className={`calendar-week__slot${isPastSlot ? ' calendar-week__slot--past' : ''}${!isPastSlot && !isFullyCovered ? ' calendar-week__slot--addable' : ''}`}
              onClick={!isPastSlot ? (e) => handleSlotClick(dayIndex, slotIdx, e) : undefined}
              data-tooltip-id={!isPastSlot && !isFullyCovered ? 'slot-add-tooltip' : undefined}
              data-tooltip-content={!isPastSlot && !isFullyCovered ? 'Kliknij, aby dodać dostępność' : undefined}
            />
          );
        })}

        {dayAvailabilities.flatMap((avail) => {
          const blocks = splitAvailabilityByAppointments(avail);
          return blocks.map((block, idx) => {
            const top = ((block.start - START_HOUR * 60) / 60) * 40;
            const height = ((block.end - block.start) / 60) * 40;
            if (height <= 0) return null;
            const showText = (block.end - block.start) >= 15;

            if (block.type === 'available') {
              return (
                <div
                  key={`${avail.id}-avail-${idx}`}
                  className="calendar-week__availability"
                  style={{ top: `${top}px`, height: `${height}px` }}
                  title={showText ? undefined : 'Dostępny'}
                >
                  {showText && 'Dostępny'}
                </div>
              );
            } else {
              const apt = block.appointment!;
              const meetingToken = apt.meetingToken;
              if (meetingToken) {
                const aptNow = new Date();
                const meetingStart = new Date(apt.startsAt);
                const fiveMinsBefore = new Date(meetingStart.getTime() - 5 * 60 * 1000);
                const meetingEnd = new Date(meetingStart.getTime() + apt.durationMinutes * 60 * 1000);
                const isAvailable = aptNow >= fiveMinsBefore && aptNow <= meetingEnd;
                const fmtD = (d: Date) => `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()}`;
                const fmtT = (d: Date) => `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
                if (isAvailable) {
                  return (
                    <Link key={`${avail.id}-busy-${idx}`} href={`/spotkanie/${meetingToken}`}
                      className="calendar-week__appointment calendar-week__appointment--clickable"
                      style={{ top: `${top}px`, height: `${height}px` }}
                      data-tooltip-id="meeting-tooltip"
                      data-tooltip-content={`Spotkanie z ${apt.clientUsername || 'klientem'} – Kliknij aby dołączyć`}
                    >
                      {showText && 'Zajęty'}
                    </Link>
                  );
                } else if (aptNow < fiveMinsBefore) {
                  const timeUntilMins = Math.ceil((fiveMinsBefore.getTime() - aptNow.getTime()) / 60000);
                  return (
                    <div key={`${avail.id}-busy-${idx}`}
                      className="calendar-week__appointment calendar-week__appointment--locked"
                      style={{ top: `${top}px`, height: `${height}px` }}
                      data-tooltip-id="meeting-tooltip"
                      data-tooltip-html={`<div style="text-align:center"><strong>${apt.clientUsername || 'Klient'}</strong><br/>Dostępne 5 min przed<br/>${fmtD(meetingStart)}, ${fmtT(fiveMinsBefore)}<br/><span style="color:#fbbf24">⏰ Za ${formatTimeUntil(timeUntilMins)}</span></div>`}
                    >
                      {showText && '🔒 Zajęty'}
                    </div>
                  );
                } else {
                  return (
                    <div key={`${avail.id}-busy-${idx}`}
                      className="calendar-week__appointment calendar-week__appointment--ended"
                      style={{ top: `${top}px`, height: `${height}px` }}
                      data-tooltip-id="meeting-tooltip"
                      data-tooltip-content="Spotkanie zakończone"
                    >
                      {showText && 'Zakończone'}
                    </div>
                  );
                }
              } else {
                return (
                  <div key={`${avail.id}-busy-${idx}`}
                    className="calendar-week__appointment"
                    style={{ top: `${top}px`, height: `${height}px` }}
                    title={showText ? undefined : 'Zajęty'}
                  >
                    {showText && 'Zajęty'}
                  </div>
                );
              }
            }
          });
        })}
      </div>
    );
  };

  const weekEnd = useMemo(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return end;
  }, [weekStart]);

  const formatDateRange = () => {
    const s = weekStart; const e = weekEnd;
    return `${s.getDate()}.${(s.getMonth()+1).toString().padStart(2,'0')}.${s.getFullYear()} - ${e.getDate()}.${(e.getMonth()+1).toString().padStart(2,'0')}.${e.getFullYear()}`;
  };

  return (
    <>
      <div className="calendar-week">
        <div className="calendar-week__nav">
          <div className="calendar-week__nav-left">
            {weekOffset !== 0 ? (
              <button className="calendar-week__nav-btn calendar-week__nav-btn--today" onClick={() => setWeekOffset(0)}>Dziś</button>
            ) : (
              <span className="calendar-week__nav-spacer" />
            )}
          </div>
          <div className="calendar-week__nav-center">
            <button className="calendar-week__nav-btn" onClick={() => setWeekOffset(weekOffset - 1)} title="Poprzedni tydzień">←</button>
            <span className="calendar-week__nav-title">{formatDateRange()}</span>
            <button className="calendar-week__nav-btn" onClick={() => setWeekOffset(weekOffset + 1)} title="Następny tydzień">→</button>
          </div>
          <div className="calendar-week__nav-right" />
        </div>

        <div className="calendar-week__header">
          <div className="calendar-week__time-label"></div>
          {DAYS.map((day, i) => {
            const dd = new Date(weekStart);
            dd.setDate(weekStart.getDate() + i);
            return (
              <div key={i} className="calendar-week__day-label">
                <div>{day}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {dd.getDate()}.{(dd.getMonth()+1).toString().padStart(2,'0')}
                </div>
              </div>
            );
          })}
        </div>

        <div className="calendar-week__grid-wrapper">
          <div className="calendar-week__grid">
            <div className="calendar-week__time-column">
              {timeSlots.map((time) => (
                <div key={time} className="calendar-week__time-slot">{time}</div>
              ))}
            </div>
            {DAYS.map((_, i) => renderDayColumn(i))}
          </div>
        </div>

        <Tooltip id="meeting-tooltip" place="top" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: '6px', padding: '8px 12px', fontSize: '0.8125rem', lineHeight: '1.4', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: 9999, maxWidth: '250px' }} />
        <Tooltip id="slot-add-tooltip" place="top" style={{ backgroundColor: 'rgba(139,92,246,0.9)', color: '#fff', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '0.75rem', zIndex: 9998 }} />
      </div>

      {quickAdd && (
        <QuickAddMenu
          quickAdd={quickAdd}
          onAdd={handleQuickAdd}
          onClose={() => setQuickAdd(null)}
          saving={quickSaving}
        />
      )}
    </>
  );
}
