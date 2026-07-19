import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/api';
import { createIdempotencyKey, ApiError, NetworkError, TimeoutError } from '../../api/httpClient';
import type { DiscountType, Product, SaleDetail } from '../../api/types';
import { calculateLineItem, calculateSale, formatMoney } from '../shared/money';
import { formatBytes, processImageFile } from '../shared/image';
import { createSaleSchema } from './sale.schema';
import { MotifCombobox } from './MotifCombobox';
import { IconTrash } from '../shared/Icons';

interface LineDraft {
  key: string;
  productId: string;
  motifName: string;
  quantity: number;
  unitPrice: string;
  discountType: DiscountType;
  discountValue: string;
  imageBase64?: string;
  imageMimeType?: string;
  imagePreviewUrl?: string;
  imageSize?: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingSale?: SaleDetail | null;
}

function emptyLine(): LineDraft {
  return {
    key: createIdempotencyKey(),
    productId: '',
    motifName: '',
    quantity: 1,
    unitPrice: '',
    discountType: 'NONE',
    discountValue: '0',
  };
}

function linesFromSale(sale: SaleDetail): LineDraft[] {
  return sale.items.map((item) => ({
    key: item.id,
    productId: item.productId,
    motifName: item.motif.name,
    quantity: item.quantity,
    unitPrice: String(Number(item.unitPrice)),
    discountType: item.discountType,
    discountValue: String(Number(item.discountValue)),
    imageBase64: item.imageBase64 ?? undefined,
    imageMimeType: item.imageMimeType ?? undefined,
    imagePreviewUrl:
      item.imageBase64 && item.imageMimeType
        ? `data:${item.imageMimeType};base64,${item.imageBase64}`
        : undefined,
  }));
}

function lineLabel(item: LineDraft, products: Product[]): string {
  const product = products.find((p) => p.id === item.productId);
  const name = product?.name ?? 'Producto';
  return `${name} · ${item.motifName}`.trim();
}

function lineAmount(item: LineDraft): string | null {
  try {
    return calculateLineItem({
      quantity: item.quantity,
      unitPrice: item.unitPrice || 0,
      discountType: item.discountType,
      discountValue: item.discountValue || 0,
    }).lineTotal.toString();
  } catch {
    return null;
  }
}

export function NewSaleModal({ isOpen, onClose, onSaved, editingSale }: Props) {
  const isEdit = Boolean(editingSale);
  const [items, setItems] = useState<LineDraft[]>([]);
  const [draft, setDraft] = useState<LineDraft>(emptyLine());
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [generalDiscountType, setGeneralDiscountType] =
    useState<DiscountType>('NONE');
  const [generalDiscountValue, setGeneralDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyRef = useRef<string>(createIdempotencyKey());
  const fileRef = useRef<HTMLInputElement>(null);

  const productsQuery = useQuery({
    queryKey: ['products', isEdit ? 'all' : 'active'],
    queryFn: () => api.products.list({ activeOnly: !isEdit }),
    staleTime: 60_000,
    enabled: isOpen,
  });

  const products = productsQuery.data ?? [];

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSaving(false);
    setEditingKey(null);
    setDraft(emptyLine());
    if (editingSale) {
      setItems(linesFromSale(editingSale));
      setGeneralDiscountType(editingSale.generalDiscountType);
      setGeneralDiscountValue(String(Number(editingSale.generalDiscountValue)));
      setNotes(editingSale.notes ?? '');
    } else {
      idempotencyRef.current = createIdempotencyKey();
      setItems([]);
      setGeneralDiscountType('NONE');
      setGeneralDiscountValue('0');
      setNotes('');
    }
  }, [isOpen, editingSale]);

  const totals = useMemo(() => {
    try {
      if (!items.length) return null;
      return calculateSale({
        items: items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unitPrice || 0,
          discountType: i.discountType,
          discountValue: i.discountValue || 0,
        })),
        generalDiscountType,
        generalDiscountValue: generalDiscountValue || 0,
      });
    } catch {
      return null;
    }
  }, [items, generalDiscountType, generalDiscountValue]);

  function patchDraft(patch: Partial<LineDraft>) {
    setDraft((prev) => ({ ...prev, ...patch }));
  }

  function selectProduct(product: Product) {
    patchDraft({
      productId: product.id,
      unitPrice: String(Number(product.defaultPrice)),
    });
  }

  function validateDraft(): string | null {
    if (!draft.productId) return 'Seleccioná un producto';
    if (!draft.motifName.trim()) return 'Indicá el motivo o diseño';
    if (draft.quantity <= 0) return 'La cantidad debe ser mayor que cero';
    if (draft.unitPrice === '' || Number(draft.unitPrice) < 0) {
      return 'El precio unitario no puede ser negativo';
    }
    try {
      calculateLineItem({
        quantity: draft.quantity,
        unitPrice: draft.unitPrice,
        discountType: draft.discountType,
        discountValue: draft.discountValue || 0,
      });
    } catch (err) {
      return err instanceof Error ? err.message : 'Revisá el descuento';
    }
    return null;
  }

  function addOrUpdateArticle() {
    const msg = validateDraft();
    if (msg) {
      setError(msg);
      return;
    }
    setError(null);
    const next = { ...draft, motifName: draft.motifName.trim() };
    if (editingKey) {
      setItems((prev) => prev.map((i) => (i.key === editingKey ? next : i)));
    } else {
      setItems((prev) => [...prev, next]);
    }
    setDraft(emptyLine());
    setEditingKey(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  function editFromList(item: LineDraft) {
    setDraft({ ...item });
    setEditingKey(item.key);
    setError(null);
  }

  function removeFromList(key: string) {
    setItems((prev) => prev.filter((i) => i.key !== key));
    if (editingKey === key) {
      setDraft(emptyLine());
      setEditingKey(null);
    }
  }

  async function onImageSelected(file: File | undefined) {
    if (!file) return;
    try {
      const processed = await processImageFile(file);
      patchDraft({
        imageBase64: processed.base64,
        imageMimeType: processed.mimeType,
        imagePreviewUrl: `data:${processed.mimeType};base64,${processed.base64}`,
        imageSize: processed.byteSize,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la imagen');
    }
  }

  async function handleSave() {
    setError(null);
    if (!items.length) {
      setError('Agregá al menos un artículo');
      return;
    }

    const parsed = createSaleSchema.safeParse({
      items: items.map((i) => ({
        productId: i.productId,
        motifName: i.motifName,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        discountType: i.discountType,
        discountValue: Number(i.discountValue || 0),
      })),
      generalDiscountType,
      generalDiscountValue: Number(generalDiscountValue || 0),
      notes: notes.trim() || undefined,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Revisá los datos de la venta');
      return;
    }

    try {
      calculateSale({
        items: parsed.data.items.map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountType: i.discountType,
          discountValue: i.discountValue,
        })),
        generalDiscountType: parsed.data.generalDiscountType,
        generalDiscountValue: parsed.data.generalDiscountValue,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Revisá los descuentos');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        items: items.map((i) => ({
          productId: i.productId,
          motifName: i.motifName.trim(),
          quantity: i.quantity,
          unitPrice: Number(i.unitPrice),
          discountType: i.discountType,
          discountValue: Number(i.discountValue || 0),
          imageBase64: i.imageBase64,
          imageMimeType: i.imageMimeType,
        })),
        generalDiscountType: parsed.data.generalDiscountType,
        generalDiscountValue: parsed.data.generalDiscountValue,
        notes: parsed.data.notes,
      };

      if (isEdit && editingSale) {
        await api.sales.update(editingSale.id, payload);
      } else {
        await api.sales.create(payload, idempotencyRef.current);
      }
      onSaved();
    } catch (err) {
      if (
        err instanceof NetworkError ||
        err instanceof TimeoutError ||
        err instanceof ApiError
      ) {
        setError(err.message);
      } else {
        setError(isEdit ? 'No se pudo actualizar la venta' : 'No se pudo guardar la venta');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      toggle={onClose}
      fullscreen="sm"
      className="fullscreen-modal"
      scrollable
    >
      <ModalHeader toggle={onClose}>{isEdit ? 'Editar venta' : 'Nueva venta'}</ModalHeader>
      <ModalBody>
        {error && <div className="error-banner">{error}</div>}

        <div className="sale-compose">
          <div className="form-row-2">
            <FormGroup className="mb-2">
              <Label className="form-label">Producto</Label>
              <Input
                type="select"
                value={draft.productId}
                onChange={(e) => {
                  const product = products.find((p) => p.id === e.target.value);
                  if (product) selectProduct(product);
                  else patchDraft({ productId: '', unitPrice: '' });
                }}
              >
                <option value="">Seleccionar…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Input>
            </FormGroup>
            <FormGroup className="mb-2">
              <Label className="form-label">Motivo / diseño</Label>
              <MotifCombobox
                productId={draft.productId}
                value={draft.motifName}
                onChange={(motifName) => patchDraft({ motifName })}
              />
            </FormGroup>
          </div>

          <div className="form-row-3">
            <FormGroup className="mb-2">
              <Label className="form-label">P. unitario</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={draft.unitPrice}
                onChange={(e) => patchDraft({ unitPrice: e.target.value })}
              />
            </FormGroup>
            <FormGroup className="mb-2">
              <Label className="form-label">Cantidad</Label>
              <div className="qty-control qty-control-compact">
                <Button
                  className="btn-secondary-fan"
                  onClick={() =>
                    patchDraft({ quantity: Math.max(1, draft.quantity - 1) })
                  }
                >
                  −
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={draft.quantity}
                  onChange={(e) =>
                    patchDraft({
                      quantity: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                  className="text-center"
                />
                <Button
                  className="btn-secondary-fan"
                  onClick={() => patchDraft({ quantity: draft.quantity + 1 })}
                >
                  +
                </Button>
              </div>
            </FormGroup>
            <FormGroup className="mb-2">
              <Label className="form-label">Desc. (sobre P.U.)</Label>
              <div className="discount-inline">
                <Input
                  type="select"
                  value={draft.discountType}
                  onChange={(e) =>
                    patchDraft({
                      discountType: e.target.value as DiscountType,
                      discountValue:
                        e.target.value === 'NONE' ? '0' : draft.discountValue,
                    })
                  }
                >
                  <option value="NONE">No</option>
                  <option value="FIXED">$</option>
                  <option value="PERCENTAGE">%</option>
                </Input>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={draft.discountType === 'PERCENTAGE' ? 100 : undefined}
                  disabled={draft.discountType === 'NONE'}
                  value={draft.discountType === 'NONE' ? '' : draft.discountValue}
                  placeholder="0"
                  onChange={(e) => patchDraft({ discountValue: e.target.value })}
                />
              </div>
            </FormGroup>
          </div>

          <FormGroup className="mb-2">
            <Label className="form-label">Foto (opcional)</Label>
            <Input
              innerRef={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => onImageSelected(e.target.files?.[0])}
            />
            {draft.imagePreviewUrl && (
              <div className="d-flex align-items-center gap-2 mt-1">
                <img
                  src={draft.imagePreviewUrl}
                  alt="Vista previa"
                  className="image-preview-mini"
                />
                <small className="text-muted">
                  ~{formatBytes(draft.imageSize ?? 0)}
                </small>
                <Button
                  color="link"
                  className="text-danger p-0"
                  onClick={() => {
                    patchDraft({
                      imageBase64: undefined,
                      imageMimeType: undefined,
                      imagePreviewUrl: undefined,
                      imageSize: undefined,
                    });
                    if (fileRef.current) fileRef.current.value = '';
                  }}
                >
                  Quitar
                </Button>
              </div>
            )}
          </FormGroup>

          <div className="summary-compact mb-2">
            {totals
              ? `Subtotal ${formatMoney(totals.subtotal)} · Desc. ${formatMoney(
                  totals.itemDiscountsTotal.plus(totals.generalDiscountAmount),
                )} · Total ${formatMoney(totals.total)}`
              : 'Sin artículos aún'}
          </div>

          <div className="form-row-2 mb-2">
            <FormGroup className="mb-0">
              <Label className="form-label">Desc. general</Label>
              <Input
                type="select"
                value={generalDiscountType}
                onChange={(e) =>
                  setGeneralDiscountType(e.target.value as DiscountType)
                }
              >
                <option value="NONE">Sin descuento</option>
                <option value="FIXED">Fijo $</option>
                <option value="PERCENTAGE">Porcentual %</option>
              </Input>
            </FormGroup>
            <FormGroup className="mb-0">
              <Label className="form-label">Valor</Label>
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                disabled={generalDiscountType === 'NONE'}
                value={
                  generalDiscountType === 'NONE' ? '' : generalDiscountValue
                }
                onChange={(e) => setGeneralDiscountValue(e.target.value)}
              />
            </FormGroup>
          </div>

          <Button
            className="btn-touch btn-secondary-fan w-100 mb-3"
            onClick={addOrUpdateArticle}
          >
            {editingKey ? 'Actualizar artículo' : 'Agregar artículo'}
          </Button>

          <div className="cart-list mb-2">
            {items.length === 0 && (
              <div className="cart-empty">Todavía no agregaste artículos.</div>
            )}
            {items.map((item) => {
              const amount = lineAmount(item);
              return (
                <div key={item.key} className="cart-row">
                  <button
                    type="button"
                    className="cart-row-main"
                    onClick={() => editFromList(item)}
                  >
                    <span className="cart-name">
                      {lineLabel(item, products)}
                    </span>
                    <span className="cart-meta">
                      {item.quantity} u. · {amount ? formatMoney(amount) : '—'}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    aria-label="Quitar artículo"
                    onClick={() => removeFromList(item.key)}
                  >
                    <IconTrash size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          <FormGroup className="mb-0">
            <Label className="form-label">Notas</Label>
            <Input
              type="textarea"
              rows={1}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </FormGroup>
        </div>
      </ModalBody>
      <ModalFooter className="d-flex gap-2">
        <Button
          className="btn-touch btn-secondary-fan flex-fill"
          onClick={onClose}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button
          className="btn-touch btn-primary-fan flex-fill"
          onClick={handleSave}
          disabled={saving || items.length === 0}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-2" /> Guardando…
            </>
          ) : (
            'Guardar'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
