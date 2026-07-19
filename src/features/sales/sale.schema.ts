import { z } from 'zod';

export const discountTypeSchema = z.enum(['NONE', 'FIXED', 'PERCENTAGE']);

export const saleItemDraftSchema = z
  .object({
    productId: z.string().min(1, 'Seleccioná un producto'),
    motifName: z.string().trim().min(1, 'Indicá el motivo o diseño').max(120),
    quantity: z.number().int().positive('La cantidad debe ser mayor que cero'),
    unitPrice: z.number().min(0, 'El precio unitario no puede ser negativo'),
    discountType: discountTypeSchema,
    discountValue: z.number().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El porcentaje debe estar entre 0 y 100',
        path: ['discountValue'],
      });
    }
  });

export const createSaleSchema = z
  .object({
    items: z.array(saleItemDraftSchema).min(1, 'Agregá al menos un artículo'),
    generalDiscountType: discountTypeSchema,
    generalDiscountValue: z.number().min(0),
    notes: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.generalDiscountType === 'PERCENTAGE' &&
      data.generalDiscountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El porcentaje general debe estar entre 0 y 100',
        path: ['generalDiscountValue'],
      });
    }
  });
