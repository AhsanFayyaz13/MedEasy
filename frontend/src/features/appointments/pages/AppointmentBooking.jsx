import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCalendar, FiPlusCircle } from 'react-icons/fi';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { fetchDoctors, bookAppointment, fetchMyAppointments, cancelAppointment } from '../../../services/api/appointmentService';
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import { notifySelf, sendNotification } from '../../../lib/notifications';
import ReviewSection from '../../reviews/components/ReviewSection';
import BookingForm from '../components/BookingForm';
import AppointmentCard from '../components/AppointmentCard';
import ReportIssueModal from '../components/ReportIssueModal';
import ConsultationChat from '../components/ConsultationChat';
import { fmtDate } from '../lib/appointmentUtils';
import './AppointmentBooking.css';

const shortId = (id) => String(id).slice(-6);

export default function AppointmentBooking() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [doctors, setDoctors] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [lastBooked, setLastBooked] = useState(null);

  const [myApts, setMyApts] = useState([]);
  const [aptsState, setAptsState] = useState({ loading: true, error: null });
  const [cancelling, setCancelling] = useState(null);
  const [chatApt, setChatApt] = useState(null);
  const [reportApt, setReportApt] = useState(null);

  const loadMyApts = useCallback(async () => {
    setAptsState({ loading: true, error: null });
    try {
      setMyApts(await fetchMyAppointments());
      setAptsState({ loading: false, error: null });
    } catch (e) {
      setAptsState({ loading: false, error: e.message || 'Could not load your appointments.' });
    }
  }, []);

  useEffect(() => {
    fetchDoctors()
      .then(setDoctors)
      .catch((e) => toast.error(e.message));
    loadMyApts();
  }, [toast, loadMyApts]);

  // Deep link from a notification: ?chat=<appointmentId>
  const chatParam = searchParams.get('chat');
  const [handledChat, setHandledChat] = useState(null);
  if (chatParam && chatParam !== handledChat && myApts.length) {
    setHandledChat(chatParam);
    const found = myApts.find((a) => [String(a.id), `#APT-${a.id}`, `APT-${a.id}`].includes(chatParam));
    if (found) setChatApt(found);
  }

  const bookedSlotsFor = (doctorId, date) =>
    myApts
      .filter((a) => a.doctorId === doctorId && a.status === 'scheduled' && String(a.date).slice(0, 10) === date)
      .map((a) => a.time);

  const handleBook = async (payload) => {
    try {
      const appt = await bookAppointment(payload);
      setLastBooked(appt);
      toast.success('Appointment booked successfully!');
      notifySelf(user, {
        text: `Booking confirmed: ${appt.doctorName} on ${fmtDate(appt.date)} at ${appt.time}.`,
        emoji: 'booking',
        link: `/appointments/book?chat=${appt.id}`,
      });
      await loadMyApts();
      return true;
    } catch (e) {
      toast.error(e.message || 'Booking failed.');
      return false;
    }
  };

  const handleCancel = async (id) => {
    setCancelling(id);
    try {
      await cancelAppointment(id);
      setMyApts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)));
      toast.success('Appointment cancelled.');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCancelling(null);
    }
  };

  const handleReport = async ({ issueType, details }) => {
    try {
      const all = JSON.parse(localStorage.getItem('medeasy_doctor_reports') || '[]');
      all.push({
        id: `rep-${Date.now()}`,
        appointmentId: reportApt.id,
        doctorId: reportApt.doctorId,
        doctorName: reportApt.doctorName,
        specialty: reportApt.specialty,
        patientName: user?.name || 'Patient',
        patientEmail: user?.email || '',
        issueType,
        details,
        status: 'pending',
        time: Date.now(),
      });
      localStorage.setItem('medeasy_doctor_reports', JSON.stringify(all));
      sendNotification('admin', null, {
        text: `Clinical complaint: ${user?.name || 'A patient'} reported Dr. ${reportApt.doctorName} (appointment #APT-${shortId(reportApt.id)}).`,
        emoji: 'complaint',
        link: '/admin?tab=audits',
      });
      toast.success('Your report has been submitted to the medical board.');
      setReportApt(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit the report.');
    }
  };

  const upcoming = myApts.filter((a) => a.status === 'scheduled');
  const past = myApts.filter((a) => a.status !== 'scheduled');

  const renderList = (list) =>
    list.map((a) => (
      <AppointmentCard key={a.id} appointment={a} cancelling={cancelling} onChat={setChatApt} onCancel={handleCancel} onReport={setReportApt} />
    ));

  return (
    <div className="appt-page">
      <PageMeta title="Book a doctor appointment" noindex />
      <div className="container">
        <PageHeader
          eyebrow="Appointments"
          title="Book a doctor"
          subtitle="Choose a verified doctor, pick a date and time, and confirm in seconds."
        />

        <div className="appt-layout">
          <Card as="section" className="appt-form-card" aria-labelledby="new-booking-title">
            <h2 id="new-booking-title" className="appt-section-title">
              <FiPlusCircle aria-hidden="true" /> New booking
            </h2>
            <BookingForm
              doctors={doctors}
              bookedSlotsFor={bookedSlotsFor}
              onBook={handleBook}
              onDoctorChange={setSelectedDoc}
              lastBooked={lastBooked}
              onDismissBooked={() => setLastBooked(null)}
            />
          </Card>

          <section aria-labelledby="my-apts-title">
            <h2 id="my-apts-title" className="appt-section-title">
              <FiCalendar aria-hidden="true" /> My appointments
            </h2>
            {aptsState.loading ? (
              <Card><Skeleton lines={6} /></Card>
            ) : aptsState.error ? (
              <ErrorState message={aptsState.error} onRetry={loadMyApts} />
            ) : myApts.length === 0 ? (
              <Card>
                <EmptyState icon={<FiCalendar />} title="No appointments yet" description="Book your first consultation using the form." />
              </Card>
            ) : (
              <div className="appt-list">
                {upcoming.length > 0 && <h3 className="appt-list__label">Upcoming</h3>}
                {renderList(upcoming)}
                {past.length > 0 && <h3 className="appt-list__label">Past & cancelled</h3>}
                {renderList(past)}
              </div>
            )}
          </section>
        </div>

        {selectedDoc && (
          <section className="appt-reviews" aria-labelledby="doc-reviews-title">
            <h2 id="doc-reviews-title">Reviews for {selectedDoc.name}</h2>
            <ReviewSection targetType="doctor" targetId={selectedDoc.id} />
          </section>
        )}
      </div>

      <ConsultationChat
        appointment={chatApt}
        role="patient"
        counterpart={chatApt?.doctorName}
        onClose={() => setChatApt(null)}
        buildMessage={() => ({ senderId: user?._id || user?.id, senderName: user?.name || 'Patient', senderRole: 'patient' })}
        onSent={() =>
          sendNotification('doctor', null, {
            text: `${user?.name || 'A patient'} sent you a message — appointment #APT-${shortId(chatApt.id)}.`,
            emoji: 'chat',
            link: `/doctor?tab=schedule&chat=${chatApt.id}`,
          })
        }
      />
      <ReportIssueModal key={reportApt?.id || 'none'} appointment={reportApt} onClose={() => setReportApt(null)} onSubmit={handleReport} />
    </div>
  );
}
