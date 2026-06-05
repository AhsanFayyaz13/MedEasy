/**
 * prescriptionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All prescription-related API calls, with mock fallbacks.
 */

import api from './api';
import MOCK_PRESCRIPTIONS from '../data/mockPrescriptions';

const USE_MOCK = import.meta.env.VITE_USE_MOCK_API !== 'false';
const delay    = (ms) => new Promise((res) => setTimeout(res, ms));

export function mapPrescriptionToFrontend(rx) {
  if (!rx) return null;

  let fileType = 'image/jpeg';
  let extractedFileName = 'prescription.png';

  if (rx.fileUrl && rx.fileUrl.startsWith('data:')) {
    const matches = rx.fileUrl.match(/^data:([^;]+);base64,/);
    if (matches && matches[1]) {
      fileType = matches[1];
    }
    const ext = fileType.split('/')[1] || 'png';
    extractedFileName = `prescription.${ext}`;
  } else if (rx.fileUrl) {
    const urlParts = rx.fileUrl.split('/');
    extractedFileName = urlParts.length > 0 ? urlParts[urlParts.length - 1] : 'prescription.png';
    if (extractedFileName.toLowerCase().endsWith('.pdf')) {
      fileType = 'application/pdf';
    } else if (extractedFileName.toLowerCase().endsWith('.png')) {
      fileType = 'image/png';
    } else if (extractedFileName.toLowerCase().endsWith('.webp')) {
      fileType = 'image/webp';
    }
  }

  return {
    ...rx,
    id: rx._id || rx.id,
    fileName: rx.fileName || extractedFileName,
    fileSize: rx.fileSize || 0,
    fileType: rx.fileType || fileType,
    uploadedAt: rx.createdAt || rx.uploadedAt || new Date().toISOString(),
    notes: rx.notes || '',
  };
}

// ─── Upload ───────────────────────────────────────────────────────────────────
/**
 * Upload a prescription file.
 * @param {File}   file
 * @param {string} [notes]
 * @returns {Promise<{ id, fileName, fileType, fileSize, status, notes, uploadedAt }>}
 */
export async function uploadPrescription(file, notes = '') {
  if (USE_MOCK) {
    await delay(1100);
    const newRx = {
      id:              'RX-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      fileName:        file.name,
      fileType:        file.type,
      fileSize:        file.size,
      status:          'pending',
      notes,
      uploadedAt:      new Date().toISOString(),
      reviewedAt:      null,
      reviewedBy:      null,
      rejectionReason: null,
      linkedOrderIds:  [],
    };
    // Prepend to mock list so it appears first
    MOCK_PRESCRIPTIONS.unshift(newRx);
    return newRx;
  }

  const form = new FormData();
  form.append('prescription',  file); // Mapped to 'prescription' to match backend single-upload parser
  form.append('notes', notes);

  const { data } = await api.post('/prescriptions/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return mapPrescriptionToFrontend(data);
}

// ─── Fetch list ───────────────────────────────────────────────────────────────
/**
 * Get all prescriptions for the current user.
 * @returns {Promise<Array>}
 */
export async function fetchPrescriptions() {
  if (USE_MOCK) {
    await delay(500);
    // newest first
    return [...MOCK_PRESCRIPTIONS].sort(
      (a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt)
    );
  }

  const { data } = await api.get('/prescriptions/');
  const list = data.results ?? data;
  return Array.isArray(list) ? list.map(mapPrescriptionToFrontend) : [];
}

// ─── Delete ───────────────────────────────────────────────────────────────────
/**
 * Delete a pending prescription.
 * @param {string} id
 */
export async function deletePrescription(id) {
  if (USE_MOCK) {
    await delay(500);
    const idx = MOCK_PRESCRIPTIONS.findIndex((p) => p.id === id);
    if (idx !== -1) MOCK_PRESCRIPTIONS.splice(idx, 1);
    return { success: true };
  }
  await api.delete(`/prescriptions/${id}`);
  return { success: true };
}
