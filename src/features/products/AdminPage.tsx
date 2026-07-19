import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
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
import type { Product } from '../../api/types';
import { formatMoney } from '../shared/money';
import { ApiError, NetworkError, TimeoutError } from '../../api/httpClient';

export function AdminPage() {
  const [q, setQ] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [motifsProductId, setMotifsProductId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => api.products.list(),
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
    return list.filter((p) => p.name.toLowerCase().includes(query));
  }, [productsQuery.data, q]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const defaultPrice = Number(price);
      if (!name.trim()) throw new Error('El nombre es obligatorio');
      if (Number.isNaN(defaultPrice) || defaultPrice < 0) {
        throw new Error('Precio inválido');
      }
      if (editing) {
        return api.products.update(editing.id, {
          name: name.trim(),
          defaultPrice,
        });
      }
      return api.products.create({ name: name.trim(), defaultPrice });
    },
    onSuccess: async () => {
      setModalOpen(false);
      setEditing(null);
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      if (
        err instanceof NetworkError ||
        err instanceof TimeoutError ||
        err instanceof ApiError
      ) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('No se pudo guardar');
      }
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (product: Product) =>
      api.products.update(product.id, { isActive: !product.isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  function openCreate() {
    setEditing(null);
    setName('');
    setPrice('');
    setError(null);
    setModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setName(product.name);
    setPrice(String(Number(product.defaultPrice)));
    setError(null);
    setModalOpen(true);
  }

  return (
    <div className="app-shell">
      <div className="page-header">
        <Button tag={Link} to="/" color="link" className="p-0">
          ←
        </Button>
        <h1>Productos</h1>
      </div>

      <FormGroup>
        <Input
          type="search"
          placeholder="Buscar producto…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </FormGroup>

      <Button
        className="btn-touch btn-primary-fan w-100 mb-3"
        onClick={openCreate}
      >
        Nuevo producto
      </Button>

      {productsQuery.isLoading && (
        <div className="text-center py-4">
          <Spinner />
        </div>
      )}

      {filtered.map((product) => (
        <div key={product.id} className="product-block">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <strong>{product.name}</strong>
              <div className="sale-row-meta">
                {formatMoney(product.defaultPrice)}
                {!product.isActive && ' · inactivo'}
              </div>
            </div>
            <div className="d-flex flex-column gap-1 align-items-end">
              <Button color="link" className="p-0" onClick={() => openEdit(product)}>
                Editar
              </Button>
              <Button
                color="link"
                className="p-0"
                onClick={() => toggleMutation.mutate(product)}
              >
                {product.isActive ? 'Desactivar' : 'Activar'}
              </Button>
              <Button
                color="link"
                className="p-0"
                onClick={() =>
                  setMotifsProductId((id) =>
                    id === product.id ? null : product.id,
                  )
                }
              >
                Motivos
              </Button>
            </div>
          </div>
          {motifsProductId === product.id && (
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
      ))}

      <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)}>
        <ModalHeader toggle={() => setModalOpen(false)}>
          {editing ? 'Editar producto' : 'Nuevo producto'}
        </ModalHeader>
        <ModalBody>
          {error && <div className="error-banner">{error}</div>}
          <FormGroup>
            <Label className="form-label">Nombre</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormGroup>
          <FormGroup>
            <Label className="form-label">Precio predeterminado</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button
            className="btn-secondary-fan"
            onClick={() => setModalOpen(false)}
          >
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
