'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { 
  Upload, 
  Download, 
  CheckCircle, 
  XCircle, 
  FileText,
  AlertCircle,
  Loader2 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

interface BulkUploadResult {
  success: number
  failed: number
  total_rows: number
  errors: Array<{ row: number; error: string }>
  warnings: Array<{ row: number; message: string }>
}

interface BulkUploadModalProps {
  open: boolean
  onClose: () => void
  storeId: string
  onSuccess?: () => void
}

export default function BulkUploadModal({ 
  open, 
  onClose, 
  storeId,
  onSuccess 
}: BulkUploadModalProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<BulkUploadResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const onDropCSV = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setCsvFile(acceptedFiles[0])
      setError(null)
    }
  }, [])

  const onDropImages = useCallback((acceptedFiles: File[]) => {
    setImageFiles(prev => [...prev, ...acceptedFiles])
  }, [])

  const { getRootProps: getCSVRootProps, getInputProps: getCSVInputProps } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv'],
      'text/plain': ['.txt', '.csv']
    },
    maxFiles: 1,
    onDrop: onDropCSV
  })

  const { getRootProps: getImageRootProps, getInputProps: getImageInputProps } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    onDrop: onDropImages
  })

  const handleUpload = async () => {
    if (!csvFile) return

    setUploading(true)
    setProgress(10)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('store_id', storeId)
      formData.append('csv_file', csvFile)
      
      // Add image files
      imageFiles.forEach(file => {
        formData.append('images', file)
      })

      setProgress(30)

      const response = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        body: formData
      })

      setProgress(90)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed')
      }

      setResults(data)
      setProgress(100)

      if (data.success > 0 && onSuccess) {
        onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const response = await fetch('/api/products/bulk-upload')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'product_upload_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // Fallback: generate template locally
      const csv = [
        'title,description,price,compare_at_price,sku,quantity,category,tags,image_filename',
        '"Blue Cotton Saree","Beautiful handwoven cotton saree in royal blue",2500,3000,SAR-001,10,"Fashion,Women\'s Clothing","saree,cotton,blue,traditional",blue_saree.jpg',
        '"Green Silk Blouse","Premium silk blouse with elegant embroidery",1800,2200,BLS-001,15,"Fashion,Women\'s Clothing","blouse,silk,green,ethnic",green_blouse.jpg'
      ].join('\n')

      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'product_upload_template.csv'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  const resetModal = () => {
    setCsvFile(null)
    setImageFiles([])
    setResults(null)
    setError(null)
    setProgress(0)
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Upload Products</DialogTitle>
          <DialogDescription>
            Upload multiple products at once using a CSV file
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <div className="space-y-6">
            {/* Instructions */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">How it works:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Download the CSV template below</li>
                <li>Fill in your product details</li>
                <li>Upload the CSV file</li>
                <li>Optionally add images (matched by filename)</li>
              </ol>
            </div>

            {/* Download Template */}
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download CSV Template
            </Button>

            {/* CSV Upload */}
            <div>
              <h4 className="font-medium mb-2">1. Upload CSV File *</h4>
              <div
                {...getCSVRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  csvFile ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-muted-foreground/25 hover:border-primary/50"
                )}
              >
                <input {...getCSVInputProps()} />
                {csvFile ? (
                  <div className="flex items-center justify-center gap-2 text-green-700 dark:text-green-400">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">{csvFile.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setCsvFile(null)
                      }}
                      className="text-red-500 hover:text-red-700 ml-2"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p>Drop CSV file here or click to browse</p>
                  </div>
                )}
              </div>
            </div>

            {/* Image Upload (Optional) */}
            <div>
              <h4 className="font-medium mb-2">2. Upload Images (Optional)</h4>
              <p className="text-sm text-muted-foreground mb-2">
                Images will be matched to products by the filename in your CSV
              </p>
              <div
                {...getImageRootProps()}
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input {...getImageInputProps()} />
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Drop images here or click to browse
                </p>
              </div>
              
              {imageFiles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {imageFiles.map((file, i) => (
                    <span
                      key={i}
                      className="text-xs bg-muted px-2 py-1 rounded flex items-center gap-1"
                    >
                      {file.name}
                      <button
                        type="button"
                        onClick={() => setImageFiles(files => files.filter((_, idx) => idx !== i))}
                        className="text-red-500 hover:text-red-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 rounded-lg">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <p className="text-sm">{error}</p>
              </div>
            )}

            {/* Progress */}
            {uploading && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-sm text-center text-muted-foreground">
                  Uploading products...
                </p>
              </div>
            )}

            {/* Upload Button */}
            <Button
              onClick={handleUpload}
              disabled={!csvFile || uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Products
                </>
              )}
            </Button>
          </div>
        ) : (
          /* Results */
          <div className="space-y-4">
            {/* Success count */}
            <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  {results.success} products uploaded successfully
                </p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  Out of {results.total_rows} total rows
                </p>
              </div>
            </div>

            {/* Failed count */}
            {results.failed > 0 && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-900 dark:text-red-100">
                    {results.failed} products failed
                  </p>
                </div>
              </div>
            )}

            {/* Errors list */}
            {results.errors && results.errors.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium text-sm">
                  Errors
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {results.errors.map((error, i) => (
                    <div
                      key={i}
                      className="px-4 py-2 text-sm border-t flex items-start gap-2"
                    >
                      <span className="text-red-600 shrink-0">Row {error.row}:</span>
                      <span className="text-muted-foreground">{error.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warnings list */}
            {results.warnings && results.warnings.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 font-medium text-sm">
                  Warnings
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {results.warnings.map((warning, i) => (
                    <div
                      key={i}
                      className="px-4 py-2 text-sm border-t flex items-start gap-2"
                    >
                      <span className="text-yellow-600 shrink-0">Row {warning.row}:</span>
                      <span className="text-muted-foreground">{warning.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Done button */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetModal} className="flex-1">
                Upload More
              </Button>
              <Button onClick={handleClose} className="flex-1">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
