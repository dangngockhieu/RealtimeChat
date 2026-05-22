import { Expose, Transform } from 'class-transformer';

export class MemberResponseDto {
  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
  id: string;

  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.conversationId?._id?.toString() ?? obj?.conversationId?.toString())
  conversationId: string;

  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.userId?._id?.toString() ?? obj?.userId?.toString())
  userId: string;

  @Expose()
  @Transform(({ obj }) => obj?.userId?.firstName ?? '')
  firstName: string;

  @Expose()
  @Transform(({ obj }) => obj?.userId?.lastName ?? '')
  lastName: string;

  @Expose()
  @Transform(({ obj }) => obj?.userId?.email ?? '')
  email: string;

  @Expose()
  role: string;

  @Expose()
  status: string;

  @Expose()
  joinedAt: Date;

  @Expose()
  leftAt: Date | null;
}
