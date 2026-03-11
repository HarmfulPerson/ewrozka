import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AppointmentEntity,
  MeetingEventEntity,
  MeetingRoomEntity,
} from '@repo/postgresql-typeorm';
import { randomBytes } from 'crypto';
import { I18nService } from 'nestjs-i18n';
import { In, Repository } from 'typeorm';
import { DailyCoService } from './daily-co.service';

const MEETING_DURATION_MINUTES = 60;

@Injectable()
export class MeetingRoomService {
  private readonly logger = new Logger(MeetingRoomService.name);

  constructor(
    @InjectRepository(MeetingRoomEntity)
    private readonly meetingRoomRepository: Repository<MeetingRoomEntity>,
    @InjectRepository(MeetingEventEntity)
    private readonly meetingEventRepository: Repository<MeetingEventEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    private readonly i18n: I18nService,
    private readonly dailyCo: DailyCoService,
  ) {}

  /** Tworzy pokój spotkania dla opłaconej wizyty (wywołane po pay()). */
  async createForAppointment(
    appointmentId: number,
  ): Promise<MeetingRoomEntity> {
    const existing = await this.meetingRoomRepository.findOne({
      where: { appointmentId },
    });
    if (existing) return existing;

    const token = randomBytes(24).toString('hex');
    const roomName = `ewrozka-${token}`;

    // Utwórz pokój w Daily.co (prywatny)
    try {
      await this.dailyCo.ensureRoom(roomName);
    } catch (err) {
      this.logger.warn(
        `Could not create Daily.co room for appointment ${appointmentId}: ${err}`,
      );
    }

    const room = this.meetingRoomRepository.create({
      appointmentId,
      token,
    });
    return this.meetingRoomRepository.save(room);
  }

  /** Zwraca koniec okna spotkania (startsAt + 1h). */
  private getMeetingEnd(appointment: AppointmentEntity): Date {
    const end = new Date(appointment.startsAt);
    end.setMinutes(end.getMinutes() + MEETING_DURATION_MINUTES);
    return end;
  }

  /** Walidacja: czy użytkownik może wejść (klient lub wróżka tej wizyty), czy okno czasowe OK. */
  async join(
    token: string,
    userId: number,
  ): Promise<{
    roomId: number;
    appointmentId: number;
    otherParticipantUsername: string;
    startsAt: string;
    endsAt: string;
    roomName: string;
    dailyToken: string;
    dailyRoomUrl: string;
  }> {
    const room = await this.meetingRoomRepository.findOne({
      where: { token },
      relations: ['appointment', 'appointment.client', 'appointment.wrozka'],
    });
    if (!room) {
      throw new NotFoundException('Link do spotkania jest nieprawidłowy.');
    }

    const appointment = room.appointment;
    if (appointment.status !== 'paid') {
      throw new BadRequestException(
        'Spotkanie jest dostępne tylko po opłaceniu wizyty.',
      );
    }

    if (userId !== appointment.clientId && userId !== appointment.wrozkaId) {
      throw new ForbiddenException('Nie masz dostępu do tego spotkania.');
    }

    const now = new Date();
    const meetingEnd = this.getMeetingEnd(appointment);

    // Check if meeting has ended
    if (now > meetingEnd) {
      throw new BadRequestException(
        'Czas na to spotkanie minął. Link jest nieaktywny.',
      );
    }

    // Check if meeting can be joined (5 minutes before start)
    const meetingStart = new Date(appointment.startsAt);
    const fiveMinutesBeforeStart = new Date(
      meetingStart.getTime() - 5 * 60 * 1000,
    );

    if (now < fiveMinutesBeforeStart) {
      throw new BadRequestException(
        JSON.stringify({
          code: 'TOO_EARLY',
          startsAt: appointment.startsAt.toISOString(),
          availableAt: fiveMinutesBeforeStart.toISOString(),
        }),
      );
    }

    const otherUser =
      userId === appointment.clientId ? appointment.wrozka : appointment.client;
    const otherUsername = otherUser?.username ?? 'Uczestnik';

    await this.meetingEventRepository.save(
      this.meetingEventRepository.create({
        meetingRoomId: room.id,
        userId,
        eventType: 'joined',
      }),
    );

    const roomName = `ewrozka-${room.token}`;
    const isWizard = userId === appointment.wrozkaId;

    // Upewnij się, że pokój istnieje w Daily.co
    await this.dailyCo.ensureRoom(roomName);

    // Wygeneruj token z oknem czasowym (nbf/exp)
    const dailyToken = await this.dailyCo.createMeetingToken(
      roomName,
      new Date(appointment.startsAt),
      meetingEnd,
      isWizard,
    );

    return {
      roomId: room.id,
      appointmentId: appointment.id,
      otherParticipantUsername: otherUsername,
      startsAt: appointment.startsAt.toISOString(),
      endsAt: meetingEnd.toISOString(),
      roomName,
      dailyToken,
      dailyRoomUrl: this.dailyCo.roomUrl(roomName),
    };
  }

  async leave(token: string, userId: number): Promise<void> {
    const room = await this.meetingRoomRepository.findOne({
      where: { token },
      relations: ['appointment'],
    });
    if (!room) {
      throw new NotFoundException('Link do spotkania jest nieprawidłowy.');
    }
    if (
      userId !== room.appointment.clientId &&
      userId !== room.appointment.wrozkaId
    ) {
      throw new ForbiddenException('Nie masz dostępu do tego spotkania.');
    }

    await this.meetingEventRepository.save(
      this.meetingEventRepository.create({
        meetingRoomId: room.id,
        userId,
        eventType: 'left',
      }),
    );
  }

  /** Statystyki: kto kiedy wszedł, kiedy wyszedł (dla uczestnika lub wróżki). */
  async getStats(
    meetingRoomId: number,
    userId: number,
  ): Promise<{
    appointmentId: number;
    events: {
      userId: number;
      username: string;
      eventType: string;
      createdAt: string;
    }[];
  }> {
    const room = await this.meetingRoomRepository.findOne({
      where: { id: meetingRoomId },
      relations: ['appointment', 'events', 'events.user'],
    });
    if (!room) {
      throw new NotFoundException('Pokój nie istnieje.');
    }
    if (
      userId !== room.appointment.clientId &&
      userId !== room.appointment.wrozkaId
    ) {
      throw new ForbiddenException(
        'Nie masz dostępu do statystyk tego spotkania.',
      );
    }

    const events =
      room.events
        ?.slice()
        .sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
        )
        .map((e) => ({
          userId: e.userId,
          username: e.user?.username ?? '',
          eventType: e.eventType,
          createdAt: e.createdAt.toISOString(),
        })) ?? [];

    return {
      appointmentId: room.appointmentId,
      events,
    };
  }

  /** Mapowanie appointmentId → token dla wielu wizyt (do listy). */
  async getTokensByAppointmentIds(
    appointmentIds: number[],
  ): Promise<Record<number, string>> {
    if (appointmentIds.length === 0) return {};
    const rooms = await this.meetingRoomRepository.find({
      where: { appointmentId: In(appointmentIds) },
      select: ['appointmentId', 'token'],
    });
    const map: Record<number, string> = {};
    for (const r of rooms) map[r.appointmentId] = r.token;
    return map;
  }

  /** Pobiera link (token) dla wizyty – dla uczestnika (klient/wróżka). */
  async getMeetingLink(
    appointmentId: number,
    userId: number,
  ): Promise<{ token: string } | null> {
    const appointment = await this.appointmentRepository.findOne({
      where: { id: appointmentId },
    });
    if (!appointment || appointment.status !== 'paid') return null;
    if (userId !== appointment.clientId && userId !== appointment.wrozkaId)
      return null;

    const room = await this.meetingRoomRepository.findOne({
      where: { appointmentId },
    });
    if (!room) return null;
    return { token: room.token };
  }
}
