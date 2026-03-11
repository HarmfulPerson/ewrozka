import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AppointmentEntity } from '@repo/postgresql-typeorm';
import { I18nService } from 'nestjs-i18n';
import { Repository } from 'typeorm';
import { ErrorCode } from '@/constants/error-code.constant';
import { MeetingRoomService } from '../meeting-room/meeting-room.service';
import { PaymentService } from '../payment/payment.service';
import { StripeService } from '../stripe/stripe.service';

export interface ReviewDto {
  id: number;
  rating: number;
  comment: string | null;
  clientUsername: string;
  createdAt: string;
}

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    private readonly i18n: I18nService,
    private readonly meetingRoomService: MeetingRoomService,
    private readonly paymentService: PaymentService,
    private readonly stripeService: StripeService,
  ) {}

  async listMine(
    userId: number,
    options?: { status?: string; filter?: string; limit?: number; offset?: number },
  ) {
    const where: any[] = [{ clientId: userId }, { wrozkaId: userId }];

    // Apply status filter if provided
    if (options?.status) {
      where[0] = { ...where[0], status: options.status };
      where[1] = { ...where[1], status: options.status };
    }

    const queryBuilder = this.appointmentRepository
      .createQueryBuilder('appointment')
      .leftJoinAndSelect('appointment.advertisement', 'advertisement')
      .leftJoinAndSelect('appointment.client', 'client')
      .leftJoinAndSelect('appointment.wrozka', 'wrozka')
      .where('appointment.clientId = :userId OR appointment.wrozkaId = :userId', { userId });

    if (options?.status) {
      queryBuilder.andWhere('appointment.status = :status', { status: options.status });
    }

    // Apply filter: upcoming, paid, pending, completed
    if (options?.filter === 'upcoming') {
      queryBuilder.andWhere('appointment.startsAt >= :now', { now: new Date() });
      queryBuilder.andWhere('appointment.status = :status', { status: 'paid' });
    } else if (options?.filter === 'paid') {
      queryBuilder.andWhere('appointment.status = :status', { status: 'paid' });
    } else if (options?.filter === 'pending') {
      queryBuilder.andWhere('appointment.status = :status', { status: 'accepted' });
    } else if (options?.filter === 'completed') {
      queryBuilder.andWhere('appointment.status = :status', { status: 'completed' });
    }

    queryBuilder.orderBy('appointment.startsAt', 'DESC');
    queryBuilder.take(options?.limit ?? 50);
    queryBuilder.skip(options?.offset ?? 0);

    const [appointments, total] = await queryBuilder.getManyAndCount();

    const paidIds = appointments.filter((a) => a.status === 'paid').map((a) => a.id);
    const tokenByAppointmentId =
      paidIds.length > 0
        ? await this.meetingRoomService.getTokensByAppointmentIds(paidIds)
        : {};

    return {
      appointments: appointments.map((a) => ({
        id: a.id,
        startsAt: a.startsAt.toISOString(),
        durationMinutes: a.durationMinutes,
        priceGrosze: a.priceGrosze,
        status: a.status,
        advertisementId: a.advertisementId,
        advertisementTitle: a.advertisement?.title,
        clientId: a.clientId,
        clientUsername: a.client?.username,
        wrozkaId: a.wrozkaId,
        wrozkaUsername: a.wrozka?.username,
        meetingToken: a.status === 'paid' ? tokenByAppointmentId[a.id] ?? null : null,
        rating: a.rating ?? null,
      })),
      total,
    };
  }

  async rateAppointment(
    clientId: number,
    appointmentId: number,
    rating: number,
    comment?: string,
  ): Promise<void> {
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      throw new BadRequestException('Ocena musi być liczbą całkowitą od 0 do 5');
    }
    const appointment = await this.appointmentRepository.findOne({ where: { id: appointmentId } });
    if (!appointment) throw new NotFoundException('Spotkanie nie istnieje');
    if (appointment.clientId !== clientId) throw new ForbiddenException('Nie możesz ocenić tego spotkania');
    if (appointment.status !== 'completed') throw new BadRequestException('Można oceniać tylko zakończone spotkania');

    appointment.rating = rating;
    if (comment !== undefined) {
      appointment.comment = comment?.trim() || null;
    }
    await this.appointmentRepository.save(appointment);
  }

  async getWizardReviews(
    wizardId: number,
    page: number,
    limit: number,
  ): Promise<{ reviews: ReviewDto[]; total: number; pages: number }> {
    const [items, total] = await this.appointmentRepository
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.client', 'client')
      .where('a.wrozkaId = :wizardId', { wizardId })
      .andWhere('a.status = :status', { status: 'completed' })
      .andWhere('a.rating IS NOT NULL')
      .orderBy('a.createdAt', 'DESC')
      .take(limit)
      .skip((page - 1) * limit)
      .getManyAndCount();

    return {
      reviews: items.map((a) => ({
        id: a.id,
        rating: a.rating!,
        comment: a.comment ?? null,
        clientUsername: a.client?.username ?? 'Anonim',
        createdAt: a.createdAt.toISOString(),
      })),
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async pay(clientUserId: number, appointmentId: number, clientEmail: string) {
    return this.stripeService.createCheckoutSession(appointmentId, clientUserId, clientEmail);
  }
}
