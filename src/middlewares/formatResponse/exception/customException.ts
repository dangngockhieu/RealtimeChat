export interface CustomError extends Error {
    success: boolean;
    statusCode: number;
    isCustomException: boolean;
}

const makeException = (message: string, statusCode: number): CustomError => {
    const error = new Error(message) as CustomError;
    error.statusCode = statusCode;
    error.success = false;
    error.isCustomException = true;
    return error;
};

// --- Định nghĩa trước các Exception phổ biến ---
export const BadRequestException = (message = 'Dữ liệu đầu vào không hợp lệ') =>
    makeException(message, 400);

// Lỗi 401 - Chưa đăng nhập / Sai token
export const UnauthorizedException = (message = 'Bạn chưa đăng nhập hoặc phiên làm việc hết hạn') =>
    makeException(message, 401);

// Lỗi 403 - Không có quyền truy cập
export const ForbiddenException = (message = 'Bạn không có quyền thực hiện hành động này') =>
    makeException(message, 403);

// Lỗi 404 - Không tìm thấy tài nguyên
export const NotFoundException = (message = 'Tài nguyên yêu cầu không tồn tại') =>
    makeException(message, 404);

// Lỗi 409 - Xung đột dữ liệu (Ví dụ: Trùng email, trùng username)
export const ConflictException = (message = 'Dữ liệu đã tồn tại trên hệ thống') =>
    makeException(message, 409);

// Lỗi 500 - Lỗi server hệ thống
export const InternalServerException = (message = 'Lỗi hệ thống phía máy chủ') =>
    makeException(message, 500);