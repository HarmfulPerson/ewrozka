import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';



import { InjectRepository } from '@nestjs/typeorm';



import { verifyPassword } from '@repo/nest-common';



import {

  AppointmentEntity,

  RoleEntity,

  TopicEntity,

  UserEntity,

} from '@repo/postgresql-typeorm';



import { In, Repository } from 'typeorm';



import { AuthService } from '../auth/auth.service';



import { EmailService } from '../email/email.service';



import { FeaturedService } from '../featured/featured.service';



import { CreateUserReqDto } from './dto/create-user.dto';



import { UpdateUserReqDto } from './dto/update-user.dto';



import { UserResDto } from './dto/user.dto';



@Injectable()

export class UserService {

  constructor(

    private readonly authService: AuthService,



    private readonly emailService: EmailService,



    private readonly featuredService: FeaturedService,



    @InjectRepository(UserEntity)

    private readonly userRepository: Repository<UserEntity>,



    @InjectRepository(RoleEntity)

    private readonly roleRepository: Repository<RoleEntity>,



    @InjectRepository(TopicEntity)

    private readonly topicRepository: Repository<TopicEntity>,



    @InjectRepository(AppointmentEntity)

    private readonly appointmentRepository: Repository<AppointmentEntity>,

  ) {}



  async get(currentUser: {

    id: number;



    token: string;



    roles?: string[];

  }): Promise<UserResDto> {

    const user = await this.userRepository.findOneOrFail({

      where: { id: currentUser.id },



      relations: ['roles'],

    });



    await this.userRepository



      .createQueryBuilder()



      .relation(UserEntity, 'topics')



      .of(user)



      .loadMany()



      .then((topics) => {

        user.topics = topics as any;

      });



    const roleNames = user.roles?.map((r) => r.name) ?? [];



    const topicIds = user.topics?.map((t) => t.id) ?? [];



    const topicNames = user.topics?.map((t) => t.name) ?? [];



    return {

      user: {

        id: user.id,



        email: user.email,



        username: user.username,



        bio: user.bio,



        image: user.image,



        image2: user.image2 || '',



        image3: user.image3 || '',



        roles: roleNames,



        topicIds,



        topicNames,



        token: currentUser.token,

      },

    };

  }



  async create(dto: CreateUserReqDto): Promise<UserResDto> {

    const { username, email, password, roleNames, topicIds, bio, phone } = dto;



    const user = await this.userRepository.findOne({

      where: [{ username }, { email }],

    });



    if (user) {

      throw new BadRequestException('Użytkownik o tej nazwie lub adresie e-mail już istnieje');

    }



    const roles: RoleEntity[] = [];



    if (roleNames?.length) {

      const found = await this.roleRepository.find({

        where: { name: In(roleNames) },

      });



      roles.push(...found);

    }



    // Domyślnie przypisz rolę "client", jeśli brak ról



    if (roles.length === 0) {

      const clientRole = await this.roleRepository.findOne({

        where: { name: 'client' },

      });



      if (clientRole) roles.push(clientRole);

    }



    const topics: TopicEntity[] = [];



    if (topicIds?.length) {

      const found = await this.topicRepository.find({

        where: { id: In(topicIds) },

      });



      topics.push(...found);

    }



    const wizardReg = (roleNames ?? []).includes('wizard');

    const newUser = this.userRepository.create({

      username,



      email,



      password,



      bio: bio ?? '',



      // Zapisujemy z prefixem +48; tylko wróżki podają telefon
      phone: wizardReg && phone ? `+48${phone}` : null,



      roles,



      topics,



      // Wróżki: emailVerified=true (brak weryfikacji email), status=pending
      // Klienci/inni: emailVerified=false (standard email verification flow)
      emailVerified: wizardReg,



      wizardApplicationStatus: wizardReg ? 'pending' : null,

    });



    const savedUser = await this.userRepository.save(newUser);



    const savedWithRoles = await this.userRepository.findOneOrFail({

      where: { id: savedUser.id },



      relations: ['roles', 'topics'],

    });



    const roleNamesResult = savedWithRoles.roles?.map((r) => r.name) ?? [];



    const topicIdsResult = savedWithRoles.topics?.map((t) => t.id) ?? [];



    const topicNamesResult = savedWithRoles.topics?.map((t) => t.name) ?? [];



    // Wróżka: NIE wysyłamy emaila, konto oczekuje na zatwierdzenie admina.
    // Klient: wysyłamy email weryfikacyjny.
    if (!wizardReg) {
      this.authService
        .createEmailVerificationToken(savedWithRoles.id)
        .then((verificationToken) =>
          this.emailService.sendVerificationEmail(email, username, verificationToken),
        )
        .catch((err) => console.error('Failed to send verification email', err));
    }

    // Wróżka dostaje tymczasowy token TYLKO do wgrania zdjęcia profilowego.
    // Nie może się zalogować do panelu (login() blokuje status pending).
    let registrationToken: string | null = null;
    if (wizardReg) {
      registrationToken = await this.authService.createToken({
        id: savedWithRoles.id,
        roles: roleNamesResult,
      });
    }

    return {

      user: {

        id: savedWithRoles.id,



        email: savedWithRoles.email,



        username: savedWithRoles.username,



        bio: savedWithRoles.bio,



        image: savedWithRoles.image,



        image2: savedWithRoles.image2,



        image3: savedWithRoles.image3,



        roles: roleNamesResult,



        topicIds: topicIdsResult,



        topicNames: topicNamesResult,



        token: registrationToken,



        emailVerified: wizardReg,

      },

    };

  }



  async update(

    userId: number,



    userData: UpdateUserReqDto,

  ): Promise<UserResDto> {

    const user = await this.userRepository.findOne({

      where: { id: userId },



      relations: ['roles', 'topics'],

    });



    if (!user) {

      throw new NotFoundException('Użytkownik nie istnieje');

    }



    const { topicIds, ...dataToUpdate } = userData;



    // Aktualizuj topics jeśli zostały podane



    if (topicIds !== undefined) {

      const topics = await this.topicRepository.find({

        where: { id: In(topicIds) },

      });



      user.topics = topics as any;

    }



    const savedUser = await this.userRepository.save({

      ...user,



      ...dataToUpdate,



      id: userId,

    });



    const updatedUser = await this.userRepository.findOne({

      where: { id: userId },



      relations: ['roles', 'topics'],

    });



    const roleNames = updatedUser?.roles?.map((r) => r.name) ?? [];



    const topicIdsResult = updatedUser?.topics?.map((t) => t.id) ?? [];



    const topicNamesResult = updatedUser?.topics?.map((t) => t.name) ?? [];



    return {

      user: {

        id: savedUser.id,



        email: savedUser.email,



        username: savedUser.username,



        bio: savedUser.bio,



        image: savedUser.image,



        image2: savedUser.image2,



        image3: savedUser.image3,



        roles: roleNames,



        topicIds: topicIdsResult,



        topicNames: topicNamesResult,



        token: await this.authService.createToken({

          id: savedUser.id,



          roles: roleNames,

        }),

      },

    };

  }



  async updateUserVideo(userId: number, videoUrl: string | null): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new BadRequestException('Użytkownik nie istnieje');
    user.video = videoUrl;
    await this.userRepository.save(user);
  }

  async changePassword(

    userId: number,



    currentPassword: string,



    newPassword: string,

  ): Promise<void> {

    const user = await this.userRepository.findOne({ where: { id: userId } });



    if (!user) throw new BadRequestException('Użytkownik nie istnieje');



    const valid = await verifyPassword(currentPassword, user.password);



    if (!valid)

      throw new BadRequestException('Obecne hasło jest nieprawidłowe');



    if (newPassword.length < 8)

      throw new BadRequestException(

        'Nowe hasło musi mieć co najmniej 8 znaków',

      );



    user.password = newPassword;



    await this.userRepository.save(user);

  }



  async updateUserImage(

    currentUser: { id: number; token: string },



    imageUrl: string,



    slot: 'image' | 'image2' | 'image3' = 'image',

  ): Promise<UserResDto> {

    const user = await this.userRepository.findOne({

      where: { id: currentUser.id },



      relations: ['roles', 'topics'],

    });



    if (!user) {

      throw new NotFoundException('Użytkownik nie istnieje');

    }



    user[slot] = imageUrl;



    await this.userRepository.save(user);



    const roleNames = user.roles?.map((r) => r.name) ?? [];



    const topicIds = user.topics?.map((t) => t.id) ?? [];



    const topicNames = user.topics?.map((t) => t.name) ?? [];



    return {

      user: {

        id: user.id,



        email: user.email,



        username: user.username,



        bio: user.bio,



        image: user.image,



        image2: user.image2 || '',



        image3: user.image3 || '',



        roles: roleNames,



        topicIds,



        topicNames,



        token: currentUser.token,

      },

    };

  }



  async getWizards(
    limit: number = 12,
    offset: number = 0,
    filters?: { name?: string; topicIds?: number[]; minRating?: number },
  ) {
    // Budujemy bazowe zapytanie dla IDs wróżek z filtrami
    let baseQb = this.userRepository
      .createQueryBuilder('u')
      .innerJoin('u.roles', 'r', 'r.name = :role', { role: 'wizard' });

    if (filters?.name) {
      baseQb = baseQb.andWhere('u.username ILIKE :name', {
        name: `%${filters.name}%`,
      });
    }

    if (filters?.topicIds && filters.topicIds.length > 0) {
      baseQb = baseQb
        .innerJoin('u.topics', 'topicFilter')
        .andWhere('topicFilter.id IN (:...topicIds)', {
          topicIds: filters.topicIds,
        });
    }

    if (filters?.minRating && filters.minRating > 0) {
      // Raw subquery – bezpieczniejsze niż TypeORM subQuery builder
      baseQb = baseQb.andWhere(
        `u.id IN (
          SELECT a.wrozka_id
          FROM appointment a
          WHERE a.status = 'completed'
            AND a.rating IS NOT NULL
          GROUP BY a.wrozka_id
          HAVING AVG(a.rating) >= :minRating
        )`,
        { minRating: filters.minRating },
      );
    }

    // Całkowita liczba pasujących wróżek (dla infinite scroll)
    const total = await baseQb.getCount();

    const wizardIdsQuery = await baseQb
      .select('u.id', 'id')
      .orderBy('u.id', 'DESC')
      .limit(limit)
      .offset(offset)
      .getRawMany<{ id: number }>();

    let wizardIds = wizardIdsQuery.map((r) => Number(r.id));

    if (wizardIds.length === 0) {
      return { wizards: [], wizardsCount: 0, total };
    }



    // Pobieramy pełne dane wróżek z relacjami



    const wizardUsers = await this.userRepository.find({

      where: { id: In(wizardIds) },



      relations: ['roles', 'topics'],



      order: { id: 'DESC' },

    });



    // Fetch avg rating + count for all wizards in one query



    wizardIds = wizardUsers.map((w) => w.id);



    const ratingStats: {

      wrozkaId: string;



      avg_rating: string;



      ratings_count: string;

    }[] =

      wizardIds.length > 0

        ? await this.appointmentRepository



            .createQueryBuilder('a')



            .select('a.wrozkaId', 'wrozkaId')



            .addSelect('AVG(a.rating)', 'avg_rating')



            .addSelect('COUNT(a.id)', 'ratings_count')



            .where('a.wrozkaId IN (:...ids)', { ids: wizardIds })



            .andWhere('a.status = :status', { status: 'completed' })



            .andWhere('a.rating IS NOT NULL')



            .groupBy('a.wrozkaId')



            .getRawMany()

        : [];



    const ratingMap = new Map(

      ratingStats.map((r) => [

        Number(r.wrozkaId),



        { avg: parseFloat(r.avg_rating), count: parseInt(r.ratings_count, 10) },

      ]),

    );



    // Pobierz aktualnie wyróżnione wróżki (bieżące okno rotacji)
    const featuredIds = new Set(
      await this.featuredService.getActiveFeaturedWizardIds(),
    );

    const wizardsData = wizardUsers.map((wizard) => {

      const stats = ratingMap.get(wizard.id);



      return {

        id: wizard.id,



        username: wizard.username,



        bio: wizard.bio,



        image: wizard.image,



        image2: wizard.image2 || '',



        image3: wizard.image3 || '',



        topicIds: wizard.topics?.map((t) => t.id) ?? [],



        topicNames: wizard.topics?.map((t) => t.name) ?? [],



        avgRating: stats ? Math.round(stats.avg * 100) / 100 : null,



        ratingsCount: stats?.count ?? 0,

        isFeatured: featuredIds.has(wizard.id),

      };

    });

    // Wyróżnione wróżki na początku listy, reszta wg oryginalnej kolejności
    wizardsData.sort((a, b) => {
      if (a.isFeatured === b.isFeatured) return 0;
      return a.isFeatured ? -1 : 1;
    });

    return {
      wizards: wizardsData,
      wizardsCount: wizardsData.length,
      total,
    };
  }

  async getWizardById(id: number) {

    const wizard = await this.userRepository.findOne({

      where: { id },



      relations: ['roles', 'topics'],

    });



    if (!wizard) {

      throw new NotFoundException('Wróżka nie istnieje');

    }



    const isWizard = wizard.roles?.some((role) => role.name === 'wizard');



    if (!isWizard) {

      throw new NotFoundException('Wróżka nie istnieje');

    }



    const ratingRow = await this.appointmentRepository



      .createQueryBuilder('a')



      .select('AVG(a.rating)', 'avg_rating')



      .addSelect('COUNT(a.id)', 'ratings_count')



      .where('a.wrozkaId = :id', { id })



      .andWhere('a.status = :status', { status: 'completed' })



      .andWhere('a.rating IS NOT NULL')



      .getRawOne<{ avg_rating: string | null; ratings_count: string }>();



    const avgRating = ratingRow?.avg_rating

      ? Math.round(parseFloat(ratingRow.avg_rating) * 100) / 100

      : null;



    const ratingsCount = parseInt(ratingRow?.ratings_count ?? '0', 10);



    const { isFeatured } = await this.featuredService.getWizardFeaturedStatus(id);

    return {

      wizard: {

        id: wizard.id,



        username: wizard.username,



        bio: wizard.bio,



        image: wizard.image,



        image2: wizard.image2 || '',



        image3: wizard.image3 || '',



        topicIds: wizard.topics?.map((t) => t.id) ?? [],



        topicNames: wizard.topics?.map((t) => t.name) ?? [],



        avgRating,



        ratingsCount,

        isFeatured,

        video: wizard.video || null,

      },

    };

  }



  async getAllTopics() {

    const topics = await this.topicRepository.find({

      order: { name: 'ASC' },

    });



    return {

      topics: topics.map((t) => ({

        id: t.id,



        name: t.name,

      })),



      topicsCount: topics.length,

    };

  }

}

