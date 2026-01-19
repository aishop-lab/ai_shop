'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Image from 'next/image'
import { X, Upload, GripVertical, ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageUploaderProps {
  images: File[]
  onImagesChange: (files: File[]) => void
  maxImages?: number
  disabled?: boolean
}

interface PreviewImage {
  file: File
  preview: string
}

export default function ImageUploader({
  images,
  onImagesChange,
  maxImages = 10,
  disabled = false
}: ImageUploaderProps) {
  const [previews, setPreviews] = useState<PreviewImage[]>([])
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // Generate previews when images change
  useEffect(() => {
    const newPreviews = images.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }))
    setPreviews(newPreviews)

    // Cleanup old previews
    return () => {
      newPreviews.forEach(p => URL.revokeObjectURL(p.preview))
    }
  }, [images])

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      alert(`Maximum ${maxImages} images allowed`)
      const allowedCount = maxImages - images.length
      acceptedFiles = acceptedFiles.slice(0, allowedCount)
    }
    
    if (acceptedFiles.length > 0) {
      onImagesChange([...images, ...acceptedFiles])
    }
  }, [images, maxImages, onImagesChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    maxFiles: maxImages - images.length,
    disabled: disabled || images.length >= maxImages,
    onDrop
  })

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index)
    onImagesChange(newImages)
  }

  // Drag and drop reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newImages = [...images]
    const draggedItem = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(index, 0, draggedItem)
    
    onImagesChange(newImages)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="space-y-4">
      {/* Image Preview Grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {previews.map((preview, index) => (
            <div
              key={preview.preview}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "relative aspect-square rounded-lg overflow-hidden border-2 group cursor-move",
                draggedIndex === index ? "border-primary opacity-50" : "border-transparent",
                "hover:border-primary/50 transition-all"
              )}
            >
              <Image
                src={preview.preview}
                alt={`Preview ${index + 1}`}
                fill
                className="object-cover"
              />
              
              {/* Drag handle */}
              <div className="absolute top-2 left-2 bg-black/50 text-white rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <GripVertical className="w-4 h-4" />
              </div>
              
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
              
              {/* Primary badge */}
              {index === 0 && (
                <div className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded">
                  Primary
                </div>
              )}
              
              {/* Image number */}
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                {index + 1}/{previews.length}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dropzone */}
      {images.length < maxImages && (
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all",
            isDragActive 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center gap-3">
            {isDragActive ? (
              <>
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <p className="text-lg font-medium text-primary">Drop images here...</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium mb-1">
                    Drag & drop product images
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or WebP (max 10MB each) • {images.length}/{maxImages} uploaded
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Tips */}
      {images.length === 0 && (
        <div className="bg-muted/50 rounded-lg p-4">
          <h4 className="font-medium text-sm mb-2">Tips for great product photos:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Use good lighting and a clean background</li>
            <li>• Show the product from multiple angles</li>
            <li>• First image will be used as the primary image</li>
            <li>• Drag images to reorder them</li>
          </ul>
        </div>
      )}
    </div>
  )
}
