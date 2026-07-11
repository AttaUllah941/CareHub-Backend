const { BadRequestError } = require('../../core/errors/AppError');
const { UserRole } = require('../../shared/enums/userRole.enum');
const { parsePaginationQuery } = require('../../core/utils/pagination.util');
const healthQuestionsRepository = require('./health-questions.repository');

const SORT_FIELDS = ['createdAt', 'views'];

const toPublicResponse = (doc) => ({
  id: String(doc._id),
  question: doc.question,
  answer: doc.answer || '',
  category: doc.category,
  city: doc.city || '',
  isAnonymous: doc.isAnonymous,
  askerName: doc.isAnonymous ? 'Anonymous' : doc.askerName || 'Patient',
  doctorName: doc.doctorName || '',
  specialty: doc.specialty || '',
  specialtySlug: doc.specialtySlug || 'general-physician',
  views: doc.views || 0,
  status: doc.status,
  createdAt: doc.createdAt,
});

const toSubmittedResponse = (doc) => ({
  id: String(doc._id),
  question: doc.question,
  category: doc.category,
  city: doc.city || '',
  isAnonymous: doc.isAnonymous,
  status: doc.status,
  createdAt: doc.createdAt,
});

const createQuestion = async (payload, user) => {
  const question = payload.question?.trim();
  if (!question || question.length < 10) {
    throw new BadRequestError('Please enter a question with at least 10 characters');
  }

  const isAnonymous = payload.isAnonymous !== false;
  const askerName = isAnonymous ? '' : (payload.askerName || '').trim();

  if (!isAnonymous && askerName.length < 2) {
    throw new BadRequestError('Please provide your name or choose to ask anonymously');
  }

  const patientId = user?.role === UserRole.PATIENT ? user.id : null;

  const created = await healthQuestionsRepository.create({
    question,
    category: payload.category,
    city: payload.city || '',
    isAnonymous,
    askerName,
    age: payload.age ?? null,
    gender: payload.gender || '',
    patientId,
    status: 'pending',
  });

  return { question: toSubmittedResponse(created.toObject()) };
};

const listPublicAnswered = async (query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, SORT_FIELDS);
  const filter = { status: 'answered', answer: { $ne: '' } };

  if (query.category?.trim()) {
    filter.category = query.category.trim();
  }

  if (query.search?.trim()) {
    const term = query.search.trim();
    filter.$or = [
      { question: { $regex: term, $options: 'i' } },
      { answer: { $regex: term, $options: 'i' } },
    ];
  }

  const [items, total] = await Promise.all([
    healthQuestionsRepository.findAnsweredPublic({ filter, skip, limit, sort }),
    healthQuestionsRepository.countAnsweredPublic(filter),
  ]);

  return {
    questions: items.map(toPublicResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const listMine = async (user, query) => {
  const { page, limit, skip, sort } = parsePaginationQuery(query, SORT_FIELDS);

  const [items, total] = await Promise.all([
    healthQuestionsRepository.findByPatientId({ patientId: user.id, skip, limit, sort }),
    healthQuestionsRepository.countByPatientId(user.id),
  ]);

  return {
    questions: items.map((doc) => ({
      ...toPublicResponse(doc),
      answer: doc.answer || '',
      status: doc.status,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

module.exports = {
  createQuestion,
  listPublicAnswered,
  listMine,
};
