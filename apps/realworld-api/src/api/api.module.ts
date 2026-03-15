import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { GuestBookingModule } from './guest-booking/guest-booking.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AdvertisementModule } from './advertisement/advertisement.module';
import { AdminModule } from './admin/admin.module';
import { WizardApplicationModule } from './wizard-application/wizard-application.module';
import { FeaturedModule } from './featured/featured.module';
import { AppointmentModule } from './appointment/appointment.module';
import { ArticleModule } from './article/article.module';
import { AuthModule } from './auth/auth.module';
import { AvailabilityModule } from './availability/availability.module';
import { EmailModule } from './email/email.module';
import { MeetingRequestModule } from './meeting-request/meeting-request.module';
import { MeetingRoomModule } from './meeting-room/meeting-room.module';
import { ProfileModule } from './profile/profile.module';
import { TagModule } from './tag/tag.module';
import { UserModule } from './user/user.module';
import { PaymentModule } from './payment/payment.module';
import { StripeModule } from './stripe/stripe.module';
import { WizardRequestsModule } from './wizard-requests/wizard-requests.module';

@Module({
  imports: [
    EmailModule,
    UserModule,
    AuthModule,
    ProfileModule,
    ArticleModule,
    TagModule,
    AvailabilityModule,
    AdvertisementModule,
    MeetingRequestModule,
    AppointmentModule,
    MeetingRoomModule,
    AdminModule,
    WizardApplicationModule,
    FeaturedModule,
    PaymentModule,
    StripeModule,
    GuestBookingModule,
    NotificationsModule,
    ContactModule,
    WizardRequestsModule,
  ],
})
export class ApiModule {}
