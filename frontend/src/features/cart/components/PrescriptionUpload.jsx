import { useState, useRef } from 'react';
import { Form } from 'react-bootstrap';
import { FaFileUpload, FaExclamationTriangle, FaFileImage, FaFilePdf, FaTimes } from 'react-icons/fa';
import { MAX_FILE_MB } from './checkoutShared';


// ─── File drop zone ───────────────────────────────────────────────────────────
export default function PrescriptionUpload({ file, onFile, error, required }) {
  const fileRef  = useRef(null);
  const [drag, setDrag] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  };

  const isPdf = file?.type === 'application/pdf';
  const icon  = isPdf ? <FaFilePdf className="file-type-icon pdf" /> : <FaFileImage className="file-type-icon img" />;

  return (
    <div className={`rx-upload-section ${error ? 'has-error' : ''}`}>
      <div className="rx-upload-header">
        <FaFileUpload className="rx-header-icon" />
        <div>
          <h6 className="rx-upload-title">
            Prescription Required {required && <span className="required-star">*</span>}
          </h6>
          <p className="rx-upload-hint">
            One or more items in your order require a valid prescription.
            Upload a clear image or PDF of your prescription.
          </p>
        </div>
      </div>

      {file ? (
        /* File preview */
        <div className="file-preview">
          {icon}
          <div className="file-preview-info">
            <span className="file-name">{file.name}</span>
            <span className="file-size">{(file.size / 1024).toFixed(1)} KB</span>
          </div>
          <button className="file-remove-btn" onClick={() => onFile(null)} type="button">
            <FaTimes />
          </button>
        </div>
      ) : (
        /* Drop zone */
        <div
          className={`drop-zone ${drag ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
        >
          <div className="drop-zone-inner">
            <span className="drop-zone-icon"><FaFileUpload size={28} className="text-secondary mb-2" /></span>
            <p className="drop-zone-text">Drag & drop your prescription here</p>
            <p className="drop-zone-sub">or <span className="drop-zone-link">click to browse</span></p>
            <p className="drop-zone-types">JPG · PNG · PDF · Max {MAX_FILE_MB} MB</p>
          </div>
        </div>
      )}

      <Form.Control
        ref={fileRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.pdf"
        className="d-none"
        onChange={(e) => onFile(e.target.files[0] || null)}
        id="prescription-file-input"
      />
      {error && <div className="field-error mt-2"><FaExclamationTriangle className="me-1" />{error}</div>}
    </div>
  );
}
