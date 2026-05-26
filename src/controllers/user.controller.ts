import { Request, Response } from 'express';
import {
  getAllUsers as getAllUsersService,
  getUserByEmail as getUserByEmailService,
  getUserById as getUserByIdService,
  updatePassword as updatePasswordService,
  updateUserProfile as updateUserProfileService,
} from '../services/user.service';
import { BadRequestException } from '../middlewares/formatResponse/exception/customException';
import { UserAccount } from '../dtos/response/auth.interface';
import { ChangePasswordDto, UpdateUserDto } from '../dtos/request/user.dto';

export const changePassword = async (req: Request, res: Response) => {
  const user = req.user as UserAccount;
  const body = req.body as ChangePasswordDto;
  await updatePasswordService(user.id, body);
  res.customSuccess(null, 'Đổi mật khẩu thành công');
};

export const updateProfile = async (req: Request, res: Response) => {
  const user = req.user as UserAccount;
  const body = req.body as UpdateUserDto;
  const data = await updateUserProfileService(user.id, body);
  res.customSuccess(data, 'Cập nhật hồ sơ thành công');
};

export const getAllUsers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const filter: any = {};

  if (req.query.email) filter.email = req.query.email;

  const result = await getAllUsersService(page, limit, filter);

  // Áp dụng middleware customSuccess
  res.customSuccess(result, 'Lấy danh sách người dùng thành công');
};

export const getUserByEmail = async (req: Request, res: Response) => {
  const email = req.query.email as string;
  if (!email) {
    // Sử dụng exception error chung
    throw BadRequestException('Vui lòng cung cấp email');
  }

  const data = await getUserByEmailService(email);

  // Áp dụng middleware customSuccess
  res.customSuccess(data, 'Lấy người dùng theo email thành công');
};

export const getProfile = async (req: Request, res: Response) => {
  res.customSuccess(req.user, 'Lấy hồ sơ thành công');
};

export const getUserById = async (req: Request, res: Response) => {
  const data = await getUserByIdService(req.params.id as string);
  res.customSuccess(data, 'Lấy người dùng theo ID thành công');
};