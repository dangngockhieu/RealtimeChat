import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class AddUserToConversationRequestDto {
    @IsNotEmpty({ message: 'ConversationId không được để trống' })
    @IsString({ message: 'ConversationId phải là một chuỗi' })
    conversationId: string;
    @IsNotEmpty({ message: 'UserIds không được để trống' })
    @IsArray({ message: 'UserIds phải là một mảng' })
    userIds: string[];
}

export class TargetUserIdRequestDto {
    @IsNotEmpty({ message: 'UserId không được để trống' })
    @IsString({ message: 'UserId phải là một chuỗi' })
    targertUserId: string;
}