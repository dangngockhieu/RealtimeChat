export interface LastMessageResponseDto{
    id: string;
    content: string;
    senderId: string;
    senderName: string;
    createdAt: Date;
}

export interface MyMemberResponseDto {
    role: string;
    status: string;
    lastReadAt: Date | null;
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
    name: string;
    type: string;
    memberCount: number;
    myMembership: MyMemberResponseDto;
    participants: MemberInfoDto[];
}

export interface ConversationSummaryResponseDto {
    id: string;
    name: string;
    type: string;
    updatedAt: Date;
    lastMessage?: LastMessageResponseDto;
}