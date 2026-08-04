import { FormEvent, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Button,
  FormGroup,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from 'reactstrap';
import { api } from '../../api/api';
import type { EventExpense } from '../../api/types';
import { formatMoney } from '../shared/money';
import { formatIsoDayLabel } from '../shared/dates';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import { AppHeader } from '../shared/AppHeader';
import { ConfirmDeleteModal } from '../shared/ConfirmDeleteModal';

export function EventExpensesPage() {
  const { eventId = '' } = useParams();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EventExpense | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<EventExpense | null>(null);
  const [busyDelete, setBusyDelete] = useState(false);

  const eventQuery = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => api.events.get(eventId),
    enabled: Boolean(eventId),
  });

  const expensesQuery = useQuery({
    queryKey: ['event-expenses', eventId],
    queryFn: () => api.events.expenses.list(eventId),
    enabled: Boolean(eventId),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!description.trim()) throw new Error('La descripción es obligatoria');
      if (Number.isNaN(value) || value < 0) throw new Error('Monto inválido');
      if (!date) throw new Error('Indicá la fecha');
      if (editing) {
        return api.events.expenses.update(eventId, editing.id, {
          amount: value,
          description: description.trim(),
          date,
        });
      }
      return api.events.expenses.create(eventId, {
        amount: value,
        description: description.trim(),
        date,
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['event-expenses', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['event-economics', eventId] });
    },
    onError: (err) => {
      if (
        err instanceof NetworkError ||
        err instanceof TimeoutError ||
        err instanceof ApiError ||
        err instanceof Error
      ) {
        setError(err.message);
      } else {
        setError('No se pudo guardar');
      }
    },
  });

  function openCreate() {
    setEditing(null);
    setAmount('');
    setDescription('');
    setDate(eventQuery.data?.startDate ?? '');
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: EventExpense) {
    setEditing(row);
    setAmount(String(Number(row.amount)));
    setDescription(row.description);
    setDate(row.date);
    setError(null);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyDelete(true);
    try {
      await api.events.expenses.remove(eventId, deleting.id);
      setDeleting(null);
      await queryClient.invalidateQueries({ queryKey: ['event-expenses', eventId] });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      await queryClient.invalidateQueries({ queryKey: ['event-economics', eventId] });
    } finally {
      setBusyDelete(false);
    }
  }

  const expenses = expensesQuery.data ?? [];
  const total = expenses.reduce((acc, e) => acc + Number(e.amount), 0);

  return (
    <div className="app-shell">
      <AppHeader eventId={eventId} />

      <div className="page-header">
        <h1 className="page-title">Gastos</h1>
        <Button
          color="primary"
          className="btn-touch btn-primary-fan ms-auto"
          onClick={openCreate}
        >
          Agregar gasto
        </Button>
      </div>

      <p className="text-muted mb-3">
        {eventQuery.data?.name ?? 'Evento'} · Total {formatMoney(total)}
      </p>

      {expensesQuery.isLoading && <Spinner />}

      {!expensesQuery.isLoading && expenses.length === 0 && (
        <div className="empty-state">
          <p className="mb-0">No hay gastos cargados en este evento.</p>
        </div>
      )}

      <div className="admin-list">
        {expenses.map((row) => (
          <div key={row.id} className="admin-row">
            <div>
              <strong>{row.description}</strong>
              <div className="text-muted small">{formatIsoDayLabel(row.date)}</div>
            </div>
            <div className="admin-row-actions">
              <strong>{formatMoney(Number(row.amount))}</strong>
              <Button size="sm" className="btn-ghost" onClick={() => openEdit(row)}>
                Editar
              </Button>
              <Button size="sm" className="btn-ghost" onClick={() => setDeleting(row)}>
                Borrar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)}>
        <ModalHeader toggle={() => setModalOpen(false)}>
          {editing ? 'Editar gasto' : 'Nuevo gasto'}
        </ModalHeader>
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            saveMutation.mutate();
          }}
        >
          <ModalBody>
            <FormGroup>
              <Label>Descripción</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Monto</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </FormGroup>
            <FormGroup>
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </FormGroup>
            {error && <div className="error-banner">{error}</div>}
          </ModalBody>
          <ModalFooter>
            <Button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              color="primary"
              className="btn-primary-fan"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? <Spinner size="sm" /> : 'Guardar'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      <ConfirmDeleteModal
        isOpen={Boolean(deleting)}
        busy={busyDelete}
        onCancel={() => setDeleting(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
