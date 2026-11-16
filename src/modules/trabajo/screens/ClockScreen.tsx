import { useState } from 'react';
import { LogIn, LogOut, Plus } from 'lucide-react';
import { Screen } from '@/core/components/Screen';
import { Button } from '@/core/components/Button';
import { ConfirmSheet } from '@/core/components/Sheet';
import { formatDateLong, todayKey } from '@/core/lib/format';
import { trabajoRepo, useOpenShift, useShifts } from '../data/hooks';
import type { Shift } from '../data/types';
import { ShiftList } from '../components/ShiftList';
import { ShiftSheet } from '../components/ShiftSheet';
import { TrabajoTabs } from '../components/TrabajoTabs';
import { addDays, formatHM, mondayOf, timeOf, totalMinutes } from '../lib/time';

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

/** Fichar entrada / salida y ver las horas de hoy y de la semana. */
export function ClockScreen() {
  const today = todayKey();
  const monday = mondayOf(today);
  const open = useOpenShift();
  const todayShifts = useShifts(today, today);
  const weekShifts = useShifts(monday, addDays(monday, 6));

  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [deleting, setDeleting] = useState<Shift | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  if (open === undefined || !todayShifts || !weekShifts) return null;

  const clockIn = async () => {
    try {
      const s = await trabajoRepo.clockIn();
      setMessage({ kind: 'ok', text: `Entrada fichada a las ${timeOf(s.startAt)}.` });
    } catch (e) {
      setMessage({ kind: 'error', text: e instanceof Error ? e.message : String(e) });
    }
  };

  const clockOut = async () => {
    if (!open) return;
    await trabajoRepo.clockOut(open.id);
    setMessage({ kind: 'ok', text: `Salida fichada a las ${timeOf(new Date().toISOString())}. Puedes corregirla tocando el registro.` });
  };

  return (
    <Screen
      title="Trabajo"
      subtitle="Registro de horas"
      backTo="/"
      footer={
        <div className="space-y-3">
          {open ? (
            <Button key="out" size="lg" block variant="warning" onClick={clockOut}>
              <LogOut className="size-5" /> Fichar salida
            </Button>
          ) : (
            <Button key="in" size="lg" block onClick={clockIn}>
              <LogIn className="size-5" /> Fichar entrada
            </Button>
          )}
          <TrabajoTabs />
        </div>
      }
    >
      <section
        className={`mb-4 rounded-2xl border p-5 text-center ${open ? 'border-accent/50 bg-accent/10' : 'border-border/60 bg-surface'}`}
      >
        {open ? (
          <>
            <p className="text-sm font-medium text-accent">Estás dentro desde las</p>
            <p className="mt-1 text-5xl font-bold tabular-nums">{timeOf(open.startAt)}</p>
            {open.date !== today && (
              <p className="mt-1 text-sm text-amber-300">Entraste el {formatDateLong(open.date)}. ¿Olvidaste fichar la salida?</p>
            )}
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-muted">Estás fuera</p>
            <p className="mt-1 text-lg font-semibold">Ficha la entrada al llegar</p>
          </>
        )}
      </section>

      {message && (
        <p
          role="status"
          className={`mb-4 rounded-xl px-3 py-2 text-sm ${message.kind === 'ok' ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'}`}
        >
          {message.text}
        </p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-2">
        <Tile label="Hoy" value={formatHM(totalMinutes(todayShifts))} />
        <Tile label="Esta semana" value={formatHM(totalMinutes(weekShifts))} />
      </div>

      <div className="mb-1 flex items-center justify-between pl-1">
        <h2 className="text-sm font-semibold tracking-wide text-muted uppercase">Hoy</h2>
        <Button variant="ghost" onClick={() => setAdding(true)} className="-mr-2 text-accent">
          <Plus className="size-4" /> Añadir horas
        </Button>
      </div>
      {todayShifts.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted">
          Todavía no hay registros hoy.
        </p>
      ) : (
        <ShiftList shifts={todayShifts} onSelect={setEditing} />
      )}

      <ShiftSheet
        open={adding}
        onSubmit={(input) => trabajoRepo.addShift(input).then(() => undefined)}
        onClose={() => setAdding(false)}
      />
      <ShiftSheet
        open={editing !== null}
        shift={editing}
        onSubmit={(input) => trabajoRepo.updateShift(editing!.id, input)}
        onDelete={() => {
          setDeleting(editing);
          setEditing(null);
        }}
        onClose={() => setEditing(null)}
      />
      <ConfirmSheet
        open={deleting !== null}
        title="¿Borrar este registro?"
        message="Se quitarán estas horas. No se puede deshacer."
        confirmLabel="Borrar"
        danger
        onConfirm={() => deleting && trabajoRepo.deleteShift(deleting.id)}
        onClose={() => setDeleting(null)}
      />
    </Screen>
  );
}
