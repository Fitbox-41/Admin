import axios from 'axios';

/**
 * Map a Delhivery status string to the app's shipmentStatus enum.
 */
export const mapDelhiveryStatus = (delhiveryStatus) => {
  if (!delhiveryStatus) return 'Pending';
  const s = delhiveryStatus.toLowerCase().trim();

  if (s === 'delivered') return 'Delivered';
  if (s.includes('out for delivery') || s === 'out for delivery') return 'Out for Delivery';
  if (s === 'in transit' || s.includes('in transit')) return 'In Transit';
  if (s === 'dispatched' || s.includes('dispatched')) return 'In Transit';
  if (s === 'picked up' || s.includes('picked up')) return 'In Transit';
  if (s === 'manifested' || s === 'ready for pickup' || s.includes('manifest')) return 'Ready to Ship';
  if (s.includes('rto')) return 'RTO';
  if (s === 'cancelled' || s.includes('cancel')) return 'Cancelled';

  return 'In Transit';
};

/**
 * Track a Delhivery shipment by AWB number.
 * Uses the Delhivery Pull API: GET /api/v1/packages/json/?waybill={AWB}
 */
export const trackDelhiveryShipment = async (awb) => {
  try {
    const response = await axios.get(
      `${process.env.DELHIVERY_BASE_URL}/api/v1/packages/json/`,
      {
        params: { waybill: awb },
        headers: {
          'Authorization': `Token ${process.env.DELHIVERY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;
    const shipmentData = data?.ShipmentData?.[0] || null;

    if (!shipmentData) {
      return {
        status: 'Pending',
        statusCode: null,
        scans: [],
        estimatedDate: null,
        rawData: data
      };
    }

    const shipment = shipmentData.Shipment || {};
    const currentStatus = shipment.Status?.Status || '';
    const statusCode = shipment.Status?.StatusCode || '';
    const estimatedDate = shipment.EstimatedDate || shipment.ExpectedDeliveryDate || null;

    const rawScans = shipment.Scans || [];
    const scans = rawScans.map((scan) => {
      const s = scan.ScanDetail || scan;
      return {
        status: s.Instructions || s.Status || '',
        statusCode: s.StatusCode || '',
        location: s.ScannedLocation || s.StatusLocation || '',
        timestamp: s.ScanDateTime || s.StatusDateTime || '',
        scanType: s.ScanType || ''
      };
    });

    return {
      status: mapDelhiveryStatus(currentStatus),
      delhiveryStatus: currentStatus,
      statusCode,
      scans,
      estimatedDate,
      rawData: data
    };
  } catch (error) {
    console.error('Delhivery tracking failed:', error.response?.data || error.message);
    throw new Error('Delhivery tracking failed: ' + (error.response?.data ? JSON.stringify(error.response.data) : error.message));
  }
};
