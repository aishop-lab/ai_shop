'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Trash2,
  Copy,
  ImageIcon,
} from 'lucide-react'
import type { VariantInput, ProductVariantOption } from '@/lib/types/variant'
import type { ProductImage } from '@/lib/types/store'
import { formatVariantAttributes } from '@/lib/products/variant-utils'

interface VariantsTableProps {
  variants: VariantInput[]
  options: ProductVariantOption[]
  basePrice: number
  images: ProductImage[]
  onChange: (variants: VariantInput[]) => void
  disabled?: boolean
}

export function VariantsTable({
  variants,
  options,
  basePrice,
  images,
  onChange,
  disabled = false,
}: VariantsTableProps) {
  const [bulkPrice, setBulkPrice] = useState<string>('')
  const [bulkQuantity, setBulkQuantity] = useState<string>('')
  const [selectedVariants, setSelectedVariants] = useState<Set<number>>(new Set())

  const updateVariant = (index: number, updates: Partial<VariantInput>) => {
    const newVariants = [...variants]
    newVariants[index] = { ...newVariants[index], ...updates }
    onChange(newVariants)
  }

  const deleteVariant = (index: number) => {
    onChange(variants.filter((_, i) => i !== index))
    const newSelected = new Set(
      [...selectedVariants]
        .filter((i) => i !== index)
        .map((i) => (i > index ? i - 1 : i))
    )
    setSelectedVariants(newSelected)
  }

  const toggleSelect = (index: number) => {
    const newSelected = new Set(selectedVariants)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedVariants(newSelected)
  }

  const selectAll = () => {
    if (selectedVariants.size === variants.length) {
      setSelectedVariants(new Set())
    } else {
      setSelectedVariants(new Set(variants.map((_, i) => i)))
    }
  }

  const applyBulkPrice = () => {
    const price = parseFloat(bulkPrice)
    if (isNaN(price) || price < 0) return

    const newVariants = variants.map((v, i) =>
      selectedVariants.has(i) ? { ...v, price } : v
    )
    onChange(newVariants)
    setBulkPrice('')
  }

  const applyBulkQuantity = () => {
    const qty = parseInt(bulkQuantity)
    if (isNaN(qty) || qty < 0) return

    const newVariants = variants.map((v, i) =>
      selectedVariants.has(i) ? { ...v, quantity: qty } : v
    )
    onChange(newVariants)
    setBulkQuantity('')
  }

  const deleteSelected = () => {
    onChange(variants.filter((_, i) => !selectedVariants.has(i)))
    setSelectedVariants(new Set())
  }

  const getVariantTitle = (variant: VariantInput): string => {
    return formatVariantAttributes(variant.attributes)
  }

  const totalInventory = variants.reduce((sum, v) => sum + (v.quantity || 0), 0)

  if (variants.length === 0) {
    return (
      <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
        <p className="text-sm">No variants generated yet.</p>
        <p className="text-xs mt-1">
          Add option values above and click &quot;Generate Variants&quot;.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedVariants.size > 0 && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <span className="text-sm font-medium">
            {selectedVariants.size} selected
          </span>
          <div className="flex-1" />
          <Input
            type="number"
            placeholder="Set price"
            value={bulkPrice}
            onChange={(e) => setBulkPrice(e.target.value)}
            className="w-24 h-8"
            disabled={disabled}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={applyBulkPrice}
            disabled={disabled || !bulkPrice}
          >
            Apply
          </Button>
          <Input
            type="number"
            placeholder="Set qty"
            value={bulkQuantity}
            onChange={(e) => setBulkQuantity(e.target.value)}
            className="w-20 h-8"
            disabled={disabled}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={applyBulkQuantity}
            disabled={disabled || !bulkQuantity}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={deleteSelected}
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>{variants.length} variants</span>
        <span>Total inventory: {totalInventory}</span>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selectedVariants.size === variants.length && variants.length > 0}
                  onChange={selectAll}
                  className="rounded"
                  disabled={disabled}
                />
              </TableHead>
              <TableHead>Variant</TableHead>
              <TableHead className="w-28">Price</TableHead>
              <TableHead className="w-24">Quantity</TableHead>
              <TableHead className="w-24">SKU</TableHead>
              <TableHead className="w-20">Active</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {variants.map((variant, index) => (
              <TableRow key={index}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedVariants.has(index)}
                    onChange={() => toggleSelect(index)}
                    className="rounded"
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {/* Image selector */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-10 h-10 p-0"
                          disabled={disabled || images.length === 0}
                        >
                          {variant.image_id ? (
                            <img
                              src={
                                images.find((i) => i.id === variant.image_id)
                                  ?.thumbnail_url ||
                                images.find((i) => i.id === variant.image_id)
                                  ?.url ||
                                ''
                              }
                              alt=""
                              className="w-full h-full object-cover rounded"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() =>
                            updateVariant(index, { image_id: undefined })
                          }
                        >
                          No image
                        </DropdownMenuItem>
                        {images.map((img) => (
                          <DropdownMenuItem
                            key={img.id}
                            onClick={() =>
                              updateVariant(index, { image_id: img.id })
                            }
                          >
                            <img
                              src={img.thumbnail_url || img.url}
                              alt=""
                              className="w-8 h-8 object-cover rounded mr-2"
                            />
                            Image {img.position + 1}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <div>
                      <span className="font-medium">
                        {getVariantTitle(variant)}
                      </span>
                      {variant.is_default && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          (default)
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      value={variant.price ?? ''}
                      onChange={(e) =>
                        updateVariant(index, {
                          price: e.target.value
                            ? parseFloat(e.target.value)
                            : null,
                        })
                      }
                      placeholder={basePrice.toString()}
                      className="h-8 w-20"
                      disabled={disabled}
                    />
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    value={variant.quantity ?? 0}
                    onChange={(e) =>
                      updateVariant(index, {
                        quantity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 w-20"
                    min={0}
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    value={variant.sku || ''}
                    onChange={(e) =>
                      updateVariant(index, { sku: e.target.value || undefined })
                    }
                    placeholder="SKU"
                    className="h-8 w-24"
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    checked={variant.status !== 'disabled'}
                    onCheckedChange={(checked) =>
                      updateVariant(index, {
                        status: checked ? 'active' : 'disabled',
                      })
                    }
                    disabled={disabled}
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" disabled={disabled}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          updateVariant(index, { is_default: true })
                        }
                      >
                        Set as default
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          // Duplicate variant
                          const newVariants = [...variants]
                          newVariants.splice(index + 1, 0, {
                            ...variant,
                            id: undefined,
                            sku: variant.sku ? `${variant.sku}-copy` : undefined,
                          })
                          onChange(newVariants)
                        }}
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deleteVariant(index)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
