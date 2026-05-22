import { Request, Response } from 'express';
import { getAllUsers as getAllUsersService, getUserByEmail as getUserByEmailService } from '../services/user.service';
import { BadRequestException } from '../middlewares/formatResponse/exception/customException';

//   const changePassword = async (req: Request, res: Response, next: NextFunction) => {
//     await this.userService.updatePassword(req.user!.id, req.body);
//     res.customSuccess(null, 'Đổi mật khẩu thành công');
//   };

//   const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
//     const data = await this.userService.updateUserProfile(req.user!.id, req.body);
//     res.customSuccess(data, 'Cập nhật hồ sơ thành công');
//   };

const getAllUsers = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const filter: any = {};

  if (req.query.email) filter.email = req.query.email;

  const result = await getAllUsersService(page, limit, filter);

  // Áp dụng middleware customSuccess
  res.customSuccess(result, 'Lấy danh sách người dùng thành công');
};

const getUserByEmail = async (req: Request, res: Response) => {
  const email = req.query.email as string;
  if (!email) {
    // Demo sử dụng exception error chung
    throw BadRequestException('Vui lòng cung cấp email');
  }

  const data = await getUserByEmailService(email);

  // Áp dụng middleware customSuccess
  res.customSuccess(data, 'Lấy người dùng theo email thành công');
};

//   const getProfile = async (req: Request, res: Response, next: NextFunction) => {
//     res.customSuccess(req.user, 'Lấy hồ sơ thành công');
//   };

//   const getUserById = async (req: Request, res: Response, next: NextFunction) => {
//     const data = await this.userService.getUserById(req.params.id);
//     res.customSuccess(data, 'Lấy người dùng theo ID thành công');
//   };

export { getAllUsers, getUserByEmail };