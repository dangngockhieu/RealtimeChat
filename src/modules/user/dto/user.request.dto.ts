import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword@123',
    description: 'Mật khẩu hiện tại của người dùng',
  })
  @IsNotEmpty({ message: 'Old Password không được để trống' })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Mật khẩu mới (phải có chữ hoa, thường, số và ký tự đặc biệt)',
  })
  @IsNotEmpty({ message: 'New Password không được để trống' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  @IsString()
  newPassword: string;

  @ApiProperty({
    example: 'NewPassword@123',
    description: 'Xác nhận lại mật khẩu mới',
  })
  @IsNotEmpty({ message: 'Confirm Password không được để trống' })
  @IsString()
  confirmPassword: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'newemail@example.com',
    description: 'Địa chỉ email mới của người dùng',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiPropertyOptional({
    example: 'Trần',
    description: 'Họ và tên đệm mới',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'FirstName không được để trống nếu đã truyền lên' })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Bình',
    description: 'Tên mới',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'LastName không được để trống nếu đã truyền lên' })
  lastName?: string;
}