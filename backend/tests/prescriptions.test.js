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
const DAY = 86400000;

async function setupPeople() {
  const patient = await createUser({ name: 'Sara Patient' });
  const pharmacist = await createUser({ name: 'Pharm Ali', role: 'pharmacist' });
  const med = await createMedicine({ requiresPrescription: true, stock: 20 });
  return { patient, pharmacist, med };
}

async function prescription(patient, extra = {}) {
  const Prescription = require('../models/Prescription');
  return Prescription.create({ userId: patient._id, fileUrl: 'https://example.com/rx.jpg', ...extra });
}

const order = (patient, med, rx) =>
  request(app).post('/api/orders').set(auth(patient)).send({ items: [{ medicineId: String(med._id), quantity: 1 }], prescriptionId: String(rx._id), shippingAddress: address });

describe('prescription reuse', () => {
  it('lets a patient order with an approved prescription, once', async () => {
    const { patient, med } = await setupPeople();
    const rx = await prescription(patient, { status: 'verified' });

    const mine = await request(app).get('/api/prescriptions').set(auth(patient));
    assert.equal(mine.body[0].usable, true);
    assert.ok(mine.body[0].expiresAt);

    assert.equal((await order(patient, med, rx)).status, 201);
    const second = await order(patient, med, rx);
    assert.equal(second.status, 400);
    assert.equal(second.body.error.code, 'PRESCRIPTION_UNUSABLE');
    assert.match(second.body.message, /already been used/);

    const after = await request(app).get('/api/prescriptions').set(auth(patient));
    assert.equal(after.body[0].usable, false);
    assert.equal(after.body[0].orders.length, 1);
  });

  it('frees the prescription again if that order is cancelled', async () => {
    const { patient, med } = await setupPeople();
    const rx = await prescription(patient, { status: 'verified' });
    const first = await order(patient, med, rx);
    assert.equal((await request(app).delete(`/api/orders/${first.body._id}`).set(auth(patient))).status, 200);
    assert.equal((await order(patient, med, rx)).status, 201);
  });

  it('allows repeat orders when the pharmacist marks it refillable', async () => {
    const { patient, med } = await setupPeople();
    const rx = await prescription(patient, { status: 'verified', refillable: true });
    assert.equal((await order(patient, med, rx)).status, 201);
    assert.equal((await order(patient, med, rx)).status, 201);
  });

  it('refuses expired and declined prescriptions', async () => {
    const { patient, med } = await setupPeople();
    const old = await prescription(patient, { status: 'verified', uploadedAt: new Date(Date.now() - 31 * DAY) });
    const res = await order(patient, med, old);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /expired/);

    const refill = await prescription(patient, { status: 'verified', refillable: true, uploadedAt: new Date(Date.now() - 60 * DAY) });
    assert.equal((await order(patient, med, refill)).status, 201, 'refills last longer');

    const declined = await prescription(patient, { status: 'rejected' });
    assert.match((await order(patient, med, declined)).body.message, /declined/);
  });

  it('won’t delete a prescription an order relies on', async () => {
    const { patient, med } = await setupPeople();
    const rx = await prescription(patient);
    await order(patient, med, rx);
    assert.equal((await request(app).delete(`/api/prescriptions/${rx._id}`).set(auth(patient))).status, 400);
  });
});

describe('prescription review', () => {
  it('approves and confirms the attached order in one step', async () => {
    const { patient, pharmacist, med } = await setupPeople();
    const rx = await prescription(patient);
    const placed = await order(patient, med, rx);

    const queue = await request(app).get('/api/prescriptions').set(auth(pharmacist));
    assert.equal(queue.body[0].orders[0].orderNumber, placed.body.orderNumber);

    const res = await request(app).put(`/api/prescriptions/${rx._id}/verify`).set(auth(pharmacist)).send({ status: 'verified', confirmOrders: true });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.confirmedOrders.map((o) => o.status), ['confirmed']);

    const Order = require('../models/Order');
    assert.equal((await Order.findById(placed.body._id)).status, 'confirmed');
    await settle();
    const texts = (await request(app).get('/api/notifications').set(auth(patient))).body.items.map((n) => n.text);
    assert.ok(texts.some((t) => /was approved/.test(t)));
    assert.ok(texts.some((t) => /has been confirmed/.test(t)));
  });

  it('leaves the order pending without confirmOrders, and decisions are final', async () => {
    const { patient, pharmacist, med } = await setupPeople();
    const rx = await prescription(patient);
    const placed = await order(patient, med, rx);
    await request(app).put(`/api/prescriptions/${rx._id}/verify`).set(auth(pharmacist)).send({ status: 'verified', refillable: true });

    const Order = require('../models/Order');
    assert.equal((await Order.findById(placed.body._id)).status, 'pending');
    const again = await request(app).put(`/api/prescriptions/${rx._id}/verify`).set(auth(pharmacist)).send({ status: 'rejected' });
    assert.equal(again.status, 409);
  });

  it('shows reviewed prescriptions with who decided', async () => {
    const { patient, pharmacist } = await setupPeople();
    const a = await prescription(patient);
    await prescription(patient);
    await request(app).put(`/api/prescriptions/${a._id}/verify`).set(auth(pharmacist)).send({ status: 'verified', refillable: true });

    const reviewed = await request(app).get('/api/prescriptions').query({ view: 'reviewed' }).set(auth(pharmacist));
    assert.equal(reviewed.body.length, 1);
    assert.equal(reviewed.body[0].reviewedBy.name, 'Pharm Ali');
    assert.equal(reviewed.body[0].refillable, true);
    const queue = await request(app).get('/api/prescriptions').set(auth(pharmacist));
    assert.equal(queue.body.length, 1);
  });
});

describe('prescription files in lists', () => {
  it('leaves files stored in the record out of lists and serves them one at a time', async () => {
    const { patient, pharmacist } = await setupPeople();
    const other = await createUser({ name: 'Someone Else' });
    const Prescription = require('../models/Prescription');
    const big = `data:image/png;base64,${'A'.repeat(200000)}`;
    const stored = await Prescription.create({ userId: patient._id, fileUrl: big, status: 'verified', reviewedAt: new Date() });
    const linked = await Prescription.create({ userId: patient._id, fileUrl: 'https://example.com/rx.jpg', status: 'rejected', reviewedAt: new Date() });

    const reviewed = await request(app).get('/api/prescriptions?view=reviewed').set(auth(pharmacist));
    assert.equal(reviewed.status, 200);
    const byId = Object.fromEntries(reviewed.body.map((r) => [r._id, r]));
    assert.equal(byId[stored._id].fileUrl, undefined);
    assert.equal(byId[stored._id].fileInline, true);
    assert.equal(byId[linked._id].fileUrl, 'https://example.com/rx.jpg');
    assert.equal(byId[linked._id].fileInline, undefined);
    assert.ok(JSON.stringify(reviewed.body).length < 10000, 'the list stays small');

    const own = await request(app).get('/api/prescriptions').set(auth(patient));
    assert.equal(own.body.find((r) => r._id === String(stored._id)).fileInline, true);

    const file = await request(app).get(`/api/prescriptions/${stored._id}/file`).set(auth(pharmacist));
    assert.equal(file.status, 200);
    assert.equal(file.body.fileUrl, big);
    assert.equal((await request(app).get(`/api/prescriptions/${stored._id}/file`).set(auth(patient))).status, 200);
    assert.equal((await request(app).get(`/api/prescriptions/${stored._id}/file`).set(auth(other))).status, 403);
  });
});

describe('removing prescriptions', () => {
  it('lets the patient remove expired and declined prescriptions, keeping ones an order used', async () => {
    const { patient, pharmacist, med } = await setupPeople();
    const Prescription = require('../models/Prescription');
    const Order = require('../models/Order');
    const del = (rx) => request(app).delete(`/api/prescriptions/${rx._id}`).set(auth(patient));

    const current = await prescription(patient, { status: 'verified' });
    assert.equal((await del(current)).status, 400, 'an approved prescription that is still valid stays');

    const declined = await prescription(patient, { status: 'rejected' });
    assert.equal((await del(declined)).status, 200);
    assert.equal(await Prescription.exists({ _id: declined._id }), null, 'never used: deleted');

    const used = await prescription(patient, { status: 'verified' });
    const placed = await order(patient, med, used);
    assert.equal(placed.status, 201, JSON.stringify(placed.body));
    await Prescription.updateOne({ _id: used._id }, { uploadedAt: new Date(Date.now() - 31 * DAY) });
    assert.equal((await del(used)).status, 200);
    assert.equal((await Prescription.findById(used._id)).hiddenByPatient, true, 'used by an order: kept, hidden');
    assert.ok(await Order.exists({ prescriptionId: used._id }));

    const mine = await request(app).get('/api/prescriptions').set(auth(patient));
    assert.deepEqual(mine.body.map((r) => r._id), [String(current._id)]);
    const staff = await request(app).get('/api/prescriptions?view=reviewed').set(auth(pharmacist));
    assert.ok(staff.body.some((r) => r._id === String(used._id)), 'the pharmacy still sees it');
  });
});
