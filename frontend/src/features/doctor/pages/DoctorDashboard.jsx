import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiCalendar, FiFileText, FiUsers } from 'react-icons/fi';
import { FaUserMd } from 'react-icons/fa';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { fetchDoctorAppointments, completeAppointment, cancelAppointment } from '../../../services/api/appointmentService';
import DashboardLayout from '../../../components/layout/DashboardLayout/DashboardLayout';
import useDashboardTab from '../../../components/layout/DashboardLayout/useDashboardTab';
import { Button } from '../../../components/ui';
import PageMeta from '../../../components/seo/PageMeta';
import ConsultationChat from '../../appointments/components/ConsultationChat';
import { sendNotification } from '../../../lib/notifications';
import ConsultationModal, { PrescriptionViewModal } from '../components/ConsultationModal';
import OverviewTab from '../components/OverviewTab';
import ScheduleTab from '../components/ScheduleTab';
import PrescribeTab from '../components/PrescribeTab';
import PatientsTab from '../components/PatientsTab';
import './DoctorDashboard.css';

const SECTIONS = [
  { key: 'overview', label: 'Overview', icon: <FiActivity /> },
  { key: 'schedule', label: 'My schedule', icon: <FiCalendar /> },
  { key: 'prescribe', label: 'Issue prescription', icon: <FiFileText /> },
  { key: 'patients', label: 'My patients', icon: <FiUsers /> },
];

const RESCHEDULE_TEMPLATE =
  'I am not available at your selected date/time. Would you be comfortable rescheduling to [Day] at [Time] instead? Let me know so we can consult.';

const shortId = (id) => String(id).slice(-6);

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [active, setActive] = useDashboardTab(SECTIONS);
  const [searchParams] = useSearchParams();

  const [apts, setApts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null); // appointment being completed
  const [viewRx, setViewRx] = useState(null);
  const [chatApt, setChatApt] = useState(null);
  const [chatDraft, setChatDraft] = useState('');

  const doctorName = user?.name || 'Doctor';
  const DOCTOR_ID = user?.id ?? user?._id ?? 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setApts(await fetchDoctorAppointments(DOCTOR_ID));
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [DOCTOR_ID, toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Deep link from a notification: /doctor?tab=schedule&chat=<appointmentId>
  const chatParam = searchParams.get('chat');
  const [handledChatParam, setHandledChatParam] = useState(null);
  if (chatParam && chatParam !== handledChatParam && apts.length) {
    const found = apts.find((a) => [String(a.id), `#APT-${a.id}`, `APT-${a.id}`].includes(chatParam));
    setHandledChatParam(chatParam);
    if (found) setChatApt(found);
  }

  const notifyPatient = (apt, text, emoji, link = '/appointments/book') =>
    sendNotification('patient', apt?.patientId, { text, emoji, link });

  const handleComplete = async ({ notes, prescription }) => {
    try {
      await completeAppointment(completing.id, { notes, prescription });
      // The API returns the raw document (no mapped id/patientName), so merge into the existing row.
      setApts((prev) => prev.map((a) => (a.id === completing.id ? { ...a, status: 'completed', notes, prescription } : a)));
      toast.success('Consultation recorded and e-prescription issued.');
      notifyPatient(completing, `E-prescription issued: Dr. ${doctorName} issued a prescription for appointment #APT-${shortId(completing.id)}.`, 'prescription');
      setCompleting(null);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleCancel = async (id) => {
    try {
      await cancelAppointment(id);
      const target = apts.find((a) => a.id === id);
      setApts((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'cancelled' } : a)));
      toast.success('Appointment cancelled.');
      notifyPatient(target, `Appointment cancelled: Dr. ${doctorName} cancelled appointment #APT-${shortId(id)}.`, 'cancel');
    } catch (e) {
      toast.error(e.message);
    }
  };

  /** Prescription pad: saves the prescription on the chosen open appointment (completing it). */
  const handleIssueIndependent = async ({ appointment, notes, prescription }) => {
    try {
      await completeAppointment(appointment.id, { notes, prescription });
      setApts((prev) => prev.map((a) => (a.id === appointment.id ? { ...a, status: 'completed', notes, prescription } : a)));
      toast.success(`Prescription issued to ${appointment.patientName}.`);
      notifyPatient(appointment, `E-prescription issued: Dr. ${doctorName} issued a prescription for appointment #APT-${shortId(appointment.id)}.`, 'prescription');
      setActive('schedule');
    } catch (e) {
      toast.error(e.message);
    }
  };

  const scheduledToday = apts.filter((a) => a.status === 'scheduled' && String(a.date).slice(0, 10) === new Date().toISOString().slice(0, 10)).length;

  return (
    <>
      <PageMeta title="Doctor dashboard" noindex />
      <DashboardLayout
        sections={SECTIONS.map((s) => (s.key === 'schedule' && scheduledToday ? { ...s, badge: scheduledToday } : s))}
        active={active}
        onSelect={setActive}
        identity={{ avatar: <FaUserMd />, name: `Dr. ${doctorName.replace(/^Dr\.?\s*/i, '')}`, role: user?.specialty || 'Consultant' }}
        subtitle={`Hello Dr. ${doctorName.replace(/^Dr\.?\s*/i, '').split(' ')[0]} — here’s your practice today.`}
      >
        {active === 'overview' && <OverviewTab apts={apts} loading={loading} setActive={setActive} openComplete={setCompleting} />}
        {active === 'schedule' && (
          <ScheduleTab apts={apts} loading={loading} openComplete={setCompleting} handleCancel={handleCancel} setViewRx={setViewRx} setChatApt={setChatApt} />
        )}
        {active === 'prescribe' && <PrescribeTab apts={apts} handleIssueIndependent={handleIssueIndependent} setActive={setActive} />}
        {active === 'patients' && <PatientsTab apts={apts} />}
      </DashboardLayout>

      <ConsultationModal key={completing?.id || 'none'} appointment={completing} onClose={() => setCompleting(null)} onSave={handleComplete} />
      <PrescriptionViewModal appointment={viewRx} onClose={() => setViewRx(null)} />

      <ConsultationChat
        appointment={chatApt}
        role="doctor"
        counterpart={chatApt?.patientName}
        onClose={() => setChatApt(null)}
        draft={chatDraft}
        setDraft={setChatDraft}
        buildMessage={() => ({ senderId: user?.id || user?._id, senderName: `Dr. ${doctorName}`, senderRole: 'doctor' })}
        onSent={() =>
          notifyPatient(chatApt, `Dr. ${doctorName} replied to your message — appointment #APT-${shortId(chatApt.id)}.`, 'chat', `/appointments/book?chat=${chatApt.id}`)
        }
        toolbar={
          <Button variant="secondary" size="sm" leftIcon={<FiAlertTriangle aria-hidden="true" />} onClick={() => setChatDraft(RESCHEDULE_TEMPLATE)}>
            Suggest rescheduling
          </Button>
        }
      />
    </>
  );
}
