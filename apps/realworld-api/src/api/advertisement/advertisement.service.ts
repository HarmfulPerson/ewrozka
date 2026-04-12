import type { AllConfigType } from '@/config/config.type';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  GuestBookingEntity,
  MeetingRequestEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { In, Repository } from 'typeorm';
import { EmailService } from '../email/email.service';
import { EmailType } from '../email/email-type.enum';

@Injectable()
export class AdvertisementService {
  private readonly logger = new Logger(AdvertisementService.name);

  constructor(
    @InjectRepository(AdvertisementEntity)
    private readonly advertisementRepository: Repository<AdvertisementEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(MeetingRequestEntity)
    private readonly meetingRequestRepository: Repository<MeetingRequestEntity>,
    @InjectRepository(GuestBookingEntity)
    private readonly guestBookingRepository: Repository<GuestBookingEntity>,
    private readonly emailService: EmailService,
    private readonly config: ConfigService<AllConfigType>,
  ) {}

  async getAdvertisementsByWizardId(wizardId: string) {
    const wizard = await this.userRepository.findOne({
      where: { uid: wizardId },
      relations: ['roles'],
    });

    if (!wizard) {
      throw new NotFoundException('Specjalista nie znaleziony');
    }

    const isWizard = wizard.roles?.some((role) => role.name === 'wizard');
    if (!isWizard) {
      throw new NotFoundException('Użytkownik nie jest specjalistą');
    }

    const advertisements = await this.advertisementRepository.find({
      where: { userId: wizardId },
      order: { createdAt: 'DESC' },
    });

    return {
      advertisements: advertisements.map((ad) => this.mapAd(ad)),
      advertisementsCount: advertisements.length,
    };
  }

  async getMyAdvertisements(userId: string) {
    const advertisements = await this.advertisementRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      advertisements: advertisements.map((ad) => this.mapAd(ad)),
      advertisementsCount: advertisements.length,
    };
  }

  private mapAd(ad: AdvertisementEntity) {
    return {
      uid: ad.uid,
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      priceGrosze: ad.priceGrosze,
      durationMinutes: ad.durationMinutes,
      userId: ad.userId,
    };
  }

  async getAdvertisementById(uid: string) {
    const advertisement = await this.advertisementRepository.findOne({
      where: { uid },
      relations: ['user', 'user.topics'],
    });

    if (!advertisement) {
      throw new NotFoundException('Ogłoszenie nie znalezione');
    }

    return {
      advertisement: {
        uid: advertisement.uid,
        title: advertisement.title,
        description: advertisement.description,
        imageUrl: advertisement.imageUrl,
        priceGrosze: advertisement.priceGrosze,
        durationMinutes: advertisement.durationMinutes,
        wizard: {
          uid: advertisement.user.uid,
          username: advertisement.user.username,
          image: advertisement.user.image,
          topicNames: advertisement.user.topics?.map((t) => t.name) ?? [],
        },
      },
    };
  }

  async createAdvertisement(
    userId: string,
    data: {
      title: string;
      description: string;
      imageUrl?: string;
      priceGrosze: number;
      durationMinutes: number;
    },
  ) {
    const advertisement = this.advertisementRepository.create({
      ...data,
      userId,
    });

    const saved = await this.advertisementRepository.save(advertisement);

    return {
      advertisement: {
        uid: saved.uid,
        title: saved.title,
        description: saved.description,
        imageUrl: saved.imageUrl,
        priceGrosze: saved.priceGrosze,
        durationMinutes: saved.durationMinutes,
        userId: saved.userId,
      },
    };
  }

  async updateAdvertisement(
    userId: string,
    uid: string,
    data: {
      description?: string;
    },
  ) {
    const advertisement = await this.advertisementRepository.findOne({ where: { uid } });

    if (!advertisement) {
      throw new NotFoundException('Ogłoszenie nie znalezione');
    }
    if (advertisement.userId !== userId) {
      throw new NotFoundException('Nie masz uprawnień do edycji tego ogłoszenia');
    }

    if (data.description !== undefined) {
      advertisement.description = data.description;
    }
    const saved = await this.advertisementRepository.save(advertisement);

    return { advertisement: this.mapAd(saved) };
  }

  async updateAdvertisementImage(uid: string, imageUrl: string) {
    await this.advertisementRepository.update({ uid }, { imageUrl });
  }

  async deleteAdvertisement(userId: string, uid: string) {
    const advertisement = await this.advertisementRepository.findOne({
      where: { uid },
      relations: ['user'],
    });

    if (!advertisement) {
      throw new NotFoundException('Ogłoszenie nie znalezione');
    }

    if (advertisement.userId !== userId) {
      throw new NotFoundException('Nie masz uprawnień do usunięcia tego ogłoszenia');
    }

    const appUrl = this.config.get('stripe.frontendUrl', { infer: true }) ?? 'http://localhost:4000';
    const wizardName = (advertisement as { user?: { username?: string } })?.user?.username ?? 'specjalista';

    // 1. Wnioski o spotkanie (zalogowani) – odrzuć tylko nieopłacone, wyślij email
    const requestsForAd = await this.meetingRequestRepository.find({
      where: { advertisementId: uid, status: In(['pending', 'accepted']) },
      relations: ['user', 'advertisement', 'advertisement.user'],
    });

    for (const req of requestsForAd) {
      const apt = await this.appointmentRepository.findOne({
        where: { meetingRequestId: req.uid },
      });
      // Pomijamy wnioski z opłaconym lub zakończonym appointmentem
      if (apt && ['paid', 'completed'].includes(apt.status)) continue;

      req.status = 'rejected';
      req.rejectionReason = 'Ogłoszenie zostało usunięte przez specjalistę.';
      await this.meetingRequestRepository.save(req);

      if (apt && apt.status === 'accepted') {
        apt.status = 'cancelled';
        await this.appointmentRepository.save(apt);
      }

      const userEmail = (req.user as { email?: string })?.email;
      if (userEmail) {
        const requestedPl = req.requestedStartsAt?.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }) ?? '–';
        void this.emailService
          .send({
            to: userEmail,
            subject: 'Ogłoszenie zostało usunięte – informacja o Twoim wniosku – eWróżka',
            type: EmailType.MEETING_REQUEST_CANCELLED_BY_AD,
            context: {
              username: (req.user as { username?: string })?.username ?? 'Użytkownik',
              wizardName: (req.advertisement as { user?: { username?: string } })?.user?.username ?? wizardName,
              requestedAt: requestedPl,
              appUrl,
            },
          })
          .catch((err) =>
            this.logger.error(`Failed to send meeting request cancellation email to ${userEmail}: ${err instanceof Error ? err.message : String(err)}`),
          );
      }
      this.logger.log(`Meeting request ${req.uid} rejected due to advertisement removal`);
    }

    // 2. Rezerwacje gości – odrzuć tylko pending i accepted (nieopłacone)
    const guestBookingsForAd = await this.guestBookingRepository.find({
      where: { advertisementId: uid },
      relations: ['wizard', 'advertisement'],
    });

    const toRejectGuests = guestBookingsForAd.filter((g) => ['pending', 'accepted'].includes(g.status));
    for (const gb of toRejectGuests) {
      gb.status = 'rejected';
      gb.rejectionReason = 'Ogłoszenie zostało usunięte przez specjalistę.';
      await this.guestBookingRepository.save(gb);
      const scheduledPl = gb.scheduledAt.toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' });
      void this.emailService
        .send({
          to: gb.guestEmail,
          subject: 'Ogłoszenie zostało usunięte – informacja o Twojej rezerwacji – eWróżka',
          type: EmailType.GUEST_BOOKING_CANCELLED_BY_AD,
          context: {
            guestName: gb.guestName,
            wizardName: gb.wizard?.username ?? wizardName,
            scheduledAt: scheduledPl,
            appUrl,
          },
        })
        .catch((err) =>
          this.logger.error(`Failed to send guest cancellation email to ${gb.guestEmail}: ${err instanceof Error ? err.message : String(err)}`),
        );
      this.logger.log(`Guest booking ${gb.id} rejected due to advertisement removal`);
    }

    // 3. Appointments bez powiązanego wniosku (fallback) – anuluj tylko accepted
    const appointmentsForAd = await this.appointmentRepository.find({
      where: { advertisementId: uid },
    });
    for (const apt of appointmentsForAd) {
      if (apt.status === 'accepted') {
        apt.status = 'cancelled';
        await this.appointmentRepository.save(apt);
        this.logger.log(`Appointment ${apt.uid} cancelled due to advertisement removal`);
      }
    }

    await this.advertisementRepository.remove(advertisement);
  }
}
