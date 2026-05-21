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

export class MyMemberResponseDto {
    @Expose()
    role: string;

    @Expose()
    status: string;

    @Expose()
    lastReadAt: Date;

    @Expose()
    unreadCount: number;
}

export class MemberInfoDto {
    @Expose()
    @Transform(({ value }) => value?.toString())
    userId: string;

    @Expose()
    firstName: string;

    @Expose()
    lastName: string;

    @Expose()
    role: string;
}

export class ConversationDetailResponseDto {
    @Expose()
    @Transform(({ obj, value }) => value ?? obj?.id ?? obj?._id?.toString())
    id: string;

    @Expose()
    name: string;

    @Expose()
    type: string;

    @Expose()
    memberCount: number;

    // Thông tin membership của chính người đang gọi API
    @Expose()
    @Type(() => MyMemberResponseDto)
    myMembership: MyMemberResponseDto;

    // Danh sách tóm tắt thành viên (chỉ id, tên, role) để hiển thị trong UI
    @Expose()
    @Type(() => MemberInfoDto)
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
