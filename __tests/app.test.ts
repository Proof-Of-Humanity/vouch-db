import request from 'supertest';
import app from '../src/app';

jest.mock('../src/models/Vouch', () => ({ get: jest.fn() }));

describe('App Test', () => {
  test('GET /random-url should return 404', done => {
    request(app).get('/reset')
      .expect(404, done);
  });

  test('GET /vouch/all should return 200', done => {
    const res = request(app).get('/vouch/all');
    res.then(a => console.info(a));
    res.expect(200, done);
  });
});
