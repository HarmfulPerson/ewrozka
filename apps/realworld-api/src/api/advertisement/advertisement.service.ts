import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  AdvertisementEntity,
  AppointmentEntity,
  MeetingRequestEntity,
  UserEntity,
} from '@repo/postgresql-typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class AdvertisementService {
  constructor(
    @InjectRepository(AdvertisementEntity)
    private readonly advertisementRepository: Repository<AdvertisementEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AppointmentEntity)
    private readonly appointmentRepository: Repository<AppointmentEntity>,
    @InjectRepository(MeetingRequestEntity)
    private readonly meetingRequestRepository: Repository<MeetingRequestEntity>,
  ) {}

  async getAdvertisementsByWizardId(wizardId: number) {
    const wizard = await this.userRepository.findOne({
      where: { id: wizardId },
      relations: ['roles'],
    });

    if (!wizard) {
      throw new NotFoundException('Wróżka nie znaleziona');
    }

    const isWizard = wizard.roles?.some((role) => role.name === 'wizard');
    if (!isWizard) {
      throw new NotFoundException('Użytkownik nie jest wróżką');
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

  async getMyAdvertisements(userId: number) {
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
      id: ad.id,
      title: ad.title,
      description: ad.description,
      imageUrl: ad.imageUrl,
      priceGrosze: ad.priceGrosze,
      durationMinutes: ad.durationMinutes,
      userId: ad.userId,
    };
  }

  async getAdvertisementById(id: number) {
    const advertisement = await this.advertisementRepository.findOne({
      where: { id },
      relations: ['user', 'user.topics'],
    });

    if (!advertisement) {
      throw new NotFoundException('Ogłoszenie nie znalezione');
    }

    return {
      advertisement: {
        id: advertisement.id,
        title: advertisement.title,
        description: advertisement.description,
        imageUrl: advertisement.imageUrl,
        priceGrosze: advertisement.priceGrosze,
        durationMinutes: advertisement.durationMinutes,
        wizard: {
          id: advertisement.user.id,
          username: advertisement.user.username,
          image: advertisement.user.image,
          topicNames: advertisement.user.topics?.map((t) => t.name) ?? [],
        },
      },
    };
  }

  async createAdvertisement(
    userId: number,
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
        id: saved.id,
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
    userId: number,
    id: number,
    data: {
      title?: string;
      description?: string;
      priceGrosze?: number;
      durationMinutes?: number;
    },
  ) {
    const advertisement = await this.advertisementRepository.findOne({ where: { id } });

    if (!advertisement) {
      throw new NotFoundException('Ogłoszenie nie znalezione');
    }
    if (advertisement.userId !== userId) {
      throw new NotFoundException('Nie masz uprawnień do edycji tego ogłoszenia');
    }

    Object.assign(advertisement, data);
    const saved = await this.advertisementRepository.save(advertisement);

    return { advertisement: this.mapAd(saved) };
  }

  async updateAdvertisementImage(id: number, imageUrl: string) {
    await this.advertisementRepository.update(id, { imageUrl });
  }

  async deleteAdvertisement(userId: number, id: number) {
    const advertisement = await this.advertisementRepository.findOne({
      where: { id },
    });

    if (!advertisement) {
      throw new NotFoundException('Ogłoszenie nie znalezione');
    }

    if (advertisement.userId !== userId) {
      throw new NotFoundException('Nie masz uprawnień do usunięcia tego ogłoszenia');
    }

    // Blokuj usunięcie tylko gdy są nieopłacone, zaakceptowane spotkania
    // (opłacone / zakończone zostają w bazie dzięki ON DELETE SET NULL na advertisementId)
    const unpaidActive = await this.appointmentRepository.findOne({
      where: {
        advertisementId: id,
        status: In(['accepted']),
      },
    });
    if (unpaidActive) {
      throw new BadRequestException(
        'Nie możesz usunąć ogłoszenia, ponieważ istnieje zaakceptowane, nieopłacone spotkanie. Poczekaj na jego opłacenie lub anuluj je.',
      );
    }

    await this.advertisementRepository.remove(advertisement);
  }
}
