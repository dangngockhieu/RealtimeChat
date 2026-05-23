import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member, MemberDocument } from '../member/schemas/member.schema';
import { MessageService } from '../message/message.service';
import { MemberService } from '../member/member.service';
import { SendMessageDto } from '../message/dto/message.request.dto';
import { MarkAsReadDto } from '../member/dto/member.request.dto';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/',
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // Lưu trữ danh sách socketId theo từng userId: Map<userId, Set<socketId>>
  private readonly userSocketsMap = new Map<string, Set<string>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly messageService: MessageService,
    private readonly memberService: MemberService,
    @InjectModel(Member.name) private readonly memberModel: Model<MemberDocument>,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway Initialized');
  }

  // Quản lý kết nối: Xác thực JWT & Join room
  async handleConnection(client: Socket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} kết nối bị từ chối: Thiếu Token`);
        client.emit('auth_error', { message: 'Token xác thực không được cung cấp' });
        client.disconnect(true);
        return;
      }

      const secret = this.configService.get<string>('JWT_SECRET');
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, { secret });

      // Lưu thông tin user vào socket instance
      client.data.user = payload;
      const userId = payload.sub;

      const isFirstConnection = this.addUserSocket(userId, client.id);

      // Join room cá nhân của user (để nhận thông báo, lời mời kết bạn,...)
      await client.join(`user_${userId}`);

      // Lấy danh sách cuộc trò chuyện mà user là thành viên để tự động join room
      const memberships = await this.memberModel
        .find({ userId, status: 'ACCEPTED' })
        .select('conversationId')
        .lean();

      for (const m of memberships) {
        await client.join(`conversation_${m.conversationId.toString()}`);
      }

      this.logger.log(`User ${userId} đã kết nối (Socket: ${client.id})`);

      // Nếu đây là thiết bị/tab đầu tiên của user, phát tín hiệu user_online
      if (isFirstConnection) {
        this.server.emit('user_online', { userId });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Xác thực socket thất bại cho ${client.id}: ${errorMessage}`);
      client.emit('auth_error', { message: 'Token không hợp lệ hoặc đã hết hạn' });
      client.disconnect(true);
    }
  }

  // Quản lý ngắt kết nối
  handleDisconnect(client: Socket) {
    const userId = client.data?.user?.sub;
    if (userId) {
      const isCompletelyOffline = this.removeUserSocket(userId, client.id);
      this.logger.log(`Socket ${client.id} của User ${userId} đã ngắt kết nối`);

      // Nếu user không còn kết nối nào khác trên các tab/thiết bị
      if (isCompletelyOffline) {
        this.server.emit('user_offline', { userId });
      }
    }
  }

  // Sự kiện gửi tin nhắn realtime
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: SendMessageDto,
  ) {
    const userId = client.data?.user?.sub;
    const message = await this.messageService.sendMessage(userId, dto);

    // Phát tin nhắn tới tất cả client trong room conversation
    this.server.to(`conversation_${dto.conversationId}`).emit('new_message', message);

    return { status: 'ok', data: message };
  }

  // Sự kiện trạng thái gõ phím (typing indicator)
  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data?.user?.sub;
    client.to(`conversation_${payload.conversationId}`).emit('user_typing', {
      conversationId: payload.conversationId,
      userId,
      isTyping: payload.isTyping,
    });
  }

  // Sự kiện đánh dấu đã xem / đã đọc tin nhắn
  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: MarkAsReadDto,
  ) {
    const userId = client.data?.user?.sub;
    await this.memberService.markAsRead(userId, dto);

    // Thông báo cho các thành viên trong room biết tin nhắn đã được đọc
    client.to(`conversation_${dto.conversationId}`).emit('message_read', {
      conversationId: dto.conversationId,
      userId,
      messageId: dto.messageId,
    });

    return { status: 'ok' };
  }

  // Sự kiện thu hồi tin nhắn
  @SubscribeMessage('recall_message')
  async handleRecallMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; conversationId: string },
  ) {
    const userId = client.data?.user?.sub;
    await this.messageService.recallMessage(userId, payload.messageId);

    // Phát sự kiện tới toàn bộ room bao gồm cả người gửi
    this.server.to(`conversation_${payload.conversationId}`).emit('message_recalled', {
      conversationId: payload.conversationId,
      messageId: payload.messageId,
    });

    return { status: 'ok' };
  }

  // Client chủ động join vào room của cuộc trò chuyện mới được tạo
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    await client.join(`conversation_${payload.conversationId}`);
    return { status: 'ok', joined: payload.conversationId };
  }

  // Client rời khỏi room cuộc trò chuyện
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    await client.leave(`conversation_${payload.conversationId}`);
    return { status: 'ok', left: payload.conversationId };
  }

  // ==================== CÁC PHƯƠNG THỨC HỖ TRỢ PHÁT SỰ KIỆN CHO CONTROLLER / SERVICE ====================

  notifyNewMessage(conversationId: string, message: any) {
    this.server?.to(`conversation_${conversationId}`).emit('new_message', message);
  }

  notifyMessageRecalled(conversationId: string, messageId: string) {
    this.server?.to(`conversation_${conversationId}`).emit('message_recalled', {
      conversationId,
      messageId,
    });
  }

  notifyConversationUpdated(conversationId: string, data: any) {
    this.server?.to(`conversation_${conversationId}`).emit('conversation_updated', {
      conversationId,
      ...data,
    });
  }

  notifyUserOnlineStatus(targetUserId: string, isOnline: boolean) {
    this.server?.emit(isOnline ? 'user_online' : 'user_offline', { userId: targetUserId });
  }

  notifyToUser(userId: string, event: string, data: any) {
    this.server?.to(`user_${userId}`).emit(event, data);
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.userSocketsMap.get(userId);
    return !!(sockets && sockets.size > 0);
  }

  // ==================== QUẢN LÝ USER PRESENCE TRONG BỘ NHỚ ====================

  private addUserSocket(userId: string, socketId: string): boolean {
    let sockets = this.userSocketsMap.get(userId);
    let isFirst = false;
    if (!sockets) {
      sockets = new Set<string>();
      this.userSocketsMap.set(userId, sockets);
      isFirst = true;
    }
    sockets.add(socketId);
    return isFirst;
  }

  private removeUserSocket(userId: string, socketId: string): boolean {
    const sockets = this.userSocketsMap.get(userId);
    if (!sockets) return true;

    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.userSocketsMap.delete(userId);
      return true; // Hoàn toàn offline
    }
    return false;
  }

  private extractTokenFromSocket(client: Socket): string | null {
    const authHeader =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization ||
      client.handshake.query?.token;

    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    return authHeader.trim();
  }
}
