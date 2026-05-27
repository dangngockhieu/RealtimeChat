import { Expose, Transform, Type } from "class-transformer";

export class LastMessageResponseDto {
    @Expose()
    @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
    id: string;

    @Expose()
    content: string;

    @Expose()
    senderId: string;

    @Expose()
    senderName: string;

    @Expose()
    createdAt: Date;
}

export interface MyMemberResponseDto {
    role: string;
    status: string;
    lastReadAt?: Date | null;
    unreadCount: number;
}

export interface MemberInfoDto{
    userId: string;
    firstName: string;
    lastName: string;
    role: string;
}

export interface ConversationDetailResponseDto {
    id: string;
    name?: string;
    type: string;
    memberCount: number;
    myMembership: MyMemberResponseDto;
    participants: MemberInfoDto[];
}

export class ConversationSummaryResponseDto {
    @Expose()
    @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
    id: string;

    @Expose()
    name: string;

    @Expose()
    type: string;

    @Expose()
    updatedAt: Date;

    // Tin nhắn cuối cùng
    @Expose()
    @Type(() => LastMessageResponseDto)
    lastMessage: LastMessageResponseDto | null;
}