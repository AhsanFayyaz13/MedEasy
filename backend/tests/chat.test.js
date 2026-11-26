const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown, reset, tokenFor, createUser, createMedicine } = require('./helpers');

let app;
before(async () => {
  app = await setup();
});
after(teardown);
beforeEach(reset);

// Notifications are written just after the response is sent.
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });
const inDays = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function book(patient, doctor, date = inDays(1)) {
  const res = await request(app).post('/api/appointments/book').set(auth(patient)).send({ doctorId: doctor._id.toString(), date, time: '10:00' });
  assert.equal(res.status, 201);
  return res.body;
}

async function people() {
  const patient = await createUser({ name: 'Sara Patient' });
  const doctor = await createUser({ name: 'Dr. Ahmed', role: 'doctor', isVerifiedProfile: true });
  return { patient, doctor };
}

const inbox = async (user) => (await request(app).get('/api/notifications').set(auth(user))).body;

describe('consultation chat', () => {
  it('delivers messages between the patient and the doctor and marks them read', async () => {
    const { patient, doctor } = await people();
    const apt = await book(patient, doctor);

    const sent = await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(patient)).send({ text: '  Should I fast before? ' });
    assert.equal(sent.status, 201);
    assert.equal(sent.body.text, 'Should I fast before?');
    assert.equal(sent.body.senderRole, 'patient');
    assert.equal(sent.body.sender, undefined, 'no internal ids in the response');

    const seen = await request(app).get(`/api/appointments/${apt._id}/messages`).set(auth(doctor));
    assert.equal(seen.status, 200);
    assert.equal(seen.body.canSend, true);
    assert.deepEqual(seen.body.messages.map((m) => m.text), ['Should I fast before?']);

    const again = await request(app).get(`/api/appointments/${apt._id}/messages`).set(auth(patient));
    assert.ok(again.body.messages[0].readAt, 'the doctor opening the chat marks it read');
  });

  it('returns only newer messages when asked', async () => {
    const { patient, doctor } = await people();
    const apt = await book(patient, doctor);
    const first = await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(patient)).send({ text: 'one' });
    await new Promise((r) => setTimeout(r, 10));
    await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(doctor)).send({ text: 'two' });
    const res = await request(app).get(`/api/appointments/${apt._id}/messages`).query({ after: first.body.createdAt }).set(auth(patient));
    assert.deepEqual(res.body.messages.map((m) => m.text), ['two']);
  });

  it('keeps other people out, and lets admins read without writing', async () => {
    const { patient, doctor } = await people();
    const stranger = await createUser();
    const otherDoctor = await createUser({ role: 'doctor', isVerifiedProfile: true });
    const admin = await createUser({ role: 'admin' });
    const apt = await book(patient, doctor);

    for (const user of [stranger, otherDoctor]) {
      assert.equal((await request(app).get(`/api/appointments/${apt._id}/messages`).set(auth(user))).status, 403);
      assert.equal((await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(user)).send({ text: 'hi' })).status, 403);
    }
    const read = await request(app).get(`/api/appointments/${apt._id}/messages`).set(auth(admin));
    assert.equal(read.status, 200);
    assert.equal(read.body.canSend, false);
    assert.equal((await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(admin)).send({ text: 'hi' })).status, 403);
  });

  it('closes the chat when the appointment is cancelled', async () => {
    const { patient, doctor } = await people();
    const apt = await book(patient, doctor);
    await request(app).patch(`/api/appointments/${apt._id}`).set(auth(patient)).send({ status: 'cancelled' });
    const res = await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(doctor)).send({ text: 'hello' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'CHAT_CLOSED');
    assert.equal((await request(app).get(`/api/appointments/${apt._id}/messages`).set(auth(patient))).body.canSend, false);
  });

  it('closes the chat a few days after the appointment', async () => {
    const { patient, doctor } = await people();
    const Appointment = require('../models/Appointment');
    const apt = await Appointment.create({ patientId: patient._id, doctorId: doctor._id, date: new Date(Date.now() - 5 * 86400000), time: '10:00', status: 'completed' });
    const res = await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(patient)).send({ text: 'Thanks!' });
    assert.equal(res.status, 400);
  });

  it('rejects empty and oversized messages', async () => {
    const { patient, doctor } = await people();
    const apt = await book(patient, doctor);
    assert.equal((await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(patient)).send({ text: '   ' })).status, 400);
    assert.equal((await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(patient)).send({ text: 'x'.repeat(2001) })).status, 400);
  });

  it('groups unread messages into one alert, cleared when the chat is opened', async () => {
    const { patient, doctor } = await people();
    const apt = await book(patient, doctor);
    await settle();
    const before = (await inbox(doctor)).items.length; // the booking alert

    for (const text of ['one', 'two', 'three']) {
      await request(app).post(`/api/appointments/${apt._id}/messages`).set(auth(patient)).send({ text });
      await settle();
    }
    const box = await inbox(doctor);
    const chats = box.items.filter((n) => n.type === 'chat');
    assert.equal(box.items.length, before + 1);
    assert.equal(chats.length, 1);
    assert.match(chats[0].text, /Sara Patient sent you a message/);
    assert.equal(chats[0].link, `/doctor?tab=schedule&chat=${apt._id}`);
    assert.ok(!chats[0].text.includes('three'), 'the message itself is not copied into the alert');

    await request(app).get(`/api/appointments/${apt._id}/messages`).set(auth(doctor));
    const after = await inbox(doctor);
    assert.equal(after.items.find((n) => n.type === 'chat').read, true);
  });
});

describe('notifications', () => {
  it('tells the doctor about a booking and the patient about a cancellation', async () => {
    const { patient, doctor } = await people();
    const apt = await book(patient, doctor);
    await settle();
    const docBox = await inbox(doctor);
    assert.equal(docBox.unread, 1);
    assert.match(docBox.items[0].text, /New booking: Sara Patient/);

    await request(app).patch(`/api/appointments/${apt._id}`).set(auth(doctor)).send({ status: 'cancelled' });
    await settle();
    const patientBox = await inbox(patient);
    assert.equal(patientBox.items[0].type, 'cancel');
    assert.match(patientBox.items[0].text, /Dr\. Ahmed cancelled your appointment/);
    assert.equal((await inbox(doctor)).unread, 1, 'the doctor is not told about their own action');
  });

  it('marks one or all as read, and only for the recipient', async () => {
    const { patient, doctor } = await people();
    await book(patient, doctor);
    await book(patient, doctor, inDays(2));
    await settle();
    const [first] = (await inbox(doctor)).items;

    assert.equal((await request(app).put(`/api/notifications/${first.id}/read`).set(auth(patient))).status, 404);
    assert.equal((await request(app).put(`/api/notifications/${first.id}/read`).set(auth(doctor))).status, 200);
    assert.equal((await inbox(doctor)).unread, 1);
    await request(app).put('/api/notifications/read-all').set(auth(doctor));
    assert.equal((await inbox(doctor)).unread, 0);
    assert.equal((await inbox(patient)).items.length, 0);
  });

  it('tells approved pharmacies and admins about a new order, and the patient about its progress', async () => {
    const patient = await createUser();
    const pharmacy = await createUser({ role: 'pharmacy', isVerifiedProfile: true });
    const pendingPharmacy = await createUser({ role: 'pharmacy', isVerifiedProfile: false });
    const admin = await createUser({ role: 'admin' });
    const med = await createMedicine();

    const order = await request(app)
      .post('/api/orders')
      .set(auth(patient))
      .send({ items: [{ medicineId: med._id.toString(), quantity: 1 }], shippingAddress: { firstName: 'Ali', lastName: 'Khan', address: 'House 1', city: 'Lahore', phone: '03001234567' } });
    assert.equal(order.status, 201);
    await settle();
    assert.match((await inbox(pharmacy)).items[0].text, /New order ME-/);
    assert.equal((await inbox(pharmacy)).items[0].link, '/pharmacist?tab=orders');
    assert.equal((await inbox(admin)).items[0].link, '/admin?tab=orders');
    assert.equal((await inbox(pendingPharmacy)).items.length, 0);

    await request(app).put(`/api/orders/${order.body._id}/status`).set(auth(pharmacy)).send({ status: 'dispatched' });
    await settle();
    const box = await inbox(patient);
    assert.match(box.items[0].text, /is on its way/);
    assert.equal(box.items[0].link, `/orders/${order.body._id}`);
  });

  it('tells the patient when their prescription is reviewed', async () => {
    const patient = await createUser();
    const pharmacy = await createUser({ role: 'pharmacy', isVerifiedProfile: true });
    const up = await request(app).post('/api/prescriptions/upload').set(auth(patient)).send({ fileUrl: 'https://example.com/rx.jpg' });
    await settle();
    assert.match((await inbox(pharmacy)).items[0].text, /waiting for review/);

    await request(app).put(`/api/prescriptions/${up.body._id}/verify`).set(auth(pharmacy)).send({ status: 'rejected', rejectionReason: 'Signature missing' });
    await settle();
    assert.match((await inbox(patient)).items[0].text, /declined\. Reason: Signature missing/);
  });

  it('requires sign-in', async () => {
    assert.equal((await request(app).get('/api/notifications')).status, 401);
  });
});
