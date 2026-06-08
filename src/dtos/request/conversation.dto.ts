import { ArrayMinSize, IsArray, IsBoolean, IsEnum, IsMongoId, IsNotEmpty, IsOptional, IsString } from "class-validator";
import { ConversationPrivacy} from "../../schemas/conversation.schema";

export class CreateDirectChatDto {
    @IsMongoId()
    @IsNotEmpty()
    targetUserId: string;
}

export class CreateGroupChatDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    @IsEnum(ConversationPrivacy)
    privacy: ConversationPrivacy;

    @IsArray()
    @IsMongoId({ each: true })
    @ArrayMinSize(2)
    participantIds: string[];
}

export class ChangeConversationPrivacyDto {
    @IsString()
    @IsNotEmpty()
    @IsEnum(ConversationPrivacy)
    privacy: ConversationPrivacy;
}