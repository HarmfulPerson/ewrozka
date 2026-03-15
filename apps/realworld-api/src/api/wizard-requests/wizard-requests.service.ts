import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface UnifiedRequestItem {
  id: string;
  kind: 'regular' | 'guest';
  unifiedStatus: string;
  createdAt: string;
  scheduledAt: string | null;
  message: string | null;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  advertisementTitle: string | null;
  advertisementId: number | null;
  rejectionReason: string | null;
  appointmentId: number | null;
  appointmentStatus: string | null;
  appointmentStartsAt: string | null;
  meetingToken: string | null;
  durationMinutes: number | null;
  priceGrosze: number | null;
}

@Injectable()
export class WizardRequestsService {
  constructor(private readonly dataSource: DataSource) {}

  async getUnifiedRequests(
    wizardId: number,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      order?: string;
    },
  ): Promise<{ items: UnifiedRequestItem[]; total: number }> {
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);

    const sortByMap: Record<string, string> = {
      createdAt: '"createdAt"',
      scheduledAt: '"scheduledAt"',
      status: '"unifiedStatus"',
    };
    const sortCol = sortByMap[options?.sortBy ?? ''] ?? '"createdAt"';
    const sortDir = options?.order === 'ASC' ? 'ASC' : 'DESC';

    const statusFilter = ['pending', 'accepted', 'paid', 'rejected'].includes(
      options?.status ?? '',
    )
      ? options!.status
      : null;

    const unionSql = `
      SELECT
        mr.id::text                     AS "id",
        'regular'                       AS "kind",
        CASE
          WHEN mr.status = 'accepted' AND apt.status = 'paid' THEN 'paid'
          ELSE mr.status
        END                             AS "unifiedStatus",
        mr.created_at                   AS "createdAt",
        mr.requested_starts_at          AS "scheduledAt",
        mr.message                      AS "message",
        u.username                      AS "clientName",
        NULL                            AS "clientEmail",
        NULL                            AS "clientPhone",
        ad.title                        AS "advertisementTitle",
        mr.advertisement_id             AS "advertisementId",
        mr.rejection_reason             AS "rejectionReason",
        apt.id                          AS "appointmentId",
        apt.status                      AS "appointmentStatus",
        apt.starts_at                   AS "appointmentStartsAt",
        room.token                      AS "meetingToken",
        apt.duration_minutes            AS "durationMinutes",
        apt.price_grosze                AS "priceGrosze"
      FROM meeting_request mr
      LEFT JOIN appointment apt ON apt.meeting_request_id = mr.id
      LEFT JOIN meeting_room room ON room.appointment_id = apt.id
      LEFT JOIN "user" u ON u.id = mr.user_id
      LEFT JOIN advertisement ad ON ad.id = mr.advertisement_id
      WHERE (
        mr.advertisement_id IN (SELECT id FROM advertisement WHERE user_id = $1)
        OR (mr.advertisement_id IS NULL AND mr.wizard_id = $1)
      )

      UNION ALL

      SELECT
        gb.id::text                     AS "id",
        'guest'                         AS "kind",
        gb.status                       AS "unifiedStatus",
        gb.created_at                   AS "createdAt",
        gb.scheduled_at                 AS "scheduledAt",
        gb.message                      AS "message",
        gb.guest_name                   AS "clientName",
        gb.guest_email                  AS "clientEmail",
        gb.guest_phone                  AS "clientPhone",
        ad.title                        AS "advertisementTitle",
        gb.advertisement_id             AS "advertisementId",
        gb.rejection_reason             AS "rejectionReason",
        NULL::int                       AS "appointmentId",
        NULL                            AS "appointmentStatus",
        NULL::timestamptz               AS "appointmentStartsAt",
        NULL                            AS "meetingToken",
        gb.duration_minutes             AS "durationMinutes",
        gb.price_grosze                 AS "priceGrosze"
      FROM guest_booking gb
      LEFT JOIN advertisement ad ON ad.id = gb.advertisement_id
      WHERE gb.wizard_id = $1
    `;

    const params: (string | number)[] = [wizardId];
    let whereClause = '';
    if (statusFilter) {
      params.push(statusFilter);
      whereClause = `WHERE c."unifiedStatus" = $${params.length}`;
    }

    const dataQuery = `
      SELECT c.* FROM (${unionSql}) c
      ${whereClause}
      ORDER BY c.${sortCol} ${sortDir}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataParams = [...params, limit, offset];

    const countQuery = `
      SELECT COUNT(*)::int AS total FROM (${unionSql}) c
      ${whereClause}
    `;

    const [items, countResult] = await Promise.all([
      this.dataSource.query(dataQuery, dataParams),
      this.dataSource.query(countQuery, params),
    ]);

    return {
      items,
      total: countResult[0]?.total ?? 0,
    };
  }

  async getClientRequests(
    clientId: number,
    options?: {
      status?: string;
      limit?: number;
      offset?: number;
      sortBy?: string;
      order?: string;
    },
  ): Promise<{ items: ClientRequestItem[]; total: number }> {
    const limit = Math.min(Math.max(options?.limit ?? 20, 1), 100);
    const offset = Math.max(options?.offset ?? 0, 0);

    const sortByMap: Record<string, string> = {
      createdAt: '"createdAt"',
      scheduledAt: '"scheduledAt"',
      status: '"unifiedStatus"',
    };
    const sortCol = sortByMap[options?.sortBy ?? ''] ?? '"createdAt"';
    const sortDir = options?.order === 'ASC' ? 'ASC' : 'DESC';

    const validStatuses = ['pending', 'accepted', 'paid', 'completed', 'rejected', 'cancelled'];
    const statusFilter = validStatuses.includes(options?.status ?? '')
      ? options!.status
      : null;

    // Meeting requests that DON'T have an appointment (pending / rejected)
    // + Appointments (accepted / paid / completed / cancelled)
    const unionSql = `
      SELECT
        mr.id::text                     AS "id",
        'request'                       AS "kind",
        mr.status                       AS "unifiedStatus",
        mr.created_at                   AS "createdAt",
        mr.requested_starts_at          AS "scheduledAt",
        mr.message                      AS "message",
        w.username                      AS "wrozkaUsername",
        ad.title                        AS "advertisementTitle",
        mr.advertisement_id             AS "advertisementId",
        mr.rejection_reason             AS "rejectionReason",
        NULL::int                       AS "appointmentId",
        NULL                            AS "meetingToken",
        NULL::int                       AS "durationMinutes",
        NULL::int                       AS "priceGrosze",
        NULL::smallint                  AS "rating",
        NULL                            AS "ratingComment"
      FROM meeting_request mr
      LEFT JOIN advertisement ad ON ad.id = mr.advertisement_id
      LEFT JOIN "user" w ON w.id = COALESCE(mr.wizard_id, (SELECT user_id FROM advertisement WHERE id = mr.advertisement_id))
      WHERE mr.user_id = $1
        AND NOT EXISTS (SELECT 1 FROM appointment a WHERE a.meeting_request_id = mr.id)

      UNION ALL

      SELECT
        apt.id::text                    AS "id",
        'appointment'                   AS "kind",
        apt.status                      AS "unifiedStatus",
        apt.created_at                  AS "createdAt",
        apt.starts_at                   AS "scheduledAt",
        NULL                            AS "message",
        w.username                      AS "wrozkaUsername",
        ad.title                        AS "advertisementTitle",
        apt.advertisement_id            AS "advertisementId",
        NULL                            AS "rejectionReason",
        apt.id                          AS "appointmentId",
        room.token                      AS "meetingToken",
        apt.duration_minutes            AS "durationMinutes",
        apt.price_grosze                AS "priceGrosze",
        apt.rating                      AS "rating",
        apt.comment                     AS "ratingComment"
      FROM appointment apt
      LEFT JOIN "user" w ON w.id = apt.wrozka_id
      LEFT JOIN advertisement ad ON ad.id = apt.advertisement_id
      LEFT JOIN meeting_room room ON room.appointment_id = apt.id
      WHERE apt.client_id = $1
    `;

    const params: (string | number)[] = [clientId];
    let whereClause = '';
    if (statusFilter) {
      params.push(statusFilter);
      whereClause = `WHERE c."unifiedStatus" = $${params.length}`;
    }

    const dataQuery = `
      SELECT c.* FROM (${unionSql}) c
      ${whereClause}
      ORDER BY c.${sortCol} ${sortDir}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;
    const dataParams = [...params, limit, offset];

    const countQuery = `
      SELECT COUNT(*)::int AS total FROM (${unionSql}) c
      ${whereClause}
    `;

    const [items, countResult] = await Promise.all([
      this.dataSource.query(dataQuery, dataParams),
      this.dataSource.query(countQuery, params),
    ]);

    return {
      items,
      total: countResult[0]?.total ?? 0,
    };
  }
}

export interface ClientRequestItem {
  id: string;
  kind: 'request' | 'appointment';
  unifiedStatus: string;
  createdAt: string;
  scheduledAt: string | null;
  message: string | null;
  wrozkaUsername: string | null;
  advertisementTitle: string | null;
  advertisementId: number | null;
  rejectionReason: string | null;
  appointmentId: number | null;
  meetingToken: string | null;
  durationMinutes: number | null;
  priceGrosze: number | null;
  rating: number | null;
  ratingComment: string | null;
}
