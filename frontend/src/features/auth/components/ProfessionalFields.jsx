import { useState } from 'react';
import { FiCheckCircle, FiUpload } from 'react-icons/fi';
import { FaHospital, FaStethoscope } from 'react-icons/fa';
import { Input, Select, Spinner } from '../../../components/ui';
import { API_ORIGIN } from '../../../lib/env';
import { DAYS_OF_WEEK, SPECIALTIES } from '../lib/validation';
import '../auth.css';

/** Extra fields for pharmacy registration, incl. storefront photo upload. */
export function PharmacyFields({ fields, errors, onChange, onBlur, onPicture }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('pharmacyImage', file);
    setUploading(true);
    setUploadError('');
    try {
      const res = await fetch(`${API_ORIGIN}/api/auth/upload-pharmacy-image`, { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Image upload failed.');
      onPicture(data.filePath);
    } catch (err) {
      setUploadError(err.message || 'Network error while uploading the image.');
    } finally {
      setUploading(false);
    }
  };

  const pictureUrl = fields.pharmacyOutsidePicture;
  const preview = pictureUrl && (pictureUrl.startsWith('http') || pictureUrl.startsWith('data:') ? pictureUrl : `${API_ORIGIN}${pictureUrl}`);

  return (
    <fieldset className="auth-section">
      <legend><FaHospital aria-hidden="true" /> Pharmacy details</legend>
      <Input name="ownerName" label="Owner full name" required placeholder="e.g. Fayyaz Ahmad" value={fields.ownerName} onChange={onChange} onBlur={onBlur} error={errors.ownerName} autoComplete="name" />
      <Input name="pharmacyLocation" label="Pharmacy address" required placeholder="e.g. Shop 12, DHA Phase 5, Lahore" value={fields.pharmacyLocation} onChange={onChange} onBlur={onBlur} error={errors.pharmacyLocation} autoComplete="street-address" />

      <div className="ui-field">
        <span className="ui-field__label">
          Storefront photo <span className="ui-field__required" aria-hidden="true">*</span>
        </span>
        <label className={`auth-upload${errors.pharmacyOutsidePicture || uploadError ? ' has-error' : ''}`}>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={upload} disabled={uploading} />
          {preview ? (
            <img src={preview} alt="Uploaded storefront" />
          ) : (
            <span className="auth-upload__icon" aria-hidden="true">{uploading ? <Spinner size="sm" label="" /> : <FiUpload />}</span>
          )}
          <span className="auth-upload__text">
            {uploading ? 'Uploading…' : preview ? <><FiCheckCircle aria-hidden="true" /> Photo uploaded — click to replace</> : 'Upload a JPG, PNG or WebP (max 5 MB)'}
          </span>
        </label>
        {(uploadError || errors.pharmacyOutsidePicture) && (
          <p className="ui-field__error" role="alert">{uploadError || errors.pharmacyOutsidePicture}</p>
        )}
      </div>
    </fieldset>
  );
}

/** Extra fields for doctor registration. */
export function DoctorFields({ fields, errors, onChange, onBlur, onDays }) {
  const toggleDay = (day, checked) => {
    const days = fields.availableDays || [];
    onDays(checked ? [...days, day] : days.filter((d) => d !== day));
  };

  return (
    <fieldset className="auth-section">
      <legend><FaStethoscope aria-hidden="true" /> Professional details</legend>
      <Select name="specialty" label="Specialty" required placeholder="Select a specialty" options={SPECIALTIES} value={fields.specialty} onChange={onChange} onBlur={onBlur} error={errors.specialty} />
      <div className="row g-3">
        <div className="col-sm-6">
          <Input name="pmcRegistration" label="PMC/PMDC registration no." required placeholder="e.g. 12345-P" value={fields.pmcRegistration} onChange={onChange} onBlur={onBlur} error={errors.pmcRegistration} />
        </div>
        <div className="col-sm-6">
          <Input name="degree" label="Medical degree(s)" required placeholder="e.g. MBBS, FCPS" value={fields.degree} onChange={onChange} onBlur={onBlur} error={errors.degree} />
        </div>
        <div className="col-sm-6">
          <Input name="experience" type="number" inputMode="numeric" min="0" label="Years of experience" required placeholder="e.g. 8" value={fields.experience} onChange={onChange} onBlur={onBlur} error={errors.experience} />
        </div>
        <div className="col-sm-6">
          <Input name="consultationFee" type="number" inputMode="numeric" min="0" label="Consultation fee (PKR)" required placeholder="e.g. 1500" value={fields.consultationFee} onChange={onChange} onBlur={onBlur} error={errors.consultationFee} />
        </div>
      </div>
      <Input name="clinicAddress" label="Clinic address" required placeholder="e.g. Room 101, Shifa Clinic, Gulberg, Lahore" value={fields.clinicAddress} onChange={onChange} onBlur={onBlur} error={errors.clinicAddress} />

      <fieldset className="auth-days">
        <legend className="ui-field__label">
          Available days <span className="ui-field__required" aria-hidden="true">*</span>
        </legend>
        <div className="auth-days__grid">
          {DAYS_OF_WEEK.map((day) => {
            const checked = fields.availableDays?.includes(day);
            return (
              <label key={day} className={`auth-day${checked ? ' is-checked' : ''}`}>
                <input type="checkbox" checked={!!checked} onChange={(e) => toggleDay(day, e.target.checked)} />
                {day.slice(0, 3)}
                <span className="sr-only">{day.slice(3)}</span>
              </label>
            );
          })}
        </div>
        {errors.availableDays && <p className="ui-field__error" role="alert">{errors.availableDays}</p>}
      </fieldset>
    </fieldset>
  );
}
