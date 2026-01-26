'use client'

import { useState } from 'react'
import {
  Truck,
  Package,
  Download,
  Calendar,
  ExternalLink,
  CheckCircle,
  Loader2,
  MapPin,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/lib/hooks/use-toast'
import { format, addDays } from 'date-fns'
import type { Order } from '@/lib/types/order'

interface ShippingActionsProps {
  order: Order
  onUpdate: () => void
}

interface ShipmentInfo {
  shiprocket_order_id: number
  shipment_id: number
  awb_code: string
  tracking_number: string
  courier_name: string
  courier_rate: number
  label_url: string
  estimated_delivery_days: number
  estimated_delivery_date: string
}

interface TrackingEvent {
  date: string
  status: string
  activity: string
  location: string
}

interface TrackingInfo {
  awb_code: string
  courier_name: string
  current_status: string
  estimated_delivery: string
  track_url?: string
  events: TrackingEvent[]
}

export function ShippingActions({ order, onUpdate }: ShippingActionsProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showPickupDialog, setShowPickupDialog] = useState(false)
  const [showTrackingDialog, setShowTrackingDialog] = useState(false)
  const [pickupDate, setPickupDate] = useState('')
  const [shipmentInfo, setShipmentInfo] = useState<ShipmentInfo | null>(null)
  const [trackingInfo, setTrackingInfo] = useState<TrackingInfo | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)

  const hasShipment = !!order.shiprocket_shipment_id || !!order.awb_code
  // Use order_status (mapped from fulfillment_status by API) - valid values: unfulfilled, processing, packed
  const canCreateShipment =
    ['unfulfilled', 'processing', 'packed', 'confirmed'].includes(order.order_status) && !hasShipment

  // Generate shipping label
  const handleGenerateLabel = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/shipping/create-shipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.id })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate shipping label')
      }

      setShipmentInfo(data.shipment)

      toast({
        title: 'Shipping Label Generated',
        description: `Tracking #: ${data.shipment.awb_code}`
      })

      onUpdate()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate label',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Schedule pickup
  const handleSchedulePickup = async () => {
    if (!pickupDate) {
      toast({
        title: 'Error',
        description: 'Please select a pickup date',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/shipping/schedule-pickup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          pickup_date: pickupDate
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to schedule pickup')
      }

      toast({
        title: 'Pickup Scheduled',
        description: `Pickup scheduled for ${format(new Date(pickupDate), 'MMM dd, yyyy')}`
      })

      setShowPickupDialog(false)
      onUpdate()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule pickup',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Get tracking info
  const handleTrackShipment = async () => {
    setTrackingLoading(true)
    setShowTrackingDialog(true)

    try {
      const response = await fetch(`/api/shipping/track?order_id=${order.id}`)
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to get tracking info')
      }

      setTrackingInfo(data.tracking)
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to get tracking',
        variant: 'destructive'
      })
      setShowTrackingDialog(false)
    } finally {
      setTrackingLoading(false)
    }
  }

  // Download label
  const handleDownloadLabel = () => {
    const labelUrl = shipmentInfo?.label_url || order.label_url
    if (labelUrl) {
      window.open(labelUrl, '_blank')
    }
  }

  // Get minimum pickup date (tomorrow)
  const minPickupDate = format(addDays(new Date(), 1), 'yyyy-MM-dd')
  const maxPickupDate = format(addDays(new Date(), 7), 'yyyy-MM-dd')

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Shipping
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasShipment ? (
            // No shipment yet
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a shipping label to get tracking and schedule pickup
              </p>
              <Button
                onClick={handleGenerateLabel}
                disabled={loading || !canCreateShipment}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Package className="h-4 w-4 mr-2" />
                    Generate Shipping Label
                  </>
                )}
              </Button>
              {!canCreateShipment && order.order_status !== 'confirmed' && (
                <p className="text-xs text-muted-foreground mt-2">
                  Order must be confirmed to generate shipping label
                </p>
              )}
            </div>
          ) : (
            // Shipment exists
            <div className="space-y-4">
              {/* Success status */}
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800 dark:text-green-200">
                    Label Generated
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-muted-foreground">Tracking #:</span>{' '}
                    <span className="font-mono font-medium">
                      {order.awb_code || order.tracking_number}
                    </span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Courier:</span>{' '}
                    <span className="capitalize">{order.courier_name}</span>
                  </p>
                  {order.estimated_delivery_date && (
                    <p>
                      <span className="text-muted-foreground">Est. Delivery:</span>{' '}
                      {format(new Date(order.estimated_delivery_date), 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              </div>

              {/* Pickup status */}
              {order.pickup_scheduled_date ? (
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800 dark:text-blue-200">
                      Pickup Scheduled
                    </span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {format(new Date(order.pickup_scheduled_date), 'EEEE, MMM dd, yyyy')}
                  </p>
                </div>
              ) : null}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2">
                {(order.label_url || shipmentInfo?.label_url) && (
                  <Button variant="outline" size="sm" onClick={handleDownloadLabel}>
                    <Download className="h-4 w-4 mr-1" />
                    Label
                  </Button>
                )}

                {!order.pickup_scheduled_date && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowPickupDialog(true)}
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Schedule Pickup
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={handleTrackShipment}>
                  <MapPin className="h-4 w-4 mr-1" />
                  Track
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Pickup Dialog */}
      <Dialog open={showPickupDialog} onOpenChange={setShowPickupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Pickup</DialogTitle>
            <DialogDescription>
              Select a date for the courier to pick up the package from your location
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pickup-date">Pickup Date</Label>
              <Input
                id="pickup-date"
                type="date"
                min={minPickupDate}
                max={maxPickupDate}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Pickup can be scheduled 1-7 days from today
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPickupDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSchedulePickup} disabled={loading || !pickupDate}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scheduling...
                </>
              ) : (
                'Schedule Pickup'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tracking Dialog */}
      <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Shipment Tracking</DialogTitle>
            {trackingInfo && (
              <DialogDescription>
                Tracking #: {trackingInfo.awb_code} • {trackingInfo.courier_name}
              </DialogDescription>
            )}
          </DialogHeader>

          {trackingLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : trackingInfo ? (
            <div className="space-y-4 py-4">
              {/* Current Status */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Status</p>
                    <p className="font-semibold text-lg">{trackingInfo.current_status}</p>
                  </div>
                  {trackingInfo.estimated_delivery && (
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Est. Delivery</p>
                      <p className="font-medium">
                        {format(new Date(trackingInfo.estimated_delivery), 'MMM dd')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Tracking Events */}
              {trackingInfo.events.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {trackingInfo.events.map((event, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-2 h-2 rounded-full ${
                            index === 0 ? 'bg-green-500' : 'bg-muted-foreground/30'
                          }`}
                        />
                        {index < trackingInfo.events.length - 1 && (
                          <div className="w-0.5 h-full bg-muted-foreground/20 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <p className="font-medium text-sm">{event.activity || event.status}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {event.location && (
                            <>
                              <MapPin className="h-3 w-3" />
                              <span>{event.location}</span>
                            </>
                          )}
                          <Clock className="h-3 w-3 ml-2" />
                          <span>
                            {format(new Date(event.date), 'MMM dd, h:mm a')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No tracking events available yet
                </p>
              )}

              {/* External tracking link */}
              {trackingInfo.track_url && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(trackingInfo.track_url, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Track on Courier Website
                </Button>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tracking information available
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
