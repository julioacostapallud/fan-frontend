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
import type { DiscountType, Product } from '../../api/types';
import { calculateSale, formatMoney } from '../shared/money';
import { formatBytes, processImageFile } from '../shared/image';
import { createSaleSchema } from './sale.schema';

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
  onCreated: () => void;
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

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function NewSaleModal({ isOpen, onClose, onCreated }: Props) {
  const [items, setItems] = useState<LineDraft[]>([emptyLine()]);
  const [generalDiscountType, setGeneralDiscountType] =
    useState<DiscountType>('NONE');
  const [generalDiscountValue, setGeneralDiscountValue] = useState('0');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idempotencyRef = useRef<string>(createIdempotencyKey());

  const productsQuery = useQuery({
    queryKey: ['products', 'active'],
    queryFn: () => api.products.list({ activeOnly: true }),
    staleTime: 60_000,
    enabled: isOpen,
  });

  const products = productsQuery.data ?? [];

  useEffect(() => {
    if (isOpen) {
      idempotencyRef.current = createIdempotencyKey();
      setItems([emptyLine()]);
      setGeneralDiscountType('NONE');
      setGeneralDiscountValue('0');
      setNotes('');
      setError(null);
      setSaving(false);
    }
  }, [isOpen]);

  const totals = useMemo(() => {
    try {
      const calcItems = items
        .filter((i) => i.productId && i.motifName.trim() && i.quantity > 0)
        .map((i) => ({
          quantity: i.quantity,
          unitPrice: i.unitPrice || 0,
          discountType: i.discountType,
          discountValue: i.discountValue || 0,
        }));
      if (!calcItems.length) return null;
      return calculateSale({
        items: calcItems,
        generalDiscountType,
        generalDiscountValue: generalDiscountValue || 0,
      });
    } catch {
      return null;
    }
  }, [items, generalDiscountType, generalDiscountValue]);

  function updateItem(key: string, patch: Partial<LineDraft>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  }

  function selectProduct(key: string, product: Product) {
    updateItem(key, {
      productId: product.id,
      unitPrice: String(Number(product.defaultPrice)),
    });
  }

  async function onImageSelected(key: string, file: File | undefined) {
    if (!file) return;
    try {
      const processed = await processImageFile(file);
      const previewUrl = `data:${processed.mimeType};base64,${processed.base64}`;
      updateItem(key, {
        imageBase64: processed.base64,
        imageMimeType: processed.mimeType,
        imagePreviewUrl: previewUrl,
        imageSize: processed.byteSize,
      });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar la imagen');
    }
  }

  async function handleSave() {
    setError(null);

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
      await api.sales.create(
        {
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
        },
        idempotencyRef.current,
      );
      onCreated();
    } catch (err) {
      if (
        err instanceof NetworkError ||
        err instanceof TimeoutError ||
        err instanceof ApiError
      ) {
        setError(err.message);
      } else {
        setError('No se pudo guardar la venta');
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
      <ModalHeader toggle={onClose}>Nueva venta</ModalHeader>
      <ModalBody>
        {error && <div className="error-banner">{error}</div>}

        {items.map((item, index) => (
          <SaleItemEditor
            key={item.key}
            index={index}
            item={item}
            products={products}
            allProducts={products}
            canRemove={items.length > 1}
            onChange={(patch) => updateItem(item.key, patch)}
            onSelectProduct={(p) => selectProduct(item.key, p)}
            onImage={(file) => onImageSelected(item.key, file)}
            onRemove={() =>
              setItems((prev) => prev.filter((i) => i.key !== item.key))
            }
          />
        ))}

        <Button
          className="btn-touch btn-secondary-fan w-100 mb-3"
          onClick={() => setItems((prev) => [...prev, emptyLine()])}
        >
          Agregar otro artículo
        </Button>

        <FormGroup>
          <Label className="form-label">Descuento general</Label>
          <Input
            type="select"
            value={generalDiscountType}
            onChange={(e) =>
              setGeneralDiscountType(e.target.value as DiscountType)
            }
          >
            <option value="NONE">Sin descuento</option>
            <option value="FIXED">Fijo en pesos</option>
            <option value="PERCENTAGE">Porcentual</option>
          </Input>
        </FormGroup>
        {generalDiscountType !== 'NONE' && (
          <FormGroup>
            <Label className="form-label">
              {generalDiscountType === 'PERCENTAGE' ? 'Porcentaje' : 'Monto'}
            </Label>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              max={generalDiscountType === 'PERCENTAGE' ? 100 : undefined}
              value={generalDiscountValue}
              onChange={(e) => setGeneralDiscountValue(e.target.value)}
            />
          </FormGroup>
        )}

        <FormGroup>
          <Label className="form-label">Notas (opcional)</Label>
          <Input
            type="textarea"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
        </FormGroup>

        <div className="summary-box">
          <div className="row-line">
            <span>Subtotal</span>
            <span>{totals ? formatMoney(totals.subtotal) : '—'}</span>
          </div>
          <div className="row-line">
            <span>Descuentos por artículos</span>
            <span>
              {totals ? formatMoney(totals.itemDiscountsTotal) : '—'}
            </span>
          </div>
          <div className="row-line">
            <span>Descuento general</span>
            <span>
              {totals ? formatMoney(totals.generalDiscountAmount) : '—'}
            </span>
          </div>
          <div className="total-line">
            <span>Total final</span>
            <span>{totals ? formatMoney(totals.total) : '—'}</span>
          </div>
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
          disabled={saving}
        >
          {saving ? (
            <>
              <Spinner size="sm" className="me-2" /> Guardando…
            </>
          ) : (
            'Guardar venta'
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
}

interface EditorProps {
  index: number;
  item: LineDraft;
  products: Product[];
  allProducts: Product[];
  canRemove: boolean;
  onChange: (patch: Partial<LineDraft>) => void;
  onSelectProduct: (p: Product) => void;
  onImage: (file: File | undefined) => void;
  onRemove: () => void;
}

function SaleItemEditor({
  index,
  item,
  products,
  allProducts,
  canRemove,
  onChange,
  onSelectProduct,
  onImage,
  onRemove,
}: EditorProps) {
  const [motifQuery, setMotifQuery] = useState(item.motifName);
  const debouncedMotif = useDebounced(motifQuery, 250);
  const fileRef = useRef<HTMLInputElement>(null);

  const productMotifsQuery = useQuery({
    queryKey: ['product-motifs', item.productId],
    queryFn: () => api.products.motifs(item.productId),
    enabled: Boolean(item.productId),
    staleTime: 60_000,
  });

  const motifSearchQuery = useQuery({
    queryKey: ['motifs-search', debouncedMotif],
    queryFn: () => api.motifs.search(debouncedMotif),
    enabled: debouncedMotif.trim().length >= 1,
    staleTime: 30_000,
  });

  const motifOptions = useMemo(() => {
    const fromProduct = productMotifsQuery.data ?? [];
    const fromSearch = motifSearchQuery.data ?? [];
    const map = new Map<string, string>();
    for (const m of [...fromProduct, ...fromSearch]) {
      map.set(m.normalizedName, m.name);
    }
    return [...map.values()];
  }, [productMotifsQuery.data, motifSearchQuery.data]);

  const lineTotal = useMemo(() => {
    try {
      if (!item.unitPrice) return null;
      return calculateSale({
        items: [
          {
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountType: item.discountType,
            discountValue: item.discountValue || 0,
          },
        ],
        generalDiscountType: 'NONE',
        generalDiscountValue: 0,
      }).items[0];
    } catch {
      return null;
    }
  }, [item]);

  const selectedProduct = allProducts.find((p) => p.id === item.productId);

  return (
    <div className="item-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <strong>Artículo {index + 1}</strong>
        {canRemove && (
          <Button color="link" className="text-danger p-0" onClick={onRemove}>
            Eliminar
          </Button>
        )}
      </div>

      <FormGroup>
        <Label className="form-label">Producto</Label>
        <Input
          type="select"
          value={item.productId}
          onChange={(e) => {
            const product = allProducts.find((p) => p.id === e.target.value);
            if (product) onSelectProduct(product);
            else onChange({ productId: '' });
          }}
        >
          <option value="">Seleccionar…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatMoney(p.defaultPrice)}
            </option>
          ))}
        </Input>
        {selectedProduct && (
          <small className="text-muted">
            Precio catálogo: {formatMoney(selectedProduct.defaultPrice)} (podés
            cambiarlo solo para esta venta)
          </small>
        )}
      </FormGroup>

      <FormGroup>
        <Label className="form-label">Motivo / diseño</Label>
        <Input
          type="text"
          list={`motifs-${item.key}`}
          value={motifQuery}
          placeholder="Ej: Nirvana, Airbag…"
          onChange={(e) => {
            setMotifQuery(e.target.value);
            onChange({ motifName: e.target.value });
          }}
        />
        <datalist id={`motifs-${item.key}`}>
          {motifOptions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </FormGroup>

      <FormGroup>
        <Label className="form-label">Cantidad</Label>
        <div className="qty-control">
          <Button
            className="btn-secondary-fan"
            onClick={() =>
              onChange({ quantity: Math.max(1, item.quantity - 1) })
            }
          >
            −
          </Button>
          <Input
            type="number"
            inputMode="numeric"
            min={1}
            value={item.quantity}
            onChange={(e) =>
              onChange({ quantity: Math.max(1, Number(e.target.value) || 1) })
            }
            className="text-center"
          />
          <Button
            className="btn-secondary-fan"
            onClick={() => onChange({ quantity: item.quantity + 1 })}
          >
            +
          </Button>
        </div>
      </FormGroup>

      <FormGroup>
        <Label className="form-label">Precio unitario</Label>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          value={item.unitPrice}
          onChange={(e) => onChange({ unitPrice: e.target.value })}
        />
      </FormGroup>

      <FormGroup>
        <Label className="form-label">Descuento del artículo</Label>
        <Input
          type="select"
          value={item.discountType}
          onChange={(e) =>
            onChange({ discountType: e.target.value as DiscountType })
          }
        >
          <option value="NONE">Sin descuento</option>
          <option value="FIXED">Fijo en pesos</option>
          <option value="PERCENTAGE">Porcentual</option>
        </Input>
      </FormGroup>
      {item.discountType !== 'NONE' && (
        <FormGroup>
          <Label className="form-label">Valor del descuento</Label>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            max={item.discountType === 'PERCENTAGE' ? 100 : undefined}
            value={item.discountValue}
            onChange={(e) => onChange({ discountValue: e.target.value })}
          />
        </FormGroup>
      )}

      <div className="summary-box mb-3">
        <div className="row-line">
          <span>Subtotal</span>
          <span>{lineTotal ? formatMoney(lineTotal.lineSubtotal) : '—'}</span>
        </div>
        <div className="row-line">
          <span>Descuento</span>
          <span>
            {lineTotal ? formatMoney(lineTotal.discountAmount) : '—'}
          </span>
        </div>
        <div className="total-line">
          <span>Total artículo</span>
          <span>{lineTotal ? formatMoney(lineTotal.lineTotal) : '—'}</span>
        </div>
      </div>

      <FormGroup>
        <Label className="form-label">Foto (opcional)</Label>
        <Input
          innerRef={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => onImage(e.target.files?.[0])}
        />
        {item.imagePreviewUrl && (
          <div className="mt-2">
            <img
              src={item.imagePreviewUrl}
              alt="Vista previa"
              className="image-preview"
            />
            <div className="d-flex justify-content-between align-items-center mt-2">
              <small className="text-muted">
                ~{formatBytes(item.imageSize ?? 0)}
              </small>
              <Button
                color="link"
                className="text-danger p-0"
                onClick={() => {
                  onChange({
                    imageBase64: undefined,
                    imageMimeType: undefined,
                    imagePreviewUrl: undefined,
                    imageSize: undefined,
                  });
                  if (fileRef.current) fileRef.current.value = '';
                }}
              >
                Quitar foto
              </Button>
            </div>
          </div>
        )}
      </FormGroup>
    </div>
  );
}
