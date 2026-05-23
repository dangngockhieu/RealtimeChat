import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class LoginRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email của người dùng',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu đăng nhập',
  })
  @IsNotEmpty({ message: 'Password không được để trống' })
  @IsString({ message: 'Password phải là một chuỗi' })
  password: string;
}

export class RegisterRequestDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Địa chỉ email đăng ký tài khoản',
  })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @ApiProperty({
    example: 'Password@123',
    description: 'Mật khẩu phải chứa ít nhất chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  @IsNotEmpty({ message: 'Password không được để trống' })
  @IsString({ message: 'Password phải là một chuỗi' })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Mật khẩu phải bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
  })
  password: string;

  @ApiProperty({
    example: 'Nguyễn',
    description: 'Họ và tên đệm của người dùng',
  })
  @IsNotEmpty({ message: 'FirstName không được để trống' })
  @IsString({ message: 'FirstName phải là một chuỗi' })
  firstName: string;

  @ApiProperty({
    example: 'An',
    description: 'Tên của người dùng',
  })
  @IsNotEmpty({ message: 'LastName không được để trống' })
  @IsString({ message: 'LastName phải là một chuỗi' })
  lastName: string;
}