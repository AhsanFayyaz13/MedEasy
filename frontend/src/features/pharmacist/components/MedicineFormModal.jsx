import { useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { Button, Checkbox, FileDropzone, Input, Modal, Select, Textarea } from '../../../components/ui';
import MedicalIcon from '../../medicines/components/MedicalIcon';
import { MEDICINE_CATEGORIES } from '../../medicines/lib/normalizeMedicine';
import { uploadMedicinePhoto } from '../../../services/api/pharmacistService';
import { EMPTY_MED } from './pharmacistShared';

const toForm = (m) =>
  m
    ? { ...EMPTY_MED, ...m, original_price: m.original_price > m.price ? m.original_price : '', expiryDate: m.expiryDate ? String(m.expiryDate).slice(0, 10) : '' }
    : EMPTY_MED;

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = 'Name is required.';
  if (!f.category) e.category = 'Choose a category.';
  if (!f.description.trim()) e.description = 'Add a short description for customers.';
  if (f.price === '' || Number(f.price) < 0) e.price = 'Enter a price of 0 or more.';
  if (f.original_price !== '' && Number(f.original_price) < Number(f.price)) e.original_price = 'Should be higher than the price (it shows as a discount).';
  if (f.stock === '' || !Number.isInteger(Number(f.stock)) || Number(f.stock) < 0) e.stock = 'Enter a whole number of 0 or more.';
  return e;
}

/** Add or edit a medicine. Remount with key per medicine. onSave(payload) may throw. */
export default function MedicineFormModal({ medicine, show, onClose, onSave }) {
  const { toast } = useToast();
  const [form, setForm] = useState(() => toForm(medicine));
  const [touched, setTouched] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const errors = validate(form);
  const err = (k) => (touched[k] ? errors[k] : undefined);
  const field = (k) => ({
    name: k,
    value: form[k] ?? '',
    onChange: (e) => setForm((f) => ({ ...f, [k]: e.target.value })),
    onBlur: () => setTouched((t) => ({ ...t, [k]: true })),
    error: err(k),
  });
  const categories = MEDICINE_CATEGORIES.includes(form.category) || !form.category ? MEDICINE_CATEGORIES : [form.category, ...MEDICINE_CATEGORIES];

  const pickPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { imageUrl } = await uploadMedicinePhoto(file);
      setForm((f) => ({ ...f, image: imageUrl }));
      toast.success('Photo uploaded.');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(EMPTY_MED).map((k) => [k, true])));
    if (Object.keys(errors).length) return;
    setSaving(true);
    try {
      await onSave({
        ...form,
        name: form.name.trim(),
        brand: form.brand.trim(),
        description: form.description.trim(),
        manufacturer: form.manufacturer.trim(),
        price: Number(form.price),
        original_price: form.original_price === '' ? Number(form.price) : Number(form.original_price),
        stock: Number(form.stock),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      size="lg"
      title={medicine ? `Edit ${medicine.brand || medicine.name}` : 'Add a medicine'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="medicine-form" loading={saving} disabled={uploading}>{medicine ? 'Save changes' : 'Add medicine'}</Button>
        </>
      }
    >
      <form id="medicine-form" className="ph-medform" onSubmit={submit} noValidate>
        <div className="ph-medform__photo">
          <div className="ph-medform__preview">
            <MedicalIcon emoji={form.image || '💊'} category={form.category} size={40} />
          </div>
          <FileDropzone file={null} onFile={pickPhoto} accept=".jpg,.jpeg,.png,.webp" label={uploading ? 'Uploading…' : 'Drop a product photo'} hint="JPG, PNG or WebP · max 5 MB" disabled={uploading} />
        </div>

        <div className="row g-3">
          <div className="col-md-6"><Input label="Generic name and strength" required placeholder="Paracetamol 500 mg" {...field('name')} /></div>
          <div className="col-md-6"><Input label="Brand" placeholder="Panadol" {...field('brand')} /></div>
          <div className="col-md-6"><Select label="Category" required placeholder="Choose a category" options={categories} {...field('category')} /></div>
          <div className="col-md-6"><Input label="Manufacturer" placeholder="GSK Pakistan Ltd." {...field('manufacturer')} /></div>
          <div className="col-sm-4"><Input label="Price (Rs.)" required type="number" min="0" inputMode="decimal" {...field('price')} /></div>
          <div className="col-sm-4"><Input label="Was (Rs.)" hint="Optional, shows a discount" type="number" min="0" inputMode="decimal" {...field('original_price')} /></div>
          <div className="col-sm-4"><Input label="Stock" required type="number" min="0" inputMode="numeric" {...field('stock')} /></div>
          <div className="col-md-6"><Input label="Expiry date" type="date" {...field('expiryDate')} /></div>
          <div className="col-12"><Textarea label="Description" required rows={3} maxLength={5000} placeholder="What it’s used for, pack size…" {...field('description')} /></div>
          <div className="col-12">
            <Checkbox
              label="Prescription required"
              hint="Customers must upload a prescription that a pharmacist verifies."
              checked={!!form.requires_prescription}
              onChange={(e) => setForm((f) => ({ ...f, requires_prescription: e.target.checked }))}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
}
