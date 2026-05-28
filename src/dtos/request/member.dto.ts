import { IsArray, IsNotEmpty, IsString } from "class-validator";

export class AddUserToConversationRequestDto {
    @IsNotEmpty({ message: 'ConversationId không được để trống' })
    @IsString({ message: 'ConversationId phải là một chuỗi' })
    conversationId: string;
    @IsNotEmpty({ message: 'UserIds không được để trống' })
    @IsArray({ message: 'UserIds phải là một mảng' })
    userIds: string[];
}