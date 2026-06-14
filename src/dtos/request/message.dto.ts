import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateMessageDto {
    @IsNotEmpty({ message: 'Content không được để trống' })
    @IsString({ message: 'Content phải là một chuỗi' })
    content: string;

    @IsOptional()
    @IsString({ message: 'replyTo phải là một chuỗi' })
    replyTo?: string;
}