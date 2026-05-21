import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { Conversation } from './schemas/conversation.schema';
import { Model, Types } from 'mongoose';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { CreateGroupChatDto } from './dto/conversation.request.dto';
import { Message } from '../message/schemas/message.schema';
import { Connection } from 'mongoose';
import { ConversationDetailResponseDto, ConversationSummaryResponseDto} from '../../response';
import { Member } from '../member/schemas/member.schema';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ConversationService {
    constructor(
        @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
        @InjectModel(Message.name) private messageModel: Model<Message>,
        @InjectModel(Member.name) private memberModel: Model<Member>,
        @InjectConnection() private readonly connection: Connection
    ) {}

    private async formatConversationResponse(conversationId: string, currentUserId: string): Promise<ConversationDetailResponseDto> {
        // GỌI SONG SONG ĐỂ TỐI ƯU TỐC ĐỘ (Promise.all)
        const [conversation, members, currentMember] = await Promise.all([
            this.conversationModel.findById(conversationId).lean(),
            this.memberModel.find({ conversationId })
                .populate('userId', 'firstName lastName role')
                .lean()
                .exec() as unknown as any[],
            this.memberModel.findOne({ conversationId, userId: currentUserId }).lean().exec()
        ]);

        if (!conversation || !currentMember) {
            throw new InternalServerErrorException('Dữ liệu không nhất quán');
        }

        // Tối ưu unreadCount: Không đếm tin nhắn do chính mình gửi
        let unreadCount = 0;
        if (currentMember.lastReadAt) {
            unreadCount = await this.messageModel.countDocuments({
                conversationId,
                createdAt: { $gt: currentMember.lastReadAt },
                senderId: { $ne: currentUserId }, // Logic chuẩn: Tin của mình gửi thì không tính là chưa đọc
                isRecalled: false
            });
        }

        const otherMember = members.filter((m: any) => m.userId._id.toString() !== currentUserId);
        const name = conversation.type === 'DIRECT'
            ? otherMember && otherMember.length > 0 ? `${otherMember[0].userId.firstName} ${otherMember[0].userId.lastName}` : 'Cuộc trò chuyện'
            : conversation.name;

        return {
            id: conversationId,
            name: name,
            type: conversation.type,
            memberCount: conversation.memberCount,
            myMembership: {
                role: currentMember.role,
                status: currentMember.status,
                lastReadAt: currentMember.lastReadAt,
                unreadCount
            },
            participants: members.map((m: any) => ({
                userId: m.userId._id.toString(),
                firstName: m.userId.firstName,
                lastName: m.userId.lastName,
                role: m.role,
            }))
        };
    }

    private buildResponseFromData(
        conversationId: string,
        conversationName: string,
        conversationType: string,
        populatedMembers: any[],
        currentUserId: string,
        currentUserRole: string,
    ): ConversationDetailResponseDto {
        const otherMember = populatedMembers.find((m: any) => m.userId._id.toString() !== currentUserId);
        const name = conversationType === 'DIRECT'
            ? otherMember ? `${otherMember.userId.firstName} ${otherMember.userId.lastName}` : 'Cuộc trò chuyện'
            : conversationName;

        return {
            id: conversationId,
            name,
            type: conversationType,
            memberCount: populatedMembers.length,
            myMembership: {
                role: currentUserRole,
                status: 'ACCEPTED',
                lastReadAt: null,
                unreadCount: 0
            },
            participants: populatedMembers.map((m: any) => ({
                userId: m.userId._id.toString(),
                firstName: m.userId.firstName,
                lastName: m.userId.lastName,
                role: m.role,
            }))
        };
    }

    async createGroupChat(creatorId: string, dto: CreateGroupChatDto): Promise<ConversationDetailResponseDto> {
        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const newConversation = new this.conversationModel({
                type: 'GROUP',
                privacy: dto.privacy,
                name: dto.name,
                memberCount: dto.participantIds.length + 1,
            });
            await newConversation.save({ session });

            await this.memberModel.insertMany([
                {
                    conversationId: newConversation._id,
                    userId: creatorId,
                    role: 'OWNER',
                    status: 'ACCEPTED'
                },
                ...dto.participantIds.map(id => ({
                    conversationId: newConversation._id,
                    userId: id,
                    role: 'MEMBER',
                    status: 'ACCEPTED'
                }))
            ], { session });

            await session.commitTransaction();

            const allUserIds = [creatorId, ...dto.participantIds];
            const populatedMembers = await this.memberModel
                .find({ conversationId: newConversation._id, userId: { $in: allUserIds } })
                .populate('userId', 'firstName lastName role')
                .lean()
                .exec();

            return this.buildResponseFromData(
                newConversation._id.toString(),
                dto.name,
                'GROUP',
                populatedMembers,
                creatorId,
                'OWNER',
            );
        } catch (error) {
            await session.abortTransaction();
            throw new InternalServerErrorException('Không thể tạo nhóm chat.');
        } finally {
            await session.endSession();
        }
    }

    async findOrCreateDirectChat(userId1: string, userId2: string): Promise<ConversationDetailResponseDto> {
        const sharedConvs = await this.memberModel.aggregate([
            { $match: { userId: { $in: [new Types.ObjectId(userId1), new Types.ObjectId(userId2)] } } },
            { $group: { _id: "$conversationId", count: { $sum: 1 } } },
            { $match: { count: 2 } }
        ]);

        if (sharedConvs.length > 0) {
            const convIds = sharedConvs.map(c => c._id);
            const conv = await this.conversationModel.findOne({ _id: { $in: convIds }, type: 'DIRECT' }).lean();
            if (conv) return this.formatConversationResponse(conv._id.toString(), userId1);
        }

        const session = await this.connection.startSession();
        session.startTransaction();
        try {
            const newConv = new this.conversationModel({
                type: 'DIRECT',
                memberCount: 2
            });
            await newConv.save({ session });

            await this.memberModel.insertMany([
                {
                    conversationId: newConv._id,
                    userId: userId1,
                    role: 'MEMBER',
                    status: 'ACCEPTED'
                },
                {
                    conversationId: newConv._id,
                    userId: userId2,
                    role: 'MEMBER',
                    status: 'ACCEPTED'
                }
            ], { session });

            await session.commitTransaction();

            const populatedMembers = await this.memberModel
                .find({ conversationId: newConv._id, userId: { $in: [userId1, userId2] } })
                .populate('userId', 'firstName lastName role')
                .lean()
                .exec();

            return this.buildResponseFromData(
                newConv._id.toString(),
                '',
                'DIRECT',
                populatedMembers,
                userId1,
                'MEMBER',
            );
        } catch (error) {
            await session.abortTransaction();
            throw new InternalServerErrorException('Lỗi tạo chat 1-1');
        } finally {
            await session.endSession();
        }
    }

    async getMyConversations(userId: string, limit = 20, cursor?: string)
    : Promise<{ result: ConversationSummaryResponseDto[], nextCursor: Date | null, hasNextPage: boolean }> {
        const members = await this.memberModel
            .find({ userId, status: 'ACCEPTED' })
            .select('conversationId')
            .lean();

        const conversationIds = members.map(member => member.conversationId.toString());

        const filter: any = {
            _id: { $in: conversationIds },
        };

        if (cursor) {
            filter.lastMessageAt = { $lt: new Date(cursor) };
        }

        const conversations = await this.conversationModel
            .find(filter)
            .sort({ lastMessageAt: -1 })
            .limit(limit + 1)
            .lean();

        const hasNextPage = conversations.length > limit;
        const data = hasNextPage ? conversations.slice(0, limit) : conversations;
        const nextCursor = hasNextPage ? data[data.length - 1].lastMessageAt : null;
        const result = data.map(conv => plainToInstance(ConversationSummaryResponseDto, conv, {
            excludeExtraneousValues: true,
        }));

        return { result, nextCursor, hasNextPage };
    }
}