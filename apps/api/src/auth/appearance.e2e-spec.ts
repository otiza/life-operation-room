import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module.js';

function cookieFrom(response: request.Response): string {
  const raw = response.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const session = list.find((item) => item.startsWith('tiza_session='));
  if (!session) throw new Error('Missing session cookie');
  return session.split(';')[0];
}

describe('Appearance e2e', () => {
  let app: INestApplication;
  let cookie: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
    const signup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: `appearance-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`, name: 'Ada', password: 'password12345' })
      .expect(201);
    cookie = cookieFrom(signup);
  });

  afterAll(async () => {
    await app.close();
  });

  it('new users start on Paper', async () => {
    const me = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(200);
    expect(me.body.user.appearance).toEqual({ theme: 'paper', strength: null, focus: false });
  });

  it('saves a partial change and keeps the rest', async () => {
    const theme = await request(app.getHttpServer())
      .patch('/auth/me/appearance')
      .set('Cookie', cookie)
      .send({ theme: 'blueprint' })
      .expect(200);
    expect(theme.body.appearance).toEqual({ theme: 'blueprint', strength: null, focus: false });

    await request(app.getHttpServer()).patch('/auth/me/appearance').set('Cookie', cookie).send({ focus: true, strength: 0.3 }).expect(200);
    const me = await request(app.getHttpServer()).get('/auth/me').set('Cookie', cookie).expect(200);
    expect(me.body.user.appearance).toEqual({ theme: 'blueprint', strength: 0.3, focus: true });
  });

  it('rejects unknown themes, out-of-range strength and unknown keys', async () => {
    const server = app.getHttpServer();
    await request(server).patch('/auth/me/appearance').set('Cookie', cookie).send({ theme: 'nope' }).expect(400);
    await request(server).patch('/auth/me/appearance').set('Cookie', cookie).send({ strength: 2 }).expect(400);
    await request(server).patch('/auth/me/appearance').set('Cookie', cookie).send({ layout: 'grid' }).expect(400);
  });

  it('needs a session', async () => {
    await request(app.getHttpServer()).patch('/auth/me/appearance').send({ theme: 'dot' }).expect(401);
  });
});
