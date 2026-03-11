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
} from '@repo/postgresql-typeorm';
import { I18nService } from 'nestjs-i18n';
import { In, Repository } from 'typeorm';
import { ErrorCode } from '@/constants/error-code.constant';
import { AvailabilityService } from '../availability/availability.service';
import { NotificationsService } from '../notifications/notifications.service';
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
    private readonly availabilityService: AvailabilityService,
    private readonly i18n: I18nService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    userId: number,
    dto: CreateMeetingRequestReqDto,
    options?: { roles?: string[] },
  ): Promise<{ id: number; requestedStartsAt: string | null; message: string }> {
    if (!dto.requestedStartsAt && !dto.preferredDate) {
      throw new BadRequestException('Podaj requestedStartsAt lub preferredDate');
    }

    const roles = options?.roles ?? [];
    if (roles.includes('wizard')) {
      throw new ForbiddenException(
        'Tylko klienci mogą składać prośby o spotkanie. Wróżka nie może aplikować na ogłoszenia.',
      );
    }

    const ad = await this.advertisementRepository.findOne({
      where: { id: dto.advertisementId },
      relations: ['user'],
    });
    if (!ad) {
      throw new NotFoundException(this.i18n.t(ErrorCode.E401));
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
        dto.advertisementId,
        from,
        to.toISOString().slice(0, 10),
      );
      const slotMatch = slots.some(
        (s) => new Date(s.startsAt).getTime() === requestedStartsAt!.getTime(),
      );
      if (!slotMatch) {
        throw new BadRequestException('Wybrany slot jest niedostępny');
      }
    } else if (dto.preferredDate) {
      preferredDate = dto.preferredDate;
    }

    const entity = this.meetingRequestRepository.create({
      userId,
      advertisementId: dto.advertisementId,
      requestedStartsAt,
      preferredDate,
      message: dto.message ?? '',
      status: 'pending',
    });
    const saved = await this.meetingRequestRepository.save(entity);

    // Powiadom wróżkę przez WebSocket o nowym wniosku
    void this.notificationsService.notifyWizard(ad.userId);

    return {
      id: saved.id,
      requestedStartsAt: saved.requestedStartsAt?.toISOString() ?? null,
      message: saved.message,
    };
  }

  async listForMyAds(
    wrozkaUserId: number,
    options?: { status?: string; limit?: number; offset?: number },
  ) {
    const myAds = await this.advertisementRepository.find({
      where: { userId: wrozkaUserId },
      select: { id: true },
    });
    const adIds = myAds.map((a) => a.id);
    if (adIds.length === 0) return { requests: [], total: 0 };

    const where: any = { advertisementId: In(adIds) };
    if (options?.status) {
      where.status = options.status;
    }

    const [requests, total] = await this.meetingRequestRepository.findAndCount({
      where,
      relations: ['user', 'advertisement'],
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    // For accepted requests, find corresponding appointments and meeting rooms
    const acceptedRequestIds = requests
      .filter((r) => r.status === 'accepted')
      .map((r) => r.id);

    let appointmentsMap: Record<number, any> = {};
    if (acceptedRequestIds.length > 0) {
      const appointments = await this.appointmentRepository.find({
        where: { meetingRequestId: In(acceptedRequestIds) },
      });

      const appointmentIds = appointments.map((apt) => apt.id);
      const meetingRooms = await this.meetingRoomRepository.find({
        where: { appointmentId: In(appointmentIds) },
      });

      const roomsMap: Record<number, string> = {};
      meetingRooms.forEach((room) => {
        roomsMap[room.appointmentId] = room.token;
      });

      appointments.forEach((apt) => {
        if (apt.meetingRequestId) {
          appointmentsMap[apt.meetingRequestId] = {
            appointmentId: apt.id,
            status: apt.status,
            startsAt: apt.startsAt?.toISOString(),
            meetingToken: roomsMap[apt.id] ?? null,
          };
        }
      });
    }

    return {
      requests: requests.map((r) => ({
        id: r.id,
        advertisementId: r.advertisementId,
        advertisementTitle: r.advertisement?.title,
        clientId: r.userId,
        clientUsername: r.user?.username,
        requestedStartsAt: r.requestedStartsAt?.toISOString() ?? null,
        preferredDate: r.preferredDate,
        message: r.message,
        status: r.status,
        createdAt: r.createdAt?.toISOString(),
        appointment: appointmentsMap[r.id] || null,
      })),
      total,
    };
  }

  async listMyRequests(
    clientUserId: number,
    options?: { status?: string; limit?: number; offset?: number },
  ) {
    const where: any = { userId: clientUserId };
    if (options?.status) {
      where.status = options.status;
    }

    const [requests, total] = await this.meetingRequestRepository.findAndCount({
      where,
      relations: ['advertisement', 'advertisement.user'],
      order: { createdAt: 'DESC' },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    });

    return {
      requests: requests.map((r) => ({
        id: r.id,
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

  async accept(wrozkaUserId: number, requestId: number) {
    const request = await this.meetingRequestRepository.findOne({
      where: { id: requestId },
      relations: ['advertisement', 'advertisement.user'],
    });
    if (!request) {
      throw new NotFoundException(this.i18n.t(ErrorCode.E401));
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
    const appointment = this.appointmentRepository.create({
      clientId: request.userId,
      wrozkaId: request.advertisement.userId,
      advertisementId: request.advertisementId,
      meetingRequestId: request.id,
      startsAt,
      durationMinutes: request.advertisement.durationMinutes,
      priceGrosze: request.advertisement.priceGrosze,
      status: 'accepted',
    });
    await this.appointmentRepository.save(appointment);
    request.status = 'accepted';
    await this.meetingRequestRepository.save(request);

    void this.notificationsService.notifyWizard(wrozkaUserId);

    return {
      appointmentId: appointment.id,
      startsAt: appointment.startsAt.toISOString(),
      status: 'accepted',
    };
  }

  async reject(wrozkaUserId: number, requestId: number) {
    const request = await this.meetingRequestRepository.findOne({
      where: { id: requestId },
      relations: ['advertisement'],
    });
    if (!request) {
      throw new NotFoundException(this.i18n.t(ErrorCode.E401));
    }
    if (request.advertisement.userId !== wrozkaUserId) {
      throw new ForbiddenException('Nie możesz odrzucić tej prośby');
    }
    if (request.status !== 'pending') {
      throw new BadRequestException('Prośba została już obsłużona');
    }
    request.status = 'rejected';
    await this.meetingRequestRepository.save(request);

    void this.notificationsService.notifyWizard(wrozkaUserId);

    return { status: 'rejected' };
  }
}
