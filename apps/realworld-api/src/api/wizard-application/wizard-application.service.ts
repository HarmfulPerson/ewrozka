import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { hashPassword } from '@repo/nest-common';
import { UserEntity, WizardApplicationEntity } from '@repo/postgresql-typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class WizardApplicationService {
  constructor(
    @InjectRepository(WizardApplicationEntity)
    private readonly appRepo: Repository<WizardApplicationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
  ) {}

  async create(dto: {
    email: string;
    username: string;
    password: string;
    bio: string;
    phone?: string;
    topicIds?: string[];
    gender?: 'female' | 'male';
    referralCode?: string;
  }): Promise<{ id: string }> {
    const emailLower = dto.email.toLowerCase().trim();

    // Sprawdź czy email nie jest już zajęty w user table
    const existingUser = await this.userRepo.findOne({ where: { email: emailLower } });
    if (existingUser) {
      throw new ConflictException('Konto z tym adresem e-mail już istnieje.');
    }

    // Sprawdź czy nie ma aktywnego wniosku (pending)
    const existingApp = await this.appRepo.findOne({ where: { email: emailLower } });
    if (existingApp) {
      if (existingApp.status === 'pending') {
        throw new ConflictException(
          'Wniosek z tym adresem e-mail oczekuje już na rozpatrzenie.',
        );
      }
      if (existingApp.status === 'approved') {
        throw new ConflictException('Konto z tym adresem e-mail już istnieje.');
      }
      // status === 'rejected' → usuń stary wniosek, pozwól złożyć nowy
      await this.appRepo.remove(existingApp);
    }

    const passwordHash = await hashPassword(dto.password);

    const app = this.appRepo.create({
      email: emailLower,
      username: dto.username.trim(),
      passwordHash,
      bio: dto.bio.trim(),
      phone: dto.phone ? `+48${dto.phone}` : null,
      topicIds: dto.topicIds ?? [],
      gender: dto.gender ?? null,
      status: 'pending',
      referralCodeUsed: dto.referralCode ?? null,
    });

    await this.appRepo.save(app);
    return { id: app.id };
  }

  async uploadPhoto(id: string, imageUrl: string): Promise<void> {
    const app = await this.appRepo.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Wniosek nie istnieje.');
    if (app.status !== 'pending') {
      throw new BadRequestException('Nie można edytować zatwierdzonego lub odrzuconego wniosku.');
    }
    app.image = imageUrl;
    await this.appRepo.save(app);
  }
}
