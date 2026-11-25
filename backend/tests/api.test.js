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

const validAddress = { firstName: 'Ali', lastName: 'Khan', address: 'House 1, Street 2', city: 'Lahore', phone: '03001234567' };

describe('health & errors', () => {
  it('responds to /api/health', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
  });

  it('returns a consistent JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.message);
  });

  it('sets security headers and hides x-powered-by', async () => {
    const res = await request(app).get('/api/health');
    assert.equal(res.headers['x-powered-by'], undefined);
    assert.ok(res.headers['x-content-type-options']);
  });

  it('rejects malformed ObjectIds with 400 instead of 500', async () => {
    const res = await request(app).get('/api/medicines/not-an-id');
    assert.equal(res.status, 400);
  });
});

describe('registration security', () => {
  const base = { name: 'Eve Attacker', phone: '03001112222', password: 'Password123!', verificationChannel: 'phone', acceptTerms: true };

  it('refuses self-registration as admin', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...base, role: 'admin' });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /account type/i);
  });

  it('refuses self-registration as staff pharmacist', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...base, role: 'pharmacist' });
    assert.equal(res.status, 400);
  });

  it('requires acceptance of the terms', async () => {
    const { acceptTerms, ...noTerms } = base; // eslint-disable-line no-unused-vars
    const res = await request(app).post('/api/auth/register').send(noTerms);
    assert.equal(res.status, 400);
    assert.match(res.body.message, /terms/i);
  });

  it('stores only hashed password and OTP for pending users', async () => {
    const res = await request(app).post('/api/auth/register').send(base);
    assert.equal(res.status, 200);
    const PendingUser = require('../models/PendingUser');
    const pending = await PendingUser.findOne({});
    assert.match(pending.password, /^\$2[aby]\$/);
    assert.match(pending.verificationCode, /^[a-f0-9]{64}$/);
    assert.ok(pending.termsAcceptedAt instanceof Date);
  });

  it('locks a pending registration after 5 wrong codes', async () => {
    await request(app).post('/api/auth/register').send(base);
    for (let i = 0; i < 5; i += 1) {
      const r = await request(app).post('/api/auth/verify-registration').send({ phone: base.phone, code: '000000' });
      assert.equal(r.status, 400);
    }
    const locked = await request(app).post('/api/auth/verify-registration').send({ phone: base.phone, code: '000000' });
    assert.equal(locked.status, 429);
  });

  it('rejects NoSQL operator injection in login', async () => {
    const res = await request(app).post('/api/auth/login').send({ identifier: { $gt: '' }, password: { $gt: '' } });
    assert.equal(res.status, 400);
  });
});

describe('authentication & authorization', () => {
  it('rejects suspended users even with a valid token', async () => {
    const user = await createUser({ status: 'suspended' });
    const res = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${tokenFor(user)}`);
    assert.equal(res.status, 403);
  });

  it('does not let doctors self-verify via profile update', async () => {
    const doc = await createUser({ role: 'doctor', isVerifiedProfile: false });
    const res = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${tokenFor(doc)}`)
      .send({ specialty: 'Cardiology', pmcRegistration: 'PMC-1', clinicAddress: 'Somewhere' });
    assert.equal(res.status, 200);
    assert.equal(res.body.isVerifiedProfile, false);
  });

  it('blocks non-admins from admin routes', async () => {
    const user = await createUser();
    const res = await request(app).get('/api/admin/users/all').set('Authorization', `Bearer ${tokenFor(user)}`);
    assert.equal(res.status, 403);
  });

  it('strips unknown fields when staff create medicines (mass assignment)', async () => {
    const admin = await createUser({ role: 'admin' });
    const res = await request(app)
      .post('/api/medicines')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'X', description: 'Y', category: 'Z', price: 10, stock: 5, _id: '507f1f77bcf86cd799439011', hacked: true });
    assert.equal(res.status, 201);
    assert.notEqual(res.body._id, '507f1f77bcf86cd799439011');
    assert.equal(res.body.hacked, undefined);
  });
});

describe('medicines', () => {
  it('treats search input literally (no regex injection)', async () => {
    await createMedicine();
    const res = await request(app).get('/api/medicines').query({ search: '(a+)+$' });
    assert.equal(res.status, 200);
    assert.equal(res.body.medicines.length, 0);
  });

  it('clamps oversized page sizes instead of failing', async () => {
    await createMedicine();
    const res = await request(app).get('/api/medicines').query({ limit: 100000 });
    assert.equal(res.status, 200);
    assert.equal(res.body.medicines.length, 1);
  });

  it('rejects non-numeric page sizes', async () => {
    const res = await request(app).get('/api/medicines').query({ limit: 'abc' });
    assert.equal(res.status, 400);
  });
});

describe('orders', () => {
  it('uses database prices and decrements stock', async () => {
    const patient = await createUser();
    const med = await createMedicine({ price: 50, stock: 5 });
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ items: [{ medicineId: med._id.toString(), quantity: 2, price: 1 }], shippingAddress: validAddress });
    assert.equal(res.status, 201);
    assert.equal(res.body.totalAmount, 100);
    const Medicine = require('../models/Medicine');
    assert.equal((await Medicine.findById(med._id)).stock, 3);
  });

  it('never oversells under concurrent orders', async () => {
    const med = await createMedicine({ stock: 3 });
    const patients = await Promise.all(Array.from({ length: 6 }, () => createUser()));
    const results = await Promise.all(
      patients.map((p) =>
        request(app)
          .post('/api/orders')
          .set('Authorization', `Bearer ${tokenFor(p)}`)
          .send({ items: [{ medicineId: med._id.toString(), quantity: 1 }], shippingAddress: validAddress })
      )
    );
    assert.equal(results.filter((r) => r.status === 201).length, 3);
    const Medicine = require('../models/Medicine');
    assert.equal((await Medicine.findById(med._id)).stock, 0);
  });

  it('rejects zero or negative quantities', async () => {
    const patient = await createUser();
    const med = await createMedicine();
    const res = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ items: [{ medicineId: med._id.toString(), quantity: -5 }], shippingAddress: validAddress });
    assert.equal(res.status, 400);
  });

  it('restocks exactly once when an order is cancelled twice', async () => {
    const patient = await createUser();
    const med = await createMedicine({ stock: 5 });
    const auth = { Authorization: `Bearer ${tokenFor(patient)}` };
    const order = await request(app).post('/api/orders').set(auth).send({ items: [{ medicineId: med._id.toString(), quantity: 2 }], shippingAddress: validAddress });
    await Promise.all([request(app).delete(`/api/orders/${order.body._id}`).set(auth), request(app).delete(`/api/orders/${order.body._id}`).set(auth)]);
    const Medicine = require('../models/Medicine');
    assert.equal((await Medicine.findById(med._id)).stock, 5);
  });

  it('rejects invalid order status values', async () => {
    const admin = await createUser({ role: 'admin' });
    const res = await request(app)
      .put('/api/orders/507f1f77bcf86cd799439011/status')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: 'hacked' });
    assert.equal(res.status, 400);
  });
});

describe('prescription orders', () => {
  it('accepts a pending prescription but blocks confirmation until it is verified', async () => {
    const Prescription = require('../models/Prescription');
    const patient = await createUser();
    const pharmacist = await createUser({ role: 'pharmacist' });
    const med = await createMedicine({ requiresPrescription: true, stock: 5 });
    const rx = await Prescription.create({ userId: patient._id, fileUrl: 'https://example.com/rx.jpg', status: 'pending' });

    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ items: [{ medicineId: med._id.toString(), quantity: 1 }], prescriptionId: rx._id.toString(), shippingAddress: validAddress });
    assert.equal(order.status, 201);

    const staff = { Authorization: `Bearer ${tokenFor(pharmacist)}` };
    const blocked = await request(app).put(`/api/orders/${order.body._id}/status`).set(staff).send({ status: 'confirmed' });
    assert.equal(blocked.status, 400);

    rx.status = 'verified';
    await rx.save();
    const ok = await request(app).put(`/api/orders/${order.body._id}/status`).set(staff).send({ status: 'confirmed' });
    assert.equal(ok.status, 200);
  });

  it('stores the reason when a patient cancels their order', async () => {
    const patient = await createUser();
    const med = await createMedicine({ stock: 5 });
    const auth = { Authorization: `Bearer ${tokenFor(patient)}` };
    const order = await request(app).post('/api/orders').set(auth).send({ items: [{ medicineId: med._id.toString(), quantity: 2 }], shippingAddress: validAddress });
    const res = await request(app).delete(`/api/orders/${order.body._id}`).set(auth).send({ reason: 'Ordered by mistake' });
    assert.equal(res.status, 200);
    assert.equal(res.body.order.cancellationReason, 'Ordered by mistake');
    const Medicine = require('../models/Medicine');
    assert.equal((await Medicine.findById(med._id)).stock, 5);
  });

  it('restocks when staff cancel an order, and cannot reopen it', async () => {
    const patient = await createUser();
    const pharmacist = await createUser({ role: 'pharmacist' });
    const med = await createMedicine({ stock: 5 });
    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ items: [{ medicineId: med._id.toString(), quantity: 2 }], shippingAddress: validAddress });
    const staff = { Authorization: `Bearer ${tokenFor(pharmacist)}` };
    const res = await request(app).put(`/api/orders/${order.body._id}/status`).set(staff).send({ status: 'cancelled', reason: 'Out of stock' });
    assert.equal(res.body.cancellationReason, 'Out of stock');
    const Medicine = require('../models/Medicine');
    assert.equal((await Medicine.findById(med._id)).stock, 5);
    const reopen = await request(app).put(`/api/orders/${order.body._id}/status`).set(staff).send({ status: 'pending' });
    assert.equal(reopen.status, 400);
  });
});

describe('prescriptions', () => {
  it('keeps the patient note for the pharmacist', async () => {
    const patient = await createUser();
    const res = await request(app)
      .post('/api/prescriptions/upload')
      .set('Authorization', `Bearer ${tokenFor(patient)}`)
      .send({ fileUrl: 'https://example.com/rx.jpg', notes: 'For Augmentin 625' });
    assert.equal(res.status, 201);
    assert.equal(res.body.notes, 'For Augmentin 625');
  });
});

describe('reviews', () => {
  it('only lets patients review doctors they have consulted', async () => {
    const patient = await createUser();
    const doctor = await createUser({ role: 'doctor' });
    const auth = { Authorization: `Bearer ${tokenFor(patient)}` };
    const body = { targetType: 'doctor', targetId: doctor._id.toString(), rating: 5, comment: 'Great' };
    assert.equal((await request(app).post('/api/reviews').set(auth).send(body)).status, 403);
    const Appointment = require('../models/Appointment');
    await Appointment.create({ patientId: patient._id, doctorId: doctor._id, date: new Date(), time: '10:00', status: 'completed' });
    assert.equal((await request(app).post('/api/reviews').set(auth).send(body)).status, 201);
  });

  it('allows one review per user per target and computes the average', async () => {
    const user = await createUser();
    const med = await createMedicine();
    const auth = { Authorization: `Bearer ${tokenFor(user)}` };
    const body = { targetType: 'medicine', targetId: med._id.toString(), rating: 4 };
    assert.equal((await request(app).post('/api/reviews').set(auth).send(body)).status, 201);
    assert.equal((await request(app).post('/api/reviews').set(auth).send(body)).status, 409);
    const avg = await request(app).get(`/api/reviews/medicine/${med._id}/average`);
    assert.deepEqual(avg.body, { averageRating: 4, totalReviews: 1 });
  });
});

describe('CORS', () => {
  it('rejects unknown origins', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    assert.equal(res.status, 403);
  });

  it('allows the production site origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://medeasy.systems');
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://medeasy.systems');
  });
});
