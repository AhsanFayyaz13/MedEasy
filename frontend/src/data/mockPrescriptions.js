/**
 * mockPrescriptions.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mock prescription history for PrescriptionUpload page.
 * Statuses: 'pending' | 'verified' | 'rejected'
 *
 * Shape:
 * {
 *   id, fileName, fileType, fileSize,  // metadata
 *   status,
 *   notes,              // patient notes at upload time
 *   uploadedAt,
 *   reviewedAt?,
 *   reviewedBy?,        // pharmacist name
 *   rejectionReason?,   // only on 'rejected'
 *   linkedOrderIds[],   // orders that used this Rx
 * }
 */

const MOCK_PRESCRIPTIONS = [
  {
    id:              'RX-8F2A1B',
    fileName:        'prescription_amlodipine.jpg',
    fileType:        'image/jpeg',
    fileSize:        512340,
    status:          'verified',
    notes:           'Monthly refill for blood pressure medication.',
    uploadedAt:      '2026-05-10T08:00:00Z',
    reviewedAt:      '2026-05-10T08:22:00Z',
    reviewedBy:      'Dr. Farhan Qureshi (PharmD)',
    rejectionReason: null,
    linkedOrderIds:  ['ORD-E5F6G7H8'],
  },
  {
    id:              'RX-3C9D4E',
    fileName:        'prescription_amoxicillin.pdf',
    fileType:        'application/pdf',
    fileSize:        204800,
    status:          'rejected',
    notes:           '',
    uploadedAt:      '2026-05-08T10:30:00Z',
    reviewedAt:      '2026-05-08T11:15:00Z',
    reviewedBy:      'Dr. Aisha Siddiq (PharmD)',
    rejectionReason: 'Prescription is expired (issued more than 30 days ago). Please obtain a fresh prescription from your doctor.',
    linkedOrderIds:  [],
  },
  {
    id:              'RX-7A5F2C',
    fileName:        'rx_atorvastatin_may2026.png',
    fileType:        'image/png',
    fileSize:        843200,
    status:          'pending',
    notes:           'Cholesterol medication – urgent refill needed.',
    uploadedAt:      '2026-05-14T21:45:00Z',
    reviewedAt:      null,
    reviewedBy:      null,
    rejectionReason: null,
    linkedOrderIds:  ['ORD-I9J0K1L2'],
  },
  {
    id:              'RX-1B6E8A',
    fileName:        'salbutamol_inhaler_rx.jpg',
    fileType:        'image/jpeg',
    fileSize:        378900,
    status:          'verified',
    notes:           'Asthma inhaler – please expedite.',
    uploadedAt:      '2026-04-28T14:00:00Z',
    reviewedAt:      '2026-04-28T14:35:00Z',
    reviewedBy:      'Dr. Farhan Qureshi (PharmD)',
    rejectionReason: null,
    linkedOrderIds:  ['ORD-E5F6G7H8'],
  },
];

export default MOCK_PRESCRIPTIONS;
