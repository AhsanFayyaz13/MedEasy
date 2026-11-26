const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { setup, teardown, reset, tokenFor, createUser } = require('./helpers');

let app;
before(async () => {
  app = await setup();
});
after(teardown);
beforeEach(reset);

const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });
const inbox = async (user) => (await request(app).get('/api/notifications').set(auth(user))).body;

async function people() {
  const patient = await createUser({ name: 'Sara Patient', email: 'sara@example.com' });
  const other = await createUser({ name: 'Other Patient' });
  const doctor = await createUser({ name: 'Dr. Ahmed', role: 'doctor', isVerifiedProfile: true, specialty: 'Cardiology' });
  const admin = await createUser({ name: 'Admin', role: 'admin' });
  return { patient, other, doctor, admin };
}

async function appointment(patient, doctor) {
  const date = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const Appointment = require('../models/Appointment');
  return Appointment.create({ patientId: patient._id, doctorId: doctor._id, date, time: '10:00', status: 'completed' });
}

async function order(patient, status = 'delivered') {
  const Order = require('../models/Order');
  return Order.create({
    userId: patient._id,
    orderNumber: `ME-T${Math.floor(Math.random() * 1e6)}`,
    items: [],
    totalAmount: 100,
    status,
    shippingAddress: { firstName: 'Sara', lastName: 'P', address: 'Street 1', city: 'Lahore', phone: '03001234567' },
  });
}

describe('feedback and complaints', () => {
  it('stores site feedback and shows it to admins only', async () => {
    const { patient, admin } = await people();
    const sent = await request(app).post('/api/feedback').set(auth(patient)).send({ kind: 'site', category: 'bug', subject: 'Search', text: 'Search shows nothing for insulin.', rating: 3 });
    assert.equal(sent.status, 201);

    assert.equal((await request(app).get('/api/feedback').set(auth(patient))).status, 403);
    const list = await request(app).get('/api/feedback').set(auth(admin));
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 1);
    const [item] = list.body.items;
    assert.equal(item.category, 'bug');
    assert.equal(item.rating, 3);
    assert.deepEqual(item.author, { name: 'Sara Patient', email: 'sara@example.com' });
  });

  it('validates the form', async () => {
    const { patient } = await people();
    const short = await request(app).post('/api/feedback').set(auth(patient)).send({ kind: 'site', subject: 'x', text: 'short' });
    assert.equal(short.status, 400);
    const unknown = await request(app).post('/api/feedback').set(auth(patient)).send({ kind: 'nope', text: 'something long enough' });
    assert.equal(unknown.status, 400);
  });

  it('accepts a doctor complaint only from that appointment’s patient and alerts admins', async () => {
    const { patient, other, doctor, admin } = await people();
    const apt = await appointment(patient, doctor);
    const body = { kind: 'doctor', appointmentId: String(apt._id), category: 'no-show', text: 'The doctor never joined the call.' };

    assert.equal((await request(app).post('/api/feedback').set(auth(other)).send(body)).status, 403);
    assert.equal((await request(app).post('/api/feedback').set(auth(patient)).send(body)).status, 201);
    await settle();

    const alerts = (await inbox(admin)).items;
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].text, /complaint from Sara Patient about consultation \(Dr\. Ahmed/);
    assert.equal(alerts[0].link, '/admin?tab=audits');

    const [item] = (await request(app).get('/api/feedback').set(auth(admin))).body.items;
    assert.equal(item.doctor.name, 'Dr. Ahmed');
    assert.equal(item.doctor.specialty, 'Cardiology');
    assert.equal(item.status, 'open');
  });

  it('lets admins resolve a complaint and tells the patient', async () => {
    const { patient, doctor, admin } = await people();
    const apt = await appointment(patient, doctor);
    await request(app).post('/api/feedback').set(auth(patient)).send({ kind: 'doctor', appointmentId: String(apt._id), text: 'Rude and dismissive throughout.' });
    const [item] = (await request(app).get('/api/feedback').set(auth(admin))).body.items;

    assert.equal((await request(app).put(`/api/feedback/${item.id}`).set(auth(patient)).send({})).status, 403);
    const done = await request(app).put(`/api/feedback/${item.id}`).set(auth(admin)).send({ action: 'sanction' });
    assert.equal(done.status, 200);
    assert.equal(done.body.status, 'resolved');
    assert.equal(done.body.action, 'sanction');
    await settle();

    const alerts = (await inbox(patient)).items;
    assert.equal(alerts.length, 1);
    assert.match(alerts[0].text, /has been reviewed/);
  });

  it('takes order complaints and one rating per delivered order', async () => {
    const { patient, other, admin } = await people();
    const delivered = await order(patient);
    const pending = await order(patient, 'pending');

    assert.equal((await request(app).post('/api/feedback').set(auth(patient)).send({ kind: 'rating', orderId: String(pending._id), rating: 5 })).status, 400);
    assert.equal((await request(app).post('/api/feedback').set(auth(other)).send({ kind: 'rating', orderId: String(delivered._id), rating: 5 })).status, 403);
    assert.equal((await request(app).post('/api/feedback').set(auth(patient)).send({ kind: 'rating', orderId: String(delivered._id), rating: 2, text: 'Slow' })).status, 201);
    assert.equal((await request(app).post('/api/feedback').set(auth(patient)).send({ kind: 'rating', orderId: String(delivered._id), rating: 4, text: 'Fine after all' })).status, 201);
    assert.equal(
      (await request(app).post('/api/feedback').set(auth(patient)).send({ kind: 'order', orderId: String(delivered._id), category: 'wrong-medicine', text: 'I got the wrong strength.' })).status,
      201
    );

    const ratings = (await request(app).get('/api/feedback').query({ kind: 'rating' }).set(auth(admin))).body.items;
    assert.equal(ratings.length, 1, 'rating again replaces the earlier rating');
    assert.equal(ratings[0].rating, 4);
    assert.equal(ratings[0].order.ref, delivered.orderNumber);

    const complaints = (await request(app).get('/api/feedback').query({ kind: 'order' }).set(auth(admin))).body.items;
    assert.equal(complaints[0].category, 'wrong-medicine');
  });

  it('requires sign-in', async () => {
    assert.equal((await request(app).post('/api/feedback').send({ kind: 'site', subject: 'Hi', text: 'Long enough text here.' })).status, 401);
  });
});
