import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  MeetingRequestEntity,
  MeetingRoomEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { In, IsNull, Repository } from 'typeorm';
import type { AllConfigType } from '@/config/config.type';
import { ConfigService } from '@nestjs/config';
import { AvailabilityService } from '../availability/availability.service';
import { EmailService } from '../email/email.service';
import { EmailType } from '../email/email-type.enum';
import { NotificationsService } from '../notifications/notifications.service';
import { buildNewRequestNotification, buildRequestStatusChangedNotification } from '../notifications/handlers';
import { CreateMeetingRequestReqDto } from './dto/create-meeting-request.dto';

@Injectable()
export class MeetingRequestService {
  constructor(
    @InjectRepository(MeetingRequestEntity)
    private readonly meetingRequestRepository: Repository<MeetingRequestEntity>,
    @InjectRepository(AdvertisementEntity)
    private readonly advertisementRepository: Repository<AdvertisementEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(MeetingRoomEntity)
    private readonly meetingRoomRepository: Repository<MeetingRoomEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly availabilityService: AvailabilityService,
    private readonly emailService: EmailService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService<AllConfigType>,
  ) {}

  async create(
    userId: string,
    dto: CreateMeetingRequestReqDto,
    options?: { roles?: string[] },
  ): Promise<{ uid: string; requestedStartsAt: string | null; message: string }> {
    if (!dto.requestedStartsAt && !dto.preferredDate) {
      throw new BadRequestException(
        'Podaj termin spotkania lub preferowaną datę',
      );
    }

    const roles = options?.roles ?? [];
    if (roles.includes('wizard')) {
      throw new ForbiddenException(
        'Tylko klienci mogą składać prośby o spotkanie. Specjalista nie może aplikować na ogłoszenia.',
      );
    }

    if (!dto.advertisementUid) {
      throw new BadRequestException('Podaj advertisementUid');
    }

    const ad = await this.advertisementRepository.findOne({
      where: { uid: dto.advertisementUid },
      relations: ['user'],
    });
    if (!ad) {
      throw new NotFoundException('Ogłoszenie nie istnieje');
    }

    if (ad.userId === userId) {
      throw new ForbiddenException('Nie możesz aplikować na własne ogłoszenie.');
    }

    let requestedStartsAt: Date | null = null;
    let preferredDate: string | null = null;

    if (dto.requestedStartsAt) {
      requestedStartsAt = new Date(dto.requestedStartsAt);
      const from = requestedStartsAt.toISOString().slice(0, 10);
      const to = new Date(requestedStartsAt);
      to.setDate(to.getDate() + 1);
      const slots = await this.availabilityService.getSlotsForAdvertisement(
        ad.uid,
        from,
        to.toISOString().slice(0, 10),
      );
      const slotMatch = slots.some(
        (s) => new Date(s.startsAt).getTime() === requestedStartsAt!.getTime(),
      );
      if (!slotMatch) {
        throw new BadRequestException('Wybrany slot jest niedostępny');
      }

      // Jedna osoba nie może wysłać dwóch wniosków na ten sam slot
      const existing = await this.meetingRequestRepository.findOne({
        where: {
          userId,
          advertisementId: ad.uid,
          requestedStartsAt,
          status: In(['pending', 'accepted']),
        },
      });
      if (existing) {
        throw new BadRequestException(
          'Masz już wniosek na ten termin. Poczekaj na odpowiedź lub wybierz inny slot.',
        );
      }
    } else if (dto.preferredDate) {
      preferredDate = dto.preferredDate;
    }

    const entity = this.meetingRequestRepository.create({
      userId,
      advertisementId: ad.uid,
      wizardId: ad.userId,
      requestedStartsAt,
      preferredDate,
      message: dto.message ?? '',
      status: 'pending',
    });
    const saved = await this.meetingRequestRepository.save(entity);

    // Powiadom wróżkę przez WebSocket o nowym wniosku
    void this.notificationsService.notifyWizard(ad.userId);

    // Powiadomienie persystentne
    const client = await this.userRepository.findOne({ where: { uid: userId }, select: { username: true } });
    void this.notificationsService.createAndEmit(
      buildNewRequestNotification({
        wizardId: ad.userId,
        clientName: client?.username ?? 'Klient',
        advertisementTitle: ad.title,
        requestId: saved.uid,
        isGuest: false,
      }),
    );

    return {
      uid: saved.uid,
      requestedStartsAt: saved.requestedStartsAt?.toISOString() ?? null,
      message: saved.message,
    };
  }

  async listForMyAds(
    wrozkaUserId: string,
    options?: { status?: string; limit?: number; offset?: number; sortBy?: string; order?: string },
  ) {
    const allowedSortBy = ['createdAt', 'requestedStartsAt', 'status'] as const;
    const allowedOrder = ['ASC', 'DESC'] as const;
    const validatedSortBy = allowedSortBy.includes(options?.sortBy as any) ? options!.sortBy! : 'createdAt';
    const validatedOrder = allowedOrder.includes(options?.order?.toUpperCase() as any) ? (options!.order!.toUpperCase() as 'ASC' | 'DESC') : 'DESC';
    const myAds = await this.advertisementRepository.find({
      where: { userId: wrozkaUserId },
      select: { uid: true },
    });
    const adIds = myAds.map((a) => a.uid);

    const statusFilter = options?.status ? { status: options.status } : {};
    const where =
      adIds.length > 0
        ? [
            { advertisementId: In(adIds), ...statusFilter },
            {
              advertisementId: IsNull(),
              wizardId: wrozkaUserId,
              ...statusFilter,
            },
          ]
        : {
            advertisementId: IsNull(),
            wizardId: wrozkaUserId,
            ...statusFilter,
          };

    const [requests, total] = await this.meetingRequestRepository.findAndCount({
      where,
      relations: ['user', 'advertisement'],
      order: { [validatedSortBy]: validatedOrder },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    // For accepted requests, find corresponding appointments and meeting rooms
    const acceptedRequestIds = requests
      .filter((r) => r.status === 'accepted')
      .map((r) => r.uid);

    const appointmentsMap: Record<string, any> = {};
    if (acceptedRequestIds.length > 0) {
      const appointments = await this.appointmentRepository.find({
        where: { meetingRequestId: In(acceptedRequestIds) },
      });

      const appointmentIds = appointments.map((apt) => apt.uid);
      const meetingRooms = await this.meetingRoomRepository.find({
        where: { appointmentId: In(appointmentIds) },
      });

      const roomsMap: Record<string, string> = {};
      meetingRooms.forEach((room) => {
        roomsMap[room.appointmentId] = room.token;
      });

      appointments.forEach((apt) => {
        if (apt.meetingRequestId) {
          appointmentsMap[apt.meetingRequestId] = {
            appointmentUid: apt.uid,
            status: apt.status,
            startsAt: apt.startsAt?.toISOString(),
            meetingToken: roomsMap[apt.uid] ?? null,
          };
        }
      });
    }

    return {
      requests: requests.map((r) => ({
        uid: r.uid,
        advertisementId: r.advertisementId,
        advertisementTitle: r.advertisement?.title ?? '(Ogłoszenie usunięte)',
        clientId: r.userId,
        clientUsername: r.user?.username,
        requestedStartsAt: r.requestedStartsAt?.toISOString() ?? null,
        preferredDate: r.preferredDate,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt?.toISOString(),
        appointment: appointmentsMap[r.uid] || null,
      })),
      total,
    };
  }

  async listMyRequests(
    clientUserId: string,
    options?: { status?: string; limit?: number; offset?: number; sortBy?: string; order?: string },
  ) {
    const allowedSortBy = ['createdAt', 'requestedStartsAt', 'status'] as const;
    const allowedOrder = ['ASC', 'DESC'] as const;
    const validatedSortBy = allowedSortBy.includes(options?.sortBy as any) ? options!.sortBy! : 'createdAt';
    const validatedOrder = allowedOrder.includes(options?.order?.toUpperCase() as any) ? (options!.order!.toUpperCase() as 'ASC' | 'DESC') : 'DESC';
    const where: any = { userId: clientUserId };
    if (options?.status) {
      where.status = options.status;
    }

    const [requests, total] = await this.meetingRequestRepository.findAndCount({
      where,
      relations: ['advertisement', 'advertisement.user'],
      order: { [validatedSortBy]: validatedOrder },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return {
      requests: requests.map((r) => ({
        uid: r.uid,
        advertisementId: r.advertisementId,
        advertisementTitle: r.advertisement?.title,
        wrozkaId: r.advertisement?.userId,
        wrozkaUsername: r.advertisement?.user?.username,
        requestedStartsAt: r.requestedStartsAt?.toISOString() ?? null,
        preferredDate: r.preferredDate,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt?.toISOString(),
      })),
      total,
    };
  }

  async accept(wrozkaUserId: string, requestUid: string) {
    const request = await this.meetingRequestRepository.findOne({
      where: { uid: requestUid },
      relations: ['advertisement', 'advertisement.user'],
    });
    if (!request) {
      throw new NotFoundException('Prośba o spotkanie nie istnieje');
    }
    if (request.advertisement.userId !== wrozkaUserId) {
      throw new ForbiddenException('Nie możesz zaakceptować tej prośby');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Prośba została już obsłużona');
    }
    if (!request.requestedStartsAt) {
      throw new BadRequestException('Prośba bez konkretnej godziny – nie można zaakceptować');
    }

    const startsAt = new Date(request.requestedStartsAt);
    const durationMinutes = request.advertisement.durationMinutes;
    const occupied = await this.availabilityService.isSlotOccupied(
      wrozkaUserId,
      startsAt,
      durationMinutes,
    );
    if (occupied) {
      throw new BadRequestException(
        'Ten termin jest już zajęty. Ktoś inny został w tym czasie zaakceptowany.',
      );
    }

    const appointment = this.appointmentRepository.create({
      clientId: request.userId,
      wrozkaId: request.advertisement.userId,
      advertisementId: request.advertisementId,
      meetingRequestId: request.uid,
      startsAt,
      durationMinutes,
      priceGrosze: request.advertisement.priceGrosze,
      status: 'accepted',
    });
    await this.appointmentRepository.save(appointment);
    request.status = 'accepted';
    await this.meetingRequestRepository.save(request);

    void this.notificationsService.notifyWizard(wrozkaUserId);

    // Powiadom klienta o akceptacji
    const wizardUser = request.advertisement?.user;
    void this.notificationsService.createAndEmit(
      buildRequestStatusChangedNotification({
        clientId: request.userId,
        wizardName: wizardUser?.username ?? 'Specjalista',
        advertisementTitle: request.advertisement?.title ?? 'Konsultacja',
        newStatus: 'accepted',
        requestId: request.uid,
      }),
    );

    return {
      appointmentUid: appointment.uid,
      startsAt: appointment.startsAt.toISOString(),
      status: 'accepted',
    };
  }

  async reject(wrozkaUserId: string, requestUid: string, reason?: string) {
    const request = await this.meetingRequestRepository.findOne({
      where: { uid: requestUid },
      relations: ['advertisement', 'advertisement.user', 'user'],
    });
    if (!request) {
      throw new NotFoundException('Prośba o spotkanie nie istnieje');
    }
    if (request.advertisement.userId !== wrozkaUserId) {
      throw new ForbiddenException('Nie możesz odrzucić tej prośby');
    }
    if (request.status !== 'pending' && request.status !== 'accepted') {
      throw new BadRequestException('Prośba została już obsłużona');
    }

    // Zaakceptowany – tylko nieopłacony można odrzucić
    if (request.status === 'accepted') {
      const apt = await this.appointmentRepository.findOne({
        where: { meetingRequestId: request.uid },
      });
      if (apt && apt.status === 'paid') {
        throw new BadRequestException('Nie można odrzucić opłaconego wniosku');
      }
      const reasonTrimmed = reason?.trim();
      if (!reasonTrimmed) {
        throw new BadRequestException('Podaj powód odrzucenia zaakceptowanego wniosku');
      }
      request.rejectionReason = reasonTrimmed;
      // Anuluj powiązany appointment (tylko gdy accepted)
      if (apt && apt.status === 'accepted') {
        apt.status = 'cancelled';
        await this.appointmentRepository.save(apt);
      }
      // E-mail do klienta
      const userEmail = (request.user as { email?: string })?.email;
      if (userEmail) {
        const appUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
        const wizardName = (request.advertisement as { user?: { username?: string } })?.user?.username ?? 'specjalista';
        const username = (request.user as { username?: string })?.username ?? 'Użytkownik';
        const requestedPl = request.requestedStartsAt?.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }) ?? '–';
        void this.emailService
          .send({
            to: userEmail,
            subject: 'Twój wniosek o spotkanie został odrzucony – eWróżka',
            type: EmailType.MEETING_REQUEST_REJECTED,
            context: {
              username,
              wizardName,
              requestedAt: requestedPl,
              rejectionReason: reasonTrimmed,
              appUrl,
            },
          })
          .catch(() => {
            // log but don't fail the reject
          });
      }
    } else {
      request.rejectionReason = reason?.trim() || null;
    }

    request.status = 'rejected';
    await this.meetingRequestRepository.save(request);

    void this.notificationsService.notifyWizard(wrozkaUserId);

    // Powiadom klienta o odrzuceniu
    const wizardUser = request.advertisement?.user;
    void this.notificationsService.createAndEmit(
      buildRequestStatusChangedNotification({
        clientId: request.userId,
        wizardName: wizardUser?.username ?? 'Specjalista',
        advertisementTitle: request.advertisement?.title ?? 'Konsultacja',
        newStatus: 'rejected',
        requestId: request.uid,
        rejectionReason: reason,
      }),
    );

    return { status: 'rejected' };
  }
}
