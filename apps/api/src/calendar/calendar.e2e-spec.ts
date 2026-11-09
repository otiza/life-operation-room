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

describe('Calendar e2e', () => {
  let app: INestApplication;
  let ownerCookie: string;
  let guestCookie: string;
  let strangerCookie: string;
  let workspaceId: string;

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
      .send({ name: `Calendar WS ${Date.now()}` })
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
  }, 60_000);

  afterAll(async () => {
    await app.close();
  });

  it('returns 403 for non-members', async () => {
    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/calendar/events`)
      .query({
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-08T00:00:00.000Z',
        tz: 'UTC',
      })
      .set('Cookie', strangerCookie)
      .expect(403);
  });

  it('returns 403 when Calendar is not installed', async () => {
    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/calendar/events`)
      .query({
        from: '2026-11-01T00:00:00.000Z',
        to: '2026-11-08T00:00:00.000Z',
        tz: 'UTC',
      })
      .set('Cookie', ownerCookie)
      .expect(403);
  });

  it('installs calendar, blocks guest writes, allows reads, and hides due chips without tasks', async () => {
    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/apps/install`)
      .set('Cookie', ownerCookie)
      .send({ appKey: 'calendar' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/calendar/events`)
      .set('Cookie', guestCookie)
      .send({
        title: 'Guest blocked',
        isAllDay: false,
        startAt: '2026-11-10T10:00:00.000Z',
        endAt: '2026-11-10T11:00:00.000Z',
        timezone: 'UTC',
      })
      .expect(403);

    const created = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/calendar/events`)
      .set('Cookie', ownerCookie)
      .send({
        title: 'Team sync',
        isAllDay: false,
        startAt: '2026-11-10T10:00:00.000Z',
        endAt: '2026-11-10T11:00:00.000Z',
        timezone: 'UTC',
      })
      .expect(201);
    expect(created.body.event.title).toBe('Team sync');

    const listed = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/calendar/events`)
      .query({
        from: '2026-11-09T00:00:00.000Z',
        to: '2026-11-12T00:00:00.000Z',
        tz: 'UTC',
      })
      .set('Cookie', guestCookie)
      .expect(200);
    expect(listed.body.events.some((item: { title: string }) => item.title === 'Team sync')).toBe(true);
    expect(listed.body.events.every((item: { kind: string }) => item.kind !== 'due_chip')).toBe(true);

    const timeBlock = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/calendar/time-blocks`)
      .set('Cookie', ownerCookie)
      .send({
        taskId: '00000000-0000-4000-8000-000000000099',
        start: '2026-11-10T12:00:00.000Z',
        end: '2026-11-10T13:00:00.000Z',
      });
    expect([400, 404]).toContain(timeBlock.status);
  });

  it('serves ICS feed and rejects revoked tokens', async () => {
    const regenerated = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/calendar/ics-token/regenerate`)
      .set('Cookie', ownerCookie)
      .expect(201);
    const token = regenerated.body.token.token as string;
    expect(token).toBeTruthy();

    const feed = await request(app.getHttpServer()).get(`/calendar/ics/${token}.ics`).expect(200);
    expect(feed.headers['content-type']).toMatch(/text\/calendar/);
    expect(feed.text).toContain('BEGIN:VCALENDAR');
    expect(feed.text).toContain('BEGIN:VEVENT');

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/calendar/ics-token/revoke`)
      .set('Cookie', ownerCookie)
      .expect(201);

    await request(app.getHttpServer()).get(`/calendar/ics/${token}.ics`).expect(401);
  });

  it('returns 404 for ICS when calendar is uninstalled or member is removed', async () => {
    const memberEmail = uniqueEmail('member');
    const memberSignup = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({ email: memberEmail, name: 'Member', password: 'password12345' })
      .expect(201);
    const memberCookie = cookieFrom(memberSignup);

    const invite = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/invites`)
      .set('Cookie', ownerCookie)
      .send({ email: memberEmail, role: 'member' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/invites/${invite.body.member.inviteToken}/accept`)
      .set('Cookie', memberCookie)
      .expect(201);

    const memberToken = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/calendar/ics-token/regenerate`)
      .set('Cookie', memberCookie)
      .expect(201);
    const token = memberToken.body.token.token as string;
    await request(app.getHttpServer()).get(`/calendar/ics/${token}.ics`).expect(200);

    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/apps/calendar`)
      .set('Cookie', ownerCookie)
      .expect(200);
    await request(app.getHttpServer()).get(`/calendar/ics/${token}.ics`).expect(404);

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/apps/install`)
      .set('Cookie', ownerCookie)
      .send({ appKey: 'calendar' })
      .expect(201);
    // Token was not revoked by uninstall; membership + install still allow access.
    await request(app.getHttpServer()).get(`/calendar/ics/${token}.ics`).expect(200);

    const members = await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/members`)
      .set('Cookie', ownerCookie)
      .expect(200);
    const memberRow = members.body.members.find(
      (item: { email: string; role: string }) => item.email === memberEmail && item.role === 'member',
    );
    expect(memberRow?.id).toBeTruthy();

    await request(app.getHttpServer())
      .delete(`/workspaces/${workspaceId}/members/${memberRow.id}`)
      .set('Cookie', ownerCookie)
      .expect(200);

    // Revoked on member removal → unauthorized (token no longer valid).
    await request(app.getHttpServer()).get(`/calendar/ics/${token}.ics`).expect(401);
  });
});
