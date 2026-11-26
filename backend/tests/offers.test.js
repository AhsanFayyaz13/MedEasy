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

const settle = () => new Promise((resolve) => setTimeout(resolve, 150));
const auth = (user) => ({ Authorization: `Bearer ${tokenFor(user)}` });
const address = { firstName: 'Ali', lastName: 'Khan', address: 'House 1, Street 2', city: 'Lahore', phone: '03001234567' };

async function people() {
  const patient = await createUser({ name: 'Sara Patient' });
  const pharmacist = await createUser({ name: 'Pharm Ali', role: 'pharmacist' });
  const amox = await createMedicine({ name: 'Amoxil', requiresPrescription: true, stock: 20, price: 300 });
  const pana = await createMedicine({ name: 'Panadol', stock: 50, price: 50 });
  const Prescription = require('../models/Prescription');
  const rx = await Prescription.create({ userId: patient._id, fileUrl: 'https://example.com/rx.jpg' });
  return { patient, pharmacist, amox, pana, rx };
}

const sendOffer = (pharmacist, rx, body) => request(app).put(`/api/prescriptions/${rx._id}/offer`).set(auth(pharmacist)).send(body);
const accept = (patient, rx, body) => request(app).post(`/api/prescriptions/${rx._id}/offer/accept`).set(auth(patient)).send({ shippingAddress: address, ...body });

describe('pharmacy offers', () => {
  it('turns a prescription into an offer the patient accepts as a confirmed order', async () => {
    const { patient, pharmacist, amox, pana, rx } = await people();
    const sent = await sendOffer(pharmacist, rx, {
      items: [
        { medicineId: String(amox._id), quantity: 2, note: 'Written for 20 days, we have 15 days' },
        { medicineId: String(pana._id), quantity: 1, substituteFor: 'Calpol' },
      ],
      unavailable: [{ name: 'Brufen syrup', note: 'Out of stock this week' }],
      message: 'Call us if you have questions.',
    });
    assert.equal(sent.status, 200, JSON.stringify(sent.body));
    assert.equal(sent.body.status, 'verified', 'preparing an offer approves the prescription');
    assert.equal(sent.body.offerState, 'open');
    assert.equal(sent.body.offer.version, 1);
    assert.equal(sent.body.offer.items[0].price, 300);

    await settle();
    const Notification = require('../models/Notification');
    const alert = await Notification.findOne({ recipient: patient._id, type: 'prescription' });
    assert.match(alert.text, /2 items, Rs\. 650, 1 not available/);

    // The patient leaves the substitute out.
    const res = await accept(patient, rx, { version: 1, items: [String(amox._id)] });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.order.status, 'confirmed');
    assert.equal(res.body.order.totalAmount, 600 + 120);

    const Medicine = require('../models/Medicine');
    assert.equal((await Medicine.findById(amox._id)).stock, 18);
    assert.equal((await Medicine.findById(pana._id)).stock, 50);

    const again = await accept(patient, rx, { version: 1, items: [String(amox._id)] });
    assert.equal(again.status, 409);
    const Prescription = require('../models/Prescription');
    assert.deepEqual((await Prescription.findById(rx._id)).offer.chosen.map(String), [String(amox._id)], 'remembers what was ordered');
    const mine = await request(app).get('/api/prescriptions').set(auth(patient));
    assert.equal(mine.body[0].offerState, 'accepted');
    assert.equal(mine.body[0].usable, false, 'the prescription was used for that order');
  });

  it('honours the offered price and refuses a stale or expired offer', async () => {
    const { patient, pharmacist, amox, rx } = await people();
    await sendOffer(pharmacist, rx, { items: [{ medicineId: String(amox._id), quantity: 1 }] });
    await sendOffer(pharmacist, rx, { items: [{ medicineId: String(amox._id), quantity: 3 }], message: 'Updated' });

    const stale = await accept(patient, rx, { version: 1, items: [String(amox._id)] });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.error.code, 'OFFER_CHANGED');

    const Medicine = require('../models/Medicine');
    await Medicine.updateOne({ _id: amox._id }, { price: 999 });
    const ok = await accept(patient, rx, { version: 2, items: [String(amox._id)] });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.order.totalAmount, 3 * 300 + 120, 'the offered price, not the new one');
  });

  it('expires offers after 48 hours', async () => {
    const { patient, pharmacist, amox, rx } = await people();
    await sendOffer(pharmacist, rx, { items: [{ medicineId: String(amox._id), quantity: 1 }] });
    const Prescription = require('../models/Prescription');
    await Prescription.updateOne({ _id: rx._id }, { 'offer.expiresAt': new Date(Date.now() - 1000) });
    const res = await accept(patient, rx, { version: 1, items: [String(amox._id)] });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'OFFER_EXPIRED');
  });

  it('lets only the owner accept, and refuses more stock than there is', async () => {
    const { patient, pharmacist, amox, rx } = await people();
    const tooMany = await sendOffer(pharmacist, rx, { items: [{ medicineId: String(amox._id), quantity: 50 }] });
    assert.equal(tooMany.status, 400);
    assert.match(tooMany.body.message, /Only 20/);

    await sendOffer(pharmacist, rx, { items: [{ medicineId: String(amox._id), quantity: 1 }] });
    const other = await createUser({ name: 'Someone Else' });
    assert.equal((await accept(other, rx, { version: 1, items: [String(amox._id)] })).status, 403);
    assert.equal((await request(app).put(`/api/prescriptions/${rx._id}/offer`).set(auth(patient)).send({ items: [] })).status, 403);
  });

  it('lets the patient say no thanks, and the pharmacy revise it', async () => {
    const { patient, pharmacist, amox, rx } = await people();
    await sendOffer(pharmacist, rx, { items: [{ medicineId: String(amox._id), quantity: 1 }] });
    const no = await request(app).post(`/api/prescriptions/${rx._id}/offer/decline`).set(auth(patient));
    assert.equal(no.status, 200);
    assert.equal(no.body.offerState, 'declined');

    const offers = await request(app).get('/api/prescriptions?view=offers').set(auth(pharmacist));
    assert.equal(offers.body.length, 1);

    const revised = await sendOffer(pharmacist, rx, { items: [{ medicineId: String(amox._id), quantity: 2 }] });
    assert.equal(revised.body.offerState, 'open');
    assert.equal(revised.body.offer.version, 2);
  });
});

describe('prescription conversation', () => {
  it('lets the patient and the pharmacy message each other', async () => {
    const { patient, pharmacist, rx } = await people();
    const ask = await request(app).post(`/api/prescriptions/${rx._id}/messages`).set(auth(patient)).send({ text: 'Do you have the syrup?' });
    assert.equal(ask.status, 201);
    const reply = await request(app).post(`/api/prescriptions/${rx._id}/messages`).set(auth(pharmacist)).send({ text: 'Tomorrow, yes.' });
    assert.equal(reply.status, 201);
    assert.equal(reply.body.senderRole, 'pharmacy');

    const list = await request(app).get(`/api/prescriptions/${rx._id}/messages`).set(auth(patient));
    assert.deepEqual(list.body.messages.map((m) => m.senderRole), ['patient', 'pharmacy']);
    assert.equal(list.body.canSend, true);

    const stranger = await createUser({ name: 'Nosy' });
    assert.equal((await request(app).get(`/api/prescriptions/${rx._id}/messages`).set(auth(stranger))).status, 403);

    await settle();
    const Notification = require('../models/Notification');
    assert.ok(await Notification.findOne({ recipient: patient._id, thread: `chat:rx:${rx._id}` }));
  });
});

describe('prescription from a consultation', () => {
  it('sends the doctor’s prescription to the pharmacy once', async () => {
    const patient = await createUser({ name: 'Sara Patient' });
    const doctor = await createUser({ name: 'Dr Who', role: 'doctor', isVerifiedProfile: true });
    const Appointment = require('../models/Appointment');
    const appt = await Appointment.create({ patientId: patient._id, doctorId: doctor._id, date: new Date(), time: '10:00 AM', status: 'completed', prescription: 'Amoxil 500mg twice daily, 5 days' });

    const sent = await request(app).post(`/api/prescriptions/from-appointment/${appt._id}`).set(auth(patient));
    assert.equal(sent.status, 201, JSON.stringify(sent.body));
    assert.equal(sent.body.source, 'consultation');
    assert.equal(sent.body.doctorText, 'Amoxil 500mg twice daily, 5 days');

    const again = await request(app).post(`/api/prescriptions/from-appointment/${appt._id}`).set(auth(patient));
    assert.equal(again.status, 200);
    assert.equal(again.body.alreadySent, true);

    const other = await createUser({ name: 'Someone Else' });
    assert.equal((await request(app).post(`/api/prescriptions/from-appointment/${appt._id}`).set(auth(other))).status, 403);
  });
});
