/**
 * prescriptionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All prescription-related API calls.
 */

import api from './api';


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
  await api.delete(`/prescriptions/${id}`);
  return { success: true };
}
