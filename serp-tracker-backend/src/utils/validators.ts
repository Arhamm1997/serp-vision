import Joi from 'joi';

export const validateSearchRequest = (data: any) => {
  const schema = Joi.object({
    keyword: Joi.string().required().min(1).max(500).trim(),
    domain: Joi.string().required().min(1).max(255).trim(),
    country: Joi.string().required().length(2).uppercase(),
    city: Joi.string().optional().max(100).trim(),
    state: Joi.string().optional().max(50).trim(),
    postalCode: Joi.string().optional().max(20).trim(),
    language: Joi.string().optional().length(2).lowercase().default('en'),
    device: Joi.string().optional().valid('desktop', 'mobile', 'tablet').default('desktop')
  });

  return schema.validate(data, { abortEarly: false });
};

export const validateBulkSearchRequest = (data: any) => {
  const schema = Joi.object({
    keywords: Joi.array()
      .items(Joi.string().min(1).max(500).trim())
      .min(1)
      .max(100)
      .required()
      .unique(),
    domain: Joi.string().required().min(1).max(255).trim(),
    country: Joi.string().required().length(2).uppercase(),
    city: Joi.string().optional().max(100).trim(),
    state: Joi.string().optional().max(50).trim(),
    postalCode: Joi.string().optional().max(20).trim(),
    language: Joi.string().optional().length(2).lowercase().default('en'),
    device: Joi.string().optional().valid('desktop', 'mobile', 'tablet').default('desktop')
  });

  return schema.validate(data, { abortEarly: false });
};

export const validateQueryParams = (params: any) => {
  const schema = Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(50),
    offset: Joi.number().integer().min(0).default(0),
    sortBy: Joi.string().valid('timestamp', 'keyword', 'domain', 'position', 'found').default('timestamp'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
    dateFrom: Joi.date().iso().optional(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional()
  });

  return schema.validate(params, { abortEarly: false, allowUnknown: true });
};
