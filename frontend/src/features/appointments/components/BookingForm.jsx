import { useState } from 'react';
import { FiBriefcase, FiCalendar, FiCheckCircle, FiClock, FiStar } from 'react-icons/fi';
import { FaUserMd } from 'react-icons/fa';
import { Alert, Badge, Button, Input, Select, Textarea } from '../../../components/ui';
import { formatPrice } from '../../../lib/format';
import { BOOKING_WINDOW_DAYS, fmtDate, localDateString } from '../lib/appointmentUtils';

const today = () => localDateString(new Date());
const maxDate = () => localDateString(new Date(Date.now() + BOOKING_WINDOW_DAYS * 864e5));

/** Profile summary of the selected doctor (experience, rating, fee). */
export function DoctorSummary({ doctor }) {
  return (
    <div className="appt-doctor">
      <div className="appt-doctor__head">
        <span className="appt-doctor__avatar" aria-hidden="true"><FaUserMd /></span>
        <div>
          <p className="appt-doctor__name">
            {doctor.name} <Badge tone="success">Verified</Badge>
          </p>
          <p className="appt-doctor__specialty">{doctor.specialty}</p>
        </div>
      </div>
      <div className="appt-doctor__meta">
        <span><FiBriefcase aria-hidden="true" /> {doctor.experience ?? '—'} yrs experience</span>
        {doctor.rating ? <span><FiStar aria-hidden="true" /> {doctor.rating} / 5</span> : null}
      </div>
      <div className="appt-doctor__fee">
        <span>Consultation fee</span>
        <strong>{formatPrice(doctor.fee ?? doctor.consultationFee ?? 0)}</strong>
      </div>
    </div>
  );
}

/**
 * New-appointment form: specialty → doctor → date → slot → reason.
 * Calls onBook({ doctorId, date, time, reason }) and resets on success.
 */
export default function BookingForm({ doctors, bookedSlotsFor, onBook, onDoctorChange, lastBooked, onDismissBooked }) {
  const [specialty, setSpecialty] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({});
  const [booking, setBooking] = useState(false);

  const specialties = [...new Set(doctors.map((d) => d.specialty).filter(Boolean))].sort();
  const options = (specialty ? doctors.filter((d) => d.specialty === specialty) : doctors).map((d) => ({
    value: String(d.id),
    label: `${d.name} — ${d.specialty}`,
  }));
  const selected = doctors.find((d) => String(d.id) === doctorId);
  const booked = selected && date ? bookedSlotsFor(selected.id, date) : [];
  const slots = selected && date ? (selected.slots || []).filter((s) => !booked.includes(s)) : [];

  const pickDoctor = (id) => {
    setDoctorId(id);
    setSlot('');
    onDoctorChange?.(doctors.find((d) => String(d.id) === id) || null);
  };

  const validate = () => {
    const e = {};
    if (!doctorId) e.doctor = 'Please select a doctor.';
    if (!date) e.date = 'Please pick a date.';
    else {
      const picked = new Date(`${date}T00:00:00`);
      if (Number.isNaN(picked.getTime())) e.date = 'Please enter a valid date.';
      else if (picked < new Date(`${today()}T00:00:00`)) e.date = 'You can’t book a date in the past.';
      else if (picked > new Date(`${maxDate()}T00:00:00`)) e.date = `Appointments can be booked up to ${BOOKING_WINDOW_DAYS} days ahead.`;
    }
    if (!slot) e.slot = 'Please choose a time slot.';
    return e;
  };

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBooking(true);
    try {
      const ok = await onBook({ doctorId: Number(doctorId) || doctorId, date, time: slot, reason });
      if (ok) {
        setSpecialty('');
        pickDoctor('');
        setDate('');
        setReason('');
      }
    } finally {
      setBooking(false);
    }
  };

  return (
    <form noValidate onSubmit={submit}>
      {lastBooked && (
        <Alert tone="success" title="Appointment booked" onClose={onDismissBooked}>
          {lastBooked.doctorName} on {fmtDate(lastBooked.date)} at {lastBooked.time}.
        </Alert>
      )}

      <Select
        label="Specialty"
        value={specialty}
        placeholder="All specialties"
        options={specialties}
        onChange={(e) => {
          setSpecialty(e.target.value);
          pickDoctor('');
        }}
      />
      <Select
        label="Doctor"
        required
        value={doctorId}
        placeholder={doctors.length ? 'Select a doctor…' : 'No doctors available yet'}
        options={options}
        onChange={(e) => pickDoctor(e.target.value)}
        error={errors.doctor}
      />

      {selected && <DoctorSummary doctor={selected} />}

      <Input
        type="date"
        label={<><FiCalendar aria-hidden="true" /> Date</>}
        required
        min={today()}
        max={maxDate()}
        value={date}
        onChange={(e) => {
          setDate(e.target.value);
          setSlot('');
        }}
        error={errors.date}
        hint={`You can book up to ${BOOKING_WINDOW_DAYS} days ahead.`}
      />

      <fieldset className="appt-slots">
        <legend className="ui-field__label">
          <FiClock aria-hidden="true" /> Time slot <span className="ui-field__required" aria-hidden="true">*</span>
        </legend>
        {!selected || !date ? (
          <p className="ui-field__hint">Select a doctor and date first.</p>
        ) : slots.length === 0 ? (
          <p className="ui-field__hint">No free slots on this day — try another date.</p>
        ) : (
          <div className="appt-slots__grid" role="radiogroup" aria-label="Available time slots">
            {slots.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={slot === s}
                className={`appt-slot${slot === s ? ' is-selected' : ''}`}
                onClick={() => setSlot(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {errors.slot && <p className="ui-field__error" role="alert">{errors.slot}</p>}
      </fieldset>

      <Textarea
        label="Reason for visit"
        hint="Optional — helps the doctor prepare."
        rows={3}
        maxLength={500}
        placeholder="Describe your symptoms or reason for the visit…"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />

      <Button type="submit" block size="lg" loading={booking} leftIcon={<FiCheckCircle aria-hidden="true" />}>
        Confirm booking
      </Button>
    </form>
  );
}
