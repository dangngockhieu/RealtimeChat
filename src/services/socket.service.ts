import { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

// Interface Socket để chứa userId
export interface AuthenticatedSocket extends Socket {
    userId?: string;
}

// Khai báo các biến ở cấp độ Module
let io: Server;
// Sử dụng Set<string> để lưu nhiều tab/thiết bị của củng 1 user
const onlineUsers = new Map<string, Set<string>>();

// Hàm khởi tạo chính
export const initSocket = (httpServer: HTTPServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // MIDDLEWARE KIỂM TRA ĐĂNG NHẬP
    io.use((socket: AuthenticatedSocket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.token;

            if (!token) {
                return next(new Error('Vui lòng đăng nhập để sử dụng tính năng này!'));
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
            
            // Gắn userId vào socket hợp lệ (Không cần as any nữa)
            socket.userId = decoded.id; 

            next();
        } catch (error) {
            return next(new Error('Token không hợp lệ hoặc đã hết hạn'));
        }
    });

    // XỬ LÝ KẾT NỐI
    io.on('connection', (socket: AuthenticatedSocket) => {
        const userId = socket.userId; 
        if (!userId) return;

        // Thêm socket.id vào danh sách của user (Hỗ trợ nhiều tab)
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId)?.add(socket.id);
        
        console.log(`[Socket] User ${userId} online với socket ${socket.id}`);

        socket.on('disconnect', () => {
            // Xóa socket.id của tab vừa đóng
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                // Nếu user không còn tab nào online, xóa hoàn toàn
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    console.log(`[Socket] User ${userId} offline hoàn toàn`);
                } else {
                    console.log(`[Socket] User ${userId} đóng 1 tab, còn ${userSockets.size} tab`);
                }
            }
        });
    });
};


export const emitToUser = (userId: string, event: string, payload: any) => {
    if (!io) return;
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
        // Bắn sự kiện tới tất cả các tab/thiết bị của user này
        userSockets.forEach(socketId => {
            io.to(socketId).emit(event, payload);
        });
    }
};

export const joinRoom = (userId: string, roomId: string) => {
    if (!io) return;
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
        // Cho tất cả các tab của user join vào room
        userSockets.forEach(socketId => {
            const socket = io.sockets.sockets.get(socketId);
            if (socket) {
                socket.join(roomId);
            }
        });
    }
};

export const emitToRoom = (roomId: string, event: string, payload: any) => {
    if (!io) return;
    io.to(roomId).emit(event, payload);
};