import { ArrayMinSize, IsArray, IsMongoId, IsNotEmpty, IsString } from "class-validator";

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
    privacy: string;

    @IsArray()
    @IsMongoId({ each: true })
    @ArrayMinSize(2)
    participantIds: string[];
}