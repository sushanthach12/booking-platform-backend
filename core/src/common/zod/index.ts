import { BadRequestException } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

function formatZodErrors(error: ZodError) {
  return error.issues.reduce<Record<string, string[]>>((acc, e) => {
    const key = e.path.join('.');
    acc[key] ??= [];
    acc[key].push(e.message);
    return acc;
  }, {});
}

export function parseWithZod<T>(schema: ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof ZodError) {
      const formattedErrors = formatZodErrors(err);

      console.log(formattedErrors);
      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    throw err;
  }
}
