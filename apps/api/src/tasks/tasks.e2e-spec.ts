import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from '../app.module.js';

function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
}

function cookieFrom(response: request.Response): string {
  const raw = response.headers['set-cookie'];
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  const session = list.find((item) => item.startsWith('tiza_session='));
  if (!session) throw new Error('Missing session cookie');
  return session.split(';')[0];
}

describe('Tasks e2e', () => {
  let app: INestApplication;
  let ownerCookie: string;
  let guestCookie: string;
  let strangerCookie: string;
  let workspaceId: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();

    const ownerEmail = uniqueEmail('owner');
    const guestEmail = uniqueEmail('guest');
    const strangerEmail = uniqueEmail('stranger');

    const ownerSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: ownerEmail, name: 'Owner', password: 'password12345' })
      .expect(201);
    ownerCookie = cookieFrom(ownerSignup);

    const guestSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: guestEmail, name: 'Guest', password: 'password12345' })
      .expect(201);
    guestCookie = cookieFrom(guestSignup);

    const strangerSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: strangerEmail, name: 'Stranger', password: 'password12345' })
      .expect(201);
    strangerCookie = cookieFrom(strangerSignup);

    const workspace = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', ownerCookie)
      .send({ name: `Tasks WS ${Date.now()}` })
      .expect(201);
    workspaceId = workspace.body.workspace.id;

    const invite = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/invites`)
      .set('Cookie', ownerCookie)
      .send({ email: guestEmail, role: 'guest' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/invites/${invite.body.member.inviteToken}/accept`)
      .set('Cookie', guestCookie)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/apps/install`)
      .set('Cookie', ownerCookie)
      .send({ appKey: 'projects' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/apps/install`)
      .set('Cookie', ownerCookie)
      .send({ appKey: 'tasks' })
      .expect(201);

    const project = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Cookie', ownerCookie)
      .send({ name: 'Work' })
      .expect(201);
    projectId = project.body.project.id;
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns 403 for non-members', async () => {
    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .set('Cookie', strangerCookie)
      .expect(403);
  });

  it('blocks guest writes and allows guest reads', async () => {
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/tasks`)
      .set('Cookie', guestCookie)
      .send({ title: 'Guest blocked' })
      .expect(403);

    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .query({ view: 'inbox', tz: 'UTC' })
      .set('Cookie', guestCookie)
      .expect(200);
  });

  it('creates an Inbox task with no project', async () => {
    const created = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/tasks`)
      .set('Cookie', ownerCookie)
      .send({ title: 'Capture me', projectId: null })
      .expect(201);
    expect(created.body.task.projectId).toBeNull();

    const inbox = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .query({ view: 'inbox', tz: 'UTC' })
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(inbox.body.tasks.some((task: { id: string }) => task.id === created.body.task.id)).toBe(true);
  });

  it('rolls yesterday when_date into Today', async () => {
    const created = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/tasks`)
      .set('Cookie', ownerCookie)
      .send({ title: 'Rollover', whenDate: '2020-01-01' })
      .expect(201);

    const today = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .query({ view: 'today', tz: 'UTC' })
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(today.body.tasks.some((task: { id: string }) => task.id === created.body.task.id)).toBe(true);
  });

  it('moves a task from Inbox to a project', async () => {
    const created = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/tasks`)
      .set('Cookie', ownerCookie)
      .send({ title: 'Move me', projectId: null })
      .expect(201);

    const updated = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/tasks/${created.body.task.id}`)
      .set('Cookie', ownerCookie)
      .send({ projectId })
      .expect(200);
    expect(updated.body.task.projectId).toBe(projectId);

    const inbox = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .query({ view: 'inbox', tz: 'UTC' })
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(inbox.body.tasks.some((task: { id: string }) => task.id === created.body.task.id)).toBe(false);
  });

  it('completes a task into Logbook', async () => {
    const created = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/tasks`)
      .set('Cookie', ownerCookie)
      .send({ title: 'Finish me', projectId: null })
      .expect(201);

    const done = await request(app.getHttpServer())
      .patch(`/workspaces/${workspaceId}/tasks/${created.body.task.id}`)
      .set('Cookie', ownerCookie)
      .send({ status: 'done' })
      .expect(200);
    expect(done.body.task.completedAt).toBeTruthy();

    const logbook = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .query({ view: 'logbook', tz: 'UTC' })
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(logbook.body.tasks.some((task: { id: string }) => task.id === created.body.task.id)).toBe(true);

    const completedDay = new Date(done.body.task.completedAt).toISOString().slice(0, 10);
    const sameDay = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .query({ view: 'logbook', tz: 'UTC', completedOn: completedDay })
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(sameDay.body.tasks.some((task: { id: string }) => task.id === created.body.task.id)).toBe(true);

    const otherDay = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .query({ view: 'logbook', tz: 'UTC', completedOn: '2000-01-01' })
      .set('Cookie', ownerCookie)
      .expect(200);
    expect(otherDay.body.tasks).toHaveLength(0);

    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/tasks`)
      .query({ view: 'logbook', tz: 'UTC', completedOn: 'yesterday' })
      .set('Cookie', ownerCookie)
      .expect(400);
  });
});
