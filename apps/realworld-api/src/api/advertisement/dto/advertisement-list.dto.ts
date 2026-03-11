import { OmitType } from '@nestjs/swagger';
import { NumberFieldOptional } from '@repo/api';
import { PageOptionsDto } from '@repo/api/dto/offset-pagination/page-options.dto';

export class AdvertisementListReqDto extends OmitType(PageOptionsDto, [
  'order',
  'q',
] as const) {
  @NumberFieldOptional({ min: 1, default: 50, int: true })
  override readonly limit: number = 50;

  @NumberFieldOptional({ min: 0, default: 0, int: true })
  override readonly offset: number = 0;
}
