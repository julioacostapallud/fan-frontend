import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, FormGroup, Input, Label, Spinner } from 'reactstrap';
import { api } from '../../api/api';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import { LobbyHeader } from '../shared/LobbyHeader';

export function NewEventPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (!name.trim()) throw new Error('El nombre es obligatorio');
      if (!startDate || !endDate) throw new Error('Indicá las fechas');
      if (startDate > endDate) {
        throw new Error('La fecha de inicio no puede ser posterior a la de fin');
      }
      const event = await api.events.create({
        name: name.trim(),
        startDate,
        endDate,
      });
      navigate(`/eventos/${event.id}`, { replace: true });
    } catch (err) {
      if (
        err instanceof NetworkError ||
        err instanceof TimeoutError ||
        err instanceof ApiError ||
        err instanceof Error
      ) {
        setError(err.message);
      } else {
        setError('No se pudo crear el evento');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="app-shell">
      <LobbyHeader />
      <div className="page-header">
        <h1 className="page-title">Nuevo evento</h1>
        <Button tag={Link} to="/" className="btn-touch btn-secondary-fan ms-auto">
          Volver a eventos
        </Button>
      </div>

      <form onSubmit={onSubmit} className="event-form">
        <FormGroup>
          <Label>Nombre</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Feria X"
            required
          />
        </FormGroup>
        <FormGroup>
          <Label>Fecha inicio</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label>Fecha fin</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </FormGroup>

        {error && <div className="error-banner">{error}</div>}

        <Button
          type="submit"
          color="primary"
          className="btn-touch btn-primary-fan"
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-2" /> Guardando…
            </>
          ) : (
            'Crear evento'
          )}
        </Button>
      </form>
    </div>
  );
}
