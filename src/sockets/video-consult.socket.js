const { UserRole } = require('../shared/enums/userRole.enum');
const appointmentsRepository = require('../modules/appointments/appointments.repository');
const logger = require('../core/utils/logger');

const NAMESPACE = '/video-consult';
const MAX_ROOM_PARTICIPANTS = 2;
const JOINABLE_STATUSES = ['confirmed'];

const getPatientId = (appointment) =>
  appointment.patientId?._id?.toString() || appointment.patientId?.toString() || null;

const getDoctorUserId = (appointment) =>
  appointment.doctorId?.userId?._id?.toString() ||
  appointment.doctorId?.userId?.toString() ||
  null;

const canJoinAppointment = (user, appointment) => {
  if (!JOINABLE_STATUSES.includes(appointment.status)) {
    return { allowed: false, reason: 'Appointment is not available for video consultation' };
  }

  const patientId = getPatientId(appointment);
  const doctorUserId = getDoctorUserId(appointment);

  if (user.role === UserRole.PATIENT && patientId && patientId === user.id) {
    return { allowed: true, participantRole: 'patient' };
  }

  if (user.role === UserRole.DOCTOR && doctorUserId && doctorUserId === user.id) {
    return { allowed: true, participantRole: 'doctor' };
  }

  return { allowed: false, reason: 'You are not a participant in this consultation' };
};

const getRoomSize = (namespace, room) => namespace.adapter.rooms.get(room)?.size || 0;

const emitToRoomExcept = (namespace, room, excludeSocketId, event, payload) => {
  for (const socketId of namespace.adapter.rooms.get(room) || []) {
    if (socketId === excludeSocketId) continue;
    namespace.sockets.get(socketId)?.emit(event, payload);
  }
};

const registerVideoConsultNamespace = (io) => {
  const namespace = io.of(NAMESPACE);

  namespace.on('connection', (socket) => {
    logger.debug(`Video consult socket connected: ${socket.id} (user ${socket.user.id})`);

    socket.on('join-room', async (payload, ack) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const room = payload?.room?.trim();

      if (!room) {
        respond({ success: false, message: 'Room is required' });
        return;
      }

      try {
        const appointment = await appointmentsRepository.findByBookingRef(room);
        if (!appointment) {
          respond({ success: false, message: 'Consultation room not found' });
          return;
        }

        const access = canJoinAppointment(socket.user, appointment);
        if (!access.allowed) {
          respond({ success: false, message: access.reason });
          return;
        }

        const currentRoom = socket.data.consultRoom;
        if (currentRoom && currentRoom !== room) {
          socket.leave(currentRoom);
          emitToRoomExcept(namespace, currentRoom, socket.id, 'participant-left', {
            room: currentRoom,
            userId: socket.user.id,
            role: socket.user.role,
          });
        }

        const occupants = getRoomSize(namespace, room);
        const alreadyInRoom = socket.rooms.has(room);

        if (!alreadyInRoom && occupants >= MAX_ROOM_PARTICIPANTS) {
          socket.emit('room-full', { room });
          respond({ success: false, message: 'Room is full' });
          return;
        }

        await socket.join(room);
        socket.data.consultRoom = room;

        if (!alreadyInRoom) {
          emitToRoomExcept(namespace, room, socket.id, 'participant-joined', {
            room,
            userId: socket.user.id,
            role: access.participantRole || socket.user.role,
          });
        }

        respond({
          success: true,
          room,
          participantRole: access.participantRole || socket.user.role,
          occupants: getRoomSize(namespace, room),
        });
      } catch (error) {
        logger.error(`join-room failed for socket ${socket.id}: ${error.message}`);
        respond({ success: false, message: 'Failed to join consultation room' });
      }
    });

    socket.on('leave-room', (payload, ack) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const room = payload?.room?.trim() || socket.data.consultRoom;

      if (!room) {
        respond({ success: false, message: 'Room is required' });
        return;
      }

      if (!socket.rooms.has(room)) {
        respond({ success: false, message: 'Not in this room' });
        return;
      }

      socket.leave(room);
      if (socket.data.consultRoom === room) {
        socket.data.consultRoom = null;
      }

      emitToRoomExcept(namespace, room, socket.id, 'participant-left', {
        room,
        userId: socket.user.id,
        role: socket.user.role,
      });

      respond({ success: true, room });
    });

    socket.on('signal', (payload, ack) => {
      const respond = typeof ack === 'function' ? ack : () => {};
      const room = payload?.room?.trim() || socket.data.consultRoom;

      if (!room) {
        respond({ success: false, message: 'Room is required' });
        return;
      }

      if (!socket.rooms.has(room)) {
        respond({ success: false, message: 'Join the room before sending signals' });
        return;
      }

      if (!payload?.payload) {
        respond({ success: false, message: 'Signal payload is required' });
        return;
      }

      const signalMessage = {
        room,
        fromUserId: socket.user.id,
        fromRole: socket.user.role,
        payload: payload.payload,
      };

      if (payload.targetUserId) {
        let delivered = false;

        for (const socketId of namespace.adapter.rooms.get(room) || []) {
          if (socketId === socket.id) continue;

          const peer = namespace.sockets.get(socketId);
          if (peer?.user?.id === payload.targetUserId) {
            peer.emit('signal', signalMessage);
            delivered = true;
          }
        }

        if (!delivered) {
          respond({ success: false, message: 'Target participant is not in the room' });
          return;
        }
      } else {
        socket.to(room).emit('signal', signalMessage);
      }

      respond({ success: true });
    });

    socket.on('disconnect', () => {
      const room = socket.data.consultRoom;
      if (!room) return;

      emitToRoomExcept(namespace, room, socket.id, 'participant-left', {
        room,
        userId: socket.user.id,
        role: socket.user.role,
      });
    });
  });

  logger.info(`Socket namespace registered: ${NAMESPACE}`);
};

module.exports = registerVideoConsultNamespace;
