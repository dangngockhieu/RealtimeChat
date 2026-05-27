import { Expose, Transform, Type } from "class-transformer";
import { MemberRole, MemberStatus } from "../../schemas/member.schema";
import { ConversationPrivacy, ConversationType } from "../../schemas/conversation.schema";

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
    role: MemberRole;
    status: MemberStatus;
    lastReadAt?: Date | null;
    unreadCount: number;
}

export interface MemberInfoDto{
    userId: string;
    firstName: string;
    lastName: string;
    role: MemberRole;
}

export interface ConversationDetailResponseDto {
    id: string;
    name?: string;
    type: ConversationType;
    privacy: ConversationPrivacy;
    memberCount: number;
    myMembership: MyMemberResponseDto;
}

export class ConversationSummaryResponseDto {
    @Expose()
    @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
    id: string;

    @Expose()
    name: string;

    @Expose()
    type: ConversationType;

    @Expose()
    updatedAt: Date;

    // Tin nhắn cuối cùng
    @Expose()
    @Type(() => LastMessageResponseDto)
    lastMessage: LastMessageResponseDto | null;
}