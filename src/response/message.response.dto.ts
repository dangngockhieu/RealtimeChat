import { Expose, Transform, Type } from 'class-transformer';

export class MessageSenderDto {
  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
  id: string;

  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  email: string;
}

export class MessageReplyToDto {
  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
  id: string;

  @Expose()
  @Transform(({ obj }) => (obj?.isRecalled ? 'Tin nhắn đã bị thu hồi' : obj?.content))
  content: string;

  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.senderId?._id?.toString() ?? obj?.senderId?.toString())
  senderId: string;

  @Expose()
  @Transform(({ obj }) => {
    if (obj?.senderId && typeof obj.senderId === 'object') {
      return `${obj.senderId.firstName ?? ''} ${obj.senderId.lastName ?? ''}`.trim();
    }
    return '';
  })
  senderName: string;

  @Expose()
  isRecalled: boolean;
}

export class MessageResponseDto {
  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
  id: string;

  @Expose()
  @Transform(({ obj, value }) => value ?? obj?.conversationId?._id?.toString() ?? obj?.conversationId?.toString())
  conversationId: string;

  @Expose()
  @Type(() => MessageSenderDto)
  sender: MessageSenderDto;

  @Expose()
  @Transform(({ obj }) => (obj?.isRecalled ? 'Tin nhắn đã bị thu hồi' : obj?.content))
  content: string;

  @Expose()
  type: string;

  @Expose()
  attachments: string[];

  @Expose()
  @Type(() => MessageReplyToDto)
  replyTo: MessageReplyToDto | null;

  @Expose()
  isRecalled: boolean;

  @Expose()
  recalledAt: Date | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}

export class MessagesListResponseDto {
  data: MessageResponseDto[];
  meta: {
    nextCursor: Date | null;
    hasNextPage: boolean;
  };
}
