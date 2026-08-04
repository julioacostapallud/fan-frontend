import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
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
import type { EventProduct, ImportableProduct } from '../../api/types';
import { formatMoney } from '../shared/money';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import { AppHeader } from '../shared/AppHeader';

type Mode = 'create' | 'import' | 'edit';

export function AdminPage() {
  const { eventId = '' } = useParams();
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('create');
  const [editing, setEditing] = useState<EventProduct | null>(null);
  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [price, setPrice] = useState('');
  const [importProductId, setImportProductId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [motifsProductId, setMotifsProductId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['event-products', eventId],
    queryFn: () => api.events.products.list(eventId),
    enabled: Boolean(eventId),
  });

  const importableQuery = useQuery({
    queryKey: ['event-products-importable', eventId],
    queryFn: () => api.events.products.importable(eventId),
    enabled: Boolean(eventId) && modalOpen && mode === 'import',
  });

  const motifsQuery = useQuery({
    queryKey: ['admin-motifs', motifsProductId],
    queryFn: () => api.products.motifs(motifsProductId!),
    enabled: Boolean(motifsProductId),
  });

  const filtered = useMemo(() => {
    const list = productsQuery.data ?? [];
    const query = q.trim().toLowerCase();
    if (!query) return list;
    return list.filter((p) => p.product.name.toLowerCase().includes(query));
  }, [productsQuery.data, q]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const costN = Number(cost);
      const priceN = Number(price);
      if (Number.isNaN(costN) || costN < 0) throw new Error('Costo inválido');
      if (Number.isNaN(priceN) || priceN < 0) throw new Error('Precio inválido');

      if (mode === 'edit' && editing) {
        return api.events.products.update(eventId, editing.id, {
          cost: costN,
          price: priceN,
        });
      }
      if (mode === 'import') {
        if (!importProductId) throw new Error('Elegí un producto para importar');
        return api.events.products.upsert(eventId, {
          productId: importProductId,
          cost: costN,
          price: priceN,
        });
      }
      if (!name.trim()) throw new Error('El nombre es obligatorio');
      return api.events.products.upsert(eventId, {
        name: name.trim(),
        cost: costN,
        price: priceN,
      });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['event-products', eventId] });
      await queryClient.invalidateQueries({
        queryKey: ['event-products-importable', eventId],
      });
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

  const toggleMutation = useMutation({
    mutationFn: (row: EventProduct) =>
      api.products.update(row.productId, { isActive: !row.product.isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['event-products', eventId] });
    },
  });

  function openCreate() {
    setMode('create');
    setEditing(null);
    setName('');
    setCost('');
    setPrice('');
    setImportProductId('');
    setError(null);
    setModalOpen(true);
  }

  function openImport() {
    setMode('import');
    setEditing(null);
    setName('');
    setCost('');
    setPrice('');
    setImportProductId('');
    setError(null);
    setModalOpen(true);
  }

  function openEdit(row: EventProduct) {
    setMode('edit');
    setEditing(row);
    setName(row.product.name);
    setCost(String(Number(row.cost)));
    setPrice(String(Number(row.price)));
    setError(null);
    setModalOpen(true);
  }

  function onPickImport(row: ImportableProduct) {
    setImportProductId(row.productId);
    setCost(String(Number(row.cost)));
    setPrice(String(Number(row.price)));
  }

  const margin =
    Number(price) > 0 && !Number.isNaN(Number(price)) && !Number.isNaN(Number(cost))
      ? ((Number(price) - Number(cost)) / Number(price)) * 100
      : null;

  return (
    <div className="app-shell">
      <AppHeader eventId={eventId} />

      <FormGroup>
        <Input
          type="search"
          placeholder="Buscar producto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </FormGroup>

      <div className="d-flex gap-2 mb-3">
        <Button className="btn-touch btn-primary-fan flex-grow-1" onClick={openCreate}>
          Nuevo producto
        </Button>
        <Button className="btn-touch btn-secondary-fan flex-grow-1" onClick={openImport}>
          Importar
        </Button>
      </div>

      {productsQuery.isLoading && (
        <div className="text-center py-4">
          <Spinner />
        </div>
      )}

      {filtered.map((row) => {
        const yieldPct =
          Number(row.price) > 0
            ? ((Number(row.price) - Number(row.cost)) / Number(row.price)) * 100
            : 0;
        return (
          <div key={row.id} className="product-block">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <strong>{row.product.name}</strong>
                <div className="sale-row-meta">
                  Costo {formatMoney(row.cost)} · Precio {formatMoney(row.price)} ·{' '}
                  {yieldPct.toFixed(0)}%
                  {!row.product.isActive && ' · inactivo'}
                </div>
              </div>
              <div className="d-flex flex-column gap-1 align-items-end">
                <Button color="link" className="p-0" onClick={() => openEdit(row)}>
                  Editar
                </Button>
                <Button
                  color="link"
                  className="p-0"
                  onClick={() => toggleMutation.mutate(row)}
                >
                  {row.product.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button
                  color="link"
                  className="p-0"
                  onClick={() =>
                    setMotifsProductId((id) =>
                      id === row.productId ? null : row.productId,
                    )
                  }
                >
                  Motivos
                </Button>
              </div>
            </div>
            {motifsProductId === row.productId && (
              <div className="mt-2">
                {motifsQuery.isLoading && <Spinner size="sm" />}
                {motifsQuery.data && motifsQuery.data.length === 0 && (
                  <small className="text-muted">Sin motivos aún.</small>
                )}
                <ul className="mb-0 ps-3">
                  {motifsQuery.data?.map((m) => (
                    <li key={m.id}>{m.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}

      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)}>
        <ModalHeader toggle={() => setModalOpen(false)}>
          {mode === 'edit'
            ? 'Editar producto del evento'
            : mode === 'import'
              ? 'Importar producto'
              : 'Nuevo producto'}
        </ModalHeader>
        <ModalBody>
          {error && <div className="error-banner">{error}</div>}

          {mode === 'import' && (
            <FormGroup>
              <Label className="form-label">Producto de otro evento</Label>
              {importableQuery.isLoading && <Spinner size="sm" />}
              <Input
                type="select"
                value={importProductId}
                onChange={(e) => {
                  const row = importableQuery.data?.find(
                    (p) => p.productId === e.target.value,
                  );
                  if (row) onPickImport(row);
                  else setImportProductId(e.target.value);
                }}
              >
                <option value="">Elegir…</option>
                {importableQuery.data?.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName} ({p.sourceEventName})
                  </option>
                ))}
              </Input>
              {importableQuery.data?.length === 0 && (
                <small className="text-muted">
                  No hay productos en otros eventos para importar.
                </small>
              )}
            </FormGroup>
          )}

          {mode === 'create' && (
            <FormGroup>
              <Label className="form-label">Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </FormGroup>
          )}

          {mode === 'edit' && (
            <FormGroup>
              <Label className="form-label">Nombre</Label>
              <Input value={name} disabled />
            </FormGroup>
          )}

          <FormGroup>
            <Label className="form-label">Costo</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
            />
          </FormGroup>
          <FormGroup>
            <Label className="form-label">Precio de venta</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </FormGroup>
          {margin != null && Number.isFinite(margin) && (
            <p className="text-muted small mb-0">
              Rendimiento estimado: {margin.toFixed(1)}%
            </p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button className="btn-secondary-fan" onClick={() => setModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            className="btn-primary-fan"
            disabled={saveMutation.isPending}
            onClick={() => {
              setError(null);
              saveMutation.mutate();
            }}
          >
            {saveMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
