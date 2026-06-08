const { PrismaClient } = require('@prisma/client');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');

const prisma = new PrismaClient();

// ─── S3 Client ───────────────────────────────────────────────────────────────
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-southeast-1',
});
const S3_BUCKET = process.env.S3_BUCKET_NAME || 'habit-tracker-attachments';

// ─── Create Task ─────────────────────────────────────────────────────────────
const createTask = async (req, res) => {
  try {
    const { title, startDate, endDate, type, repeatableType, attachmentUrl } = req.body;
    const userId = req.user.userId;

    // Validation: required fields
    if (!title || !startDate || !endDate || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Field title, startDate, endDate, dan type wajib diisi.',
      });
    }

    // Validation: date logic
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Format tanggal tidak valid. Gunakan format ISO 8601 (YYYY-MM-DD).',
      });
    }

    if (end < start) {
      return res.status(400).json({
        status: 'error',
        message: 'endDate tidak boleh lebih awal dari startDate.',
      });
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title,
        startDate: start,
        endDate: end,
        type,
        repeatableType: repeatableType || 'disable',
        attachmentUrl: attachmentUrl || null,
      },
    });

    return res.status(201).json({ status: 'success', data: task });
  } catch (error) {
    console.error('createTask error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal membuat task.' });
  }
};

// ─── Get All Tasks ───────────────────────────────────────────────────────────
const getAllTasks = async (req, res) => {
  try {
    const userId = req.user.userId;

    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { startDate: 'asc' },
    });

    return res.json({ status: 'success', data: tasks });
  } catch (error) {
    console.error('getAllTasks error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengambil tasks.' });
  }
};

// ─── Update Task ─────────────────────────────────────────────────────────────
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, startDate, endDate, type, repeatableType, attachmentUrl } = req.body;

    // Verify ownership
    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Task tidak ditemukan.',
      });
    }

    // Validate dates if provided
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    if (start && isNaN(start.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Format startDate tidak valid.',
      });
    }

    if (end && isNaN(end.getTime())) {
      return res.status(400).json({
        status: 'error',
        message: 'Format endDate tidak valid.',
      });
    }

    // Cross-check dates (use existing values as fallback)
    const finalStart = start || existing.startDate;
    const finalEnd = end || existing.endDate;

    if (finalEnd < finalStart) {
      return res.status(400).json({
        status: 'error',
        message: 'endDate tidak boleh lebih awal dari startDate.',
      });
    }

    // Build update data — only include fields that are provided
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (start) updateData.startDate = start;
    if (end) updateData.endDate = end;
    if (type !== undefined) updateData.type = type;
    if (repeatableType !== undefined) updateData.repeatableType = repeatableType;
    if (attachmentUrl !== undefined) updateData.attachmentUrl = attachmentUrl;

    const task = await prisma.task.update({
      where: { id },
      data: updateData,
    });

    return res.json({ status: 'success', data: task });
  } catch (error) {
    console.error('updateTask error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal mengupdate task.' });
  }
};

// ─── Delete Task ─────────────────────────────────────────────────────────────
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify ownership
    const existing = await prisma.task.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Task tidak ditemukan.',
      });
    }

    await prisma.task.delete({ where: { id } });

    return res.json({ status: 'success', message: 'Task berhasil dihapus.' });
  } catch (error) {
    console.error('deleteTask error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal menghapus task.' });
  }
};

// ─── Get S3 Presigned URL ────────────────────────────────────────────────────
const getPresignedUrl = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { fileName, fileType } = req.query;

    if (!fileName || !fileType) {
      return res.status(400).json({
        status: 'error',
        message: 'Query parameter fileName dan fileType wajib diisi.',
      });
    }

    // Generate a unique key to prevent collisions
    const uniqueId = crypto.randomUUID();
    const ext = fileName.split('.').pop();
    const key = `attachments/${userId}/${uniqueId}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      ContentType: fileType,
    });

    const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutes

    // The final public URL where the file will be accessible
    const fileUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-southeast-1'}.amazonaws.com/${key}`;

    return res.json({
      status: 'success',
      data: {
        uploadUrl: presignedUrl,  // Frontend PUTs the file here
        fileUrl,                  // Save this to the Task's attachmentUrl
      },
    });
  } catch (error) {
    console.error('getPresignedUrl error:', error);
    return res.status(500).json({ status: 'error', message: 'Gagal membuat presigned URL.' });
  }
};

module.exports = {
  createTask,
  getAllTasks,
  updateTask,
  deleteTask,
  getPresignedUrl,
};
